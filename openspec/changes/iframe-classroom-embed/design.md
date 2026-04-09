## Context

LittleStar（小星辰）是儿童学习应用，通过 OpenMAIC 服务生成 AI 课堂。OpenMAIC 是独立部署的 Docker 服务（Next.js 全栈应用，端口 3000），包含：
- **API 层**：`/api/generate-classroom`（生成）、`/api/classroom`（获取数据）
- **原生前端**：完整的课堂播放器（画布渲染、角色系统、TTS 语音、动作编排、场景导航）

当前 LittleStar 通过 API 获取课堂 JSON 后用自研 `ClassroomView` 渲染，但数据适配层（`client.ts` 的 `convertTeachingScene`）将后端丰富结构降维为纯文本 slides，丢失了画布元素位置/样式、actions 动作序列（speech/spotlight/interact）、角色系统、TTS 语音等核心能力。

Vite 开发服务器已配置 `/openmaic-proxy` → `localhost:3000` 的代理。

## Goals / Non-Goals

**Goals:**
- 通过 iframe 嵌入 OpenMAIC 原生课堂前端，使课堂体验达到与原生前端一致的水平
- 建立 iframe ↔ 宿主双向通信桥，将答题和完成事件回写到 LittleStar 学习记录
- 保留 ClassroomView 作为降级方案（当 classroomUrl 不可用或 iframe 加载失败时）
- 确保 iframe 内资源通过 proxy 正确加载，无跨域问题

**Non-Goals:**
- 不重写 OpenMAIC 原生前端的渲染逻辑
- 不修改 OpenMAIC Docker 镜像或后端代码
- 不实现自研的画布渲染引擎、TTS 引擎或角色系统
- 不改变现有的课堂生成流程（教导处 → API → 轮询）

## Decisions

### D1: iframe 嵌入方式 — 同源 proxy 嵌入

**选择**：通过 Vite proxy 将 OpenMAIC 前端路由映射到 LittleStar 同域下，iframe `src` 使用 proxy 路径而非直接指向 `localhost:3000`。

**理由**：
- 同源策略下 iframe 和宿主可自由通信（`postMessage` + `contentWindow` 访问）
- 避免 `X-Frame-Options` / CSP 跨域限制
- 开发环境和生产环境一致（生产环境 Nginx 反代同理）

**替代方案**：
- 直接 iframe 指向 `localhost:3000` — 跨域限制，无法可靠通信
- 修改 OpenMAIC Docker 镜像去除 X-Frame-Options — 侵入性强，升级困难

**实现**：Vite proxy 新增路由规则，将 `/openmaic/*` 路径代理到 OpenMAIC 服务，iframe src = `/openmaic/classroom/{id}`。

### D2: iframe ↔ 宿主通信 — postMessage 协议

**选择**：使用 `window.postMessage` + `MessageEvent` 实现双向通信。

**协议设计**：
```typescript
// 宿主 → iframe：初始化配置
{ type: 'LITTLESTAR_INIT', payload: { childName, theme } }

// iframe → 宿主：课堂事件
{ type: 'OPENMAIC_QUIZ_ANSWER', payload: { sceneId, questionIndex, answer, correct } }
{ type: 'OPENMAIC_CLASSROOM_COMPLETE', payload: { classroomId, duration } }
{ type: 'OPENMAIC_READY', payload: {} }  // iframe 加载完成
{ type: 'OPENMAIC_ERROR', payload: { message } }  // 加载失败
```

**理由**：postMessage 是 Web 标准、无跨域限制、双向异步，且 OpenMAIC 前端即使未实现消息监听，我们也可以通过 iframe 的 load 事件和 URL hash 变化来检测状态。

**降级策略**：如果 OpenMAIC 原生前端未实现 postMessage 监听（大概率），则：
- 课堂完成：通过 iframe URL 变化检测（hashchange/popstate 监听）
- 答题数据：不回写到 LittleStar，仅记录课堂已完成（可接受的 MVP 降级）

### D3: ClassroomUrl 传递链路

**选择**：在 `Classroom` 类型中新增 `classroomUrl?: string` 字段，从 `_meta` 提升为一等字段。

**传递链路**：
1. `client.ts` — `pollUntilComplete` 完成时，从轮询响应或 `getClassroom` 结果中提取 URL
2. `useLearningFlow.ts` — 将 `classroom.classroomUrl` 传递给渲染层
3. `LearningSession.tsx` — 根据 `classroomUrl` 是否存在，选择 `ClassroomIframe` 或 `ClassroomView`

### D4: 降级策略 — 三级降级

1. **优先**：iframe 加载 `classroomUrl`（完整原生体验）
2. **降级 1**：iframe 加载失败（5s 超时或 error），切换到 `ClassroomView` 自渲染
3. **降级 2**：`classroomUrl` 不存在，直接使用 `ClassroomView`

### D5: Vite Proxy 路由设计

```typescript
// vite.config.ts proxy 新增
'/openmaic': {
  target: 'http://localhost:3000',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/openmaic/, ''),
  // 剥离可能的 X-Frame-Options header
  configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes) => {
      delete proxyRes.headers['x-frame-options']
      delete proxyRes.headers['content-security-policy']
    })
  }
}
```

生产环境需在 Nginx 配置中添加对应规则。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenMAIC 原生前端 URL 格式不确定 | iframe 无法加载 | 先通过浏览器验证 URL 格式，配置可调 |
| OpenMAIC 未实现 postMessage | 无法回写答题数据 | MVP 降级：仅记录课堂完成，答题数据后续迭代 |
| iframe 内 Next.js 路由刷新导致 404 | 课堂页面白屏 | proxy 配置 fallback 到 OpenMAIC 入口 |
| OpenMAIC Docker 镜像更新改变 URL 结构 | iframe 加载失败 | 三级降级策略 + 监控告警 |
| iframe 内存占用较高 | 低端设备卡顿 | 课堂结束后及时销毁 iframe |
