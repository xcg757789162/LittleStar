## Why

课堂教学页面图片加载反复失败，已修复多次但从未真正解决。根因是**图片 URL 的生成、存储、代理、渲染四个环节存在系统性断裂**：

1. **CDN 临时 URL 过期**：AI 生成的图片使用 DashScope 临时 CDN URL（`dashscope-result.oss-cn-beijing.aliyuncs.com`），约 24 小时后过期，但缓存的 classroom JSON 中仍保留这些过期 URL。
2. **Docker 卷隔离**：OpenMAIC 容器将生成的图片存于 `openmaic-data:/app/data` 卷，而 Nginx 容器只挂载 `media-data:/data/media` 卷——Nginx 根本无法读取 OpenMAIC 的图片文件。
3. **Nginx 代理缺失**：Nginx 代理了 `/images/`、`/uploads/`、`/public/`、`/_next/` 等路径，但**未代理 `/data/` 路径**——即使 URL 指向 OpenMAIC 内部路径，浏览器也无法通过 Nginx 访问。
4. **URL 解析从未接入**：`resolveMediaUrl()` 工具函数已创建（`src/utils/media-url.ts`）但**零组件导入**，所有渲染组件直接使用原始 `imageUrl`，无任何 URL 转换或加载失败兜底。

此次必须从架构层面彻底解决，而非再打补丁。

## What Changes

- **新增图片持久化下载机制**：OpenMAIC 后端在生成课堂时，将 AI 生成的临时 CDN 图片下载到本地持久化存储，替换 JSON 中的临时 URL 为本地稳定路径
- **修复 Docker 卷共享**：让 Nginx 容器能访问 OpenMAIC 的图片存储卷（`openmaic-data`），或通过反向代理转发到 OpenMAIC 容器
- **补全 Nginx 代理规则**：新增 `/data/` 路径的代理规则，确保 iframe 内的图片请求可达 OpenMAIC 后端
- **全面接入 `resolveMediaUrl()`**：所有课堂渲染组件（`ImageSlide`、`TeachingSlide`、`QuizSlide`、`TPRSlide`）和数据转换层（`client.ts`）统一使用 URL 解析函数
- **增加图片加载错误兜底**：渲染组件增加 `onError` 回调，加载失败时显示占位图而非空白

## Capabilities

### New Capabilities
- `image-persistence`: AI 生成的临时 CDN 图片在课堂创建时下载到本地持久化存储，确保 URL 永不过期
- `image-error-fallback`: 课堂渲染组件的图片加载失败兜底机制，包含占位图和重试逻辑

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **Docker 基础设施**：`docker-compose.yml` 需修改 Nginx 容器的卷挂载配置
- **Nginx 配置**：`nginx.conf` 需新增 `/data/` 代理规则
- **OpenMAIC 后端**：需确认/修改图片存储策略（临时 CDN → 本地持久化）
- **前端渲染组件**：`ImageSlide.tsx`、`TeachingSlide.tsx`、`QuizSlide.tsx`、`TPRSlide.tsx` 需接入 `resolveMediaUrl()` 和错误兜底
- **数据转换层**：`src/services/openmaic/client.ts` 的 `convertTeachingScene()` 需在提取 URL 时做转换
- **工具函数**：`src/utils/media-url.ts` 的 `resolveMediaUrl()` 需增强为真正可用的 URL 转换逻辑
- **已缓存数据**：PostgreSQL 中已缓存的课堂数据可能包含过期 CDN URL，需提供迁移/刷新策略
