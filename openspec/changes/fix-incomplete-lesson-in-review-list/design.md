## Context

当前系统中，课堂学习历史（`classroom_history`）在两个入口写入：
1. **`handleClassroomComplete()`** — 用户正常完成课堂时
2. **`stopFlow()`** — 用户中途退出时

两者都调用 `onSessionEnd()`，该函数无差别地写入 `classroom_history` 记录。`stopFlow()` 中有兜底逻辑：如果 `questionsCompleted === 0`，从课堂 scenes 中推断 quiz 数量并假设全对。

而 `LearningHistory.tsx` 通过 `ReviewLearningService.getHistory()` 从 `classroom_history` 表读取所有记录展示。这导致用户只是点击进入课堂又退出（未做任何题目），也会在复习列表中看到该课程记录。

**关键数据流**：
```
进入课堂 → startFlow() → setIsActive(true)
退出按钮 → stopFlow() → onSessionEnd() → 写入 classroom_history（兜底值）
复习列表 → getHistory() → 读取所有 classroom_history → 显示
```

## Goals / Non-Goals

**Goals:**
- 复习列表只显示用户真正完成学习的课堂记录
- 中途退出（未实质答题）不产生复习列表中的记录
- 方案简洁，不引入数据库 schema 变更（避免重建容器）

**Non-Goals:**
- 不需要追踪"部分完成"状态（未来可做，本次不涉及）
- 不修改课堂渲染逻辑
- 不改变 `handleClassroomComplete` 的正常完成写入逻辑

## Decisions

### Decision 1: 前端过滤方案（不加 DB 列）

**选项 A**: 数据库新增 `is_completed` 列 → 需要 SQL migration + Docker 重建
**选项 B**: `stopFlow()` 中途退出时跳过 `classroom_history` 写入（仅写 `daily_sessions`）
**选项 C**: 前端查询时按 `accuracy > 0` 或 `questions_completed > 0` 过滤

**决定**: 采用 **B + C 双保险**

理由：
- **方案 B**（主要）: 中途退出且无实质答题时，不写入 `classroom_history`。这是最根本的解决 — 不应该产生的记录就不应该写入。
- **方案 C**（防御）: 查询时额外过滤，作为历史脏数据的兜底处理。

B 方案细节：
- `stopFlow()` 中，检查 `classroomAnswerCount === 0`（iframe 未发送过答题事件）且 `stats.questionsCompleted === 0`（learningStore 也无记录）
- 若两个条件都满足 → 说明用户只是进入了课堂就退出，**跳过 `onSessionEnd()`** 中 `classroom_history`、`learning_records`、`mastery_records` 的写入
- 仍写入 `daily_sessions`（记录用户确实打开了学习页面）

### Decision 2: `onSessionEnd` 增加完成标记参数

给 `onSessionEnd` 增加一个 `isCompleted` 参数：
- `handleClassroomComplete()` 调用时传 `true` 
- `stopFlow()` 调用时传 `false`
- `onSessionEnd` 内部根据该标记决定是否写入 `classroom_history`

### Decision 3: 查询层增加最小答题数过滤

`ReviewLearningService.getHistory()` 和 `LearningHistory.tsx` 的查询增加 PostgREST 过滤：
- `questions_completed > 0`（至少做了 1 题）

这同时清理了历史遗留的脏数据。

## Risks / Trade-offs

- **[Risk]** 历史已写入的脏数据（`questions_completed=0` 且是兜底推断的记录）会一直留在数据库 → 通过方案 C 的查询过滤处理，UI 不展示
- **[Risk]** `stopFlow` 跳过写入后，`daily_sessions` 仍有记录但 `classroom_history` 无对应记录 → 可接受，`daily_sessions` 只是日活统计，不影响复习功能
- **[Trade-off]** 不加 DB 列意味着无法在数据库层面区分"正常完成"和"中途退出后有实质答题" → 当前阶段可接受，因为 iframe 未实现 `quiz-answer` postMessage，实际上所有答题数据都是兜底推断的

## Implementation Notes (2026-04-10)

- `onSessionEnd` 新增第4个参数 `isCompleted: boolean = false`，默认值保证向后兼容
- 写入条件从 `if (classroom)` 改为 `if (classroom && (isCompleted || stats.questionsCompleted > 0))`
- `getHistory()` 的 PostgREST 过滤使用 `{ column: 'questionsCompleted', operator: 'gt', value: 0 }`
- 前端双重保险使用 `items.filter(item => item.questionsCompleted > 0)`
