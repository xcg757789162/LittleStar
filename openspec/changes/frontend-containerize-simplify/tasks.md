## 1. Dockerfile 新增前端构建阶段

- [x] 1.1 在 `docker/deploy/Dockerfile.app` Stage 1 和 Stage 2 之间新增 `frontend-builder` 阶段：`FROM node:22-alpine AS frontend-builder`，复制 `package.json`/`package-lock.json` → `npm ci --ignore-scripts` → 复制 `src/`、`index.html`、`vite.config.ts`、`tsconfig*.json` → `npm run build`
- [x] 1.2 在 Stage 3（最终镜像）新增 `mkdir -p /app/frontend` 和 `COPY --from=frontend-builder /build/frontend/dist /app/frontend`
- [x] 1.3 在 `docker/deploy/entrypoint.sh` 新增前端产物验证：检查 `/app/frontend/index.html` 是否存在

## 2. Nginx 路由改造（SPA fallback）

- [x] 2.1 修改 `docker/deploy/nginx-app.conf`：新增 `location /assets/` 块，`alias /app/frontend/assets/`，30 天长缓存
- [x] 2.2 修改 `location /`：从 `return 404` 改为 `root /app/frontend; try_files $uri $uri/ /index.html`，index.html 不缓存
- [x] 2.3 验证所有 API 路由（`/api/auth`、`/api/rest`、`/openmaic`、`/_next`）不被 SPA fallback 拦截

## 3. 前端代码同源化精简

- [x] 3.1 修改 `src/components/classroom/ClassroomIframe.tsx`：`toEmbedUrl()` 移除 `import.meta.env.DEV` 分支，统一返回相对路径 `/openmaic/...`
- [x] 3.2 修改 `src/hooks/useClassroomBridge.ts`：origin 白名单精简为 `[window.location.origin]`
- [x] 3.3 修改 `src/services/openmaic/client.ts`：浏览器 baseUrl 从 `/openmaic-proxy` 改为 `/openmaic`
- [x] 3.4 修改 `src/services/openmaic/pipeline-client.ts`：baseUrl 逻辑同步修改
- [x] 3.5 修改 `src/services/config.ts`：`getOpenMAICConfig()` 的 url 改为固定 `/openmaic`，移除 DEV 分支

## 4. Vite proxy 重构

- [x] 4.1 修改 `vite.config.ts`：移除 `/openmaic-proxy` 及其 `rewrite` 规则，新增 `/openmaic`、`/_next`、`/avatars`、`/media` 代理规则（全部指向 `http://localhost:8080`）

## 5. iframe-bridge.js 精简

- [x] 5.1 移除 `speechSynthesis.speak()` 跨域 Monkey Patch（同源后无需）
- [x] 5.2 移除跨域 `fetch` 拦截逻辑（同源后无需）
- [x] 5.3 移除 `postMessage` origin 校验放宽逻辑（同源后自动通过）
- [x] 5.4 保留场景切换检测、`gen_img_*` DOM 监测、TTS 事件观察、localStorage 注入

## 6. 构建验证与端到端测试

- [x] 6.1 执行 `docker-compose build` 验证镜像构建成功
- [x] 6.2 执行 `docker-compose up` 验证：`/health` 200、前端页面加载、API 路由正常
- [ ] 6.3 验证 iframe 课堂：图片显示 ✅、TTS 播放 ✅、答题交互 ✅、postMessage 通信 ✅
- [x] 6.4 验证 `npm run dev`（Vite dev server）仍可正常开发：proxy 转发、iframe 加载、API 调用
