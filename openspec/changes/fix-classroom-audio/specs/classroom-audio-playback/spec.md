## ADDED Requirements

### Requirement: ClassroomAudioService 统一课堂语音播放
系统 SHALL 提供 `ClassroomAudioService` 服务，在 LittleStar 宿主层统一管理课堂语音的合成与播放。该服务 SHALL 支持两种 TTS 后端，按优先级降级：CosyVoice API → Web Speech API。

#### Scenario: CosyVoice API 可用时使用 API TTS
- **WHEN** 系统配置了有效的 CosyVoice API Key 且网络正常
- **THEN** `ClassroomAudioService.speak(text)` SHALL 调用 CosyVoice API 获取音频 ArrayBuffer，通过 AudioContext 解码并播放

#### Scenario: CosyVoice 不可用时降级到 Web Speech API
- **WHEN** 未配置 API Key 或 CosyVoice API 调用失败
- **THEN** 系统 SHALL 自动降级到 `WebSpeechFallback.speak(text, lang)`，使用浏览器原生 TTS 播放

#### Scenario: 两种 TTS 均不可用时静默失败
- **WHEN** CosyVoice API 失败且浏览器不支持 Web Speech API
- **THEN** 系统 SHALL 静默处理（console.warn），不影响课堂正常进行

### Requirement: 浏览器 AudioContext 预激活
系统 SHALL 在用户点击"开始学习"按钮时，在点击事件的同步调用栈中预激活 AudioContext 和 Web Speech API，确保后续音频播放不被浏览器自动播放策略阻止。

#### Scenario: 点击开始学习时预激活音频
- **WHEN** 用户点击"🚀 开始学习"按钮
- **THEN** 系统 SHALL 同步执行以下操作：创建并 resume AudioContext、播放静音缓冲区、初始化 Web Speech API

#### Scenario: AudioContext 已处于活跃状态时不重复激活
- **WHEN** AudioContext 已处于 `running` 状态
- **THEN** 系统 SHALL 跳过激活步骤

### Requirement: 课堂旁白自动播放
系统 SHALL 提供 `useClassroomNarration` Hook，在课堂 slide 切换时自动朗读当前 slide 的文本内容。

#### Scenario: 场景切换时自动朗读 slide 内容
- **WHEN** iframe 发送 `classroom:scene-change` 事件，切换到新场景
- **THEN** 系统 SHALL 从当前 scene 的第一个 slide 提取文本（优先级：content > title > onomatopoeia > quiz.question），通过 `ClassroomAudioService` 朗读

#### Scenario: 快速翻页时中断旧语音播放新语音
- **WHEN** 上一条语音尚未播放完毕，用户已翻到下一页
- **THEN** 系统 SHALL 立即中断当前播放（`speechSynthesis.cancel()` / `AudioBufferSourceNode.stop()`），开始播放新页内容

#### Scenario: voiceEnabled 关闭时不播放语音
- **WHEN** `uiStore.voiceEnabled` 为 false
- **THEN** 系统 SHALL 跳过所有语音播放（旁白和 TTS 委托均不执行）

### Requirement: iframe TTS 委托协议
系统 SHALL 扩展 `useClassroomBridge` 的 postMessage 协议，支持 iframe 将 TTS 请求委托给宿主层执行。

#### Scenario: 接收 iframe 的 TTS 委托请求
- **WHEN** iframe 发送 `{ type: 'classroom:tts-request', payload: { text, lang } }` 消息
- **THEN** 宿主 SHALL 通过 `ClassroomAudioService.speak(text, lang)` 播放，播放完成后向 iframe 发送 `{ type: 'host:tts-done' }`

#### Scenario: iframe 未发送 TTS 委托请求
- **WHEN** iframe 不支持 `classroom:tts-request` 消息（大概率）
- **THEN** 系统 SHALL 通过宿主旁白播放器（通道 B）独立提供语音，不影响课堂正常运行

### Requirement: 语音与 voiceEnabled 开关联动
`uiStore.voiceEnabled` 状态 SHALL 作为所有课堂语音播放的总开关。

#### Scenario: 关闭语音开关后立即停止播放
- **WHEN** 用户将 `voiceEnabled` 从 true 切换为 false
- **THEN** 系统 SHALL 立即停止当前正在播放的语音，后续不再自动播放

#### Scenario: 重新打开语音开关后恢复自动播放
- **WHEN** 用户将 `voiceEnabled` 从 false 切换为 true
- **THEN** 系统 SHALL 从当前 slide 开始恢复自动旁白播放

### Requirement: 语音文本语言自动检测
系统 SHALL 根据文本内容自动检测语言，为 Web Speech API 设置正确的 `lang` 参数。

#### Scenario: 中文文本使用 zh-CN
- **WHEN** 文本主要为中文字符（中文字符占比 > 50%）
- **THEN** 系统 SHALL 使用 `lang='zh-CN'` 调用 Web Speech API

#### Scenario: 英文文本使用 en-US
- **WHEN** 文本主要为英文字符
- **THEN** 系统 SHALL 使用 `lang='en-US'` 调用 Web Speech API

#### Scenario: 使用 Classroom.language 字段覆盖
- **WHEN** `Classroom.language` 字段有值
- **THEN** 系统 SHALL 优先使用该字段指定的语言
