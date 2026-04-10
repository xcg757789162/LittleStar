## ADDED Requirements

### Requirement: Nginx SHALL proxy OpenMAIC internal data paths
Nginx 网关 MUST 新增 `/data/` 路径的反向代理规则，将浏览器（含 iframe 内）对 `/data/*` 的请求转发到 OpenMAIC 容器（`openmaic:3002`），使 iframe 内 OpenMAIC 前端引用的内部图片路径可达。

#### Scenario: iframe 内请求 OpenMAIC 生成的图片
- **WHEN** iframe 内的 OpenMAIC 前端请求 `/data/classroom-jobs/{jobId}/image.png`
- **THEN** Nginx MUST 将请求代理到 `http://openmaic:3002/data/classroom-jobs/{jobId}/image.png` 并返回图片内容

#### Scenario: 请求不存在的 data 路径
- **WHEN** 浏览器请求 `/data/nonexistent/file.png` 且 OpenMAIC 返回 404
- **THEN** Nginx MUST 透传 OpenMAIC 的 404 响应，不进行重试或回退

#### Scenario: data 路径的 CORS 支持
- **WHEN** iframe 内的请求携带跨域头访问 `/data/*` 资源
- **THEN** Nginx MUST 返回 `Access-Control-Allow-Origin: *` 头，允许跨域图片加载

### Requirement: URL resolution SHALL normalize image paths
`resolveMediaUrl()` 工具函数 MUST 识别并正确处理以下 URL 格式：
- `/media/*` → 本地持久化路径，直接返回
- `/data/*` → OpenMAIC 内部路径，直接返回（通过 Nginx 代理可达）
- `/openmaic/*` → OpenMAIC 带前缀路径，直接返回
- `http(s)://*` 外部 URL → 直接返回

#### Scenario: 处理本地 media 路径
- **WHEN** `resolveMediaUrl('/media/abc123.jpg')` 被调用
- **THEN** 函数 MUST 返回 `'/media/abc123.jpg'` 不做任何修改

#### Scenario: 处理 OpenMAIC data 路径
- **WHEN** `resolveMediaUrl('/data/classroom-jobs/123/image.png')` 被调用
- **THEN** 函数 MUST 返回 `'/data/classroom-jobs/123/image.png'` 不做任何修改

#### Scenario: 处理外部 CDN URL
- **WHEN** `resolveMediaUrl('https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx/output.png')` 被调用
- **THEN** 函数 MUST 返回原始 URL 不做修改

#### Scenario: 处理 undefined 输入
- **WHEN** `resolveMediaUrl(undefined)` 被调用
- **THEN** 函数 MUST 返回 `undefined`

### Requirement: Data conversion SHALL apply URL resolution
`convertTeachingScene()` 和所有数据转换函数在提取 `imageUrl` 时 MUST 通过 `resolveMediaUrl()` 进行 URL 解析，确保所有图片 URL 在进入渲染层之前已经过统一处理。

#### Scenario: 转换包含图片的教学场景
- **WHEN** `convertTeachingScene()` 从 canvas elements 提取 `imageUrl`
- **THEN** 提取的每个 `imageUrl` MUST 经过 `resolveMediaUrl()` 处理后再赋值给 Slide 对象

#### Scenario: 转换不含图片的教学场景
- **WHEN** canvas elements 中没有 image 类型元素
- **THEN** Slide 对象的 `imageUrl` MUST 为 `undefined`，不触发 URL 解析

### Requirement: All Slide components SHALL use resolveMediaUrl
`ImageSlide`、`TeachingSlide`、`QuizSlide`、`TPRSlide` 组件在渲染图片时 MUST 使用 `resolveMediaUrl()` 包裹 `slide.imageUrl`，确保双重保障（数据层 + 渲染层）。

#### Scenario: ImageSlide 渲染图片
- **WHEN** `ImageSlide` 接收到包含 `imageUrl` 的 slide 数据
- **THEN** `<img>` 标签的 `src` 属性 MUST 使用 `resolveMediaUrl(slide.imageUrl)` 的返回值

#### Scenario: TeachingSlide 渲染图片
- **WHEN** `TeachingSlide` 接收到包含 `imageUrl` 的 slide 数据
- **THEN** `<img>` 标签的 `src` 属性 MUST 使用 `resolveMediaUrl(slide.imageUrl)` 的返回值
