## Context

LittleStar（小星辰）基于 OpenMAIC 的幼儿英语启蒙应用。当前课程预生成采用**前端编排**架构：

```
前端 React Hook (usePreGeneration)
├── LessonPlanner.planLessons()          — 纯前端，课程规划
├── RequirementGenerator.generate()       — 纯前端，prompt 构建
└── GenerationScheduler → PipelineClient.runFullPipeline()
    ├── POST /api/generate/agent-profiles      (可选, LLM)
    ├── POST /api/generate/scene-outlines-stream (SSE, LLM)
    ├── POST /api/generate/scene-content        (LLM, ×N 场景)
    ├── POST /api/generate/scene-actions         (LLM, ×N 场景)
    ├── POST /api/generate/tts                   (TTS, ×M 语音)
    └── assembleScene() → Classroom JSON         (纯前端组装)
        → cache.saveClassroom() → PostgREST → DB
```

**后端 OpenMAIC 子 API** 运行在 Docker 容器中（Next.js App Router），通过 Nginx + Vite proxy 代理。前端通过 `buildHeadersFromSettings()` 构建 HTTP Headers（`x-model`, `x-api-key`, `x-tts-provider` 等）传递 AI 配置。

**当前数据库**：PostgreSQL + PostgREST（REST API），`classroom_cache` 表存储生成结果，RLS 按 `child_id` 隔离。

**技术栈**：React 19 + Vite + TypeScript（前端）、Next.js + Node.js（后端 OpenMAIC）、PostgreSQL + PostgREST（数据层）。

## Goals / Non-Goals

**Goals:**
- 将 Pipeline 编排逻辑（`PipelineClient.runFullPipeline`）从前端迁移到后端
- 前端只负责「POST 触发 + GET 轮询进度」，不再持有 Pipeline 执行状态
- 生成任务持久化到数据库，支持断点续传和服务端重试
- 前端页面跳转/关闭/刷新不影响后端生成任务
- 保持现有 OpenMAIC 子 API 端点不变（`/api/generate/*`）
- 保持 `classroom_cache` 表结构和 RLS 策略不变

**Non-Goals:**
- 不修改 OpenMAIC 子 API 的实现（那是上游 OpenMAIC 的代码）
- 不引入消息队列中间件（Redis/RabbitMQ）—— 任务量小（<50/天），数据库队列足够
- 不实现后端 WebSocket 推送（轮询足够，3-5 秒间隔）
- 不修改 `LessonPlanner`/`RequirementGenerator` 算法逻辑（只改调用位置）
- 不替换 PostgREST（缓存写入改为后端直连 PostgreSQL 或继续用 PostgREST 内部调用）

## Decisions

### D1: 后端 API 路由位置 — LittleStar Vite 后端（非 OpenMAIC Next.js）

**选择**: 在 LittleStar 项目中新增 Express/Fastify 后端服务，暴露 `/api/pre-generate` 和 `/api/pre-generate/status` 端点

**替代方案**:
- *在 OpenMAIC Next.js 中添加 API Route*: 需要 fork 修改 OpenMAIC 源码，增加耦合
- *独立微服务*: 架构过重，当前规模不需要

**理由**: LittleStar 是 Vite SPA + Docker 部署。新增一个轻量的 Node.js 后端服务（Express），复用现有 Docker 编排。这个后端服务在前端 Vite dev server 和生产 Docker 之间保持一致。

### D2: 任务队列实现 — 数据库队列（PostgreSQL `generation_tasks` 表）

**选择**: 使用 PostgreSQL 表作为任务队列，后端服务启动时轮询/处理待执行任务

**替代方案**:
- *Redis 队列*: 需要新增 Redis 容器，增加运维负担
- *内存队列*: 服务重启后丢失任务
- *BullMQ*: 依赖 Redis

**理由**: 任务量极小（每天 <50 个课堂），PostgreSQL 完全胜任。任务持久化天然支持断点续传。

### D3: Pipeline 编排位置 — 后端直接调用 OpenMAIC 子 API（HTTP 内网调用）

**选择**: 后端服务通过 `http://localhost:3002`（OpenMAIC 容器端口）直接调用子 API，不走 Nginx 代理

**替代方案**:
- *通过 Nginx 代理调用*: 多一层转发，增加延迟
- *gRPC/内部协议*: OpenMAIC 不支持

**理由**: 后端和 OpenMAIC 在同一 Docker network，直连最快。API Key 等配置通过请求 body/headers 传递。

### D4: 前端架构 — `usePreGeneration` 瘦客户端

**选择**: Hook 精简为：检查条件 → `POST /api/pre-generate` → 定时 `GET /api/pre-generate/status` 轮询

**替代方案**:
- *前端继续编排，后端只提供单步 API*: 不解决核心问题（页面跳转中断）

**理由**: 前端只需感知「有没有任务在跑」「进度如何」「结果就绪」三个状态。所有复杂编排逻辑在后端。

### D5: 断点续传策略 — 步骤级检查点

**选择**: 后端在每个 Pipeline 步骤（outlines、content[i]、actions[i]、tts[i][j]）完成后将中间结果写入 `generation_tasks.checkpoint` JSONB 字段

**恢复逻辑**:
1. 任务状态为 `running` 且上次更新超过 5 分钟 → 视为中断
2. 读取 `checkpoint`，从最后完成的步骤继续
3. 已生成的 outlines/content/actions 不重新请求
4. 最多恢复 3 次，之后标记为 `failed`

**理由**: 每个子 API 调用耗时 5-30 秒，重新生成已完成步骤是浪费。步骤级粒度在复杂度和恢复精度间取得平衡。

### D6: API Key 传递方式 — 请求 Body 而非全局配置

**选择**: 前端 POST 时将 `ChildSettings`（含 API Key 配置）作为请求 body 的一部分发送，后端从中提取配置构建 Headers

**替代方案**:
- *后端从数据库读取 ChildSettings*: 需要后端有数据库直连权限读取 `children.settings` JSONB
- *环境变量*: 不灵活，不支持多孩子不同配置

**理由**: 最小改动。前端已有 `buildHeadersFromSettings()` 逻辑，只需将 settings 对象序列化到请求 body。后端端接收后用同样的逻辑构建 Headers。

## Risks / Trade-offs

- **[新增后端服务]** 需要在 Docker 编排中新增一个 Node.js 服务 → 利用现有 supervisord 管理，监听不同端口
- **[API Key 安全]** 前端将 API Key 发送到自己的后端 → 内网调用，HTTPS 加密，与当前前端直发 Headers 给 OpenMAIC 同等安全
- **[轮询延迟]** 前端 3-5 秒轮询一次 → 进度更新不如本地实时，但对于 2-5 分钟的任务可接受
- **[数据库队列性能]** PostgreSQL 作为队列 → 任务量极小（<50/天），不存在性能瓶颈
- **[LessonPlanner 重复实现]** 课程规划逻辑从前端迁移到后端 → 使用共享 TypeScript 代码（isomorphic），或后端直接 import 前端模块
- **[向后兼容]** 旧版前端可能仍调用前端编排 → 后端 API 作为新增端点，旧逻辑可保留作为 fallback，通过 feature flag 切换
- **[Docker 改动]** 需要修改 `docker-compose.yml` 和 supervisord 配置 → 新增一个进程，监听 3003 端口，Nginx 路由 `/api/pre-generate/*` → :3003
