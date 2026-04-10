## 1. 扩展缓存列表返回缩略图信息

- [x] 1.1 在 `CacheListItem` 接口中新增 `thumbnailUrl?: string` 字段（`src/services/openmaic/cache.ts`）
- [x] 1.2 修改 `ClassroomCache.listCachedClassrooms()` 方法，遍历 classroom scenes/slides 提取第一个非空 `imageUrl` 作为 `thumbnailUrl`

## 2. 拆分 useLearningFlow 为两步

- [x] 2.1 在 `useLearningFlow` 中新增 `cachedLessons` 状态（`CacheListItem[]`）和 `showLessonPicker` 状态（`boolean`）
- [x] 2.2 新增 `loadCachedLessons(subject)` 方法：调用 `listCachedClassrooms()` 填充 `cachedLessons`，设置 `showLessonPicker = true`，不自动加载课堂
- [x] 2.3 新增 `startLesson(knowledgeNodeId, date)` 方法：从缓存加载指定课堂数据，进入 ClassroomIframe 渲染（复用原 `startFlow` 的后半段逻辑）
- [x] 2.4 修改 `LearningFlowState` 接口，导出新增状态和方法

## 3. 新建 LessonCard 组件

- [x] 3.1 创建 `src/components/learning/LessonCard.tsx`，接收 props：`title`, `thumbnailUrl`, `subject`, `isLocked`, `onTap`
- [x] 3.2 实现卡片 UI：圆角 28px、缩略图/emoji fallback、标题、锁定叠层（半透明遮罩 + 🔒图标）、Framer Motion 按压动画
- [x] 3.3 锁定状态下点击触发轻弹动画（`whileTap={{ scale: 0.97 }}`），不触发 `onTap` 回调

## 4. LearningSession 页面集成课程选择视图

- [x] 4.1 修改"开始学习"按钮的 `handleStart`：从直接 `startFlow()` 改为调用 `loadCachedLessons(subject)`
- [x] 4.2 新增 `showLessonPicker` 条件渲染分支：在科目选择和课堂学习之间插入课程列表视图
- [x] 4.3 实现课程列表布局：水平滚动或网格排列 `LessonCard` 组件，第一张卡片为可学习状态，其余锁定
- [x] 4.4 卡片点击处理：调用 `startLesson(nodeId, date)` 进入课堂
- [x] 4.5 空缓存处理：`cachedLessons.length === 0` 时显示"课程准备中"提示和返回按钮

## 5. 验证与完善

- [x] 5.1 端到端手工验证：科目选择 → 课程列表展示 → 点击第一课 → 进入课堂 → 完成 → 再次进入 → 列表更新
- [x] 5.2 确保 TypeScript 编译通过 0 错误，ESLint 0 新增警告

## 6. 代码审查修复

- [x] C2: `stopFlow` 在 lesson picker 阶段退出时跳过 `endSession`/`onSessionEnd`，避免状态不一致
- [x] I1: 空缓存时 `showLessonPicker = true`，展示课程选择器空状态而非走兜底路径
- [x] I2: `startLesson` 添加 `startLessonLockRef` 防连击 guard
- [x] I3: `listCachedClassrooms` 返回前按 `cachedAt` 升序排序
