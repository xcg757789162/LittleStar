## ADDED Requirements

### Requirement: Nginx 注入 TTS 桥接脚本
系统 SHALL 通过 Nginx `sub_filter` 在 OpenMAIC iframe 页面的 `</head>` 前注入 TTS 桥接脚本（`iframe-bridge.js`），确保脚本在 OpenMAIC 自身代码执行前加载。

#### Scenario: 脚本成功注入
- **WHEN** 浏览器加载 `/openmaic/` 路径下的 HTML 页面
- **THEN** 页面 `<head>` 中 SHALL 包含 `<script src="/iframe-bridge.js"></script>` 标签，且该脚本成功加载执行

#### Scenario: 非 HTML 资源不受影响
- **WHEN** 浏览器加载 `/openmaic/` 路径下的 CSS、JS、图片等非 HTML 资源
- **THEN** 响应内容 SHALL 不被 `sub_filter` 修改

### Requirement: 拦截 iframe 内 speechSynthesis 调用
注入脚本 SHALL 通过 Monkey Patch `window.speechSynthesis.speak()` 方法，拦截 iframe 内部的所有 Web Speech TTS 调用，将文本以 `classroom:tts-request` postMessage 转发给宿主窗口。

#### Scenario: 拦截 speechSynthesis.speak 并转发
- **WHEN** iframe 内代码调用 `speechSynthesis.speak(utterance)`
- **THEN** 注入脚本 SHALL 提取 `utterance.text` 和 `utterance.lang`，通过 `window.parent.postMessage({ type: 'classroom:tts-request', payload: { text, lang } }, '*')` 发送给宿主层，且 SHALL 阻止原始 `speechSynthesis.speak()` 执行

#### Scenario: speechSynthesis 不可用时静默跳过
- **WHEN** 浏览器不支持 `speechSynthesis` API
- **THEN** 注入脚本 SHALL 不报错，不执行 Monkey Patch

### Requirement: 拦截 iframe 内 AudioContext 播放
注入脚本 SHALL 监听 iframe 内通过 `AudioContext` 播放的音频（OpenMAIC 可能使用 AudioContext 而非 speechSynthesis），拦截后将相关信息转发给宿主层。

#### Scenario: 拦截 AudioContext.decodeAudioData + AudioBufferSourceNode.start
- **WHEN** iframe 内代码通过 `AudioContext.decodeAudioData` 解码音频数据并调用 `source.start()` 播放
- **THEN** 注入脚本 SHALL 检测到此播放行为，如果音频来自 TTS API 响应（URL 包含 `/api/tts` 或 `/api/speech`），SHALL 将原始文本（如可获取）或音频 URL 通过 postMessage 通知宿主层

#### Scenario: 非 TTS 音频不拦截
- **WHEN** iframe 内播放的音频不来自 TTS API（如 UI 音效、背景音乐）
- **THEN** 注入脚本 SHALL 不拦截，允许正常播放

### Requirement: 场景切换事件桥接
注入脚本 SHALL 检测 iframe 内的课堂场景切换，并以 `classroom:scene-change` postMessage 通知宿主层。

#### Scenario: 检测到场景 DOM 变化并发送事件
- **WHEN** iframe 内课堂内容区域 DOM 发生变化（新场景渲染）
- **THEN** 注入脚本 SHALL 提取当前场景索引信息，通过 `window.parent.postMessage({ type: 'classroom:scene-change', payload: { sceneId, sceneIndex, totalScenes } }, '*')` 发送给宿主层

#### Scenario: 首次加载时发送初始场景事件
- **WHEN** iframe 课堂页面首次完成渲染
- **THEN** 注入脚本 SHALL 发送 `classroom:ready` 消息，随后发送 sceneIndex=0 的 `classroom:scene-change` 消息

### Requirement: TTS 超时 Fallback
注入脚本 SHALL 实现超时降级机制：如果宿主层未在指定时间内响应 TTS 请求，则放行原始 TTS 调用。

#### Scenario: 宿主层正常响应
- **WHEN** 注入脚本发送 `classroom:tts-request` 后，宿主层在 5 秒内回复 `host:tts-done`
- **THEN** 注入脚本 SHALL 正常等待宿主层完成播放，不执行原始 TTS

#### Scenario: 宿主层超时未响应
- **WHEN** 注入脚本发送 `classroom:tts-request` 后，5 秒内未收到 `host:tts-done`
- **THEN** 注入脚本 SHALL 放行被拦截的原始 `speechSynthesis.speak()` 调用作为降级
