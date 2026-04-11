## 1. Cache 层数据提取 — CacheListItem 扩展

- [x] 1.1 在 `src/services/openmaic/cache.ts` 中 import `Slide` 类型 (`@/lib/openmaic/types/slides`)
- [x] 1.2 `CacheListItem` 接口新增 `firstSlideCanvas?: Slide` 字段（完整的第一个 slide scene 的 canvas 数据）
- [x] 1.3 在 `listCachedClassrooms()` 方法中，遍历 `entry.classroom.scenes` 时，找到第一个 `content.type === 'slide'` 的 scene，提取 `content.canvas` 作为 `firstSlideCanvas`
- [x] 1.4 同步保留现有 `thumbnailUrl` 提取逻辑（降级用）

关键代码位置：`src/services/openmaic/cache.ts` 第 30-42 行（类型定义）、第 180-232 行（提取逻辑）

## 2. LessonCard 组件升级 — 接入 ThumbnailSlide

- [x] 2.1 在 `src/components/learning/LessonCard.tsx` 中 import `ThumbnailSlide` 组件和 `Slide` 类型
- [x] 2.2 `LessonCardProps` 新增可选 prop `slide?: Slide`（完整 slide 数据）
- [x] 2.3 修改缩略图区域渲染逻辑，实现三级降级：
  - 有 `slide` → 使用 `<ThumbnailSlide slide={slide} size={thumbWidth} viewportSize={slide.viewportSize ?? 1000} viewportRatio={slide.viewportRatio ?? 0.5625} />`
  - 无 slide 但有 `thumbnailUrl` → 保持现有 `<img>` 渲染
  - 都没有 → 保持现有科目 emoji
- [x] 2.4 缩略图区域 size 计算：使用 `useRef` + `ResizeObserver` 获取缩略图容器 div 的实际 `clientWidth`
- [x] 2.5 ThumbnailSlide 外层 div 确保 `overflow: hidden`、锁定状态 filter 正确应用

## 3. NativeClassroom 页面适配

- [x] 3.1 在 `src/pages/NativeClassroom.tsx` 中，`LessonCard` 调用处新增 `slide={lesson.firstSlideCanvas}` prop
- [x] 3.2 确认 `cachedLessons` 列表来自 `ClassroomCache.listCachedClassrooms()` 返回值，`firstSlideCanvas` 已随列表数据一并返回

关键代码位置：第 441-449 行

## 4. GenerationPreview 页面适配

- [x] 4.1 在 `src/pages/GenerationPreview.tsx` 中 import `ThumbnailSlide` 组件
- [x] 4.2 修改 `LessonPreviewCard` 组件缩略图渲染区域，实现三级降级逻辑
- [x] 4.3 使用 `item.firstSlideCanvas` 数据渲染 ThumbnailSlide
- [x] 4.4 使用 `useRef` + `ResizeObserver` 获取缩略图区域实际宽度

## 5. 端到端验证

- [x] 5.1 编译验证：TypeScript 类型检查无新增错误（4 个修改文件均通过）
- [x] 5.2 构建验证：`vite build` 成功，构建产物含 `firstSlideCanvas`(8处) + `ResizeObserver`(15处)，已部署到 Docker 容器
- [x] 5.3 代码逻辑验证：
  - LessonCard: 三级降级 `showSlide → showImg → showEmoji` 条件互斥正确
  - GenerationPreview: LessonPreviewCard 同样实现三级降级
  - cache.ts: `firstSlideCanvas` 提取逻辑与 `thumbnailUrl` 在同一循环中，零额外性能开销
  - NativeClassroom: `slide={lesson.firstSlideCanvas}` prop 正确传递
  - ThumbnailSlide: `transform: scale(size/viewportSize)` + `origin-top-left` 缩放机制完备
  - 锁定状态滤镜: `filter: grayscale(0.5) brightness(0.85)` 应用于 ThumbnailSlide 外层 div
  - 溢出保护: `overflow: hidden` 在缩略图容器和 ThumbnailSlide 自身双重设置
- [ ] 5.4 运行时视觉验证（需手动）：登录后进入课程选择页确认实际渲染效果
