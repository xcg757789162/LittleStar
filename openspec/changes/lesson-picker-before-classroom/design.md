## Context

当前学习流程为：`LearningSession` 科目选择 → 点"开始学习" → `useLearningFlow.startFlow()` 从 `ClassroomCache.listCachedClassrooms()` 取第一条缓存 → 直接加载 `ClassroomIframe` 渲染课堂。

用户无法看到已缓存课程的全貌，也感知不到学习进度。需要在科目选择和课堂之间插入一个"课程列表"中间视图，展示已缓存课程的缩略图卡片，按顺序解锁。

**约束**：
- 纯前端改造，不涉及后端/数据库变更
- 已完成课程通过缓存删除机制自动从列表消失（现有 `handleClassroomComplete` 已实现）
- 复用 Sunny Playground 设计系统（暖色调、圆角、Framer Motion 动画）
- 面向 2-8 岁幼儿，交互极简化

## Goals / Non-Goals

**Goals:**
- 在科目选择和课堂之间插入课程选择视图，展示缓存课程列表
- 课程卡片显示标题 + 缩略图 + 锁定/可学习状态
- 只有第一节未学课程可点击进入，后续课程锁定
- 学完一节后，下次进入只展示剩余课程（已完成课程已从缓存删除）
- 缓存为空时显示友好提示

**Non-Goals:**
- 不修改课程生成逻辑或缓存策略
- 不增加后端 API 或数据库表
- 不支持跳过/跳学（严格顺序学习）
- 不支持课程拖拽重排序

## Decisions

### 1. 课程列表作为 LearningSession 内部视图状态，而非独立路由

**选择**：在 `LearningSession.tsx` 中新增 `'picking'` 阶段（视图状态），而非新建 `/learn/pick` 路由。

**理由**：
- 当前 `LearningSession` 已有 `!isActive && !isComplete`（科目选择）、`isActive`（课堂学习）、`isComplete`（学习总结）三个状态。新增 `'picking'` 状态自然融入。
- 避免新路由引入的导航管理复杂性（返回键、刷新行为、路由守卫等）。
- 课程列表数据来源于 `ClassroomCache`，已在 `useLearningFlow` 中初始化，不必跨组件传递。

**替代方案**：新建独立页面组件 — 被否决，因为需要额外的状态传递和路由配置。

### 2. 拆分 startFlow 为两步

**选择**：
- 步骤 1（`loadCachedLessons`）：调用 `ClassroomCache.listCachedClassrooms()` 获取列表，返回 `CacheListItem[]`，不自动加载课堂数据。UI 进入 `'picking'` 状态。
- 步骤 2（`startLesson`）：用户点击卡片后，调用 `ClassroomCache.getClassroom(nodeId, date)` 加载并进入课堂。

**理由**：最小改动原则。`startFlow` 当前逻辑是加载第一条缓存并直接进入课堂。拆分为两步后，步骤 2 复用大部分原有逻辑。

### 3. 缩略图提取策略

**选择**：从 `CacheListItem` 扩展，在 `listCachedClassrooms()` 返回时额外提取 `thumbnailUrl`（课堂第一个 scene 中第一个 `imageUrl` 不为空的 slide）。

**理由**：
- `CacheListItem` 当前只有 `classroomTitle`，缩略图需要从完整 `Classroom` 数据中提取。
- 在 `listCachedClassrooms()` 遍历 entries 时就提取，避免为每条缓存单独加载完整 Classroom 数据。
- 如果没有图片 slide，使用科目对应的默认 emoji 图标作为 fallback。

### 4. 锁定状态使用列表索引判断

**选择**：列表第一项（index === 0）为"可学习"状态，其余为"锁定"状态。不需要额外的状态存储。

**理由**：
- 已完成课程在 `handleClassroomComplete` 中从缓存删除，所以每次 `listCachedClassrooms()` 返回的都是"未完成"课程。
- 列表自然按缓存写入顺序排列（`cachedAt` 时间戳），第一条就是下一节要学的课。
- 无需引入新的"学习进度"数据结构。

### 5. LessonCard 组件提取

**选择**：新建 `src/components/learning/LessonCard.tsx` 作为课程卡片组件。

**理由**：
- 职责单一：展示一节课的缩略图、标题、状态（可学/锁定）
- 可复用：未来首页或其他页面可能也需要课程卡片展示
- 遵循项目组件目录结构规范

## Risks / Trade-offs

- **[风险] 缓存列表为空但课程正在后台生成** → 缓解：显示"课程准备中，请稍候"提示，不阻塞用户返回首页。Home 页面的预生成 hook 会在后台继续工作。
- **[风险] 缩略图缺失** → 缓解：使用科目默认 emoji 作为 fallback（数学🔢、语文📖、英语🔤），确保卡片始终有视觉内容。
- **[权衡] 严格顺序 vs 自由选择** → 用户明确要求严格顺序学习，知识点递进性比自由度更重要。
- **[权衡] 不缓存完成状态到数据库** → 依赖缓存删除机制判断进度，简化实现但刷新页面/清缓存可能导致"进度重置"感（实际学习记录不丢失，只是列表展示可能变化）。
