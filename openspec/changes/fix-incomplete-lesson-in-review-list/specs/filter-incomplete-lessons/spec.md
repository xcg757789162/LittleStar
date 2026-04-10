## ADDED Requirements

### Requirement: 中途退出课堂不写入 classroom_history
当用户进入课堂后未进行实质性学习（未答题）就退出时，系统 SHALL NOT 写入 `classroom_history` 记录。

判断条件：`classroomAnswerCount === 0` 且 `learningStore.sessionStats.questionsCompleted === 0`

#### Scenario: 用户进入课堂后立即退出
- **WHEN** 用户进入课堂页面，未作任何答题操作，点击"退出"按钮
- **THEN** 系统不写入 `classroom_history` 记录
- **AND** 系统不写入 `learning_records` 记录
- **AND** 系统不写入 `mastery_records` 记录
- **AND** 系统仍写入 `daily_sessions` 记录（统计用户活跃度）

#### Scenario: 用户进入课堂浏览后退出但未答题
- **WHEN** 用户进入课堂页面，浏览了教学内容但未触发任何答题（quiz slide），点击"退出"
- **THEN** 系统不写入 `classroom_history` 记录

#### Scenario: 用户正常完成课堂
- **WHEN** 用户点击"完成课堂"按钮完成整堂课学习
- **THEN** 系统正常写入 `classroom_history` 记录（`isReview=false`）
- **AND** 系统写入 `learning_records`、`mastery_records` 等所有相关记录

### Requirement: 复习列表过滤无效记录
复习列表（学习历史页面）查询 SHALL 过滤掉 `questions_completed = 0` 的记录，确保只展示有实质学习行为的课堂记录。

#### Scenario: 复习列表不显示零答题记录
- **WHEN** 数据库中存在 `questions_completed = 0` 的 `classroom_history` 记录（历史脏数据）
- **THEN** 复习列表不展示该记录

#### Scenario: 复习列表正常显示已完成课堂
- **WHEN** 数据库中存在 `questions_completed > 0` 的 `classroom_history` 记录
- **THEN** 复习列表正常展示该记录，包含正确率、答题数、学习轮次等信息

### Requirement: onSessionEnd 区分完成与退出
`onSessionEnd` 函数 SHALL 接受一个 `isCompleted` 参数，根据该参数决定是否写入课堂相关的持久化记录。

#### Scenario: 完成调用写入全部记录
- **WHEN** `onSessionEnd` 以 `isCompleted=true` 调用
- **THEN** 写入 `daily_sessions` + `classroom_history` + `classroom_snapshots` + `learning_records` + `mastery_records` + `mastery_snapshots` + 成就检查 + 年级解锁检查

#### Scenario: 退出调用仅写入会话记录
- **WHEN** `onSessionEnd` 以 `isCompleted=false` 调用且用户无实质答题
- **THEN** 仅写入 `daily_sessions`
- **AND** 跳过 `classroom_history`、`classroom_snapshots`、`learning_records`、`mastery_records` 的写入
