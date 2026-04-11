**⚠️ 本 Change 已废弃** — iframe 架构已被 OpenMAIC 原生迁移完全替代（openmaic-frontend-native-migration），图片加载问题通过原生 MediaGenerationStore 和 ImageWithFallback 组件解决。以下任务不再适用。

## 1. 诊断验证（已废弃）

- [ ] 1.1 进入 OpenMAIC 容器 (`docker exec -it openmaic-server sh`)，查看 `/app/data/` 目录结构，确认 AI 生成的图片实际存储路径和文件格式
- [ ] 1.2 在浏览器 DevTools Network 面板中捕获 iframe 内图片 `<img>` 的实际请求 URL，记录失败的 URL 格式
- [ ] 1.3 测试 OpenMAIC 是否能 serve `/data/` 路径的静态文件：`curl http://localhost:3002/data/classroom-jobs/<jobId>/xxx.png` 验证

## 2. Nginx 代理层修复

- [ ] 2.1 在 `docker/nginx/nginx.conf` 中新增 `/data/` 反向代理规则，代理到 `http://openmaic:3002/data/`，包含 CORS 头和缓存配置
- [ ] 2.2 如果 1.3 验证 OpenMAIC 不 serve `/data/` 路径，则改为共享卷方案：修改 `docker-compose.yml`，在 nginx 服务中添加 `openmaic-data:/app/data:ro` 卷挂载，并在 nginx.conf 中用 `alias` 指令 serve 静态文件
- [ ] 2.3 重启 Docker 容器 (`docker-compose down && docker-compose up -d`) 验证 Nginx 代理规则生效

## 3. 前端 URL 解析接入

- [ ] 3.1 增强 `src/utils/media-url.ts` 的 `resolveMediaUrl()` 函数，新增 `/data/*` 路径识别
- [ ] 3.2 在 `src/services/openmaic/client.ts` 的 `convertTeachingScene()` 中导入 `resolveMediaUrl`，对所有提取的 `imageUrl` 进行包裹处理
- [ ] 3.3 在 `ImageSlide.tsx` 中导入并使用 `resolveMediaUrl(slide.imageUrl)` 作为 img src
- [ ] 3.4 在 `TeachingSlide.tsx`、`QuizSlide.tsx`、`TPRSlide.tsx` 中同样接入 `resolveMediaUrl`

## 4. 图片加载失败兜底

- [ ] 4.1 创建通用的 `ImageWithFallback` 组件（或 Hook），封装 `onError` + 占位图逻辑（200×200px、`#EDF2F7` 背景、20px 圆角、🖼️ emoji）
- [ ] 4.2 在 `ImageSlide.tsx` 中替换裸 `<img>` 为 `ImageWithFallback`，图片加载失败时显示占位图
- [ ] 4.3 在 `TeachingSlide.tsx`、`QuizSlide.tsx`、`TPRSlide.tsx` 中同样接入 `ImageWithFallback`

## 5. 端到端验证

- [ ] 5.1 创建新课堂并进入教学，验证 AI 生成的图片在 iframe 中正常加载
- [ ] 5.2 打开已缓存的课堂（可能含过期 CDN URL），验证图片加载失败时显示占位图而非空白
- [ ] 5.3 更新 `.codebuddy/project-index.md`，标记 Phase 4.6 resolveMediaUrl 接入为已完成，记录本次修复
