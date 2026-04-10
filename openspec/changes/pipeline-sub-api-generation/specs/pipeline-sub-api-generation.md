## ADDED Requirements

### Requirement: Pipeline Client 子 API 调用

LittleStar 需要一个 Pipeline Client，能够按顺序调用 OpenMAIC 的子 API 端点，逐步生成课堂内容。

#### Scenario: 成功生成完整课堂（核心链路）
- **WHEN** 系统调用 Pipeline Client 的 `runFullPipeline()` 方法，传入课程需求（requirement）、语言、学生信息
- **THEN** Pipeline Client 按顺序调用：scene-outlines-stream → 对每个 outline 调用 scene-content → scene-actions → 对每个 speech action 调用 tts
- **THEN** 返回完整的 Classroom 对象，包含所有 scenes、actions 和 audio 数据
- **THEN** 生成过程中通过 callbacks 回调报告每一步的进度

#### Scenario: SSE 流式大纲生成
- **WHEN** Pipeline Client 调用 `/api/generate/scene-outlines-stream`
- **THEN** 通过 SSE 流式接收 `{ type: 'outline', data, index }` 事件
- **THEN** 接收到 `{ type: 'done', outlines }` 事件后返回完整的 SceneOutline[]
- **THEN** 接收到 `{ type: 'error' }` 事件时抛出错误

#### Scenario: 单步失败重试
- **WHEN** 任一子 API 调用失败（网络错误、500 等）
- **THEN** 自动重试最多 2 次（带指数退避）
- **THEN** 重试全部失败后抛出包含失败步骤信息的错误

#### Scenario: TTS 语音生成
- **WHEN** 场景动作包含 speech 类型的 action
- **THEN** 对每个 speech action 调用 `/api/generate/tts` 生成音频
- **THEN** 将生成的 base64 音频数据附加到对应 action 上

### Requirement: Headers 配置自动读取

家长在设置面板中一次性配置 API Key、模型等参数后，Pipeline Client 自动从 settingsStore 读取，无需每次生成时手动传递。

#### Scenario: 从 settingsStore 构建 Headers
- **WHEN** Pipeline Client 初始化
- **THEN** 自动从 settingsStore 读取 LLM 模型/API Key、TTS 配置、图片/视频开关等
- **THEN** 构建完整的 HTTP Headers（x-model、x-api-key、x-base-url、x-image-generation-enabled 等）
- **THEN** 所有后续 API 调用自动携带这些 Headers

#### Scenario: 未配置 API Key 时的提示
- **WHEN** Pipeline Client 初始化时发现必要的 API Key 未配置
- **THEN** 抛出明确的错误信息，指引用户到家长设置面板配置

### Requirement: 家长设置扩展

家长设置面板需要新增高级课堂设置区域，允许一次性配置生成参数。

#### Scenario: 高级课堂设置 UI
- **WHEN** 家长进入设置面板
- **THEN** 可以看到"高级课堂设置"区域
- **THEN** 包含以下配置项：TTS 开关及语音选择、图片生成开关、视频生成开关、Agent 模式（预设/自动）、学生自我介绍文本框

#### Scenario: 设置持久化
- **WHEN** 家长修改任一高级课堂设置
- **THEN** 设置自动保存到 settingsStore（通过 PostgreSQL 持久化）
- **THEN** 下次生成课堂时自动生效

### Requirement: requirement-generator 适配

需求生成器需要输出 OpenMAIC UserRequirements 格式的需求对象。

#### Scenario: 生成 UserRequirements 对象
- **WHEN** lesson-planner 为某节课生成需求
- **THEN** requirement-generator 输出 `{ requirement, language, userNickname?, userBio? }` 格式
- **THEN** requirement 文本包含教学目标、单词/短语、难度级别等
- **THEN** userNickname 来自 child profile，userBio 来自家长设置的自我介绍

### Requirement: 进度回调与状态展示

生成过程中需要通过回调机制报告进度，前端可据此展示生成状态。

#### Scenario: 步骤级进度回调
- **WHEN** Pipeline 正在执行
- **THEN** 每完成一个主要步骤（大纲生成、第 N 个场景内容、第 N 个场景动作、第 N 个 TTS）时触发回调
- **THEN** 回调包含当前步骤名称、完成百分比、当前场景索引/总场景数

### Requirement: 降级到旧 API

当子 API 调用链路不可用时，应能降级到旧的 generate-classroom 单一 API。

#### Scenario: 自动降级
- **WHEN** Pipeline Client 的 `runFullPipeline()` 在大纲生成步骤即失败（子 API 不可用）
- **THEN** 自动降级到 `client.ts` 中的旧 `generateClassroom()` 方法
- **THEN** 降级过程对上层调用者透明
