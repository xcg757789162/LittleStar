## Why

课堂中 AI 老师的语音一直无法播放，反复修复仍未解决。根本原因是**架构层面的断裂**：LittleStar 定义了 `TTSService`（CosyVoice）和 `WebSpeechFallback` 两个 TTS 服务，但从未在课堂播放流程中实际调用它们。当前课堂通过 iframe 嵌入 OpenMAIC 原生前端，声音完全依赖 iframe 内部的 TTS 引擎，而 iframe 内的声音因浏览器自动播放策略（iframe sandbox 限制、AudioContext suspended）和 iframe 跨域上下文隔离等原因频繁失败。同时，所有 Slide 组件（TeachingSlide、AudioSlide 等）的 `onAudioPlay` 回调没有任何消费者连接，是死代码。需要从架构层面彻底修复声音问题，而非继续在 iframe 内部修修补补。

## What Changes

- **新增宿主侧 TTS 播放服务**：创建 `ClassroomAudioService`，在 LittleStar 宿主层直接播放课堂语音（绕过 iframe 限制），支持 CosyVoice API TTS 和 Web Speech API 降级
- **新增 iframe ↔ 宿主音频通信协议**：扩展 `useClassroomBridge` 的 postMessage 协议，增加 `classroom:tts-request` 消息类型，让 iframe 内的 TTS 请求委托给宿主层执行
- **新增宿主侧旁白播放器**：创建 `useClassroomNarration` Hook，监听课堂 slide 切换事件，自动朗读 slide 的 content/title 文本
- **修复浏览器自动播放策略兼容**：在用户点击"开始学习"时预激活 AudioContext（用户交互触发），确保后续音频播放不被浏览器阻止
- **连接 Slide 组件的 onAudioPlay 回调**：为备用自渲染模式连接音频播放实现，确保降级场景也有声音

## Capabilities

### New Capabilities
- `classroom-audio-playback`: 宿主侧课堂 TTS 语音播放能力，包括 CosyVoice API 集成、Web Speech API 降级、AudioContext 预激活、iframe TTS 委托协议、slide 旁白自动播放

### Modified Capabilities

## Impact

- **受影响文件**：
  - `src/hooks/useClassroomBridge.ts` — 扩展通信协议，增加 TTS 请求/响应消息类型
  - `src/components/classroom/ClassroomIframe.tsx` — 集成音频预激活和 TTS 播放逻辑
  - `src/pages/LearningSession.tsx` — 在"开始学习"点击时预激活 AudioContext
  - `src/stores/uiStore.ts` — voiceEnabled 开关需连接到新的播放服务
- **新增文件**：
  - `src/services/audio/classroom-audio.ts` — 课堂音频播放服务（核心）
  - `src/hooks/useClassroomNarration.ts` — 课堂旁白自动播放 Hook
  - `src/hooks/useAudioActivation.ts` — 浏览器 AudioContext 预激活 Hook
- **依赖**：无新外部依赖，复用现有 `TTSService`、`WebSpeechFallback`、`SoundEffectsService`
