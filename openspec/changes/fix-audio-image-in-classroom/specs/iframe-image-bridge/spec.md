## ADDED Requirements

### Requirement: 拦截 iframe 内图片生成 API 调用
注入脚本 SHALL 通过 Monkey Patch `window.fetch` 拦截 iframe 内部对 `/api/generate-image` 的请求，将图片生成请求以 `classroom:image-request` postMessage 委托给宿主层处理。

#### Scenario: 拦截 generate-image 请求并委托宿主层
- **WHEN** iframe 内代码调用 `fetch('/api/generate-image', { method: 'POST', body: JSON.stringify({ prompt, ... }) })`
- **THEN** 注入脚本 SHALL 阻止原始 fetch 执行，提取 `prompt` 和相关参数，通过 `window.parent.postMessage({ type: 'classroom:image-request', payload: { requestId, prompt, width, height } }, '*')` 发送给宿主层，并返回一个 pending Promise 等待宿主层回传结果

#### Scenario: 非 generate-image 请求不拦截
- **WHEN** iframe 内代码调用 `fetch` 请求其他 API（如 `/api/classroom`、`/api/server-providers`）
- **THEN** 注入脚本 SHALL 透传原始 fetch，不做任何拦截

### Requirement: 宿主层图片生成委托处理
宿主层 SHALL 在 `useClassroomBridge` 中监听 `classroom:image-request` 消息，调用已配置的图片生成服务，完成后通过 `host:image-result` 将结果回传 iframe。

#### Scenario: 收到图片请求并成功生成
- **WHEN** 宿主层收到 `classroom:image-request` 消息，payload 包含有效的 `prompt`
- **THEN** 宿主层 SHALL 调用图片生成 API（使用家长模块配置的 API Key），成功后通过 `postMessage({ type: 'host:image-result', payload: { requestId, success: true, imageUrl } })` 回传 iframe

#### Scenario: 图片生成失败
- **WHEN** 宿主层调用图片生成 API 失败（API Key 无效、网络错误等）
- **THEN** 宿主层 SHALL 通过 `postMessage({ type: 'host:image-result', payload: { requestId, success: false, error: '...' } })` 通知 iframe 失败原因

### Requirement: iframe 侧图片结果接收与 DOM 更新
注入脚本 SHALL 监听宿主层的 `host:image-result` 消息，将生成的图片 URL 注入到 iframe 对应的 DOM 元素中。

#### Scenario: 收到图片 URL 并更新 DOM
- **WHEN** 注入脚本收到 `host:image-result` 消息，`success` 为 true
- **THEN** 注入脚本 SHALL 查找与 `requestId` 对应的占位元素，将其 `src` 属性替换为 `imageUrl`，并移除 "图片生成中..." 占位 UI

#### Scenario: 收到失败结果显示兜底 UI
- **WHEN** 注入脚本收到 `host:image-result` 消息，`success` 为 false
- **THEN** 注入脚本 SHALL 将占位元素替换为 "图片暂不可用" 的兜底显示

### Requirement: 图片生成超时处理
注入脚本 SHALL 实现图片生成的超时机制，避免用户长时间看到 "生成中..." 状态。

#### Scenario: 图片生成超时
- **WHEN** 注入脚本发送 `classroom:image-request` 后，30 秒内未收到 `host:image-result`
- **THEN** 注入脚本 SHALL 将对应占位元素替换为 "图片生成超时" 的兜底显示，并 resolve 之前返回的 pending Promise（返回空响应）

#### Scenario: 正常超时内完成
- **WHEN** 注入脚本发送 `classroom:image-request` 后，30 秒内收到成功结果
- **THEN** 注入脚本 SHALL 正常处理结果，resolve Promise（返回包含 imageUrl 的模拟 Response）

### Requirement: gen_img 占位符 DOM 监测与替换
注入脚本 SHALL 通过 MutationObserver 监测 iframe DOM 中出现的 `gen_img_*` 占位符引用（img 标签的 src 或 CSS background-image），自动触发图片生成请求。

#### Scenario: 检测到 gen_img 占位符图片
- **WHEN** iframe DOM 中出现 `<img src="gen_img_XXXX">` 或类似引用 gen_img 占位符的元素
- **THEN** 注入脚本 SHALL 将该元素替换为 "AI 图片生成中..." 占位 UI，并发送 `classroom:image-request` 请求宿主层生成图片

#### Scenario: 同一占位符不重复请求
- **WHEN** 同一个 `gen_img_XXXX` 占位符在 DOM 中多次出现（如重新渲染）
- **THEN** 注入脚本 SHALL 缓存已发送的请求 ID，不重复发送，但 SHALL 为新 DOM 元素关联已有的请求结果

### Requirement: useClassroomBridge 扩展图片消息类型
宿主层 `useClassroomBridge` Hook SHALL 扩展以下消息类型和处理逻辑：

#### Scenario: 新增 ImageRequestPayload 类型和校验
- **WHEN** 定义 `classroom:image-request` 消息的 payload 类型
- **THEN** SHALL 包含 `requestId: string`、`prompt: string`、`width?: number`、`height?: number` 字段，并实现运行时校验函数

#### Scenario: 新增 host:image-result 指令类型
- **WHEN** 宿主层需要向 iframe 回传图片生成结果
- **THEN** `HostCommandType` SHALL 包含 `'host:image-result'`，payload 包含 `requestId: string`、`success: boolean`、`imageUrl?: string`、`error?: string`
