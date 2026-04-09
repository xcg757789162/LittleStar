## Why

LittleStar 当前通过 API 获取 OpenMAIC 课堂 JSON 数据后使用自研的 `ClassroomView` 组件渲染，但 `convertTeachingScene()` 数据适配层将后端丰富的画布元素、动作序列、角色系统、TTS 语音全部降维为纯文本 slides，导致课堂体验远不如 OpenMAIC 原生前端（无角色、无语音、无画布排版、无互动编排）。OpenMAIC 后端已返回原生前端的课堂 URL（`backendResult.url`），存储在 `_meta.classroomUrl` 但从未使用。**通过 iframe 嵌入 OpenMAIC 原生前端可以零成本获得完整课堂体验。**

## What Changes

- **新增 iframe 课堂嵌入组件**：创建 `ClassroomIframe` 组件，通过 iframe 加载 OpenMAIC 原生前端课堂页面，替代当前的自渲染 `ClassroomView`
- **iframe ↔ 宿主通信桥**：通过 `postMessage` 实现双向通信，监听课堂完成、答题等事件，将数据回写到 LittleStar 学习记录
- **Vite proxy 扩展**：确保 iframe 内 OpenMAIC 前端资源（JS/CSS/图片/字体/API）能通过 proxy 正确加载
- **保留 ClassroomView 作为降级方案**：当 `classroomUrl` 不可用时自动降级到自渲染模式
- **移除数据适配层的信息截断**：`convertTeachingScene` 中 speech 文本 500 字符截断不再影响主流程

## Capabilities

### New Capabilities
- `classroom-iframe-embed`: iframe 嵌入 OpenMAIC 原生课堂前端，包括组件、通信桥、资源代理、降级策略

### Modified Capabilities
<!-- 无需修改现有 spec 的需求级行为 -->

## Impact

- **受影响文件**：
  - `src/pages/LearningSession.tsx` — 课堂渲染入口，需切换到 iframe 组件
  - `src/hooks/useLearningFlow.ts` — 需对接 iframe 通信事件（答题、完成）
  - `src/services/openmaic/client.ts` — 确保 `classroomUrl` 正确传递到前端
  - `src/services/openmaic/types.ts` — Classroom 类型需添加 `classroomUrl` 字段
  - `vite.config.ts` — 扩展 proxy 规则支持 iframe 内资源加载
- **新增文件**：
  - `src/components/classroom/ClassroomIframe.tsx` — iframe 嵌入组件
  - `src/components/classroom/useClassroomBridge.ts` — postMessage 通信 Hook
- **依赖**：无新外部依赖
- **风险**：iframe 跨域策略需要 OpenMAIC 服务端不设置 `X-Frame-Options: DENY`；如果设置了需要调整 proxy 剥离该 header
