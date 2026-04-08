# Phase 3: 端到端集成 — Tasks

## 1. 首页导航 + App 初始化  <!-- 轻量任务组：跳过独立审查，变更纳入后续任务组统一审查 -->

- [x] 1.1 Home.tsx 添加路由导航  <!-- 非 TDD 任务 -->
  - [x] 1.1.1 执行变更：`src/pages/Home.tsx` — 导入 `useNavigate`，为"开始学习"按钮添加 `onClick={() => navigate('/learn')}`
  - [x] 1.1.2 验证无回归（运行：`npx vitest run`，确认所有 358 测试通过，输出干净）
  - [x] 1.1.3 检查：确认 Home.tsx 导入正确，按钮 onClick 绑定正确

（无独立代码审查任务 — 变更纳入任务组 2 的审查范围）

## 2. 学习主循环核心串联

- [x] 2.1 创建 useLearningFlow Hook  <!-- TDD 任务 -->
  - [x] 2.1.1 写失败测试：`src/hooks/__tests__/useLearningFlow.test.ts` — 测试 Hook 基本生命周期（startFlow/stopFlow）、引擎串联（AdaptiveRouter.getRecommendations → QuestionGenerator.generate → setQuestionQueue）、答题流程（handleAnswer → recordAnswer → FeedbackAnimation 触发 → 下一题）、会话结束条件（队列耗尽 / RuleEngine 建议停止）
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认失败原因是 useLearningFlow 不存在）
  - [x] 2.1.3 写最小实现：`src/hooks/useLearningFlow.ts` — 实现 Hook：接收 subject 参数；调用 learningStore.startSession；初始化 AdaptiveRouter + QuestionGenerator；编排 getRecommendations → generate → setQuestionQueue；提供 handleAnswer（recordAnswer + MasteryCalculator.calculate + RuleEngine.evaluate）；提供 currentQuestion / isLoading / showFeedback / feedbackType / sessionSummary / isComplete 状态；队列耗尽或 shouldStop 时设置 isComplete
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认所有测试通过，输出干净）
  - [x] 2.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 2.2 重写 LearningSession.tsx 页面  <!-- TDD 任务 -->
  - [x] 2.2.1 写失败测试：`src/pages/__tests__/LearningSession.test.tsx` — 测试：选科目后调用 useLearningFlow.startFlow；根据 question.type 渲染对应组件（MultipleChoice / FlashCard / WritingPad）；答题后显示 FeedbackAnimation；会话结束时显示总结面板（题数、正确率、"回到首页"按钮）；退出按钮导航回首页
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/LearningSession.test.tsx`，确认失败原因是 LearningSession 未使用 useLearningFlow）
  - [x] 2.2.3 写最小实现：`src/pages/LearningSession.tsx` — 重写页面：导入 useLearningFlow；选科目后调用 startFlow(subject)；根据 currentQuestion.type 动态渲染 MultipleChoice / FlashCard / WritingPad；答题回调调用 handleAnswer；showFeedback 时渲染 FeedbackAnimation；isComplete 时渲染会话总结；退出按钮调用 stopFlow + navigate('/')
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/LearningSession.test.tsx`，确认所有测试通过，输出干净）
  - [x] 2.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 2.3 代码审查（含任务组 1 变更）— 已完成
  - [x] 前置验证：374 个测试全部通过
  - [x] 审查范围：Home.tsx、useLearningFlow.ts、useLearningFlow.test.ts、LearningSession.tsx、LearningSession.test.tsx
  - [x] 审查结果：发现 2 个 Important 问题（currentQuestion 非响应式、未使用的解构变量导致不必要重渲染）
  - [x] 修复：改为 Zustand 选择器订阅 currentQuestion，移除未使用解构变量，验证全部测试通过

## 3. AI 出题集成 + 鼓励语

- [x] 3.1 useLearningFlow 集成 AI 出题  <!-- TDD 任务 -->
  - [x] 3.1.1 写失败测试：`src/hooks/__tests__/useLearningFlow.test.ts`（追加测试用例）— 测试：有 API Key 时 QwenProvider 被初始化 + QuestionGenerator 使用 AI provider；无 Key 时 QuestionGenerator fallback（isFallback: true）；答题后 AITeacher.generateEncouragement 被调用
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认新增测试失败）
  - [x] 3.1.3 写最小实现：`src/hooks/useLearningFlow.ts`（扩展）— 检测 `import.meta.env.VITE_QWEN_API_KEY`；有 Key 时创建 QwenProvider 传入 QuestionGenerator；答题后调用 AITeacher.generateEncouragement 并将鼓励语传递到 UI；增加 encouragement 状态字段
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认所有测试通过）
  - [x] 3.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 3.2 LearningSession 页面显示 AI 鼓励语  <!-- 非 TDD 任务 -->
  - [x] 3.2.1 执行变更：`src/pages/LearningSession.tsx` — 从 useLearningFlow 获取 encouragement 字段；在 FeedbackAnimation 区域显示鼓励语文本
  - [x] 3.2.2 验证无回归（运行：`npx vitest run`，确认所有测试通过，输出干净）
  - [x] 3.2.3 检查：确认鼓励语在 UI 中正确展示，无 Key 时显示默认鼓励语

- [x] 3.3 代码审查 — 已完成，仅 Minor 问题（卸载态 setState、fixed 定位），自动继续

## 4. Store 持久化 + 成就检测

- [x] 4.1 创建 useInitializeApp Hook  <!-- TDD 任务 -->
  - [x] 4.1.1 写失败测试：`src/hooks/__tests__/useInitializeApp.test.ts` — 测试：App 启动时从 Dexie.js 加载孩子列表到 childStore；DB 为空时自动创建默认孩子（name: '小星星', gradeLevel: 'K1'）；loading 状态管理（isInitialized: false → true）
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/useInitializeApp.test.ts`，确认失败原因是 useInitializeApp 不存在）
  - [x] 4.1.3 写最小实现：`src/hooks/useInitializeApp.ts` — 实现 Hook：useEffect 中查询 db.children.toArray()；结果为空时 db.children.add(默认孩子)；写入 childStore.addChild；设置 isInitialized = true
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/useInitializeApp.test.ts`，确认所有测试通过）
  - [x] 4.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 4.2 学习会话结束时写入 DB + 成就检测  <!-- TDD 任务 -->
  - [x] 4.2.1 写失败测试：`src/hooks/__tests__/useLearningFlow.test.ts`（追加测试用例）— 测试：会话结束时 LearningRecord 写入 db.learningRecords；MasteryRecord 写入 db.masteryRecords；DailySession 写入 db.dailySessions；AchievementEngine.checkAchievements 被调用；GradeUnlockEngine.checkUnlockEligibility 被调用
  - [x] 4.2.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认新增测试失败）
  - [x] 4.2.3 写最小实现：`src/hooks/useLearningFlow.ts`（扩展 onSessionEnd 回调）— 在 stopFlow / 队列耗尽时：构造 LearningRecord + MasteryRecord + DailySession 写入 db；调用 AchievementEngine.checkAchievements；调用 GradeUnlockEngine.checkUnlockEligibility；调用 generateDailySnapshot
  - [x] 4.2.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.test.ts`，确认所有测试通过）
  - [x] 4.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 4.3 App.tsx 集成 useInitializeApp  <!-- 非 TDD 任务 -->
  - [x] 4.3.1 执行变更：`src/App.tsx` — 导入并调用 useInitializeApp；在 isInitialized 为 false 时显示加载状态；为 true 时渲染 AppRoutes
  - [x] 4.3.2 验证无回归（运行：`npx vitest run`，确认所有测试通过，输出干净）
  - [x] 4.3.3 检查：确认 App 启动时能加载孩子数据，首次启动创建默认孩子

- [x] 4.4 代码审查 — 已完成，仅 Minor 问题，自动继续
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase3/specs/integration.md` 和 `openspec/changes/littlestar-phase3/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/hooks/useInitializeApp.ts`, `src/hooks/__tests__/useInitializeApp.test.ts`, `src/hooks/useLearningFlow.ts`, `src/hooks/__tests__/useLearningFlow.test.ts`, `src/App.tsx`
    - `{BASE_SHA}` → 任务组 3 代码审查通过后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 5. 星空地图连接真实数据

- [x] 5.1 StarMap.tsx 连接 DB 数据  <!-- TDD 任务 -->
  - [x] 5.1.1 写失败测试：`src/pages/__tests__/StarMap.test.tsx`（扩展现有测试）— 测试：从 Dexie.js 查询各科目 MasteryRecord 计算平均掌握率；掌握率 ≥ 80% 的科目星球 opacity 为 1；掌握率 < 80% 的星球 opacity 为 0.5；"已点亮 X/3" 显示真实数量
  - [x] 5.1.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/StarMap.test.tsx`，确认新增测试失败）
  - [x] 5.1.3 写最小实现：`src/pages/StarMap.tsx` — 重写：useEffect 中查询 db.masteryRecords；按 subject 分组计算平均掌握率；根据阈值 80% 设置星球样式（opacity + boxShadow 发光）；计算并显示真实的"已点亮 X/3"
  - [x] 5.1.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/StarMap.test.tsx`，确认所有测试通过）
  - [x] 5.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 5.2 代码审查 — 已完成，仅 Minor（知识点前缀推断科目），自动继续
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase3/specs/integration.md` 和 `openspec/changes/littlestar-phase3/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/pages/StarMap.tsx`, `src/pages/__tests__/StarMap.test.tsx`
    - `{BASE_SHA}` → 任务组 4 代码审查通过后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 6. 家长面板连接真实数据

- [x] 6.1 ParentDashboard.tsx 连接 DB 数据  <!-- TDD 任务 -->
  - [x] 6.1.1 写失败测试：`src/pages/__tests__/ParentDashboard.test.tsx`（新建）— 测试：从 Dexie.js 查询今日 DailySession 数据；显示真实的学习时长（分钟）；显示真实的完成题数；显示真实的正确率（百分比）；无数据时显示"0分/0题/0%"
  - [x] 6.1.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/ParentDashboard.test.tsx`，确认失败原因是 ParentDashboard 未查询 DB）
  - [x] 6.1.3 写最小实现：`src/pages/ParentDashboard.tsx` — 重写：useEffect 中查询 db.dailySessions.where({ childId, date: today })；计算总学习时长、总题数、总正确率；替换硬编码"0分/0题/0%"为真实数据
  - [x] 6.1.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/ParentDashboard.test.tsx`，确认所有测试通过）
  - [x] 6.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 6.2 ParentSettings.tsx 连接 childStore  <!-- TDD 任务 -->
  - [x] 6.2.1 写失败测试：`src/pages/__tests__/ParentSettings.test.tsx`（扩展现有测试）— 测试：孩子信息从 childStore.currentChild 读取（非硬编码）；学习时长显示 currentChild.settings.dailyLearningMinutes；修改学习时长调用 updateChildSettings；科目偏好显示 currentChild.settings.preferredSubjects
  - [x] 6.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/ParentSettings.test.tsx`，确认新增测试失败）
  - [x] 6.2.3 写最小实现：`src/pages/ParentSettings.tsx` — 重写：导入 useChildStore；从 currentChild 读取孩子信息替换硬编码；学习时长 slider onChange 调用 updateChildSettings；科目偏好读取 settings.preferredSubjects
  - [x] 6.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/ParentSettings.test.tsx`，确认所有测试通过）
  - [x] 6.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 6.3 代码审查 — 已完成，仅 Minor 问题，自动继续

## 7. 全局布局 + 底部导航

- [x] 7.1 创建 AppLayout + BottomNav 组件  <!-- TDD 任务 -->
  - [x] 7.1.1 写失败测试：`src/components/layout/__tests__/AppLayout.test.tsx` — 测试：AppLayout 渲染子组件 + BottomNav；BottomNav 显示 3 个导航项（首页/星空/家长）；点击导航项触发路由跳转；学习页面（/learn）不渲染 BottomNav
  - [x] 7.1.2 验证测试失败（运行：`npx vitest run src/components/layout/__tests__/AppLayout.test.tsx`，确认失败原因是组件不存在）
  - [x] 7.1.3 写最小实现：`src/components/layout/AppLayout.tsx` + `src/components/layout/BottomNav.tsx` — AppLayout：渲染 children + 条件渲染 BottomNav（当前路由不是 /learn 时显示）；BottomNav：三个导航按钮（首页 /, 星空 /starmap, 家长 /parent），使用 useLocation 高亮当前页，固定在底部
  - [x] 7.1.4 验证测试通过（运行：`npx vitest run src/components/layout/__tests__/AppLayout.test.tsx`，确认所有测试通过）
  - [x] 7.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 7.2 Router 集成 AppLayout  <!-- 非 TDD 任务 -->
  - [x] 7.2.1 执行变更：`src/router/index.tsx` — 用 AppLayout 包裹所有路由（作为外层 Layout Route 或直接包裹 Routes）
  - [x] 7.2.2 验证无回归（运行：`npx vitest run`，确认所有测试通过，输出干净）
  - [x] 7.2.3 检查：确认所有页面有底部导航，学习中页面隐藏导航

- [x] 7.3 代码审查 — 已完成，仅 Minor 问题，自动继续

## 8. PreCI 代码规范检查

- [x] 8.1 检测 preci 安装状态
  - 按以下优先级检测：① `~/PreCI/preci`（优先）→ ② `command -v preci`（PATH）
  - 若均未找到：执行安装命令，安装完成后继续
  - 若找到：记录可用路径，直接继续
- [x] 8.2 检测项目是否已 preci 初始化
  - 检查 `.preci/`、`build.yml`、`.codecc/` 任一存在即为已初始化
  - 若未初始化：执行 `preci init`，等待完成后继续
- [x] 8.3 检测 PreCI Server 状态
  - 执行 `<preci路径> server status` 检查服务是否启动
  - 若未启动：执行 `<preci路径> server start`，等待服务启动（最多 10 秒）
  - 若启动失败且 `skip_preci: false`：暂停流程，提示用户选择操作
- [x] 8.4 执行代码规范扫描
  - 依次执行两个扫描命令：
    1. `<preci路径> scan --diff`（扫描未暂存变更）
    2. `<preci路径> scan --pre-commit`（扫描已暂存变更）
  - 合并两次扫描结果，去重后统一处理
  - 仅扫描代码文件（跳过 .md/.yml/.json/.xml/.txt/.png/.jpg 等非代码文件）
- [x] 8.5 处理扫描结果
  - ✅ PreCI 检查通过 — 无告警

## 9. Documentation Sync (Required)

- [x] 9.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 9.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 9.3 sync proposal.md: update scope/impact if changed
- [x] 9.4 sync specs/*.md: update requirements if changed
- [x] 9.5 Final review: ensure all OpenSpec docs reflect actual implementation
