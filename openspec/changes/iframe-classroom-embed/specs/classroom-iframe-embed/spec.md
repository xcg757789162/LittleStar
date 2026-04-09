## ADDED Requirements

### Requirement: iframe 课堂嵌入组件
系统 SHALL 提供 `ClassroomIframe` 组件，通过 iframe 加载 OpenMAIC 原生课堂前端页面，展示完整的课堂播放体验（画布渲染、角色系统、TTS 语音、动作编排）。

#### Scenario: 正常加载课堂
- **WHEN** 课堂生成完成且 `classroomUrl` 存在
- **THEN** 系统 MUST 使用 `ClassroomIframe` 组件通过 iframe 嵌入 OpenMAIC 原生前端课堂页面，iframe src MUST 使用 proxy 路径（`/openmaic/...`）而非直接指向 OpenMAIC 服务地址

#### Scenario: iframe 加载超时降级
- **WHEN** iframe 在 5 秒内未触发 load 事件或未收到 `OPENMAIC_READY` 消息
- **THEN** 系统 MUST 自动切换到 `ClassroomView` 自渲染模式，并在控制台记录降级原因

#### Scenario: classroomUrl 不存在
- **WHEN** 课堂数据中 `classroomUrl` 为空或未定义
- **THEN** 系统 MUST 直接使用 `ClassroomView` 自渲染模式，无需尝试 iframe 加载

### Requirement: iframe 宿主通信桥
系统 SHALL 通过 `postMessage` 协议建立 iframe 与宿主页面的双向通信通道，支持接收课堂事件。

#### Scenario: 接收课堂完成事件
- **WHEN** iframe 内 OpenMAIC 前端发送 `OPENMAIC_CLASSROOM_COMPLETE` 消息
- **THEN** 宿主 MUST 触发 `onComplete` 回调，将课堂完成数据回写到学习记录

#### Scenario: 接收答题事件
- **WHEN** iframe 内 OpenMAIC 前端发送 `OPENMAIC_QUIZ_ANSWER` 消息
- **THEN** 宿主 MUST 触发 `onQuizAnswer` 回调，记录答题结果

#### Scenario: 通信不可用降级
- **WHEN** OpenMAIC 原生前端未实现 postMessage 协议
- **THEN** 系统 MUST 通过用户手动操作（点击"完成课堂"按钮）来结束课堂，并记录课堂已完成（无详细答题数据）

### Requirement: Classroom 类型扩展
`Classroom` 类型 SHALL 包含 `classroomUrl` 可选字段，用于存储 OpenMAIC 原生前端的课堂页面 URL。

#### Scenario: classroomUrl 字段传递
- **WHEN** OpenMAIC API 返回课堂数据包含 URL 信息
- **THEN** `client.ts` MUST 将 URL 映射到 `Classroom.classroomUrl` 字段，并通过 proxy 路径转换（将 `http://localhost:3000/...` 转换为 `/openmaic/...`）

### Requirement: Vite Proxy 扩展
Vite 开发服务器 SHALL 配置 `/openmaic` 路由代理到 OpenMAIC 服务，支持 iframe 内资源加载。

#### Scenario: 静态资源代理
- **WHEN** iframe 内请求 `/openmaic/_next/...` 等 Next.js 静态资源
- **THEN** Vite proxy MUST 正确代理到 OpenMAIC 服务并返回资源

#### Scenario: 剥离 iframe 限制 header
- **WHEN** OpenMAIC 服务返回 `X-Frame-Options` 或 `Content-Security-Policy` header
- **THEN** Vite proxy MUST 在 proxyRes 阶段删除这些 header，确保 iframe 能正常加载

### Requirement: 课堂完成按钮
当 iframe 通信不可用时，系统 SHALL 在 iframe 上层提供"完成课堂"悬浮按钮，允许用户手动结束课堂。

#### Scenario: 显示完成按钮
- **WHEN** iframe 加载成功但未在 10 秒内收到 `OPENMAIC_READY` 消息（表示通信不可用）
- **THEN** 系统 MUST 在 iframe 右上角显示悬浮的"完成课堂"按钮

#### Scenario: 手动完成课堂
- **WHEN** 用户点击"完成课堂"按钮
- **THEN** 系统 MUST 弹出确认对话框，确认后触发 `onComplete` 回调并销毁 iframe

### Requirement: iframe 生命周期管理
系统 SHALL 正确管理 iframe 的创建和销毁，避免内存泄漏。

#### Scenario: 课堂结束销毁 iframe
- **WHEN** 课堂完成或用户离开课堂页面
- **THEN** 系统 MUST 销毁 iframe DOM 元素并清理所有 message 事件监听器

#### Scenario: 组件卸载清理
- **WHEN** `ClassroomIframe` 组件被 React 卸载
- **THEN** 系统 MUST 在 useEffect cleanup 中移除所有事件监听器并置空 iframe ref
