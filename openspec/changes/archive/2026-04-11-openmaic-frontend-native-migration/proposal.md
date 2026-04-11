# OpenMAIC 前端原生移植

## Summary

将 OpenMAIC 前端约 28,000+ 行代码从 iframe 嵌入模式完全移植为 LittleStar 的原生 React 组件，去掉 iframe 中转层，实现课堂体验与 OpenMAIC 原生前端 100% 一致。同时用 OpenMAIC 的 Generation Preview、Dashboard、Settings 面板替换 LittleStar 现有的课程选择页、复习功能和设置面板。

## Motivation

当前通过 iframe 嵌入 OpenMAIC 前端存在三大问题：
1. **体验割裂** — iframe 内外样式不统一，过渡动画断裂，无法深度定制儿童友好 UI
2. **通信受限** — 答题数据、学习进度等只能通过 postMessage 传递，实时性和可靠性差
3. **性能损耗** — 双重 React 运行时，额外的浏览器上下文，低端设备容易卡顿

## Approach

- **前端全移植**：Components（18,000+ 行）+ Lib（10,000+ 行）全部移植到 Vite + React SPA
- **API 后端保留**：25 个 API 端点继续运行在 OpenMAIC 的 Next.js 进程中
- **Pipeline Client 保留**：LittleStar 独有的预生成 + 课程规划 + 缓存能力不变
- **Next.js → Vite 适配**：服务端组件转客户端、替换 Next.js 特有 API、文件路由转 React Router
- **样式分区**：课堂内保持 OpenMAIC 原样式，课堂外适配儿童友好设计
- **Zustand 统一**：全局状态管理统一使用 Zustand

## Scope

11 个任务大类，覆盖依赖升级、类型/Store 移植、引擎层移植、渲染器移植、组件移植、页面替换、Pipeline Client 改造、样式适配、端到端验证。

详见 `tasks.md`。
