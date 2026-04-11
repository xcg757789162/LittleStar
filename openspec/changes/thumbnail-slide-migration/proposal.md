## Why

当前 LittleStar 课程选择页面（NativeClassroom / GenerationPreview）的课程卡片缩略图体验不佳：

1. **低保真** — 只提取课堂 JSON 中第一个 `image` 元素的 `src` URL，用 `<img objectFit="cover">` 渲染。无法展示完整的 slide 布局（文字标题 + 背景渐变 + 多图片 + 形状等）
2. **频繁 fallback** — 大量课程的第一张 slide 没有图片元素（纯文字/形状），导致 thumbnailUrl 为空，降级为科目 emoji（🔢📖🔤），视觉信息量极低
3. **组件已存在但未复用** — LittleStar 已经完整移植了上游 OpenMAIC 的 `ThumbnailSlide` 组件（93 个文件），但仅在课堂内 `scene-sidebar.tsx` 中使用，课程选择页面未接入

上游 OpenMAIC 首页已证明 CSS Transform 缩放渲染方案可行且性能良好，我们应当复用已移植的组件。

## What Changes

- **修改** `CacheListItem` 数据结构，新增 `firstSlideCanvas` 字段携带完整 Slide 数据
- **修改** `ClassroomCache.listCachedClassrooms()` 方法，从缓存的 Classroom JSON 中提取第一个 slide scene 的完整 canvas 数据
- **修改** `LessonCard` 组件，支持同时接收 `slide` 数据（优先）和 `thumbnailUrl`（降级），有 slide 数据时使用 `ThumbnailSlide` 渲染高保真缩略图
- **修改** `NativeClassroom` 页面的 `LessonCard` 调用处，传递 slide 数据
- **修改** `GenerationPreview` 页面的缩略图渲染，接入 ThumbnailSlide

## Capabilities

### New Capabilities

- `high-fidelity-thumbnail`: 课程选择卡片展示完整 slide 布局的高保真缩略图（背景 + 文字 + 图片 + 形状），与上游 OpenMAIC 首页效果一致

### Modified Capabilities

- `lesson-card-rendering`: LessonCard 组件新增 slide 数据驱动的渲染路径，保留 thumbnailUrl 作为降级方案
- `cache-data-extraction`: 缓存列表查询增加 slide canvas 数据提取能力

## Impact

- **渲染性能**: 每个 ThumbnailSlide 实际渲染一个完整 slide 的所有元素（缩放到 ~130px 宽度），相比单张 `<img>` 稍重。对于典型的 3-6 个课程卡片，性能影响可忽略
- **内存占用**: `CacheListItem` 增加 `firstSlideCanvas` 字段（每个约 2-5KB 的 JSON 对象），列表通常 3-6 项，增量内存 < 30KB
- **向后兼容**: 保留 `thumbnailUrl` 降级路径，slide 数据不可用时自动回退到原有逻辑
- **无数据库变更**: 所有数据从现有缓存 JSON 中提取，不涉及新的存储或 API
