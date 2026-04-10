# 技术设计 — 前端容器化 & 架构精简

## 架构总览

### 改造前

```
[用户浏览器]
  ├── :5173 Vite Dev Server (前端 React SPA)
  │     ├── /api/auth → proxy → :8080/api/auth
  │     ├── /api/rest → proxy → :8080/api/rest
  │     └── /openmaic-proxy → proxy → :8080/openmaic
  │
  └── :8080 Nginx (容器)
        ├── /api/auth/* → localhost:3001 (Auth Service)
        ├── /api/rest/* → localhost:3000 (PostgREST)
        ├── /openmaic/* → localhost:3002 (OpenMAIC)
        └── / → 404 (无前端静态文件)
```

**问题**：前端 `:5173` 嵌入的 iframe 指向 `:8080`，跨域。

### 改造后

```
[用户浏览器]
  └── :80 Nginx (容器)
        ├── /api/auth/* → localhost:3001 (Auth Service)
        ├── /api/rest/* → localhost:3000 (PostgREST)
        ├── /openmaic/* → localhost:3002 (OpenMAIC)
        ├── /_next/*    → localhost:3002 (OpenMAIC 静态资源)
        ├── /assets/*   → /app/frontend/assets/* (Vite 构建产物)
        └── /           → /app/frontend/index.html (SPA fallback)
```

**收益**：所有请求同源（端口 80），iframe 无跨域问题。

## 设计决策

### D1: Dockerfile 新增 Vite 构建阶段

**决策**：在 `Dockerfile.app` 中新增一个构建阶段（Stage 1.5），使用 Node.js 执行 `npm ci && npm run build`，将产物复制到最终镜像的 `/app/frontend/` 目录。

**理由**：
- 与现有的 Auth Service 和 OpenMAIC 构建阶段保持一致的多阶段模式
- 不增加最终镜像大小（构建工具不会带入最终阶段）
- 复用已有的 Node.js Alpine 基础镜像

**实现**：

```dockerfile
# Stage 1.5: 构建 LittleStar 前端 (Vite)
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY src/ ./src/
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
# 生产环境构建，输出到 dist/
RUN npm run build

# Stage 3（最终镜像）中增加：
COPY --from=frontend-builder /build/frontend/dist /app/frontend
```

### D2: Nginx 路由优先级设计

**决策**：精确匹配的 API 路由优先，前端 SPA fallback 放最后。

**关键规则**：

```
优先级从高到低：
1. = /health                    → 健康检查（精确匹配）
2. /api/auth/                   → Auth Service
3. /api/rest/                   → PostgREST
4. /openmaic/                   → OpenMAIC（含 sub_filter 桥接注入）
5. /_next/                      → OpenMAIC 静态资源（带长缓存）
6. /api/                        → OpenMAIC 内部 API（兜底）
7. /avatars/ /images/ /uploads/ → OpenMAIC 公共资源
8. /media/                      → 媒体文件（volume 挂载）
9. /assets/                     → 前端静态资源（Vite 构建产物，带 hash，长缓存）
10. /                           → SPA fallback: try_files $uri $uri/ /index.html
```

**关键变更**：原来 `location /` 返回 404，改造后改为：

```nginx
location / {
    root /app/frontend;
    try_files $uri $uri/ /index.html;
    
    # index.html 不缓存（确保每次获取最新版本）
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# Vite 构建产物带 content hash，可长期缓存
location /assets/ {
    root /app/frontend;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### D3: ClassroomIframe 同源简化

**现状**：`toEmbedUrl()` 根据 `import.meta.env.DEV` 区分开发/生产环境：

```typescript
// 改造前
const nginxOrigin = import.meta.env.DEV
  ? 'http://localhost:8080'
  : window.location.origin
```

**改造后**：始终使用当前 origin（同源）：

```typescript
// 改造后
function toEmbedUrl(classroomUrl: string): string {
  // 同源：前端和 OpenMAIC 都在 Nginx 后面
  let path = classroomUrl
  if (path.startsWith('http')) {
    try { path = new URL(path).pathname } catch { /* keep as-is */ }
  }
  if (!path.startsWith('/openmaic')) {
    path = `/openmaic${path.startsWith('/') ? '' : '/'}${path}`
  }
  return `${window.location.origin}${path}`
}
```

**保留开发环境兼容**：Vite dev server 仍然可通过 proxy 转发 `/openmaic` 路由（新增一条 proxy 规则），让开发环境也能同源访问 OpenMAIC iframe。

### D4: OpenMAIC Client baseUrl 统一

**现状**（`client.ts`）：

```typescript
const isBrowser = typeof window !== 'undefined'
this.baseUrl = config?.baseUrl || (isBrowser ? '/openmaic-proxy' : 'http://localhost:3000')
```

**改造后**：

```typescript
// 浏览器环境统一走 /openmaic（Nginx 反向代理）
// 开发环境 Vite proxy 也代理 /openmaic → Nginx → OpenMAIC
const isBrowser = typeof window !== 'undefined'
this.baseUrl = config?.baseUrl || (isBrowser ? '/openmaic' : 'http://localhost:3000')
```

同样适用于 `pipeline-client.ts` 中的 `getOpenMAICConfig().url` 返回值。

### D5: Vite proxy 简化

**现状**：3 条 proxy 规则，其中 `/openmaic-proxy` 有路径重写。

**改造后**：4 条规则但更简洁，移除路径重写：

```typescript
proxy: {
  '/api/auth': { target: 'http://localhost:8080', changeOrigin: true },
  '/api/rest': { target: 'http://localhost:8080', changeOrigin: true },
  '/openmaic': { target: 'http://localhost:8080', changeOrigin: true },
  // iframe 内部请求（/_next, /avatars 等）也需要代理
  '/_next':    { target: 'http://localhost:8080', changeOrigin: true },
}
```

**好处**：开发环境和生产环境使用完全相同的路径（`/openmaic/api/...`），不再需要 `/openmaic-proxy` 中间层。

### D6: iframe-bridge.js 精简

**现状**（854 行）：大量跨域 Monkey Patch：
- `speechSynthesis.speak()` 拦截（跨域限制）
- `window.fetch` 拦截（跨域 fetch）
- DOM Mutation Observer 监测 `gen_img_*` 占位符

**改造后**：同源后可大幅精简：
- ❌ 移除 `speechSynthesis` Monkey Patch — 同源后无跨域限制
- ❌ 移除跨域 `fetch` 拦截 — 同源后无需
- ✅ 保留场景切换检测（postMessage 桥接）— 宿主仍需感知 iframe 内部状态
- ✅ 保留图片生成自动启用注入（sub_filter 注入的 localStorage 设置）
- ✅ 保留 `gen_img_*` DOM 监测 — 这不是跨域问题，而是 OpenMAIC 图片生成流程本身的占位符机制

### D7: config.ts 架构精简

**核心原则**：前端 = 教导处，不直接调用 AI 服务；AI 能力全部委托给 OpenMAIC 后端。

**保留的前端服务**：
| 服务 | Provider | 理由 |
|------|---------|------|
| TTS（语音合成）| MiniMax / 阿里云 / Web Speech | 前端旁白播放需要，OpenMAIC 有自己的 TTS |
| STT（语音识别）| 阿里云 / Web Speech | 前端语音输入需要 |
| ISE（口语评测）| 阿里云 | 前端互动练习需要 |

**可精简的**：
| 服务 | 现状 | 改造 |
|------|------|------|
| LLM（前端直调）| config.ts 管理 3 个 LLM Provider | 分析使用场景：如果仅用于"AI 老师对话"，可移至后端 |
| 后端 LLM/TTS/图片配置 | config.ts `BACKEND_*_PROVIDERS` | 仅做"配置透传"，不做前端调用 |
| `getOpenMAICConfig()` | 返回 URL + API Key | URL 改为固定相对路径 `/openmaic` |

**决策**：本次变更**不删除**前端 Provider，仅：
1. `getOpenMAICConfig()` 的 `url` 字段改为固定 `/openmaic`
2. 移除 `import.meta.env.DEV` 分支判断
3. 后续版本再考虑前端 LLM Provider 的移除

### D8: useClassroomBridge origin 简化

**现状**：

```typescript
const ALLOWED_ORIGINS = [
  window.location.origin,
  'http://localhost:8080',
  'http://localhost:3002',
]
```

**改造后**：

```typescript
// 同源：只需要检查 window.location.origin
const ALLOWED_ORIGINS = [window.location.origin]
```

开发环境下，由于 Vite proxy 代理了 `/openmaic`，iframe src 也是同源的，无需额外 origin。

### D9: 实施阶段决策记录

> 以下决策在 Phase 3 实施过程中产生，补充原设计文档。

#### D9.1: Vite proxy 扩展（D5 补充）

实际实现比设计文档新增了更多代理路径，确保开发环境 iframe 内所有资源请求均能正确到达 Nginx：

```typescript
proxy: {
  '/openmaic': { target, changeOrigin: true },
  '/_next':    { target, changeOrigin: true },
  '/avatars':  { target, changeOrigin: true },
  '/media':    { target, changeOrigin: true },
  '/iframe-bridge.js': { target, changeOrigin: true },
  '/health':   { target, changeOrigin: true },
}
```

设计文档 D5 仅列出 4 条规则，实际需要 6 条。新增 `/iframe-bridge.js`（Nginx sub_filter 注入的桥接脚本）和 `/health`（健康检查端点）的代理。

#### D9.2: iframe-bridge.js 精简范围（D6 补充）

设计文档 D6 提到移除 `speechSynthesis` Monkey Patch，但实际实现中 **保留了** `observeSpeechSynthesis()` 观察器。原因：

- `observeSpeechSynthesis()` 不是跨域 Monkey Patch，而是用于监听 TTS 播放状态并通过 `postMessage` 通知宿主
- 移除的是 `patchFetch()`（跨域 fetch 拦截）和 `extractRequestBody()`（请求体提取）
- 精简结果：853 行 → 726 行（减少 ~15%）

#### D9.3: entrypoint.sh 前端验证策略

设计决策：使用**警告**（`⚠️`）而非**错误**（❌）来报告前端产物缺失。

**理由**：前端不可用不应阻止容器启动。可能的合法场景：
- 仅部署后端 API 服务（不需要前端 UI）
- 调试模式下前端通过 Vite dev server 独立运行

#### D9.4: ClassroomIframe toEmbedUrl 简化（D3 补充）

实际实现比设计文档更彻底——移除了 `window.location.origin` 前缀拼接，直接返回相对路径：

```typescript
// 设计文档方案
return `${window.location.origin}${path}`

// 实际实现（更简洁）
return `/openmaic${path}`
```

相对路径在浏览器中自动基于当前 origin 解析，无需显式拼接。

#### D9.5: Nginx /assets/ 块使用 root 而非 alias

设计文档 D2 示例使用 `root /app/frontend`，实际实现保持一致。注意 `/assets/` 块的 `root` 指令会将请求路径追加到 root 后面（即 `/app/frontend/assets/...`），这与 Vite 构建产物的 `dist/assets/` 目录结构一致。

## 不变更的部分

| 模块 | 说明 |
|------|------|
| 两容器架构 | db + app 不变 |
| supervisord 4 进程 | PostgREST + Auth + OpenMAIC + Nginx 不变 |
| Auth 认证流程 | JWT 签发/刷新/校验逻辑不变 |
| 数据库 Schema | 7 个 SQL 初始化脚本不变 |
| Pipeline Client 调用逻辑 | 仅 baseUrl 变更，API 调用流程不变 |
| OpenMAIC 源码构建 | Git clone → pnpm build 流程不变 |

## 验证策略

1. **Docker 构建验证**：`docker-compose build` 成功，镜像大小增量 < 10MB
2. **容器启动验证**：`docker-compose up` → 5 个进程 RUNNING，`/health` 200
3. **前端访问验证**：`http://localhost/` → 看到 LittleStar 登录页
4. **API 路由验证**：`/api/auth/health`、`/api/rest/` 正常响应
5. **iframe 验证**：课堂页面加载 → 图片、TTS、答题全部正常
6. **开发环境验证**：`npm run dev` → Vite `:5173` 正常开发，proxy 正常
