## 1. Vite Proxy 扩展

- [x] 1.1 在 `vite.config.ts` 中新增 `/openmaic` proxy 规则，代理到 `http://localhost:3000`，rewrite 去掉 `/openmaic` 前缀，并在 `proxyRes` 中删除 `x-frame-options` 和 `content-security-policy` header
- [x] 1.2 新增 `/_next`、`/api`、`/avatars` 代理规则（iframe 内页面的静态资源和 API 请求）
- [x] 1.3 验证 proxy 生效：所有代理路径返回正确 Content-Type 和状态码

## 2. Classroom 类型扩展与数据链路

- [x] 2.1 在 `src/services/openmaic/types.ts` 的 `Classroom` 接口中添加 `classroomUrl?: string` 可选字段
- [x] 2.2 修改 `src/services/openmaic/client.ts` 的 `getClassroomStatus()` 方法，将 `classroomUrl` 存入 Classroom 正式字段（替代原 `_meta`）
- [x] 2.3 修改 `pollUntilComplete()` 方法，确保 classroomUrl 在完成时正确传递到最终返回的 Classroom 对象

## 3. ClassroomIframe 组件

- [x] 3.1 创建 `src/components/classroom/ClassroomIframe.tsx` — iframe 嵌入组件，接收 `classroomUrl`、`onComplete`、`onAnswer` 等 props
- [x] 3.2 实现 iframe 加载状态管理：loading 骨架屏动画 → iframe 显示 → 超时/错误降级（15s）
- [x] 3.3 实现悬浮"完成课堂"按钮：加载完成 5s 后显示，支持学科配色

## 4. postMessage 通信桥

- [x] 4.1 创建 `src/hooks/useClassroomBridge.ts` — postMessage 通信 Hook，封装消息监听、来源验证、事件分发
- [x] 4.2 定义通信协议类型：`classroom:ready`、`classroom:complete`、`classroom:quiz-answer`、`classroom:scene-change`、`classroom:error`
- [x] 4.3 实现 useEffect cleanup：组件卸载时移除所有 message 监听器、重置 isReady 状态

## 5. 渲染入口切换与降级

- [x] 5.1 修改 `src/pages/LearningSession.tsx`，根据 `classroom.classroomUrl` 是否存在 + `useIframeFallback` 状态选择渲染 `ClassroomIframe` 或 `ClassroomView`
- [x] 5.2 实现三级降级链路：iframe 优先 → iframe 失败切 ClassroomView → classroomUrl 不存在直接 ClassroomView
- [x] 5.3 对接 `useLearningFlow` 的 `handleClassroomComplete`，确保 iframe 完成事件正确触发学习记录保存

## 6. 端到端验证

- [x] 6.1 Proxy 验证通过：`/openmaic/classroom/[id]` 200 OK + SAMEORIGIN、`/_next/static` 200 OK、`/api` 200 OK、`/avatars` 200 OK
- [x] 6.2 降级机制代码审查确认：无 classroomUrl 时自动降级、iframe 超时/错误时提供重试和简化版选项
- [x] 6.3 完成流程代码审查确认：悬浮按钮 → onComplete → handleClassroomComplete → DB 写入

## 7. PreCI 代码规范检查

- [x] TypeScript 类型检查通过（0 新增错误，修复 1 个已有错误）
- [x] ESLint 检查通过（新文件 0 错误）
