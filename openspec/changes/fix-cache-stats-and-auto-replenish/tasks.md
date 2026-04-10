## 1. 课程缓存自动补充（auto-cache-replenish）

- [x] 1.1 在 `src/hooks/usePreGeneration.ts` 中引入 `MIN_CACHE_SIZE = 3` 常量，将自动触发条件从 `cachedCount === 0` 改为 `cachedCount < MIN_CACHE_SIZE`
- [x] 1.2 修改 `runPreGeneration()` 内部的 `existingSize > 0` 跳过逻辑为 `existingSize >= MIN_CACHE_SIZE`，允许缓存不足时继续生成
- [x] 1.3 将 `planner.planLessons({ ..., days: 1 })` 改为 `days: 2`，确保每次预生成产出 6~10 节课堂
- [x] 1.4 在 `classroom-completed` 事件监听中，延迟刷新后重新检查缓存水位并触发补充

## 2. 学习统计实时刷新（stats-realtime-refresh）

- [x] 2.1 在 `src/pages/ParentDashboard.tsx` 中添加 `visibilitychange` 事件监听，页面重新可见时调用 `loadStats()` + `loadCacheStatus()` + `loadSubjectMasteries()`
- [x] 2.2 在 ParentDashboard 中添加 `classroom-completed` CustomEvent 监听，触发时刷新统计数据和缓存数量
- [x] 2.3 在 `src/pages/Home.tsx` 中添加 `classroom-completed` 事件的直接缓存刷新监听（补充当前仅依赖 preGenStatus 变化的逻辑）

## 3. 智能重学流程（smart-relearn-flow）

- [x] 3.1 在 `src/hooks/useLearningFlow.ts` 中实现 `startReview` 方法：quick-review 模式调用 `ReviewLearningService.loadClassroomFromHistory(historyId)` 或查询 `classroom_snapshots` 获取历史课堂
- [x] 3.2 实现 `startReview` 的 deep-relearn 模式：基于 `knowledgeNodeId` 从缓存匹配→最新课堂→任意缓存 fallback
- [x] 3.3 将 `isReviewMode` 和 `startReview` 加入 `useLearningFlow` 的返回值对象
- [x] 3.4 修改 `handleClassroomComplete`：当 `isReviewMode === true` 时，跳过缓存删除逻辑，`onSessionEnd` 写入时标记 `isReview: true`
- [x] 3.5 修改 `src/pages/LearningSession.tsx`：当 `reviewState.reviewMode` 存在时调用 `startReview(...)` 而非 `startFlow(subject)`，从 `useLearningFlow` 解构出 `startReview` 和 `isReviewMode`

## 4. 验证与更新

- [ ] 4.1 端到端验证：登录 → 学完一节课 → 返回家长面板 → 确认统计非零、缓存数量正确、后台预生成自动触发
- [ ] 4.2 验证智能重学：进入学习历史 → 点击"智能重学" → 确认加载对应知识点课堂而非标准缓存课堂
- [x] 4.3 更新 `src/.codebuddy/project-index.md` 已知问题和修复记录
