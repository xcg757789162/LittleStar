# planner progress

- 状态: 已完成
- 负责任务: Task 3 前置梳理 - Playwright E2E full 闭环现状与最小方案
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`

## TODO
- [x] 盘点 `e2e/tests/full`、`e2e/helpers`、`playwright.config.ts` 现状
- [x] 确认真实 UI 选择器（课堂答题 / 完成课堂 / session summary / history）
- [x] 判断 TDD 下首个 failing test
- [x] 输出最小实现方案与风险清单

## 工作内容
- 当前 `e2e/tests/` 已有 3 条 Playwright 用例：`smoke/app-smoke.spec.ts`、`feature/lesson-picker.spec.ts`、`full/core-learning-loop.spec.ts`。其中 `full/core-learning-loop.spec.ts` 已开始覆盖 Task 3 最小闭环：seed `/classroom_cache` → 登录 → 进入 `/classroom` → 打开第一节课 → 做题 → `✅ 完成课堂` → 断言 `session-summary` 与学习历史增长。
- `playwright.config.ts` 仍是单项目 chromium 配置：`testDir=./e2e/tests`、`outputDir=test-results`、`baseURL`/`workers` 走 `e2e/config/env.ts`，并通过 `npm run dev -- --host --port --strictPort` 自动起 Vite dev server。
- `e2e/helpers/` 当前已具备 full 最小闭环所需基础：`api.ts`（auth/PostgREST 请求）、`auth.ts`（清 token / UI 登录）、`learning.ts`（创建 E2E 用户、placement test 种子、seed `classroom_cache`、打开首个 lesson）、`assertions.ts`、`reporting.ts`、`screenshots.ts`、`tags.ts`。其中 `ensureCoreLoopClassroomCache()` 会写入一个仅含单选 quiz scene 的最小课堂，真实可配合 `quiz-start-button` + `option-0` 驱动。
- 真实课堂 DOM 走 `NativeClassroom -> ClassroomBridge -> Stage -> SceneRenderer -> openmaic/scene-renderers/quiz-view.tsx`。这里 `quiz-start-button` 是真实按钮；点击后只会在 `QuizView` 内部把 phase 从 `not_started` 切到 `answering`，随后可见单选题按钮 `data-testid="option-0"` 与文案按钮 `提交答案`。当前 answering 容器本身没有页面级 testid，因此应把 `option-0` 视为最稳的“已进入答题态”锚点。
- 稳定锚点：课堂完成 `✅ 完成课堂`；总结页 `session-summary`；历史页 `learning-history-page`；历史操作按钮文案 `快速复习` / `智能重学`。需要注意：`QuizView` 只有单选题选项带 `data-testid`，多选题/简答题没有等价 testid，因此 Task 3 的 seed 数据应继续锁定为单选 quiz。
- 关键断链已再次确认：1) `NativeClassroom` 虽传入 `onAnswer={handleAnswer}`，但 `ClassroomBridge` 将其命名为 `_onAnswer` 后未使用，只渲染裸 `Stage`；2) `QuizView` 全部答题、判分、review 状态都只存在组件内部，未调用 `useLearningStore.recordAnswer()`，`openmaic` 目录下也搜不到任何 `recordAnswer`/`sessionStats` 连接；3) `learningStore.recordAnswer()` 本身可正常累加 `questionsCompleted` / `correctCount`，但当前真实课堂没人触发它；4) `LearningHistory` 与 `ReviewLearningService` 都过滤 `questionsCompleted > 0`，所以即使完成课堂并写库，只要统计为 0，历史页也会把记录隐藏。
- 结论：当前更准确的 first failing test 已经落在 `full/core-learning-loop.spec.ts` 这条线上，但它的真正红点不该理解为“找不到选择器”，而是“真实 quiz 交互没有回流学习统计”。最小修复路径应先让真实 quiz 作答至少触发一次 `recordAnswer()`（或等价统计写入），再继续看 history 增长与页面展示；`reviewMode/historyId` 仍不应纳入本轮最小验收范围。

## 环境信息
- Node PATH 需包含 `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 仅允许修改 worktree 内文件
- 本次仅做搜索/阅读与进度记录，未改业务代码
