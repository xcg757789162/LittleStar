# executor progress

- 状态: ✅ 完成
- 负责任务: Task 3 TDD 执行 - 完整学习闭环 E2E
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`

## TODO
- [x] 复现 `quiz-start-button -> option-0` 红灯基线
- [x] 去掉 E2E 中对 quiz 开始按钮的 `force click` 并补最小真实闭环断言
- [x] 修复 `ClassroomBridge -> Stage -> CanvasArea -> SceneRenderer -> QuizView` 尺寸继承链
- [x] 验证答题后进入 review 态并可完成课堂
- [x] 验证 `/classroom_history` 新记录满足 `questionsCompleted > 0` 且 `correctCount >= 1`
- [x] 修复统计链路断口：QuizView 判分结果 → ClassroomBridge → NativeClassroom.handleAnswer → learningStore.recordAnswer

## 四段验收口径回报

### 1️⃣ 祖先链宽高非 0
- 修改 `ClassroomBridge.tsx`：根 div 从 `h-full w-full relative` 改为 `relative flex h-full w-full min-h-0 overflow-hidden`，增加 `<div className="flex-1 min-h-0 w-full">` 包裹 `Stage`
- 修改 `stage.tsx`：根节点从 `flex-1 flex` 改为 `flex h-full w-full min-h-0 min-w-0`
- 结果：`Stage -> CanvasArea -> SceneRenderer -> QuizView` 祖先链宽高完整继承，不再出现 quiz-start-button 可见但命中异常

### 2️⃣ 严格走真实点击禁止 force
- E2E 中完全去掉 `click({ force: true })`
- 严格使用 `await startQuizButton.click()` / `await firstOption.click()` / `await submitAnswersButton.click()`
- 结果：所有 quiz 操作均为真实用户点击，无 force hack

### 3️⃣ review 后到完成态
- `quiz-start-button -> option-0 -> Submit Answers -> Retry 可见（review 态）-> ✅ 完成课堂 -> session-summary 可见`
- 结果：完整流转验证通过

### 4️⃣ 统计链路 onAnswer 上行
- **修复方案**：
  - `QuizView`（quiz-view.tsx）：判分完成进入 reviewing 阶段时，dispatch `quiz-answer-results` CustomEvent，包含每道题的 `{ questionId, isCorrect }`
  - `ClassroomBridge`（ClassroomBridge.tsx）：不再丢弃 `onAnswer` prop（之前命名为 `_onAnswer`），改为监听 `quiz-answer-results` 事件，逐个调用 `onAnswer(result.isCorrect)`
  - 链路：`QuizView 判分 → CustomEvent → ClassroomBridge 监听 → onAnswer(isCorrect) → NativeClassroom.handleAnswer → learningStore.recordAnswer(isCorrect) → sessionStats.questionsCompleted++ / correctCount++`
  - `NativeClassroom.handleComplete` 读取 `useLearningStore.getState().sessionStats` 写入 `classroom_history`
- **E2E 验证**：
  - `getLatestHistoryRecord()` 查询最新 classroom_history 记录
  - `expect(latestRecord.questionsCompleted).toBeGreaterThanOrEqual(1)` ✅
  - `expect(latestRecord.correctCount).toBeGreaterThanOrEqual(1)` ✅
  - 学习记录页显示记录，`快速复习` 按钮可见 ✅

## 修改文件清单
1. `src/components/openmaic/scene-renderers/quiz-view.tsx` — 判分完成时 dispatch `quiz-answer-results` 事件
2. `src/components/classroom/ClassroomBridge.tsx` — 接通 `onAnswer` prop + 监听 quiz 事件 + 布局修复
3. `src/components/openmaic/stage.tsx` — 根节点布局修复
4. `e2e/tests/full/core-learning-loop.spec.ts` — 去掉 force click + 补 review 断言 + 补统计精确断言 + 修复 select snake_case

## 验证命令与结果
```
cd /Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412
E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test e2e/tests/full/core-learning-loop.spec.ts --workers=1 --reporter=line

Running 1 test using 1 worker
  1 passed (15.7s)
```

## 剩余 blocker
无。Task 3 全链路验证通过。
