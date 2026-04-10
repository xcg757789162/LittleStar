## 1. 核心修复：onSessionEnd 区分完成与退出

- [x] 1.1 `useLearningFlow.ts`: 给 `onSessionEnd` 新增 `isCompleted: boolean` 参数，当 `isCompleted=false` 且无实质答题时，跳过 `classroom_history`、`classroom_snapshots`、`learning_records`、`mastery_records` 的写入，仅保留 `daily_sessions` 写入
- [x] 1.2 `useLearningFlow.ts`: `handleClassroomComplete()` 调用 `onSessionEnd` 时传入 `isCompleted=true`
- [x] 1.3 `useLearningFlow.ts`: `stopFlow()` 调用 `onSessionEnd` 时传入 `isCompleted=false`；同时增加判断 — 若 `classroomAnswerCount === 0` 且 `stats.questionsCompleted === 0`，则跳过课堂相关记录写入

## 2. 防御性查询过滤：复习列表排除无效记录

- [x] 2.1 `review-learning.ts`: `getHistory()` 方法增加 PostgREST 过滤条件 `questions_completed > 0`，排除历史脏数据
- [x] 2.2 `LearningHistory.tsx`: 在前端渲染前增加额外过滤 `item.questionsCompleted > 0`，作为双重保险

## 3. 验证与更新

- [x] 3.1 手动验证：进入课堂 → 立即退出 → 检查复习列表是否不显示该记录
- [x] 3.2 手动验证：正常完成课堂 → 检查复习列表正常显示
- [x] 3.3 更新 `project-index.md` 的已知问题记录
