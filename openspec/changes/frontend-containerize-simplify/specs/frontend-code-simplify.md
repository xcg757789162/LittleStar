# Spec: 前端代码精简（同源化）

## 概述

前端容器化后，LittleStar 前端和 OpenMAIC 同源（都在 Nginx :80 后面），可以大幅精简跨域相关逻辑。

## 1. ClassroomIframe.tsx — `toEmbedUrl()` 精简

### 改造前

```typescript
function toEmbedUrl(classroomUrl: string): string {
  const nginxOrigin = import.meta.env.DEV
    ? 'http://localhost:8080'
    : window.location.origin
  // ...
  return `${nginxOrigin}/openmaic${path}`
}
```

### 改造后

```typescript
function toEmbedUrl(classroomUrl: string): string {
  // 同源：始终使用当前 origin
  // 开发环境 Vite proxy 代理 /openmaic → Nginx → OpenMAIC
  // 生产环境 Nginx 直接代理 /openmaic → OpenMAIC
  let path = classroomUrl
  if (path.startsWith('http')) {
    try { path = new URL(path).pathname } catch { /* keep original */ }
  }
  // 去掉已有的 /openmaic 前缀
  if (path.startsWith('/openmaic')) {
    path = path.slice('/openmaic'.length)
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return `/openmaic${path}`  // 相对路径，同源
}
```

**变更**：移除 `import.meta.env.DEV` 判断，统一用相对路径。

## 2. useClassroomBridge.ts — origin 白名单精简

### 改造前

```typescript
const ALLOWED_ORIGINS = [
  window.location.origin,
  'http://localhost:8080',
  'http://localhost:3002',
]
```

### 改造后

```typescript
// 同源后只需要验证当前 origin
const ALLOWED_ORIGINS = [window.location.origin]
```

## 3. OpenMAIC Client (client.ts) — baseUrl 统一

### 改造前

```typescript
const isBrowser = typeof window !== 'undefined'
this.baseUrl = config?.baseUrl || (isBrowser ? '/openmaic-proxy' : 'http://localhost:3000')
```

### 改造后

```typescript
const isBrowser = typeof window !== 'undefined'
this.baseUrl = config?.baseUrl || (isBrowser ? '/openmaic' : 'http://localhost:3000')
```

**变更**：`/openmaic-proxy` → `/openmaic`，不再需要路径重写。

## 4. Pipeline Client (pipeline-client.ts) — baseUrl 统一

`getOpenMAICConfig()` 返回的 `url` 字段从条件逻辑改为固定 `/openmaic`：

### config.ts 中的变更

```typescript
// 改造前
export function getOpenMAICConfig() {
  const url = import.meta.env.DEV
    ? 'http://localhost:8080/openmaic'  // 或类似逻辑
    : `${window.location.origin}/openmaic`
  // ...
}

// 改造后
export function getOpenMAICConfig() {
  // 无论开发/生产，都走相对路径（同源）
  const url = '/openmaic'
  // ...
}
```

## 5. vite.config.ts — proxy 重构

### 改造前

```typescript
proxy: {
  '/api/auth':       { target: 'http://localhost:8080', changeOrigin: true },
  '/api/rest':       { target: 'http://localhost:8080', changeOrigin: true },
  '/openmaic-proxy': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/openmaic-proxy/, '/openmaic'),
  },
}
```

### 改造后

```typescript
proxy: {
  '/api/auth':  { target: 'http://localhost:8080', changeOrigin: true },
  '/api/rest':  { target: 'http://localhost:8080', changeOrigin: true },
  '/openmaic':  { target: 'http://localhost:8080', changeOrigin: true },
  '/_next':     { target: 'http://localhost:8080', changeOrigin: true },
  '/avatars':   { target: 'http://localhost:8080', changeOrigin: true },
  '/media':     { target: 'http://localhost:8080', changeOrigin: true },
}
```

**变更**：移除 `/openmaic-proxy` 的路径重写；新增 `/_next`、`/avatars`、`/media` 代理，让开发环境中 iframe 内的请求也能正确路由。

## 6. iframe-bridge.js — 精简

### 可移除的功能

| 功能 | 行数(约) | 移除原因 |
|------|---------|---------|
| `speechSynthesis.speak()` Monkey Patch | ~100 | 同源后无跨域限制 |
| 跨域 `fetch` 拦截 | ~80 | 同源后无需 |
| `postMessage` origin 校验放宽逻辑 | ~30 | 同源后自动通过 |

### 保留的功能

| 功能 | 理由 |
|------|------|
| 场景切换检测 + postMessage 通知宿主 | 宿主需要感知 iframe 内部状态变化 |
| `gen_img_*` 占位符 DOM 监测 | 这是 OpenMAIC 图片生成流程的设计，非跨域问题 |
| localStorage 注入（imageGenerationEnabled） | sub_filter 注入，与跨域无关 |
| TTS 事件观察（不拦截，仅上报） | 宿主统计/调试用 |

### 预期精简

约 854 行 → **约 400-500 行**，减少 40%+。

## 验证清单

- [ ] `toEmbedUrl('/classroom/abc')` → `/openmaic/classroom/abc`
- [ ] 开发环境 iframe 加载 `http://localhost:5173/openmaic/classroom/abc` → proxy → `:8080/openmaic/classroom/abc` → OpenMAIC
- [ ] 生产环境 iframe 加载 `/openmaic/classroom/abc` → Nginx → OpenMAIC
- [ ] postMessage 通信在同源下正常工作
- [ ] iframe 内 TTS 在同源下正常播放
- [ ] iframe 内图片加载正常
- [ ] Pipeline Client `/openmaic/api/generate-classroom` 正常调用
