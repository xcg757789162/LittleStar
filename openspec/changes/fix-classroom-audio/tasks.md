## 1. ClassroomAudioService 核心播放服务
- [x] 1.1 创建 `src/services/audio/classroom-audio.ts`，实现 `ClassroomAudioService` 类：管理共享 AudioContext 实例，提供 `speak(text, lang?)` 方法，按优先级调用 CosyVoice API → Web Speech API 降级
- [x] 1.2 实现 CosyVoice TTS 通道：复用现有 `TTSService`（`src/services/voice/tts.ts`），调用 CosyVoice API 获取音频 ArrayBuffer，通过 `AudioContext.decodeAudioData()` 解码并播放
- [x] 1.3 实现 Web Speech API 降级通道：复用现有 `WebSpeechFallback`（`src/services/voice/web-speech-fallback.ts`），当 CosyVoice 不可用时自动降级到 `SpeechSynthesisUtterance` 播放
- [x] 1.4 实现播放队列与冲突管理：`stop()` 方法立即中断当前播放（`speechSynthesis.cancel()` + `AudioBufferSourceNode.stop()`），新的 `speak()` 调用自动中断旧播放
- [x] 1.5 实现语言自动检测：根据文本中文字符占比（>50% 为 zh-CN，否则 en-US）或 `Classroom.language` 字段覆盖，为 Web Speech API 设置正确的 `lang` 参数

## 2. AudioContext 预激活机制
- [x] 2.1 创建 `src/hooks/useAudioActivation.ts` Hook：提供 `activateAudio()` 函数，在用户点击事件的同步调用栈中创建并 resume AudioContext、播放静音缓冲区、初始化 Web Speech API
- [x] 2.2 在 `src/pages/LearningSession.tsx` 的"开始学习"按钮点击处理函数中，同步调用 `activateAudio()`（必须在 await 之前），确保浏览器标记为"已与用户交互"
- [x] 2.3 将预激活的 AudioContext 实例传递给 `ClassroomAudioService`，确保整个课堂生命周期内复用同一个已激活的 AudioContext

## 3. 课堂旁白自动播放
- [ ] 3.1 创建 `src/hooks/useClassroomNarration.ts` Hook：监听 `classroom:scene-change` 事件（通过 `useClassroomBridge`），当场景切换时从缓存的 `Classroom.scenes[].slides[]` 提取文本
- [ ] 3.2 实现语音文本提取优先级逻辑：按 `slide.content` > `slide.title` > `slide.onomatopoeia` > `slide.quiz?.question` 顺序提取要朗读的文本
- [ ] 3.3 与 `uiStore.voiceEnabled` 联动：voiceEnabled 为 false 时跳过所有旁白播放；从 false 切换为 true 时从当前 slide 恢复播放；从 true 切换为 false 时立即停止当前播放

## 4. iframe TTS 委托协议
- [ ] 4.1 扩展 `src/hooks/useClassroomBridge.ts`：新增 `classroom:tts-request` 消息监听，接收 `{ type: 'classroom:tts-request', payload: { text, lang } }` 并通过 `ClassroomAudioService.speak()` 播放
- [ ] 4.2 播放完成后向 iframe 发送 `{ type: 'host:tts-done' }` 响应消息
- [ ] 4.3 新增 `host:mute-internal` 指令：在宿主旁白播放器启动时向 iframe 发送静默请求，避免宿主旁白与 iframe 残留 TTS 声音重叠

## 5. 集成与连接
- [ ] 5.1 在 `src/pages/LearningSession.tsx` 中集成 `useClassroomNarration` 和 `useAudioActivation`，将 `ClassroomAudioService` 实例注入到需要的 Hook 中
- [ ] 5.2 在 `src/components/classroom/ClassroomIframe.tsx` 中集成 TTS 委托协议，确保 iframe 通信桥支持音频相关消息
- [ ] 5.3 清理死代码：移除或标注 Slide 组件中未使用的 `onAudioPlay` 回调（保留接口定义以备自渲染模式使用，添加 TODO 注释）
- [ ] 5.4 验证 `uiStore.voiceEnabled` 开关端到端联动：家长设置页面 → uiStore → ClassroomAudioService → 语音播放/静音
