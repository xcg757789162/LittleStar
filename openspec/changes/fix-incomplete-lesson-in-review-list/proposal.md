## Why

用户反馈：第一次学习完成后，复习列表（`/history`）中出现了仅点击进入但未完成学习的课程，并且显示为可"智能重学"的记录。根因是 `useLearningFlow.ts` 的 `stopFlow()`（中途退出）也会调用 `onSessionEnd()` 写入 `classroom_history` 记录，且该记录的正确率为 0%、答题数为兜底推断值。`LearningHistory.tsx` 从 `classroom_history` 表无差别地加载所有记录，导致未完成的课堂也出现在复习列表中。

## What Changes

- **过滤未完成课堂**：复习列表（`LearningHistory.tsx`）在显示记录时，过滤掉正确率为 0% 且答题数为 0 的未完成记录，或者在数据库层面增加 `is_completed` 字段区分完成与中途退出。
- **标记课堂完成状态**：在 `classroom_history` 表中新增 `is_completed` 布尔字段，`handleClassroomComplete` 写入 `true`，`stopFlow`（中途退出）写入 `false`。
- **中途退出不写入历史**：或选择更简洁的方案 — `stopFlow()` 中途退出时，如果用户没有实质性答题（`questionsCompleted === 0` 且 `classroomAnswerCount === 0`），则跳过 `onSessionEnd()` 的 `classroom_history` 写入。
- **学习历史页面仅展示有效记录**：查询时过滤 `accuracy > 0` 或 `is_completed = true` 的记录。

## Capabilities

### New Capabilities
- `filter-incomplete-lessons`: 过滤复习列表中的未完成课堂记录，确保只有真正完成学习的课程才出现在复习/重学列表中

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **数据库**: `classroom_history` 表可能新增 `is_completed` 列（方案取决于 design）
- **前端 Hook**: `useLearningFlow.ts` — `stopFlow()` 和 `onSessionEnd()` 逻辑调整
- **前端页面**: `LearningHistory.tsx` — 查询过滤条件调整
- **前端服务**: `review-learning.ts` — `getHistory()` 查询条件可能调整
- **无 API 破坏性变更**: 仅影响内部写入逻辑和查询过滤
