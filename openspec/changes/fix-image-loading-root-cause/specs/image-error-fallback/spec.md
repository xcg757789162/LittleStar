## ADDED Requirements

### Requirement: Image components SHALL display fallback on load failure
所有渲染图片的课堂组件（`ImageSlide`、`TeachingSlide`、`QuizSlide`、`TPRSlide`）MUST 在图片加载失败时显示友好的占位图，而非空白或破碎图标。

#### Scenario: 图片 URL 返回 404
- **WHEN** `<img>` 的 `src` URL 返回 HTTP 404
- **THEN** 组件 MUST 触发 `onError` 回调，隐藏 `<img>` 标签，显示包含🖼️ emoji 的占位区域
- **AND** 占位区域 MUST 有明确的视觉边界（圆角矩形 + 浅灰背景）

#### Scenario: 图片 URL 网络超时
- **WHEN** `<img>` 的 `src` URL 因网络超时无法加载
- **THEN** 组件 MUST 在浏览器触发 error 事件后显示占位图

#### Scenario: 图片 URL 为空字符串
- **WHEN** `slide.imageUrl` 为空字符串 `""`
- **THEN** 组件 MUST 直接显示占位图，不尝试加载

#### Scenario: 图片成功加载
- **WHEN** `<img>` 的 `src` URL 正常返回图片内容
- **THEN** 组件 MUST 正常显示图片，不显示占位图

### Requirement: Fallback placeholder SHALL have consistent visual design
占位图 MUST 在所有课堂组件中保持一致的视觉设计：
- 背景色：`#EDF2F7`（浅灰蓝）
- 圆角：`20px`
- 居中显示 🖼️ emoji（字号 48px）
- 尺寸：宽度 `200px`、高度 `200px`

#### Scenario: ImageSlide 占位图样式
- **WHEN** `ImageSlide` 显示占位图
- **THEN** 占位图 MUST 使用 200×200px、`#EDF2F7` 背景、20px 圆角、48px 🖼️ emoji

#### Scenario: TeachingSlide 占位图样式
- **WHEN** `TeachingSlide` 显示占位图
- **THEN** 占位图 MUST 与 `ImageSlide` 使用完全相同的占位图样式

### Requirement: Image loading state SHALL be tracked per component
每个图片组件实例 MUST 独立跟踪自身图片的加载状态（loading → loaded / error），避免全局状态污染。

#### Scenario: 多张图片同时渲染
- **WHEN** 课堂中同时渲染 3 张图片，其中 1 张加载失败
- **THEN** 仅加载失败的那张显示占位图，其他 2 张正常显示

#### Scenario: 组件重新渲染时重置状态
- **WHEN** `slide.imageUrl` 发生变化（props 更新）
- **THEN** 组件 MUST 重置图片加载状态，重新尝试加载新的 URL
