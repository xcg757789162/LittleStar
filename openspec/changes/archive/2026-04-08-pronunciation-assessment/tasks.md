# Tasks: 发音评分与纠音反馈

## 1. 类型定义与抽象接口层

- [x] 1.1 发音评估类型定义与 Provider 接口  <!-- TDD 任务 -->
  - [x] 1.1.1 写失败测试：`src/services/voice/pronunciation/__tests__/types-and-provider.test.ts` — 测试 `PronunciationScore`/`PhonemeScore`/`TeacherFeedback`/`SyllableBreakdown`/`PronunciationSession` 类型完整性，测试 `createAssessmentProvider()` 工厂函数创建实例、主方案不可用时自动降级到文本匹配
  - [x] 1.1.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/types-and-provider.test.ts`，确认失败原因是缺少类型和接口模块）
  - [x] 1.1.3 写最小实现：`src/services/voice/pronunciation/types.ts`（所有类型定义）、`src/services/voice/pronunciation/assessment-provider.ts`（`PronunciationAssessmentProvider` 接口 + `createAssessmentProvider` 工厂函数）、`src/services/voice/pronunciation/index.ts`（统一导出）
  - [x] 1.1.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/types-and-provider.test.ts`，确认所有测试通过）
  - [x] 1.1.5 重构：确保类型无 `any`、接口文档完整

- [x] 1.2 扩展现有数据模型  <!-- TDD 任务 -->
  - [x] 1.2.1 写失败测试：`src/services/voice/pronunciation/__tests__/model-extension.test.ts` — 测试 `LearningRecord` 新增 `pronunciationScore`/`pronunciationStars` 字段可正确存取，测试 `uiStore` 新增发音练习状态
  - [x] 1.2.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/model-extension.test.ts`，确认失败原因是缺少新字段）
  - [x] 1.2.3 写最小实现：修改 `src/types/models.ts`（扩展 `LearningRecord` 类型）、修改 `src/stores/uiStore.ts`（添加 `pronunciationPhase`/`isRecordingPronunciation` 等状态）
  - [x] 1.2.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/model-extension.test.ts`，确认所有测试通过）
  - [x] 1.2.5 重构：确保向后兼容，已有测试无回归

- [x] 1.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 1 所有变更
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/pronunciation-assessment/specs/*.md` 和 `openspec/changes/pronunciation-assessment/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 1 所有新增和修改文件
    - `{BASE_SHA}` → 任务组 1 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 2. 发音评测后端实现

- [x] 2.1 讯飞口语评测（ISE）Provider 实现  <!-- TDD 任务 -->
  - [x] 2.1.1 写失败测试：`src/services/voice/pronunciation/__tests__/iflytek-ise-provider.test.ts` — 测试 API 调用（mock HTTP）、音素级评分解析、幼儿模式参数、超时处理（3s）、错误重试（1次）、API Key 从环境变量读取
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/iflytek-ise-provider.test.ts`，确认失败原因是缺少 Provider 实现）
  - [x] 2.1.3 写最小实现：`src/services/voice/pronunciation/iflytek-ise-provider.ts` — 实现 `IflytekISEProvider`，包含 API 调用、响应解析（总分/音素/流利度/完整度）、超时降级、错误重试
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/iflytek-ise-provider.test.ts`，确认所有测试通过）
  - [x] 2.1.5 重构：优化 API 响应映射、提取配置常量

- [x] 2.2 文本匹配降级 Provider 实现  <!-- TDD 任务 -->
  - [x] 2.2.1 写失败测试：`src/services/voice/pronunciation/__tests__/text-match-fallback.test.ts` — 测试完全匹配（≥90分）、部分匹配（按比例）、完全不匹配但有内容（≥40分宽容）、无语音输入（0分+特殊提示）、Levenshtein 距离计算、STT 置信度加权
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/text-match-fallback.test.ts`，确认失败原因是缺少降级 Provider）
  - [x] 2.2.3 写最小实现：`src/services/voice/pronunciation/text-match-fallback.ts` — 实现 `TextMatchFallbackProvider`，调用现有 STT 识别后计算匹配度
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/text-match-fallback.test.ts`，确认所有测试通过）
  - [x] 2.2.5 重构：优化匹配算法、处理大小写/空格/标点归一化

- [x] 2.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 2 所有变更
    - `{BASE_SHA}` → 任务组 2 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 3. 幼儿评分策略与音节拆分

- [x] 3.1 幼儿宽容评分策略  <!-- TDD 任务 -->
  - [x] 3.1.1 写失败测试：`src/services/voice/pronunciation/__tests__/child-scoring.test.ts` — 测试 `applyChildAdjustments()` 函数：原始 30→调整≥40（保底）、原始 60→调整≥70（3星通过）、有效语音永不0星、无语音返回特殊状态、星级阈值 [40,55,70,85,95] 正确映射
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/child-scoring.test.ts`，确认失败原因是缺少评分策略模块）
  - [x] 3.1.3 写最小实现：`src/services/voice/pronunciation/child-scoring.ts` — `CHILD_SCORING_ADJUSTMENTS` 常量 + `applyChildAdjustments()` 函数 + `scoreToStars()` 转换函数
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/child-scoring.test.ts`，确认所有测试通过）
  - [x] 3.1.5 重构：优化调整曲线平滑度、提取可配置参数

- [x] 3.2 英文音节拆分引擎  <!-- TDD 任务 -->
  - [x] 3.2.1 写失败测试：`src/services/voice/pronunciation/__tests__/syllable-splitter.test.ts` — 测试词典命中（apple→["ap","ple"]、elephant→["el","e","phant"]）、单音节不拆分（cat→["cat"]）、规则引擎拆分、重音索引返回、未知词兜底
  - [x] 3.2.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/syllable-splitter.test.ts`，确认失败原因是缺少音节拆分模块）
  - [x] 3.2.3 写最小实现：`src/services/voice/pronunciation/syllable-splitter.ts` — 内置 200+ 常用幼儿英语单词音节词典 + 基于辅音-元音模式的规则引擎 + `splitSyllables()` 函数
  - [x] 3.2.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/syllable-splitter.test.ts`，确认所有测试通过）
  - [x] 3.2.5 重构：优化规则引擎准确率、扩充词典覆盖范围

- [x] 3.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 3 所有变更
    - `{BASE_SHA}` → 任务组 3 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 4. 反馈模板与纠音编排器

- [x] 4.1 温和引导型反馈模板库  <!-- TDD 任务 -->
  - [x] 4.1.1 写失败测试：`src/services/voice/pronunciation/__tests__/feedback-templates.test.ts` — 测试每星级+阶段组合至少3条模板、模板变量（{word}/{goodPart}/{focusPart}/{syllable}）正确替换、连续3次不重复、分音节教学专用模板完整、三明治法则（肯定→引导→鼓励）
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/feedback-templates.test.ts`，确认失败原因是缺少模板模块）
  - [x] 4.1.3 写最小实现：`src/services/voice/pronunciation/feedback-templates.ts` — 模板数据 + `selectFeedback(stars, phase, variables)` 选取函数 + 防重复机制
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/feedback-templates.test.ts`，确认所有测试通过）
  - [x] 4.1.5 重构：丰富模板内容、优化随机选取算法

- [x] 4.2 纠音教学循环编排器  <!-- TDD 任务 -->
  - [x] 4.2.1 写失败测试：`src/services/voice/pronunciation/__tests__/pronunciation-coordinator.test.ts` — 测试完整状态机 6 阶段流转、首次通过（跳过重试）、C2 第1/2次重试后通过、C2 失败进入 C1、C1 后 6 种终态反馈、TTS 语速设置（0.7x/0.5x）、attempts 记录、bestScore 追踪
  - [x] 4.2.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/pronunciation-coordinator.test.ts`，确认失败原因是缺少编排器模块）
  - [x] 4.2.3 写最小实现：`src/services/voice/pronunciation/pronunciation-coordinator.ts` — `PronunciationCoordinator` 类，包含 `assess()`/`retrySlow()`/`drillSyllables()`/`generateFeedback()` 方法，管理 `PronunciationSession` 状态
  - [x] 4.2.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/pronunciation-coordinator.test.ts`，确认所有测试通过）
  - [x] 4.2.5 重构：优化状态转移逻辑、提取配置常量

- [x] 4.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 4 所有变更
    - `{BASE_SHA}` → 任务组 4 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 5. 发音练习 UI 组件

- [x] 5.1 StarRating 星星评分组件  <!-- TDD 任务 -->
  - [x] 5.1.1 写失败测试：`src/components/__tests__/StarRating.test.tsx` — 测试 1-5 星正确渲染（亮星+暗星数量）、点亮动画触发、大尺寸（≥40px）
  - [x] 5.1.2 验证测试失败（运行：`npx vitest run src/components/__tests__/StarRating.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.1.3 写最小实现：`src/components/voice/StarRating.tsx` — Framer Motion 逐个点亮动画 + 金色大星星
  - [x] 5.1.4 验证测试通过（运行：`npx vitest run src/components/__tests__/StarRating.test.tsx`，确认所有测试通过）
  - [x] 5.1.5 重构：优化动画流畅度、添加音效触发回调

- [x] 5.2 SyllableHighlight 音节高亮组件  <!-- TDD 任务 -->
  - [x] 5.2.1 写失败测试：`src/components/__tests__/SyllableHighlight.test.tsx` — 测试音节分隔显示、当前音节高亮（放大+变色）、已完成音节显示小星星、从左到右推进
  - [x] 5.2.2 验证测试失败（运行：`npx vitest run src/components/__tests__/SyllableHighlight.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.2.3 写最小实现：`src/components/voice/SyllableHighlight.tsx` — 音节分段展示 + 当前/已完成/待完成三种状态视觉区分
  - [x] 5.2.4 验证测试通过（运行：`npx vitest run src/components/__tests__/SyllableHighlight.test.tsx`，确认所有测试通过）
  - [x] 5.2.5 重构：优化幼儿友好视觉效果、添加过渡动画

- [x] 5.3 PronunciationFeedback 评分反馈组件  <!-- TDD 任务 -->
  - [x] 5.3.1 写失败测试：`src/components/__tests__/PronunciationFeedback.test.tsx` — 测试 StarRating 集成、AI 老师气泡反馈语展示、"再试一次"/"继续"按钮渲染与交互、反馈语 TTS 播放触发
  - [x] 5.3.2 验证测试失败（运行：`npx vitest run src/components/__tests__/PronunciationFeedback.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.3.3 写最小实现：`src/components/voice/PronunciationFeedback.tsx` — 组合 StarRating + 老师头像气泡 + 操作按钮
  - [x] 5.3.4 验证测试通过（运行：`npx vitest run src/components/__tests__/PronunciationFeedback.test.tsx`，确认所有测试通过）
  - [x] 5.3.5 重构：优化布局适配、完善交互状态

- [x] 5.4 PronunciationDrill 纠音练习页面  <!-- TDD 任务 -->
  - [x] 5.4.1 写失败测试：`src/components/__tests__/PronunciationDrill.test.tsx` — 测试完整纠音循环 UI 流程（AI 示范→录音→评分→重试/分音节→最终评分）、各阶段 UI 正确切换、VoiceRecorder/VoicePlayer 集成、拍手引导动画触发
  - [x] 5.4.2 验证测试失败（运行：`npx vitest run src/components/__tests__/PronunciationDrill.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.4.3 写最小实现：`src/components/voice/PronunciationDrill.tsx` — 整合所有组件 + PronunciationCoordinator 状态驱动 UI
  - [x] 5.4.4 验证测试通过（运行：`npx vitest run src/components/__tests__/PronunciationDrill.test.tsx`，确认所有测试通过）
  - [x] 5.4.5 重构：优化组件组合、提取可复用的纠音 hook

- [x] 5.5 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 5 所有变更
    - `{BASE_SHA}` → 任务组 5 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 6. 集成与导出

- [x] 6.1 学习记录集成与服务统一导出  <!-- TDD 任务 -->
  - [x] 6.1.1 写失败测试：`src/services/voice/pronunciation/__tests__/integration.test.ts` — 测试纠音完成后自动创建 LearningRecord（含 pronunciationScore/pronunciationStars）、发音评分参与掌握率计算、voice/index.ts 导出新模块、学习会话中语音题触发纠音流程
  - [x] 6.1.2 验证测试失败（运行：`npx vitest run src/services/voice/pronunciation/__tests__/integration.test.ts`，确认失败原因是缺少集成逻辑）
  - [x] 6.1.3 写最小实现：修改 `src/services/voice/index.ts`（导出发音评估模块）、集成纠音结果写入 `LearningRecord`、连接 `useLearningFlow` hook 中语音题的纠音流程
  - [x] 6.1.4 验证测试通过（运行：`npx vitest run src/services/voice/pronunciation/__tests__/integration.test.ts`，确认所有测试通过）
  - [x] 6.1.5 重构：确保集成点清晰、无副作用

- [x] 6.2 代码审查

## 7. PreCI 代码规范检查

- [x] 7.1 检测 preci 安装状态
- [x] 7.2 检测项目是否已 preci 初始化
- [x] 7.3 检测 PreCI Server 状态
- [x] 7.4 执行代码规范扫描
- [x] 7.5 处理扫描结果

## 8. Documentation Sync (Required)

- [x] 8.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 8.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 8.3 sync proposal.md: update scope/impact if changed
- [x] 8.4 sync specs/*.md: update requirements if changed
- [x] 8.5 Final review: ensure all OpenSpec docs reflect actual implementation
