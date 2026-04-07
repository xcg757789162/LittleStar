# Tasks: LittleStar Phase 1

## 1. 项目初始化与基础配置 <!-- 轻量任务组：跳过独立审查，变更纳入后续任务组统一审查 -->

- [x] 1.1 Vite + React + TypeScript 项目脚手架初始化  <!-- 非 TDD 任务 -->
  - [x] 1.1.1 执行变更：运行 `npm create vite@latest . -- --template react-ts`，配置 `package.json`、`tsconfig.json`、`vite.config.ts`，安装核心依赖（react, react-dom, react-router-dom, zustand, dexie, framer-motion），配置路径别名 `@/` → `src/`
  - [x] 1.1.2 验证无回归（运行：`npm run build`，确认构建成功无错误）
  - [x] 1.1.3 检查：确认 `package.json` 依赖完整、`tsconfig.json` 路径别名正确、`vite.config.ts` 配置正确

- [x] 1.2 开发工具链配置（ESLint + Prettier + Vitest）  <!-- 非 TDD 任务 -->
  - [x] 1.2.1 执行变更：安装 eslint、prettier、vitest、@testing-library/react、@testing-library/jest-dom、jsdom，创建 `.eslintrc.cjs`、`.prettierrc`、`vitest.config.ts`、`src/test/setup.ts`
  - [x] 1.2.2 验证无回归（运行：`npx eslint src/ --ext .ts,.tsx && npx vitest run`，确认无 lint 错误且测试框架可运行）
  - [x] 1.2.3 检查：确认 ESLint 规则合理、Prettier 格式化正常、Vitest 可运行空测试

- [x] 1.3 环境变量与项目结构  <!-- 非 TDD 任务 -->
  - [x] 1.3.1 执行变更：创建 `.env`（含 `VITE_QWEN_API_KEY`、`VITE_QWEN_BASE_URL`）、`.env.example`（不含敏感值）、`src/` 目录结构（components/、pages/、stores/、services/、hooks/、utils/、types/、assets/、data/）
  - [x] 1.3.2 验证无回归（运行：`npm run build`，确认构建成功）
  - [x] 1.3.3 检查：确认 `.env` 在 `.gitignore` 中、目录结构合理完整

（无独立代码审查任务 — 变更纳入任务组 2 的审查范围）

## 2. 数据模型与 Dexie.js 本地存储

- [x] 2.1 Dexie.js 数据库 Schema 定义与初始化  <!-- TDD 任务 -->
  - [x] 2.1.1 写失败测试：`src/db/__tests__/database.test.ts` — 测试数据库初始化、表创建、基础 CRUD 操作
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/db/__tests__/database.test.ts`，确认失败原因是缺少数据库模块）
  - [x] 2.1.3 写最小实现：`src/db/database.ts` — 定义 LittleStarDB 类，包含所有核心表（children、knowledgeNodes、learningRecords、masteryRecords、questions、questionTemplates、achievements、dailySessions），定义 TypeScript 接口 `src/types/models.ts`
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/db/__tests__/database.test.ts`，确认所有测试通过）
  - [x] 2.1.5 重构：整理类型定义、优化索引设计、添加 JSDoc 注释

- [x] 2.2 知识图谱数据模型与操作  <!-- TDD 任务 -->
  - [x] 2.2.1 写失败测试：`src/db/__tests__/knowledge-graph.test.ts` — 测试知识点查询、前置/后续依赖解析、解锁条件判断、按年级/科目过滤
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/db/__tests__/knowledge-graph.test.ts`，确认失败原因是缺少知识图谱操作模块）
  - [x] 2.2.3 写最小实现：`src/db/knowledge-graph.ts` — 实现 KnowledgeGraphService，支持节点查询、依赖遍历、解锁判断
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/db/__tests__/knowledge-graph.test.ts`，确认所有测试通过）
  - [x] 2.2.5 重构：优化查询性能、提取公共方法

- [x] 2.3 种子数据生成（数学+语文+英语幼儿园内容）  <!-- TDD 任务 -->
  - [x] 2.3.1 写失败测试：`src/data/__tests__/seed-data.test.ts` — 测试种子数据完整性（每科目知识点数量、题目数量、知识图谱连通性、难度分布合理性）
  - [x] 2.3.2 验证测试失败（运行：`npx vitest run src/data/__tests__/seed-data.test.ts`，确认失败原因是缺少种子数据）
  - [x] 2.3.3 写最小实现：`src/data/seed/math.ts`（数字认知1-20、数数、比大小、10以内加减法、图形认识）、`src/data/seed/chinese.ts`（拼音声母韵母、50-100个常见汉字、儿歌）、`src/data/seed/english.ts`（26字母、动物/颜色/水果/数字单词）、`src/data/seed/index.ts`（统一导出+数据库播种函数）
  - [x] 2.3.4 验证测试通过（运行：`npx vitest run src/data/__tests__/seed-data.test.ts`，确认所有测试通过）
  - [x] 2.3.5 重构：优化数据结构、确保知识图谱依赖关系合理

- [x] 2.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 1（轻量）+ 2 的所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase1/specs/*.md` 和 `openspec/changes/littlestar-phase1/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 1 + 2 所有变更文件
    - `{BASE_SHA}` → 任务组 1 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 3. Zustand 状态管理

- [x] 3.1 核心 Store 设计与实现（childStore + learningStore + uiStore）  <!-- TDD 任务 -->
  - [x] 3.1.1 写失败测试：`src/stores/__tests__/stores.test.ts` — 测试 childStore（当前孩子选择/创建）、learningStore（当前学习会话状态、题目队列）、uiStore（主题、语音开关、家长模式标记）
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/stores/__tests__/stores.test.ts`，确认失败原因是缺少 store 模块）
  - [x] 3.1.3 写最小实现：`src/stores/childStore.ts`、`src/stores/learningStore.ts`、`src/stores/uiStore.ts`
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/stores/__tests__/stores.test.ts`，确认所有测试通过）
  - [x] 3.1.5 重构：提取公共类型、优化 store slice 设计

- [x] 3.2 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 3 所有变更
    - `{BASE_SHA}` → 任务组 3 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 4. 自适应学习引擎

- [x] 4.1 掌握率计算引擎（艾宾浩斯+连续正确率）  <!-- TDD 任务 -->
  - [x] 4.1.1 写失败测试：`src/engine/__tests__/mastery.test.ts` — 测试掌握率计算公式、遗忘曲线衰减、连续正确加权、边界条件
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/mastery.test.ts`，确认失败原因是缺少掌握率模块）
  - [x] 4.1.3 写最小实现：`src/engine/mastery.ts` — MasteryCalculator 类
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/mastery.test.ts`，确认所有测试通过）
  - [x] 4.1.5 重构：优化算法精度、提取配置常量

- [x] 4.2 复习调度器（SM-2 变体间隔重复）  <!-- TDD 任务 -->
  - [x] 4.2.1 写失败测试：`src/engine/__tests__/scheduler.test.ts` — 测试下次复习时间计算、难度系数调整、优先队列排序
  - [x] 4.2.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/scheduler.test.ts`，确认失败原因是缺少调度器模块）
  - [x] 4.2.3 写最小实现：`src/engine/scheduler.ts` — ReviewScheduler 类
  - [x] 4.2.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/scheduler.test.ts`，确认所有测试通过）
  - [x] 4.2.5 重构：优化调度算法、添加配置灵活性

- [x] 4.3 自适应路由（知识点推荐引擎）  <!-- TDD 任务 -->
  - [x] 4.3.1 写失败测试：`src/engine/__tests__/adaptive-router.test.ts` — 测试下一知识点推荐逻辑、多科目平衡、难度梯度控制、新知识点与复习的混合比例
  - [x] 4.3.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/adaptive-router.test.ts`，确认失败原因是缺少路由模块）
  - [x] 4.3.3 写最小实现：`src/engine/adaptive-router.ts` — AdaptiveRouter 类
  - [x] 4.3.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/adaptive-router.test.ts`，确认所有测试通过）
  - [x] 4.3.5 重构：优化推荐算法、提取策略接口

- [x] 4.4 规则引擎（年龄/难度/学习状态综合决策）  <!-- TDD 任务 -->
  - [x] 4.4.1 写失败测试：`src/engine/__tests__/rule-engine.test.ts` — 测试规则匹配、难度调整策略、疲劳检测、学习时长限制
  - [x] 4.4.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/rule-engine.test.ts`，确认失败原因是缺少规则引擎）
  - [x] 4.4.3 写最小实现：`src/engine/rule-engine.ts` — RuleEngine 类
  - [x] 4.4.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/rule-engine.test.ts`，确认所有测试通过）
  - [x] 4.4.5 重构：优化规则组合、提取可配置规则

- [x] 4.5 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 4 所有变更
    - `{BASE_SHA}` → 任务组 4 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 5. 学习界面

- [x] 5.1 闪卡学习组件  <!-- TDD 任务 -->
  - [x] 5.1.1 写失败测试：`src/components/__tests__/FlashCard.test.tsx` — 测试闪卡渲染、翻转动画触发、正确/错误反馈、语音播放触发
  - [x] 5.1.2 验证测试失败（运行：`npx vitest run src/components/__tests__/FlashCard.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.1.3 写最小实现：`src/components/learning/FlashCard.tsx` — 大图+文字+语音的闪卡组件，Framer Motion 翻转动画
  - [x] 5.1.4 验证测试通过（运行：`npx vitest run src/components/__tests__/FlashCard.test.tsx`，确认所有测试通过）
  - [x] 5.1.5 重构：优化动画性能、提取样式常量

- [x] 5.2 选择题组件  <!-- TDD 任务 -->
  - [x] 5.2.1 写失败测试：`src/components/__tests__/MultipleChoice.test.tsx` — 测试选项渲染（2-4个大按钮）、选中状态、正确/错误反馈动画、图文并茂
  - [x] 5.2.2 验证测试失败（运行：`npx vitest run src/components/__tests__/MultipleChoice.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.2.3 写最小实现：`src/components/learning/MultipleChoice.tsx` — 幼儿友好的大按钮选择题，图文选项
  - [x] 5.2.4 验证测试通过（运行：`npx vitest run src/components/__tests__/MultipleChoice.test.tsx`，确认所有测试通过）
  - [x] 5.2.5 重构：优化触摸交互、提取通用选项组件

- [x] 5.3 手写/涂鸦板组件  <!-- TDD 任务 -->
  - [x] 5.3.1 写失败测试：`src/components/__tests__/WritingPad.test.tsx` — 测试 Canvas 初始化、笔画绘制、清除/撤销、提交手写图片
  - [x] 5.3.2 验证测试失败（运行：`npx vitest run src/components/__tests__/WritingPad.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.3.3 写最小实现：`src/components/learning/WritingPad.tsx` — Canvas 手写板，大字书写区域，彩色画笔，适配幼儿操作
  - [x] 5.3.4 验证测试通过（运行：`npx vitest run src/components/__tests__/WritingPad.test.tsx`，确认所有测试通过）
  - [x] 5.3.5 重构：优化笔画平滑度、添加笔画引导线

- [x] 5.4 即时反馈动画系统  <!-- TDD 任务 -->
  - [x] 5.4.1 写失败测试：`src/components/__tests__/FeedbackAnimation.test.tsx` — 测试正确反馈（星星/烟花）、错误反馈（温柔引导）、动画完成回调
  - [x] 5.4.2 验证测试失败（运行：`npx vitest run src/components/__tests__/FeedbackAnimation.test.tsx`，确认失败原因是缺少组件）
  - [x] 5.4.3 写最小实现：`src/components/feedback/FeedbackAnimation.tsx` — Framer Motion 动画组件，正确→星星粒子+音效，错误→温柔提示+重试引导
  - [x] 5.4.4 验证测试通过（运行：`npx vitest run src/components/__tests__/FeedbackAnimation.test.tsx`，确认所有测试通过）
  - [x] 5.4.5 重构：优化动画性能、提取动画配置

- [x] 5.5 每日学习流程页面  <!-- TDD 任务 -->
  - [x] 5.5.1 写失败测试：`src/pages/__tests__/LearningSession.test.tsx` — 测试学习会话流程（选科目→出题→答题→反馈→下一题→结束奖励）、会话数据记录
  - [x] 5.5.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/LearningSession.test.tsx`，确认失败原因是缺少页面）
  - [x] 5.5.3 写最小实现：`src/pages/LearningSession.tsx` — 学习会话页面，整合闪卡/选择题/手写板组件，连接自适应引擎和 store
  - [x] 5.5.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/LearningSession.test.tsx`，确认所有测试通过）
  - [x] 5.5.5 重构：优化组件组合、提取学习流程 hook

- [x] 5.6 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 5 所有变更
    - `{BASE_SHA}` → 任务组 5 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 6. AI 教师集成

- [x] 6.1 通义千问 Provider 抽象层  <!-- TDD 任务 -->
  - [x] 6.1.1 写失败测试：`src/services/__tests__/ai-provider.test.ts` — 测试 Provider 接口定义、QwenProvider 实现、对话补全调用、错误处理、超时处理
  - [x] 6.1.2 验证测试失败（运行：`npx vitest run src/services/__tests__/ai-provider.test.ts`，确认失败原因是缺少 AI 服务模块）
  - [x] 6.1.3 写最小实现：`src/services/ai/provider.ts`（抽象接口）、`src/services/ai/qwen-provider.ts`（千问实现，OpenAI 兼容格式）、`src/services/ai/index.ts`
  - [x] 6.1.4 验证测试通过（运行：`npx vitest run src/services/__tests__/ai-provider.test.ts`，确认所有测试通过）
  - [x] 6.1.5 重构：优化错误重试机制、添加请求缓存

- [x] 6.2 AI 对话与鼓励系统  <!-- TDD 任务 -->
  - [x] 6.2.1 写失败测试：`src/services/__tests__/ai-teacher.test.ts` — 测试 AI 老师对话生成、错误分析、鼓励语生成、内容安全过滤、角色设定一致性
  - [x] 6.2.2 验证测试失败（运行：`npx vitest run src/services/__tests__/ai-teacher.test.ts`，确认失败原因是缺少 AI 教师模块）
  - [x] 6.2.3 写最小实现：`src/services/ai/teacher.ts` — AITeacher 类（系统 prompt 设定"温暖陪伴型"人设、错误分析、鼓励生成、安全过滤）
  - [x] 6.2.4 验证测试通过（运行：`npx vitest run src/services/__tests__/ai-teacher.test.ts`，确认所有测试通过）
  - [x] 6.2.5 重构：优化 prompt 模板、提取人设配置

- [x] 6.3 AI 出题模板系统  <!-- TDD 任务 -->
  - [x] 6.3.1 写失败测试：`src/services/__tests__/question-generator.test.ts` — 测试模板加载、按约束条件生成题目、答案验证、难度控制
  - [x] 6.3.2 验证测试失败（运行：`npx vitest run src/services/__tests__/question-generator.test.ts`，确认失败原因是缺少出题模块）
  - [x] 6.3.3 写最小实现：`src/services/ai/question-generator.ts` — QuestionGenerator 类（模板加载、千问 API 出题、答案自动验证、Fallback 到种子题库）
  - [x] 6.3.4 验证测试通过（运行：`npx vitest run src/services/__tests__/question-generator.test.ts`，确认所有测试通过）
  - [x] 6.3.5 重构：优化模板结构、添加更多题型模板

- [x] 6.4 AI 对话界面组件  <!-- TDD 任务 -->
  - [x] 6.4.1 写失败测试：`src/components/__tests__/AIChat.test.tsx` — 测试对话气泡渲染、AI 头像显示、消息列表滚动、加载状态
  - [x] 6.4.2 验证测试失败（运行：`npx vitest run src/components/__tests__/AIChat.test.tsx`，确认失败原因是缺少组件）
  - [x] 6.4.3 写最小实现：`src/components/ai/AIChat.tsx` — 气泡式对话组件，AI 老师头像，幼儿友好 UI
  - [x] 6.4.4 验证测试通过（运行：`npx vitest run src/components/__tests__/AIChat.test.tsx`，确认所有测试通过）
  - [x] 6.4.5 重构：优化对话体验、添加打字机效果

- [x] 6.5 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 6 所有变更
    - `{BASE_SHA}` → 任务组 6 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 7. TTS/STT 语音系统

- [x] 7.1 CosyVoice TTS 与 Paraformer STT 集成  <!-- TDD 任务 -->
  - [x] 7.1.1 写失败测试：`src/services/__tests__/voice.test.ts` — 测试 TTS 调用（文字转语音）、STT 调用（语音转文字）、音量/语速控制、离线降级到 Web Speech API
  - [x] 7.1.2 验证测试失败（运行：`npx vitest run src/services/__tests__/voice.test.ts`，确认失败原因是缺少语音模块）
  - [x] 7.1.3 写最小实现：`src/services/voice/tts.ts`（CosyVoice TTS）、`src/services/voice/stt.ts`（Paraformer STT）、`src/services/voice/web-speech-fallback.ts`（浏览器降级）、`src/services/voice/index.ts`
  - [x] 7.1.4 验证测试通过（运行：`npx vitest run src/services/__tests__/voice.test.ts`，确认所有测试通过）
  - [x] 7.1.5 重构：优化音频缓存、提取语音配置

- [x] 7.2 语音交互组件  <!-- TDD 任务 -->
  - [x] 7.2.1 写失败测试：`src/components/__tests__/VoiceInteraction.test.tsx` — 测试播放按钮、录音按钮、音量可视化、语音状态提示
  - [x] 7.2.2 验证测试失败（运行：`npx vitest run src/components/__tests__/VoiceInteraction.test.tsx`，确认失败原因是缺少组件）
  - [x] 7.2.3 写最小实现：`src/components/voice/VoicePlayer.tsx`（播放控制）、`src/components/voice/VoiceRecorder.tsx`（录音控制）
  - [x] 7.2.4 验证测试通过（运行：`npx vitest run src/components/__tests__/VoiceInteraction.test.tsx`，确认所有测试通过）
  - [x] 7.2.5 重构：优化录音体验、添加波形动画

- [x] 7.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 7 所有变更
    - `{BASE_SHA}` → 任务组 7 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 8. 家长功能

- [x] 8.1 PIN 码验证与家长模式切换  <!-- TDD 任务 -->
  - [x] 8.1.1 写失败测试：`src/components/__tests__/PinVerification.test.tsx` — 测试 PIN 输入界面、验证逻辑、锁定/解锁家长模式、错误尝试次数限制
  - [x] 8.1.2 验证测试失败（运行：`npx vitest run src/components/__tests__/PinVerification.test.tsx`，确认失败原因是缺少组件）
  - [x] 8.1.3 写最小实现：`src/components/parent/PinVerification.tsx`、`src/hooks/useParentMode.ts`
  - [x] 8.1.4 验证测试通过（运行：`npx vitest run src/components/__tests__/PinVerification.test.tsx`，确认所有测试通过）
  - [x] 8.1.5 重构：优化 PIN 输入体验、添加安全措施

- [x] 8.2 家长仪表盘与学习报告  <!-- TDD 任务 -->
  - [x] 8.2.1 写失败测试：`src/pages/__tests__/ParentDashboard.test.tsx` — 测试学习概览渲染（时长/完成量/正确率）、每日/每周报告、知识点掌握可视化
  - [x] 8.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/ParentDashboard.test.tsx`，确认失败原因是缺少页面）
  - [x] 8.2.3 写最小实现：`src/pages/ParentDashboard.tsx`、`src/components/parent/LearningReport.tsx`、`src/components/parent/MasteryChart.tsx`
  - [x] 8.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/ParentDashboard.test.tsx`，确认所有测试通过）
  - [x] 8.2.5 重构：优化数据聚合查询、改善图表展示

- [x] 8.3 家长设置管理  <!-- TDD 任务 -->
  - [x] 8.3.1 写失败测试：`src/pages/__tests__/ParentSettings.test.tsx` — 测试每日学习时长设置、科目偏好配置、难度调整、孩子信息管理
  - [x] 8.3.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/ParentSettings.test.tsx`，确认失败原因是缺少页面）
  - [x] 8.3.3 写最小实现：`src/pages/ParentSettings.tsx`、`src/components/parent/SettingsForm.tsx`
  - [x] 8.3.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/ParentSettings.test.tsx`，确认所有测试通过）
  - [x] 8.3.5 重构：优化表单交互、添加设置验证

- [x] 8.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 8 所有变更
    - `{BASE_SHA}` → 任务组 8 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 9. 成就系统

- [x] 9.1 成就引擎与星球收集逻辑  <!-- TDD 任务 -->
  - [x] 9.1.1 写失败测试：`src/engine/__tests__/achievement.test.ts` — 测试成就触发条件（里程碑/连续学习/星球解锁）、成就记录、重复触发防护
  - [x] 9.1.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/achievement.test.ts`，确认失败原因是缺少成就模块）
  - [x] 9.1.3 写最小实现：`src/engine/achievement.ts` — AchievementEngine 类
  - [x] 9.1.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/achievement.test.ts`，确认所有测试通过）
  - [x] 9.1.5 重构：优化触发检测效率、提取成就定义配置

- [x] 9.2 星空地图与成就展示界面  <!-- TDD 任务 -->
  - [x] 9.2.1 写失败测试：`src/pages/__tests__/StarMap.test.tsx` — 测试星球渲染、点亮动画、成就徽章列表、进度百分比
  - [x] 9.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/StarMap.test.tsx`，确认失败原因是缺少页面）
  - [x] 9.2.3 写最小实现：`src/pages/StarMap.tsx`、`src/components/achievement/PlanetNode.tsx`、`src/components/achievement/BadgeList.tsx`
  - [x] 9.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/StarMap.test.tsx`，确认所有测试通过）
  - [x] 9.2.5 重构：优化星空视觉效果、提取动画配置

- [x] 9.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 9 所有变更
    - `{BASE_SHA}` → 任务组 9 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 10. PWA 与离线支持

- [x] 10.1 Service Worker 配置与缓存策略  <!-- TDD 任务 -->
  - [x] 10.1.1 写失败测试：`src/__tests__/pwa.test.ts` — 测试 SW 注册、静态资源缓存、API 响应缓存、离线检测
  - [x] 10.1.2 验证测试失败（运行：`npx vitest run src/__tests__/pwa.test.ts`，确认失败原因是缺少 PWA 配置）
  - [x] 10.1.3 写最小实现：`vite.config.ts`（添加 vite-plugin-pwa）、`src/sw.ts`（Service Worker，Workbox 缓存策略）、`src/hooks/useOfflineStatus.ts`
  - [x] 10.1.4 验证测试通过（运行：`npx vitest run src/__tests__/pwa.test.ts`，确认所有测试通过）
  - [x] 10.1.5 重构：优化缓存策略、添加缓存版本管理

- [x] 10.2 离线学习模式与数据同步  <!-- TDD 任务 -->
  - [x] 10.2.1 写失败测试：`src/services/__tests__/offline.test.ts` — 测试离线题目缓存、离线学习记录暂存、上线后数据同步、冲突处理
  - [x] 10.2.2 验证测试失败（运行：`npx vitest run src/services/__tests__/offline.test.ts`，确认失败原因是缺少离线模块）
  - [x] 10.2.3 写最小实现：`src/services/offline/cache-manager.ts`（题目预缓存）、`src/services/offline/sync-manager.ts`（学习记录同步）
  - [x] 10.2.4 验证测试通过（运行：`npx vitest run src/services/__tests__/offline.test.ts`，确认所有测试通过）
  - [x] 10.2.5 重构：优化同步策略、添加同步状态提示

- [x] 10.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 10 所有变更
    - `{BASE_SHA}` → 任务组 10 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 11. 路由与页面整合

- [x] 11.1 React Router 路由配置与页面导航  <!-- TDD 任务 -->
  - [x] 11.1.1 写失败测试：`src/__tests__/router.test.tsx` — 测试路由配置（首页/科目选择/学习会话/星空地图/家长仪表盘/设置）、导航守卫（家长页面需 PIN 验证）、404 处理
  - [x] 11.1.2 验证测试失败（运行：`npx vitest run src/__tests__/router.test.tsx`，确认失败原因是缺少路由配置）
  - [x] 11.1.3 写最小实现：`src/router/index.tsx`（路由配置）、`src/pages/Home.tsx`（首页）、`src/pages/SubjectSelect.tsx`（科目选择）、`src/components/layout/AppLayout.tsx`（全局布局）、`src/components/layout/BottomNav.tsx`（底部导航）
  - [x] 11.1.4 验证测试通过（运行：`npx vitest run src/__tests__/router.test.tsx`，确认所有测试通过）
  - [x] 11.1.5 重构：优化路由懒加载、提取路由常量

- [x] 11.2 端到端学习流程串联  <!-- TDD 任务 -->
  - [x] 11.2.1 写失败测试：`src/__tests__/e2e-flow.test.tsx` — 测试完整学习流程（打开App→选孩子→选科目→学习→答题→反馈→成就→结束）、数据流转完整性
  - [x] 11.2.2 验证测试失败（运行：`npx vitest run src/__tests__/e2e-flow.test.tsx`，确认失败原因是缺少流程串联）
  - [x] 11.2.3 写最小实现：`src/App.tsx`（根组件整合）、`src/hooks/useLearningFlow.ts`（学习流程 hook）、修复各页面间数据传递
  - [x] 11.2.4 验证测试通过（运行：`npx vitest run src/__tests__/e2e-flow.test.tsx`，确认所有测试通过）
  - [x] 11.2.5 重构：优化页面切换动画、整理全局样式

- [x] 11.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 11 所有变更
    - `{BASE_SHA}` → 任务组 11 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 12. 性能优化与全局样式

- [x] 12.1 性能优化（代码分割 + 图片懒加载 + Memo 优化）  <!-- 非 TDD 任务 -->
  - [x] 12.1.1 执行变更：配置 React.lazy + Suspense 路由懒加载、图片组件懒加载（`src/components/common/LazyImage.tsx`）、关键组件 React.memo 优化、Zustand selector 优化
  - [x] 12.1.2 验证无回归（运行：`npx vitest run`，确认所有测试通过）
  - [x] 12.1.3 检查：确认首屏加载性能、路由切换流畅度

- [x] 12.2 全局样式与主题系统  <!-- 非 TDD 任务 -->
  - [x] 12.2.1 执行变更：创建 `src/styles/global.css`（全局样式、CSS 变量主题系统）、`src/styles/theme.ts`（主题配置）、适配幼儿 UI 规范（大按钮、圆角、柔和色彩、大字体）
  - [x] 12.2.2 验证无回归（运行：`npm run build && npx vitest run`，确认构建成功且测试通过）
  - [x] 12.2.3 检查：确认所有页面视觉一致性、主题切换正常

- [x] 12.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查任务组 12 所有变更
    - `{BASE_SHA}` → 任务组 12 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 13. PreCI 代码规范检查

- [x] 13.1 检测 preci 安装状态
  - 按以下优先级检测：① `~/PreCI/preci`（优先）→ ② `command -v preci`（PATH）
  - 若均未找到：执行本技能 "PreCI 代码规范检查规范" 节中的安装命令，安装完成后继续
  - 若找到：记录可用路径，直接继续
- [x] 13.2 检测项目是否已 preci 初始化
  - 检查 `.preci/`、`build.yml`、`.codecc/` 任一存在即为已初始化
  - 若未初始化：执行 `preci init`，等待完成后继续
- [x] 13.3 检测 PreCI Server 状态
  - 执行 `<preci路径> server status` 检查服务是否启动
  - 若未启动：执行 `<preci路径> server start`，等待服务启动（最多 10 秒）
  - 若启动失败且 `skip_preci: false`：暂停流程，提示用户选择操作（重试/跳过/中止）
- [x] 13.4 执行代码规范扫描
  - 依次执行：`<preci路径> scan --diff` + `<preci路径> scan --pre-commit`
  - 合并扫描结果，去重后统一处理
  - 仅扫描代码文件
- [x] 13.5 处理扫描结果
  - 若无告警：输出 `✅ PreCI 检查通过`，继续 Documentation Sync
  - 若有告警：自动修正（最多 3 次重试），修正后重新扫描验证

## 14. Documentation Sync (Required)

- [x] 14.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 14.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 14.3 sync proposal.md: update scope/impact if changed
- [x] 14.4 sync specs/*.md: update requirements if changed
- [x] 14.5 Final review: ensure all OpenSpec docs reflect actual implementation
