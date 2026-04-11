## Context

LittleStar（小星辰）是基于 OpenMAIC 的幼儿英语启蒙应用。课程选择页面使用 `LessonCard` 组件展示缓存的课程列表，当前缩略图仅提取第一个 `image` 元素的 URL，效果低保真。

LittleStar 已完整移植了上游 OpenMAIC 的 `slide-renderer` 组件体系（93 个文件），包括 `ThumbnailSlide` + `ThumbnailElement` + 8 种 Base*Element。`ThumbnailSlide` 目前仅在课堂内 `scene-sidebar.tsx` 中使用。

**技术栈**：React 19 + Vite + Zustand 5 + motion 12 + Tailwind CSS

**现有组件路径**：
- `src/components/openmaic/slide-renderer/components/ThumbnailSlide/index.tsx`
- `src/components/openmaic/slide-renderer/components/ThumbnailSlide/ThumbnailElement.tsx`
- `src/components/openmaic/slide-renderer/components/element/` — 8 种 Base 组件
- `src/lib/openmaic/hooks/use-slide-background-style.ts`

**数据源**：
- `ClassroomCache.listCachedClassrooms()` → 从 `CacheStore` 中读取 `CacheEntry`，每个包含完整的 `Classroom` 对象
- `Classroom.scenes[]` → 每个 scene 有 `content` 字段，`content.type === 'slide'` 时 `content.canvas` 就是完整的 `Slide` 数据

## Goals / Non-Goals

**Goals:**
- 课程选择卡片（LessonCard）展示高保真缩略图，完整还原 slide 的背景、文字、图片、形状等元素
- 复用已移植的 `ThumbnailSlide` 组件，零额外组件开发
- 保留 `thumbnailUrl` 降级路径和科目 emoji 最终 fallback
- NativeClassroom 和 GenerationPreview 两个页面同步接入

**Non-Goals:**
- 不修改 `ThumbnailSlide` 组件本身（已与上游一致）
- 不处理 `gen_img_*` 占位符解析（LittleStar 使用 API 获取数据，图片 URL 已是完整的远端 URL，不存在 IndexedDB 占位符问题）
- 不实现虚拟列表优化（课程列表通常 3-6 项，无需虚拟化）
- 不修改课堂内 scene-sidebar 的现有 ThumbnailSlide 使用

## Decisions

### D1: Slide 数据提取位置 — 在 Cache 层提取

**选择**: 在 `ClassroomCache.listCachedClassrooms()` 中提取第一个 slide scene 的 canvas 数据，附加到 `CacheListItem` 返回

**替代方案**:
- *在组件层按需加载*: LessonCard 接收 classroomId，组件内部 `useEffect` 异步获取 → 导致卡片闪烁（先显示 emoji，再切换到缩略图），UX 差
- *在页面层统一加载*: NativeClassroom 加载 lessons 后再遍历获取 slide → 逻辑分散，难以复用

**理由**: Cache 层已经遍历了 `Classroom.scenes` 来提取 `thumbnailUrl`，在同一循环中提取 `canvas` 数据是零额外成本的扩展。数据与列表同步返回，组件渲染无闪烁。

### D2: LessonCard 渲染优先级

**选择**: `slide` 数据 > `thumbnailUrl` > 科目 emoji

渲染逻辑：
```
if (slide) → <ThumbnailSlide slide={slide} size={cardWidth} />
else if (thumbnailUrl && !imgError) → <img src={thumbnailUrl} />
else → <span>{emoji}</span>
```

**理由**: 三级降级保证在任何数据条件下都有合理的视觉输出。slide 数据优先因为保真度最高。

### D3: ThumbnailSlide 的 size 计算

**选择**: 使用 LessonCard 的固定缩略图区域宽度（与卡片 `maxWidth: 160` 对齐，缩略图区域 width: 100% = 154px 去掉 border）

**替代方案**:
- *ResizeObserver 动态计算*: 上游 ClassroomCard 的做法，但 LessonCard 宽度通过 CSS Grid 确定，初始渲染时可能为 0 → 需要额外处理
- *固定值硬编码*: 简单直接，卡片 maxWidth 已固定

**理由**: LessonCard 的 `maxWidth: 160px` + `border: 3px` → 内容区约 154px。使用 `useRef` + `ResizeObserver` 获取实际宽度最精确，但考虑到移动端课程卡片宽度变化不大，固定值 150 作为默认值配合 `overflow: hidden` 裁切即可。后续如果需要响应式可升级为 ResizeObserver。

### D4: Slide 类型定义引用

**选择**: 直接 import `Slide` 类型从 `@/lib/openmaic/types/slides`

**理由**: 类型已存在且与 ThumbnailSlide 组件的 props 完全匹配。`CacheListItem` 新增的 `firstSlideCanvas` 字段类型为 `Slide | undefined`。

### D5: viewportSize / viewportRatio 默认值

**选择**: 使用上游默认值 `viewportSize = 1000`, `viewportRatio = 0.5625 (16:9)`

**理由**: OpenMAIC 生成的所有 slide 均使用 1000px 设计稿宽度和 16:9 比例。如果 slide 数据中包含自定义值则优先使用。

## Risks / Trade-offs

- **[渲染性能]** 每个 LessonCard 渲染一个完整 ThumbnailSlide（所有 DOM 元素按 scale 缩放到 ~150px）→ 课程列表通常 3-6 项，实测上游首页 50+ 课程无性能问题
- **[图片加载]** Slide 中的图片元素 src 可能指向远端 URL，需要额外网络请求 → 图片有浏览器缓存，且 slide 元素的图片通常与课堂内使用相同 URL，大概率已缓存
- **[CSS 类名冲突]** ThumbnailSlide 使用 Tailwind 类名（`bg-white`, `overflow-hidden` 等），LessonCard 使用 inline style → 不冲突，ThumbnailSlide 渲染在 LessonCard 的缩略图区域内部
- **[数据体积]** `CacheListItem` 增加 `firstSlideCanvas` 字段 → 每个约 2-5KB，列表通常 3-6 项，总增量 < 30KB，可忽略
