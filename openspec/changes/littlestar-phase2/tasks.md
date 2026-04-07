# Tasks: LittleStar Phase 2 — 渐进式年级解锁 + 学习报告 + 入学测评

## 1. 数据模型与类型扩展  <!-- 轻量任务组：跳过独立审查，变更纳入后续任务组统一审查 -->

- [x] 1.1 扩展 GradeLevel 类型和工具函数  <!-- 非 TDD 任务 -->
  - [x] 1.1.1 执行变更：`src/types/models.ts`（扩展 GradeLevel 联合类型）、新增 `src/types/grades.ts`（GRADE_ORDER、GRADE_LABELS、getNextGrade、getGradeIndex）
  - [x] 1.1.2 验证无回归（运行：`npx vitest run`，确认所有现有测试通过，输出干净）
  - [x] 1.1.3 检查：确认所有引用 GradeLevel 的文件兼容新类型值

- [x] 1.2 新增数据库表和类型定义  <!-- 非 TDD 任务 -->
  - [x] 1.2.1 执行变更：`src/types/models.ts`（新增 GradeUnlock、PlacementTest、PlacementQuestion、PlacementResult、ReportData、ReportMetrics、MasterySnapshot 类型）、`src/db/database.ts`（新增 gradeUnlocks、placementTests、reportData、masterySnapshots 表，升级 schema 版本）
  - [x] 1.2.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 1.2.3 检查：确认新表索引设计合理，类型导出完整

（无独立代码审查任务 — 变更纳入任务组 2 的审查范围）

## 2. 知识点大纲体系

- [x] 2.1 大纲类型定义与加载器  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.1.1 写失败测试：`src/curriculum/__tests__/curriculum-loader.test.ts`
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/curriculum/__tests__/curriculum-loader.test.ts`，确认失败原因是缺少功能）
  - [x] 2.1.3 写最小实现：`src/curriculum/types.ts`（GradeCurriculum、CurriculumModule、CurriculumKnowledgeNode 类型）、`src/curriculum/index.ts`（loadCurriculum 按需加载入口）
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/curriculum/__tests__/curriculum-loader.test.ts`，确认所有测试通过，输出干净）
  - [x] 2.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 2.2 一年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.2.1 执行变更：`src/curriculum/grade-1/math.ts`、`src/curriculum/grade-1/chinese.ts`、`src/curriculum/grade-1/english.ts`（参考 2022 课标定义各科 8-12 个核心知识点 + 前置关系 + AI 出题模板）
  - [x] 2.2.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.2.3 检查：确认知识点 ID 全局唯一，前置关系正确，AI prompt 模板完整

- [x] 2.3 二年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.3.1 执行变更：`src/curriculum/grade-2/math.ts`、`src/curriculum/grade-2/chinese.ts`、`src/curriculum/grade-2/english.ts`
  - [x] 2.3.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.3.3 检查：确认知识点 ID 全局唯一，与一年级知识点有正确的前置衔接

- [x] 2.4 三年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.4.1 执行变更：`src/curriculum/grade-3/math.ts`、`src/curriculum/grade-3/chinese.ts`、`src/curriculum/grade-3/english.ts`
  - [x] 2.4.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.4.3 检查：确认知识点 ID 全局唯一，三年级英语从 1 级课标起始

- [x] 2.5 四年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.5.1 执行变更：`src/curriculum/grade-4/math.ts`、`src/curriculum/grade-4/chinese.ts`、`src/curriculum/grade-4/english.ts`
  - [x] 2.5.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.5.3 检查：确认知识点 ID 全局唯一，与三年级正确衔接

- [x] 2.6 五年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.6.1 执行变更：`src/curriculum/grade-5/math.ts`、`src/curriculum/grade-5/chinese.ts`、`src/curriculum/grade-5/english.ts`
  - [x] 2.6.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.6.3 检查：确认知识点 ID 全局唯一，五年级为 2 级课标

- [x] 2.7 六年级知识点大纲（数学/语文/英语）  <!-- 非 TDD 任务 -->
  - [x] 2.7.1 执行变更：`src/curriculum/grade-6/math.ts`、`src/curriculum/grade-6/chinese.ts`、`src/curriculum/grade-6/english.ts`
  - [x] 2.7.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.7.3 检查：确认六年级为最终年级，无后续节点指向不存在的年级

- [x] 2.8 幼儿园大纲迁移（将 Phase 1 种子数据适配为大纲格式）  <!-- 非 TDD 任务 -->
  - [x] 2.8.1 执行变更：`src/curriculum/kindergarten/math.ts`、`src/curriculum/kindergarten/chinese.ts`、`src/curriculum/kindergarten/english.ts`（从 `src/data/seed-*.ts` 迁移并适配 GradeCurriculum 格式）
  - [x] 2.8.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.8.3 检查：确认幼儿园知识点的 nextNodes 正确指向一年级知识点

- [x] 2.9 代码审查  <!-- 审查范围覆盖任务组 1（轻量）+ 2 的所有变更 -->
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase2/specs/curriculum.md` 和 `openspec/changes/littlestar-phase2/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 本任务组所有变更文件
    - `{BASE_SHA}` → 任务组 1 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 3. 年级解锁引擎

- [x] 3.1 年级解锁引擎核心逻辑  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.1.1 写失败测试：`src/engine/__tests__/grade-unlock-engine.test.ts`
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/grade-unlock-engine.test.ts`，确认失败原因是缺少功能）
  - [x] 3.1.3 写最小实现：`src/engine/grade-unlock-engine.ts`（checkUnlockEligibility、triggerUnlock、getCurrentGrade、getUnlockProgress）
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/grade-unlock-engine.test.ts`，确认所有测试通过，输出干净）
  - [x] 3.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 3.2 年级解锁 Store 和配置  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.2.1 写失败测试：`src/stores/__tests__/gradeUnlockStore.test.ts`
  - [x] 3.2.2 验证测试失败（运行：`npx vitest run src/stores/__tests__/gradeUnlockStore.test.ts`，确认失败原因是缺少功能）
  - [x] 3.2.3 写最小实现：`src/stores/gradeUnlockStore.ts`（状态管理 + 解锁配置 + 自动检查集成）、更新 `src/pages/ParentSettings.tsx`（新增解锁阈值配置 UI）
  - [x] 3.2.4 验证测试通过（运行：`npx vitest run src/stores/__tests__/gradeUnlockStore.test.ts`，确认所有测试通过，输出干净）
  - [x] 3.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 3.3 解锁通知与庆祝动画组件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.3.1 写失败测试：`src/components/__tests__/GradeUnlockCelebration.test.tsx`
  - [x] 3.3.2 验证测试失败（运行：`npx vitest run src/components/__tests__/GradeUnlockCelebration.test.tsx`，确认失败原因是缺少功能）
  - [x] 3.3.3 写最小实现：`src/components/GradeUnlockCelebration.tsx`（庆祝动画 + 通知文案 + 跳转入学测评按钮）
  - [x] 3.3.4 验证测试通过（运行：`npx vitest run src/components/__tests__/GradeUnlockCelebration.test.tsx`，确认所有测试通过，输出干净）
  - [x] 3.3.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 3.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase2/specs/grade-unlock.md` 和 `openspec/changes/littlestar-phase2/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 本任务组所有变更文件
    - `{BASE_SHA}` → 任务组 3 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 4. 入学测评系统

- [x] 4.1 测评引擎核心逻辑  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.1.1 写失败测试：`src/engine/__tests__/placement-test-engine.test.ts`
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/placement-test-engine.test.ts`，确认失败原因是缺少功能）
  - [x] 4.1.3 写最小实现：`src/engine/placement-test-engine.ts`（generateTest、submitAnswer 自适应、completeTest、applyResult）
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/placement-test-engine.test.ts`，确认所有测试通过，输出干净）
  - [x] 4.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 4.2 测评 UI 组件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.2.1 写失败测试：`src/pages/__tests__/PlacementTestPage.test.tsx`
  - [x] 4.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/PlacementTestPage.test.tsx`，确认失败原因是缺少功能）
  - [x] 4.2.3 写最小实现：`src/pages/PlacementTestPage.tsx`（测评开始页 + 答题界面 + 进度条 + 简单反馈 + 结果摘要页）
  - [x] 4.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/PlacementTestPage.test.tsx`，确认所有测试通过，输出干净）
  - [x] 4.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 4.3 测评路由与触发集成  <!-- 非 TDD 任务 -->
  - [x] 4.3.1 执行变更：`src/App.tsx`（新增 /placement-test/:subject/:grade 路由）、`src/stores/gradeUnlockStore.ts`（解锁后自动跳转测评）、`src/pages/ChildSetup.tsx`（首次创建孩子后触发测评）
  - [x] 4.3.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 4.3.3 检查：确认首次使用和年级解锁两种触发路径均正确

- [x] 4.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase2/specs/placement-test.md` 和 `openspec/changes/littlestar-phase2/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 本任务组所有变更文件
    - `{BASE_SHA}` → 任务组 4 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 5. 学习报告系统

- [x] 5.1 添加 Recharts 依赖  <!-- 轻量任务组内联：非 TDD 任务 -->
  - [x] 5.1.1 执行变更：`package.json`（添加 recharts 依赖）
  - [x] 5.1.2 验证无回归（运行：`npm install && npx vitest run`，确认输出干净）
  - [x] 5.1.3 检查：确认 recharts 版本兼容 React 18

- [x] 5.2 掌握度历史快照与报告生成引擎  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.2.1 写失败测试：`src/engine/__tests__/report-engine.test.ts`
  - [x] 5.2.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/report-engine.test.ts`，确认失败原因是缺少功能）
  - [x] 5.2.3 写最小实现：`src/engine/report-engine.ts`（generateWeeklyReport、generateMonthlyReport、getCachedReport、getReportsByGrade）、`src/engine/mastery-snapshot.ts`（每日快照保存逻辑）
  - [x] 5.2.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/report-engine.test.ts`，确认所有测试通过，输出干净）
  - [x] 5.2.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 5.3 报告 Store  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.3.1 写失败测试：`src/stores/__tests__/reportStore.test.ts`
  - [x] 5.3.2 验证测试失败（运行：`npx vitest run src/stores/__tests__/reportStore.test.ts`，确认失败原因是缺少功能）
  - [x] 5.3.3 写最小实现：`src/stores/reportStore.ts`（当前报告、报告列表、加载状态、筛选条件、generateReport、loadReports、setFilter）
  - [x] 5.3.4 验证测试通过（运行：`npx vitest run src/stores/__tests__/reportStore.test.ts`，确认所有测试通过，输出干净）
  - [x] 5.3.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 5.4 图表可视化组件（Recharts）  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.4.1 写失败测试：`src/components/__tests__/ReportCharts.test.tsx`
  - [x] 5.4.2 验证测试失败（运行：`npx vitest run src/components/__tests__/ReportCharts.test.tsx`，确认失败原因是缺少功能）
  - [x] 5.4.3 写最小实现：`src/components/charts/LearningTimeChart.tsx`（柱状图）、`src/components/charts/MasteryTrendChart.tsx`（折线图）、`src/components/charts/GradeProgressChart.tsx`（环形进度图）
  - [x] 5.4.4 验证测试通过（运行：`npx vitest run src/components/__tests__/ReportCharts.test.tsx`，确认所有测试通过，输出干净）
  - [x] 5.4.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 5.5 报告列表页与详情页  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.5.1 写失败测试：`src/pages/__tests__/LearningReportPage.test.tsx`
  - [x] 5.5.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/LearningReportPage.test.tsx`，确认失败原因是缺少功能）
  - [x] 5.5.3 写最小实现：`src/pages/LearningReportPage.tsx`（年级 Tab + 周报/月报切换 + 报告列表）、`src/pages/ReportDetailPage.tsx`（5 个指标模块：时长卡片、掌握趋势图、成就里程碑、薄弱知识点、年级进度环）
  - [x] 5.5.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/LearningReportPage.test.tsx`，确认所有测试通过，输出干净）
  - [x] 5.5.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 5.6 报告路由与导航集成  <!-- 非 TDD 任务 -->
  - [x] 5.6.1 执行变更：`src/App.tsx`（新增 /reports 和 /reports/:id 路由）、`src/pages/ParentDashboard.tsx`（新增"学习报告"入口按钮）
  - [x] 5.6.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 5.6.3 检查：确认家长仪表盘到报告页面的导航路径正确

- [x] 5.7 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase2/specs/learning-report.md` 和 `openspec/changes/littlestar-phase2/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 本任务组所有变更文件
    - `{BASE_SHA}` → 任务组 5 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 6. 端到端集成与学习流程更新

- [x] 6.1 学习完成后自动解锁检查集成  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 6.1.1 写失败测试：`src/engine/__tests__/learning-flow-integration.test.ts`
  - [x] 6.1.2 验证测试失败（运行：`npx vitest run src/engine/__tests__/learning-flow-integration.test.ts`，确认失败原因是缺少功能）
  - [x] 6.1.3 写最小实现：更新 `src/stores/learningStore.ts`（学习完成回调中集成解锁检查）、更新 `src/engine/adaptive-router.ts`（支持跨年级知识图谱路由）
  - [x] 6.1.4 验证测试通过（运行：`npx vitest run src/engine/__tests__/learning-flow-integration.test.ts`，确认所有测试通过，输出干净）
  - [x] 6.1.5 重构：整理代码、改善命名、消除重复（保持所有测试通过）

- [x] 6.2 每日快照自动保存集成  <!-- 非 TDD 任务 -->
  - [x] 6.2.1 执行变更：更新 `src/stores/learningStore.ts`（学习会话结束时触发每日掌握度快照保存）
  - [x] 6.2.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 6.2.3 检查：确认快照只在每天首次学习结束时保存一次

- [x] 6.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/littlestar-phase2/specs/*.md` 和 `openspec/changes/littlestar-phase2/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 本任务组所有变更文件
    - `{BASE_SHA}` → 任务组 6 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD

## 7. PreCI 代码规范检查

- [x] 7.1 检测 preci 安装状态
  - 按以下优先级检测：① `~/PreCI/preci`（优先）→ ② `command -v preci`（PATH）
  - 若均未找到：执行安装命令，安装完成后继续
  - 若找到：记录可用路径，直接继续
- [x] 7.2 检测项目是否已 preci 初始化
  - 检查 `.preci/`、`build.yml`、`.codecc/` 任一存在即为已初始化
  - 若未初始化：执行 `preci init`，等待完成后继续
- [x] 7.3 检测 PreCI Server 状态
  - 执行 `<preci路径> server status` 检查服务是否启动
  - 若未启动：执行 `<preci路径> server start`，等待服务启动（最多 10 秒）
  - 若启动失败且 `skip_preci: false`：暂停流程，提示用户选择操作（重试/跳过/中止），等待用户明确确认后才继续
- [x] 7.4 执行代码规范扫描
  - 依次执行两个扫描命令：
    1. `<preci路径> scan --diff`（扫描未暂存变更）
    2. `<preci路径> scan --pre-commit`（扫描已暂存变更）
  - 合并两次扫描结果，去重后统一处理
  - 仅扫描代码文件（跳过 .md/.yml/.json/.xml/.txt/.png/.jpg 等非代码文件）
- [x] 7.5 处理扫描结果
  - 若无告警：输出 `✅ PreCI 检查通过`，继续 Documentation Sync
  - 若有告警：自动修正（最多 3 次），修正后重新扫描验证
  - 若重试用尽后仍有无法自动修正的告警：暂停流程，输出剩余问题列表，等待用户选择

## 8. Documentation Sync (Required)

- [x] 8.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 8.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 8.3 sync proposal.md: update scope/impact if changed
- [x] 8.4 sync specs/*.md: update requirements if changed
- [x] 8.5 Final review: ensure all OpenSpec docs reflect actual implementation
