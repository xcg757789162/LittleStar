## Context

OpenMAIC（小星辰）是面向 2-8 岁幼儿的 AI 教育平台。当前学习流程为：首页（Home）→ 选科目 → 从课堂缓存加载 → ClassroomIframe 渲染 → 完成后写入 DB。

**现状问题**：

1. **统计不刷新**：`ParentDashboard` 的 `loadStats`/`loadCacheStatus` 在 `useEffect([], [])` 中一次性加载，学完课堂切回家长面板后数据仍为旧值。用户看到"今日学习 0 分 / 0 题 / 0%"。
2. **缓存补充太晚**：`usePreGeneration` 触发条件为 `cachedCount === 0`，且 `runPreGeneration()` 内部 `existingSize > 0` 时直接返回不生成。用户学完 1 节课后缓存从 2→1，系统不补充；学完第 2 节后缓存清空，才开始预生成，用户需等待 ~5 分钟。
3. **智能重学名存实亡**：`LearningHistory` 中"智能重学"按钮传递 `reviewMode: 'deep-relearn'`，但 `LearningSession` 直接调用 `startFlow(subject)`（标准缓存加载），`useLearningFlow` 的 `startReview` 方法和 `isReviewMode` 状态虽已声明但未导出。

## Goals / Non-Goals

**Goals:**

- G1: 家长面板统计（今日学习/题数/正确率）在学习完成后立即反映最新数据
- G2: 课程缓存始终保持 ≥3 节课程水位线，缓存低于阈值时自动后台补充
- G3: "智能重学"按钮触发真正的知识点专项复习流程（而非普通学习）
- G4: Home 页面和 ParentDashboard 的缓存计数始终一致且准确

**Non-Goals:**

- 不修改 OpenMAIC 后端服务或 iframe 通信协议
- 不新建数据库表或修改 RLS 策略
- 不实现复杂的多策略复习算法（仅连通现有 ReviewLearningService）
- 不做跨页面全局状态管理迁移（保持当前 Zustand + React Query 架构）

## Decisions

### D1: 统计刷新机制 — `visibilitychange` + `CustomEvent`

**选型**：监听 `document.visibilitychange` 事件（页面重新可见时刷新）+ 监听 `classroom-completed` CustomEvent（课堂完成后刷新）。

**备选方案**：
- ❌ 定时轮询（`setInterval 10s`）：增加不必要的 API 请求，电池消耗大
- ❌ React Query `refetchOnWindowFocus`：ParentDashboard 统计是手动 `apiClient.get` 非 React Query hook，无法直接使用
- ❌ 全局 EventEmitter / Zustand store：过度工程，仅两个页面需要此功能

**理由**：`visibilitychange` 精准覆盖"用户离开→学习→返回"场景，零额外请求；`CustomEvent` 覆盖同页面内学习完成的极端情况（虽然当前架构中 ParentDashboard 和 LearningSession 不会同时渲染，但 Home 页面需要）。

### D2: 缓存水位线 — `MIN_CACHE_SIZE = 3` 阈值检查

**选型**：在 `usePreGeneration` 中引入常量 `MIN_CACHE_SIZE = 3`，将触发条件从 `cachedCount === 0` 改为 `cachedCount < MIN_CACHE_SIZE`。在 `runPreGeneration()` 内部也将 `existingSize > 0` 的跳过逻辑改为 `existingSize >= MIN_CACHE_SIZE`。同时将 `days: 1` 改为 `days: 2`（规划 2 天的课程，生成约 6~10 节课堂，超过 3 节水位线有充足余量）。

**备选方案**：
- ❌ 固定每次生成 N 节：与当前 LessonPlanner 的知识点规划架构不兼容（按天规划，非按数量）
- ❌ 动态水位线（基于用户学习频率预测）：复杂度高，当前数据量不足以支撑

**理由**：3 是合理的最小值——用户一次学习会话通常完成 1-3 节课，3 节缓存确保至少 1 次完整学习不需等待。`days: 2` 在满足水位线的同时不过度占用 OpenMAIC 资源。

### D3: 智能重学 — 复用现有 ReviewLearningService

**选型**：
- **快速复习**（`quick-review`）：通过 `ReviewLearningService.loadClassroomFromHistory(historyId)` 加载历史课堂 JSON，直接传给 `ClassroomIframe` 渲染。
- **深度重学**（`deep-relearn`）：通过 `ReviewLearningService.getLatestClassroom(childId, knowledgeNodeId)` 获取最近一次课堂作为参考，然后用 `RequirementGenerator` 基于当前掌握率重新生成 requirement，提交到 `GenerationScheduler` 生成新课堂。

**实现位置**：在 `useLearningFlow` 中实现 `startReview` 方法，并将其和 `isReviewMode` 加入返回值。`LearningSession` 根据 `location.state.reviewMode` 调用 `startReview` 而非 `startFlow`。

**理由**：`ReviewLearningService` 的 `loadClassroomFromHistory()` 和 `getLatestClassroom()` 已实现但未被调用，直接复用零成本。

### D4: 缓存计数同步 — 事件驱动刷新

**选型**：`classroom-completed` CustomEvent 已存在。Home 页面在收到该事件后立即调用 `refreshCache()`（已有逻辑，但当前依赖 `preGenStatus === 'completed'` 触发，需补充直接事件监听）。ParentDashboard 同样监听该事件刷新 `cachedCount`。

## Risks / Trade-offs

- **[缓存过多占用存储]** → 每节课堂 JSON 约 50-200KB，`classroom_cache` 表保留 3 天 TTL（已有 `expiresAt` 字段），PostgreSQL 行不会无限增长。
- **[预生成请求风暴]** → 若用户快速连续完成多节课堂，可能触发多次预生成。→ `isRunningRef` 防重入锁已存在，保证同时只有一次 `runPreGeneration` 运行。
- **[快速复习加载 classroomData 字段]** → 当前 `classroom_history` 表的 `classroom_data` 仅存在于 `classroom_snapshots` 中（分离设计），但 `ReviewLearningService` 直接查 `classroom_history.classroomData`，需确认字段是否存在。→ 若不存在则改为查询 `classroom_snapshots` 关联表。
- **[深度重学生成等待]** → 重新生成课堂需要 ~5 分钟。→ 在 UI 中显示生成进度条（复用 Home 页面的预生成进度 UI），让用户知道在等什么。

### D5: 实施阶段补充决策 (2026-04-10)

**发现：组 3（智能重学流程）已在先前会话中实现**
- `useLearningFlow.ts` 中 `startReview` 方法已完整实现（quick-review + deep-relearn 两种模式）
- `isReviewMode` 状态已创建并在返回值中导出
- `LearningSession.tsx` 已正确解构 `startReview` 并通过 `useEffect` 在 `reviewState.reviewMode` 存在时调用
- `handleClassroomComplete` 中已实现复习模式跳过缓存删除 + `isReview: true` 标记
- 因此组 3 的 5 个任务无需重复修改

**缓存水位检查增强**
- 在 `classroom-completed` 事件监听中，不再无条件触发 `runPreGeneration()`
- 改为先创建新的 `ClassroomCache` 实例检查当前缓存大小
- 仅当 `currentSize < MIN_CACHE_SIZE` 时才触发补充
- 避免在缓存充足时产生不必要的 API 请求
