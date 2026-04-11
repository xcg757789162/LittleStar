## Context

LittleStar（宿主）通过 iframe 嵌入 OpenMAIC 原生前端来渲染课堂。当前架构存在两个关键断裂：

1. **TTS 断裂**：宿主层已建立完整的 `ClassroomAudioService`（CosyVoice → Web Speech 双层降级），`useClassroomNarration` 也已实现场景旁白自动播放——但它依赖 iframe 发送 `classroom:scene-change` postMessage，而 OpenMAIC 原生前端从未实现此协议，事件永远不会到达。同时 iframe 内部自己的 TTS 引擎受浏览器 AudioContext 自动播放策略限制，大概率处于 suspended 状态。

2. **图片断裂**：OpenMAIC 后端生成 `gen_img_XXXX` 占位符 ID，需要前端调用 qwen-image API 异步生成。虽然已通过 Nginx `sub_filter` 注入了 `imageGenerationEnabled=true` 和 `autoConfigApplied=false`，但 iframe 内部的图片生成服务调用 `/api/generate-image` 时，API Key 可能未正确传递（OpenMAIC 自身的 server-providers 配置与 LittleStar 家长模块的 API Key 配置是两套独立系统）。

**现有 Nginx 注入能力**：nginx.conf 第 108 行已有 `sub_filter` 注入 JavaScript 的先例（注入 localStorage 设置），证明此技术路线可行。

**现有 postMessage 通信基础**：`useClassroomBridge` 已定义完整的消息类型体系（`classroom:tts-request`、`classroom:scene-change` 等）和 payload 校验机制，但 iframe 端没有对应的发送实现。

## Goals / Non-Goals

**Goals:**
- 让课堂中 AI 教师的语音能正常播放（用户可听到朗读声）
- 让课堂中的教学插图能正常显示（用户可看到图片而非空白）
- 方案不依赖修改 OpenMAIC 源代码（通过 Nginx 注入解决）
- 充分利用宿主层已有的 `ClassroomAudioService` 和 API Key 配置

**Non-Goals:**
- 不改造 OpenMAIC 原生前端代码
- 不替换 OpenMAIC 的课堂渲染引擎
- 不实现 iframe 内部的独立 API Key 管理
- 不处理除 TTS 和图片之外的其他 iframe 功能问题

## Decisions

### D1: 通过 Nginx sub_filter 注入 TTS 桥接脚本（而非修改 OpenMAIC 源码）

**方案**：在 Nginx `/openmaic/` location 块中增加 `sub_filter` 规则，注入一段 JavaScript，该脚本：
1. 拦截 iframe 内部的 `speechSynthesis.speak()` 调用（Monkey Patch）
2. 拦截 iframe 内部的 `AudioContext` 播放调用
3. 将文本以 `classroom:tts-request` postMessage 转发给宿主 LittleStar
4. 宿主层 `useClassroomBridge` 已有 `onTTSRequest` 回调，`LearningSession.tsx` 中已有 `handleTTSRequest` 处理函数——无需新增代码

**替代方案（已否决）**：
- 修改 OpenMAIC 源码增加 postMessage 发送 → 需要维护 fork，升级困难
- 宿主层自驱动 TTS（从 `Classroom.scenes[]` 提取文本）→ 无法与 iframe 内的场景切换同步

**理由**：Nginx 注入是最小侵入方案，`sub_filter` 已有成功先例（第 108 行），且宿主层已有完整的 TTS 播放链路。

### D2: 注入 Scene Change 事件桥接

**方案**：注入脚本需要同时监听 iframe 内部的场景切换（OpenMAIC 使用 React Router 或内部状态管理），通过 MutationObserver 或 History API 拦截检测场景变化，发送 `classroom:scene-change` postMessage。

**具体策略**：
- 使用 `MutationObserver` 监听 DOM 中课堂内容区域的变化
- 检测页面中 scene/slide 相关元素的变化（如 `[data-scene-index]` 属性或特定 class 名）
- 同时监听 `hashchange` 和 `popstate` 事件作为补充
- 每次检测到变化时提取 sceneIndex 信息，发送 `classroom:scene-change`

### D3: 通过 Nginx 注入图片生成代理脚本

**方案**：注入脚本拦截 iframe 内部对 `/api/generate-image` 的 fetch 调用（Monkey Patch `window.fetch`），将请求以 `classroom:image-request` postMessage 转发给宿主层。宿主层使用家长模块已配置的 API Key 调用图片生成服务，完成后通过 `host:image-result` 将图片 URL/Base64 回传 iframe。

**替代方案（已否决）**：
- 在 Nginx 层透传 API Key header → API Key 暴露在网络请求中，安全风险
- 让 iframe 自己配置 API Key → 需要修改 OpenMAIC 源码或复杂的 localStorage 注入

**理由**：postMessage 委托方式复用宿主层的 API Key 管理（家长模块→高级设置），不暴露密钥，且图片生成结果可被宿主层缓存复用。

### D4: 注入脚本以外部 JS 文件方式管理（而非 inline 在 nginx.conf 中）

**方案**：创建独立的 JS 文件 `docker/nginx/iframe-bridge.js`，通过 Nginx 的 `sub_filter` 注入 `<script src="/iframe-bridge.js">` 标签。Nginx 为该文件添加一个静态文件 location。

**理由**：当前 nginx.conf 108 行的 inline 注入已经很长，再追加 TTS 和图片桥接逻辑会导致配置文件不可维护。外部文件支持注释、调试、版本管理。

### D5: 宿主层新增 `classroom:image-request` 消息处理

**方案**：在 `useClassroomBridge.ts` 中扩展消息类型，增加：
- `IframeMessageType` 新增 `'classroom:image-request'`
- `HostCommandType` 新增 `'host:image-result'`
- 新增 `ImageRequestPayload` 类型和校验函数
- `ClassroomBridgeCallbacks` 新增 `onImageRequest` 回调

在 `LearningSession.tsx` 中添加 `handleImageRequest` 回调，调用宿主层图片生成服务。

## Risks / Trade-offs

- **[风险] Monkey Patch speechSynthesis 可能与 OpenMAIC 内部逻辑冲突** → 注入脚本需在 OpenMAIC 代码执行前运行（`<head>` 尾部注入），并保留 fallback：如果宿主层 TTS 不响应（超时 5s），则放行原始调用
- **[风险] MutationObserver 检测场景切换不精确** → 降级策略：若无法精确检测 scene 变化，则在 TTS 桥接时顺带将当前场景信息一并发送
- **[风险] 图片生成 postMessage 往返延迟** → iframe 侧显示 "图片生成中..." 占位 UI（注入脚本替换 gen_img 占位符 DOM），5s 内未收到结果则显示 "图片暂不可用" 兜底
- **[风险] sub_filter 在 gzip 压缩的响应上不工作** → 已有 `proxy_set_header Accept-Encoding ""` 解决（nginx.conf 111 行）
- **[Trade-off] 外部 JS 文件需要额外的 Nginx location 配置** → 可接受，一次性配置，且便于后续维护
- **[Trade-off] Monkey Patch fetch 可能影响 iframe 内其他 API 调用** → 仅拦截 URL 包含 `/api/generate-image` 的请求，其他请求透传
