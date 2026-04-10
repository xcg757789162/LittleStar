## Context

### 当前架构

LittleStar 的课堂渲染有两条路径：

1. **iframe 模式（主路径）**：LittleStar → `ClassroomIframe` → `http://localhost:8080/openmaic/classroom/{id}` → OpenMAIC Next.js 前端在 iframe 内渲染，图片由 OpenMAIC 前端直接加载
2. **Slide 组件模式（备用路径）**：LittleStar 从 PostgreSQL 加载 `classroomData` JSON → 通过 `ImageSlide`/`TeachingSlide`/`QuizSlide`/`TPRSlide` 组件渲染

### 图片 URL 来源链路

```
AI 生成（通义万象）→ 临时 CDN URL → OpenMAIC 后端存入 canvas.elements[].src
  → 课堂 JSON 缓存到 PostgreSQL（classrooms.data）
  → LittleStar 读取 JSON → 渲染组件直接使用 img.src
```

### 核心问题

| 问题 | 影响路径 | 严重度 |
|------|---------|--------|
| CDN 临时 URL ~24h 过期 | iframe + Slide | 🔴 致命 |
| Nginx 无 `/data/` 代理规则 | iframe | 🔴 致命 |
| `openmaic-data` 卷未共享给 Nginx | iframe | 🟡 中等 |
| `resolveMediaUrl()` 零接入 | Slide | 🟡 中等 |
| 渲染组件无 `onError` 兜底 | Slide | 🟢 低 |

### 约束

- OpenMAIC 是第三方镜像（`devprincekumar/openmaic:latest`），**不可修改其源码**
- 修复必须在 LittleStar 侧（Nginx 配置、Docker 编排、前端组件）完成
- 需向下兼容已缓存的课堂数据（PostgreSQL 中可能包含过期 CDN URL）

## Goals / Non-Goals

**Goals:**

1. iframe 模式下图片 100% 可加载（解决 Nginx 代理和卷共享问题）
2. Slide 组件模式下图片 URL 经过统一解析，过期 CDN URL 有兜底策略
3. 图片加载失败时用户看到友好的占位图，而非空白
4. 新创建的课堂图片使用持久化本地路径，不再依赖临时 CDN URL

**Non-Goals:**

- 不修改 OpenMAIC 后端源码（第三方镜像）
- 不迁移历史课堂数据（通过运行时兜底处理）
- 不实现完整的 CDN 缓存/加速方案
- 不处理音频 URL 问题（本次仅聚焦图片）

## Decisions

### 决策 1：Nginx 反向代理方案（而非共享卷方案）

**选择**: 通过 Nginx 新增 `/data/` 代理规则，将图片请求反向代理到 OpenMAIC 容器

**理由**:
- OpenMAIC 已经在 3002 端口对外服务，其 Next.js 后端可以直接 serve `/data/` 下的文件
- 不需要修改 Docker 卷挂载（避免引入新的卷共享复杂度）
- 与现有 `/_next/`、`/images/`、`/uploads/` 的代理模式一致
- 更安全：不直接暴露文件系统

**备选方案（放弃）**:
- 共享卷方案：让 Nginx 挂载 `openmaic-data` 卷 → 增加卷耦合，且 Nginx 需要配置 `alias` 规则，不如反向代理灵活
- 中间服务方案：新增一个文件代理微服务 → 过度设计，增加运维复杂度

### 决策 2：前端图片代理 + 缓存中间层

**选择**: 在 LittleStar 前端（Vite 开发/Nginx 生产）新增一个图片代理 API 端点

**设计**:
```
/api/image-proxy?url=<encoded-external-url>
```
- OpenMAIC 容器接收外部 CDN URL → 下载 → 缓存到本地 → 返回图片二进制
- 后续请求直接从本地缓存返回
- 这样即使原始 CDN URL 过期，本地缓存仍然可用

**理由**:
- 解决 CDN URL 过期的根本问题
- OpenMAIC 已有 `/api/` 路由被 Nginx 代理，新增端点自然融入
- 不需要修改 OpenMAIC 源码 —— 此代理运行在 LittleStar 的 Vite 开发服务器或 Nginx 层

**实际可行方案调整**:
由于不能修改 OpenMAIC 源码，图片代理改为在**数据转换层**实现：
1. `convertTeachingScene()` 提取 `imageUrl` 时，检测是否为外部 CDN URL
2. 如果是 CDN URL，包裹为 Nginx 可代理的本地路径格式
3. `resolveMediaUrl()` 增强为真正的 URL 转换器

### 决策 3：统一 URL 解析 + 加载失败兜底

**选择**: 全面接入 `resolveMediaUrl()` 并增加 `<img onError>` 兜底

**设计**:
- `resolveMediaUrl()` 增强逻辑：
  - `/media/*` → 直接返回（已持久化的本地路径）
  - `/data/*` → 通过 Nginx 代理到 OpenMAIC（新增代理规则后可达）
  - `http(s)://dashscope-result.*` → 外部 CDN URL，保持原样但标记为"可能过期"
  - 其他外部 URL → 保持原样
- 所有 `<img>` 标签增加 `onError` handler → 显示🖼️占位图 + 可选重试按钮

**理由**:
- 单一入口统一处理所有 URL 变体
- 渐进降级：本地路径优先 → 代理路径 → 外部 URL → 占位图

### 决策 4：iframe 内图片的代理路径覆盖

**选择**: 新增 Nginx 规则覆盖 OpenMAIC 内部的所有可能图片路径

**需要代理的路径**:
```
/data/classroom-jobs/*/        → proxy_pass http://openmaic/data/classroom-jobs/*/
/data/images/*                 → proxy_pass http://openmaic/data/images/*
/data/*                        → proxy_pass http://openmaic/data/*（通配符兜底）
```

**理由**:
- iframe 内 OpenMAIC 的 Next.js 前端可能使用多种路径格式引用图片
- 通配符兜底确保不遗漏

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| OpenMAIC 不 serve `/data/` 路径的静态文件 | Nginx 代理到 OpenMAIC 后返回 404 | → 需先验证 OpenMAIC 是否响应 `/data/` 请求；如不行，改为共享卷 + Nginx alias 方案 |
| iframe 内图片 URL 格式未知 | 新增的代理规则可能覆盖不到 | → 先通过浏览器 DevTools Network 面板捕获 iframe 内实际的图片请求 URL，再针对性配置 |
| `resolveMediaUrl()` 修改影响现有功能 | 其他使用 URL 的地方可能受影响 | → 当前零组件导入，不存在兼容性风险 |
| CDN URL 已过期的历史数据 | 已缓存课堂的图片仍然加载失败 | → `onError` 兜底显示占位图；长期方案：提供"刷新课堂"按钮重新生成 |

## Migration Plan

### 部署步骤

1. **验证 OpenMAIC 图片路径**：进入 `openmaic-server` 容器，确认 `/app/data/` 下的图片文件结构和 Next.js 是否 serve 这些路径
2. **更新 Nginx 配置**：新增 `/data/` 代理规则
3. **更新前端组件**：接入 `resolveMediaUrl()` 和 `onError` 兜底
4. **重启 Docker 容器**：`docker-compose down && docker-compose up -d`
5. **验证**：
   - 新建课堂 → 检查图片是否加载
   - 打开已缓存课堂 → 检查是否有兜底占位图

### 回滚策略

- Nginx 配置变更可独立回滚（仅需还原 `nginx.conf` + restart nginx 容器）
- 前端组件变更可独立回滚（`resolveMediaUrl` 接入是增强，移除不影响现有行为）
- Docker 卷配置变更可独立回滚

## Open Questions

1. **OpenMAIC 容器内 `/app/data/` 的目录结构是什么？** → 需进入容器 `docker exec` 查看
2. **OpenMAIC Next.js 是否 serve `/data/` 路径的静态文件？** → 需用 `curl` 测试
3. **iframe 内图片 `<img src="...">` 的实际 URL 格式是什么？** → 需用浏览器 DevTools 捕获
4. **CDN 临时 URL 的精确过期时间？** → 需确认通义万象文档
