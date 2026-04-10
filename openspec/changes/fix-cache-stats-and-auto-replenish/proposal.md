## Why

家长仪表盘（ParentDashboard）的"学习概览"统计数据（今日学习时长、完成题数、正确率）在学完课堂后仍显示为 0，用户体验断裂。同时，课程缓存补充策略过于保守——仅在缓存完全清空（`cachedCount === 0`）时才触发预生成，且每次只规划 1 天（3~5 节课）。用户学完一节课后缓存数从 2 降为 1，系统不会自动补充，导致缓存逐渐耗尽，用户需要等待新课堂生成才能继续学习。此外，"智能重学"功能实际上直接调用普通 `startFlow()` 而非真正的专项复习流程，行为与预期不符。

## What Changes

- **修复统计数据实时更新**：ParentDashboard 的 `loadStats` 和 `loadCacheStatus` 不再仅在组件挂载时加载一次，改为监听学习完成事件或页面可见性变化后自动刷新，确保学完课堂返回家长面板后数据即时更新。
- **缓存自动补充策略**：引入 `MIN_CACHE_SIZE = 3` 最小缓存水位线。当缓存数量低于 3 时（而非等到 0），自动触发后台预生成补充到 3 节。同时将 `usePreGeneration` 的规划天数从 `days: 1` 改为 `days: 2`，确保有足够的课程储备。
- **修复智能重学流程**：实现 `useLearningFlow` 中已声明但未导出的 `startReview` 方法，使其根据 `reviewMode` 正确加载历史课堂（快速复习）或基于知识点重新生成课堂（深度重学），而非走标准缓存加载流程。
- **课程缓存计数修正**：修复课堂完成后缓存删除与预生成之间的时序问题，确保 Home 页面和 ParentDashboard 显示的缓存数量始终准确。

## Capabilities

### New Capabilities
- `auto-cache-replenish`: 课程缓存自动补充机制——当缓存低于最小水位线时自动触发后台预生成，确保始终有 ≥3 节课程可用
- `stats-realtime-refresh`: 学习统计数据实时刷新——家长面板统计在课堂完成后自动更新，无需手动刷新页面
- `smart-relearn-flow`: 智能重学真实流程——实现 startReview 方法，区分快速复习（回放历史课堂）和深度重学（基于薄弱知识点重新生成课堂）

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **核心文件修改**：
  - `src/hooks/usePreGeneration.ts` — 缓存水位线检测 + 补充逻辑
  - `src/hooks/useLearningFlow.ts` — 实现 startReview + 导出 isReviewMode/startReview
  - `src/pages/ParentDashboard.tsx` — 统计数据刷新机制
  - `src/pages/Home.tsx` — 缓存计数同步刷新
  - `src/pages/LearningSession.tsx` — 接入 startReview 调用
- **无数据库变更**：不涉及表结构修改
- **无破坏性变更**：所有修改向后兼容，不影响现有用户数据
