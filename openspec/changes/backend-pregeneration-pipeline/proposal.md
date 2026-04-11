## Why

当前课程预生成（Pre-Generation）的**编排逻辑完全运行在前端浏览器中**。`usePreGeneration` Hook 在 Home 页面挂载时触发，由 `GenerationScheduler` → `PipelineClient.runFullPipeline()` 在浏览器内串行调用 4-5 个后端子 API 端点（outlines → content × N → actions × N → TTS × M），整个流程持续 2-5 分钟。

这个架构存在以下**根本性问题**：

1. **页面跳转即中断** — React 组件卸载后，异步 Promise 链失去状态管理，已完成的中间结果全部丢失
2. **不可后台执行** — 浏览器标签页关闭/刷新 = 整个生成任务彻底丢失
3. **用户只能干等** — 必须保持在 Home 页面才能完成生成，期间无法进入其他页面
4. **无断点续传** — 中断后只能从头开始，每次失败浪费的 AI 调用无法恢复
5. **资源浪费** — 浏览器单线程环境下 260+ 次 HTTP 请求的编排效率低下
6. **状态不持久** — 预生成状态（进度、阶段、错误）完全由 `useState` 管理，刷新即丢

**触发时机**：在 Home 页面，当 `cachedCount < 3`（水位线）且有已完成评测时自动触发；课堂完成后延迟 2 秒再检查水位补充。这意味着即使用户只是想去看课程列表，预生成也会在后台被打断。

## What Changes

将课程预生成的**编排逻辑从前端迁移到后端服务**，前端只负责「触发」和「查看进度」。

- **新增** `POST /api/pre-generate` 后端 API 端点 — 接收生成请求，在服务器端执行完整 Pipeline 编排
- **新增** `GET /api/pre-generate/status` 后端 API 端点 — 查询生成任务进度
- **新增** `generation_tasks` 数据库表 — 持久化任务队列（状态、进度、中间结果、重试次数）
- **重构** `usePreGeneration` Hook — 从编排执行者变为轻量的「触发 + 轮询」客户端
- **迁移** `LessonPlanner`、`RequirementGenerator`、`GenerationScheduler`、`PipelineClient` — 从前端服务层迁移到后端服务层
- **新增** 断点续传机制 — 后端记录每个 Pipeline 步骤的完成状态，中断后从最后完成点继续
- **不影响** 后端 OpenMAIC 子 API（`/api/generate/scene-outlines-stream` 等）— 这些端点不变，只是调用者从浏览器变为后端服务

## Capabilities

### New Capabilities

- `backend-pipeline-orchestration`: 后端执行完整 Pipeline 编排（outlines → content × N → actions × N → TTS × M → 组装 → 写缓存），前端可自由跳转/关闭
- `task-persistence`: 生成任务持久化到 `generation_tasks` 表，含状态、进度、中间结果、重试计数
- `checkpoint-resume`: Pipeline 步骤级检查点，中断后从最后完成步骤恢复（不重新生成已完成的场景）
- `progress-polling`: 前端通过 GET 轮询实时获取后端生成进度（步骤、百分比、阶段描述）

### Modified Capabilities

- `usePreGeneration` Hook: 从「本地编排执行器」重构为「远程任务触发器 + 进度轮询器」，不再依赖 PipelineClient
- `classroom-cache-write`: 缓存写入从前端 `PostgresCacheStore` 改为后端直接写入（跳过 PostgREST RLS，使用内部数据库连接）

## Impact

- **前端代码**: `usePreGeneration` 大幅简化（从 443 行减到 ~150 行），移除对 `PipelineClient`、`GenerationScheduler` 的直接依赖
- **后端代码**: 新增后端 API 路由 + 任务调度服务（约 500-800 行新代码）
- **数据库**: 新增 `generation_tasks` 表（任务队列）、修改 `classroom_cache` 写入方式
- **API 配置**: 后端需要读取 `ChildSettings` 中的 API Key 配置（通过请求 body 传递，非 HTTP Headers）
- **用户体验**: 预生成不再阻塞前端导航，用户可自由浏览应用；回到首页后直接看到已完成的课程
- **可靠性**: 任务持久化 + 断点续传 + 服务器端重试，生成成功率预计从 ~70% 提升到 ~95%
