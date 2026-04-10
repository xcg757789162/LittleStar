## Context

OpenMAIC（LittleStar/小星辰）是面向 2-8 岁幼儿的英语启蒙 App。课堂通过 iframe 嵌入 OpenMAIC 原生 Next.js 前端，由 Nginx 网关代理。当前声音架构存在以下问题：

1. **TTSService 未集成**：`src/services/voice/tts.ts` 中的 CosyVoice TTS 服务从未在任何组件/Hook 中被实例化调用
2. **iframe 音频隔离**：课堂声音完全依赖 iframe 内部 OpenMAIC 自己的 TTS，LittleStar 宿主无法控制
3. **浏览器自动播放策略**：iframe 内的 AudioContext 经常处于 `suspended` 状态，因为用户交互（点击"开始学习"）发生在宿主页面，iframe 被视为独立浏览上下文
4. **死代码**：所有 Slide 组件的 `onAudioPlay` 回调从未被连接到实际播放逻辑
5. **uiStore.voiceEnabled** 开关存在但未连接到任何播放逻辑

技术栈：React + Zustand + Vite，Docker 本地部署（PostgreSQL + PostgREST + Nginx + OpenMAIC），`AudioContext` / `SpeechSynthesisUtterance` 为浏览器原生 API。

## Goals / Non-Goals

**Goals:**
- 在 LittleStar 宿主层实现可靠的课堂语音播放，不再依赖 iframe 内部的不可控 TTS
- 支持两种 TTS 后端：CosyVoice API（高质量）→ Web Speech API（浏览器原生降级）
- 解决浏览器自动播放策略问题，确保 AudioContext 在用户交互后预激活
- 连接 uiStore.voiceEnabled 开关，让用户可以控制语音开/关
- 为课堂 slide 切换时自动朗读提供旁白能力

**Non-Goals:**
- 不修改 OpenMAIC 后端或 Docker 镜像
- 不实现 iframe 内部的 TTS 修复（治标不治本）
- 不替换现有的音效系统（SoundEffectsService 工作正常）
- 不实现语音识别（STT）相关功能

## Decisions

### D1: 宿主侧 TTS 播放架构 — 双层降级

**选择**：在 LittleStar 宿主层新建 `ClassroomAudioService`，统一管理课堂语音播放。

**播放优先级**：
1. **CosyVoice API TTS**（需配置 API Key）→ 返回 ArrayBuffer → 通过 `AudioContext.decodeAudioData()` 播放
2. **Web Speech API**（浏览器原生）→ `SpeechSynthesisUtterance` 直接播放

**理由**：
- 宿主层的 AudioContext 可以在用户点击"开始学习"时预激活，绕过 iframe 隔离问题
- 复用已有的 `TTSService` 和 `WebSpeechFallback` 代码，无需新依赖
- 双层降级确保即使无 API Key 或网络不可用，仍有浏览器原生语音兜底

**替代方案**：
- 在 iframe 内注入脚本修复 AudioContext → 侵入性强，OpenMAIC 升级后可能失效
- 使用 `<audio>` 标签预加载音频文件 → 需要后端预生成所有 slide 的 TTS 音频文件并存储，改动过大

### D2: 课堂语音触发方式 — postMessage 委托 + 宿主旁白双通道

**选择**：两个触发通道并行工作：

**通道 A: iframe TTS 委托（可选增强）**
- 扩展 `useClassroomBridge` 协议，新增 `classroom:tts-request` 消息
- iframe 内 OpenMAIC 前端（如果支持）可以将 TTS 请求委托给宿主
- 宿主收到后通过 `ClassroomAudioService` 播放，播放完成发送 `host:tts-done`

**通道 B: 宿主旁白播放器（主要方案）**
- 新建 `useClassroomNarration` Hook，监听 `classroom:scene-change` 事件
- 当 scene 切换时，从缓存的 `Classroom.scenes[].slides[].content` 提取文本
- 通过 `ClassroomAudioService` 朗读

**理由**：
- 通道 B 不依赖 iframe 侧的任何配合，可以立即工作
- 通道 A 为未来 OpenMAIC 前端适配预留接口
- 两个通道通过播放队列协调，避免同时说话

### D3: 浏览器 AudioContext 预激活策略

**选择**：在用户点击"开始学习"按钮时，同步执行 AudioContext 预激活。

**实现**：
```typescript
// useAudioActivation Hook
function activateAudio() {
  // 1. 激活 SoundEffectsService 的 AudioContext
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()

  // 2. 播放一段静音（确保浏览器标记为"已与用户交互"）
  const buffer = ctx.createBuffer(1, 1, 22050)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)

  // 3. 激活 Web Speech API（部分浏览器需要）
  const utterance = new SpeechSynthesisUtterance('')
  utterance.volume = 0
  speechSynthesis.speak(utterance)
  speechSynthesis.cancel()
}
```

**关键约束**：必须在用户点击事件处理函数的同步调用栈中执行，不能 await 后再激活。

### D4: 播放队列与冲突管理

**选择**：使用简单的串行播放队列，新的播放请求会中断当前正在播放的内容。

**理由**：
- 课堂场景切换时，旧 slide 的语音应该被新 slide 的语音替换
- 幼儿 App 不需要复杂的音频混合，简单直接更好
- `speechSynthesis.cancel()` + `AudioBufferSourceNode.stop()` 可以立即中断

### D5: 语音文本提取策略

**选择**：从 `Classroom.scenes[].slides[]` 中按优先级提取要朗读的文本：

```
1. slide.content（教学文本）→ 最主要的语音内容
2. slide.title（标题）→ content 不存在时降级使用
3. slide.onomatopoeia（拟声词）→ 音频类 slide 的特殊内容
4. slide.quiz?.question（题目文本）→ quiz 类 slide 读题
```

**语言检测**：根据 `Classroom.language` 或文本内容自动判断中文/英文，切换 Web Speech API 的 `lang` 参数。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| CosyVoice API 延迟导致语音跟不上翻页 | 用户体验卡顿 | 预加载下一页文本的 TTS；Web Speech API 几乎无延迟可作为快速降级 |
| Web Speech API 各浏览器表现不一致 | 发音质量差异 | 优先 CosyVoice；Web Speech 仅作为兜底 |
| iframe scene-change 事件可能未实现 | 宿主无法感知页面切换 | 使用定时轮询 iframe URL hash 变化作为降级检测方式 |
| 宿主旁白与 iframe 内残留 TTS 同时播放 | 声音重叠 | 通过 postMessage 发送 `host:mute-internal` 指令静默 iframe 内部音频 |
| 无 CosyVoice API Key 时降级到 Web Speech | 语音质量下降 | 家长设置页面提示配置 API Key 以获得更好的语音体验 |
