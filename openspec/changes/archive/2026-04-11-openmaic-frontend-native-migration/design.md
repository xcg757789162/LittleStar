## Context

LittleStar（小星辰）是面向 2-8 岁幼儿的英语启蒙 App，底层依赖 OpenMAIC 服务生成 AI 课堂。当前架构通过 iframe 嵌入 OpenMAIC 原生前端，存在以下问题：

- **iframe 隔离导致通信受限**：宿主和 iframe 只能通过 postMessage 通信，答题数据、学习进度等无法实时同步
- **体验割裂**：iframe 内外样式不统一，过渡动画断裂，加载感受不连贯
- **性能损耗**：额外的浏览器上下文、双重 React 运行时、内存占用翻倍
- **功能受限**：无法深度定制 OpenMAIC 的 UI（如适配儿童友好设计），无法访问内部状态

OpenMAIC 是一个基于 Next.js App Router 的全栈应用，前端约 28,000+ 行代码，包含完整的课堂渲染引擎（Stage/Canvas/Chat/Roundtable/Quiz/PBL）。LittleStar 是 Vite + React SPA。

完整的 OpenMAIC 源码分析见：`docs/openmaic-source-analysis.md`

## Goals / Non-Goals

**Goals:**
- 将 OpenMAIC 前端约 28,000+ 行代码完全移植到 LittleStar 的 Vite + React SPA 中，实现原生渲染
- 去掉 iframe 中转层（约 3,900 行），课堂体验与 OpenMAIC 原生前端 100% 一致
- 保留 OpenMAIC API 后端不动（25 个 API 端点继续运行在 Next.js 进程中），前端通过 HTTP 调用
- 保留 LittleStar 独有的 Pipeline Client（预生成+课程规划+缓存）能力
- 用 OpenMAIC 的 Generation Preview 替换当前的"今日课程"选择页
- 用 OpenMAIC 的 Dashboard/历史替换/增强现有的复习功能
- 用 OpenMAIC 的 Settings 面板替换现有的设置面板
- 课堂内保持 OpenMAIC 原样式，课堂外适配 LittleStar 儿童友好设计
- 全局统一使用 Zustand 状态管理

**Non-Goals:**
- 不修改 OpenMAIC 后端 API 端点的逻辑
- 不重写 OpenMAIC 的渲染引擎（原样移植）
- 不替换 LittleStar 的 Pipeline Client 为 OpenMAIC 的 use-scene-generator（两套共存）
- 不移植 OpenMAIC 的服务端 Lib（保留在 Next.js 进程中）
- 不改变现有的 Docker 部署架构（OpenMAIC 仍作为独立服务运行）

## Decisions

### D1: 移植方式 — 前端全移植 + API 后端保留

**选择**：将 OpenMAIC 的全部前端代码（Components ~18,000 行 + Lib ~10,000 行）移植到 LittleStar 的 Vite + React 项目中，作为原生 React 组件直接渲染。OpenMAIC 的 25 个 API 端点继续运行在 Next.js 后端，LittleStar 通过 HTTP 调用。

**理由**：
- 前端移植后可完全控制 UI/UX，深度定制儿童友好设计
- 单一 React 运行时，性能最优
- API 后端不动，避免重复实现服务端 AI 编排逻辑
- 前后端职责清晰分离

**替代方案**：
- iframe 嵌入（当前方案）— 体验割裂，通信受限
- 完全独立运行 OpenMAIC — 无法定制，两套独立 App
- 后端也移植（合并为一个 Node.js 进程）— 工作量巨大，需要在 Vite 中实现 SSR 或额外的服务端

### D2: 生成逻辑 — Pipeline Client 和 OpenMAIC 组件共存

**选择**：LittleStar 的 Pipeline Client（预生成模式，课前一次性批量生成）和 OpenMAIC 的 use-scene-generator（实时生成模式，逐场景按需生成）两套共存。

**理由**：
- Pipeline Client 调用的就是 OpenMAIC 的原生 API，不存在能力差异
- Pipeline Client 额外提供了 LittleStar 独有的课程规划（LessonPlanner）、缓存管理（GenerationScheduler）等能力
- 预生成模式适合幼儿场景（课前准备好，上课不卡顿）
- OpenMAIC 的实时生成作为补充，支持更灵活的运行时交互

**分工**：
- **预生成**（课前准备）：Home 页面 → LessonPlanner → RequirementGenerator → Pipeline Client → 缓存
- **运行时**（课堂内交互）：OpenMAIC 的 Chat/Roundtable/Quiz 组件直接调用 `/api/chat`、`/api/quiz-grade` 等

### D3: 数据格式 — Pipeline Client 保存原始数据

**选择**：修改 Pipeline Client 的 `assembleScene` 逻辑，不再将 OpenMAIC 的 Canvas JSON 转换为简化的 `Slide` 对象，而是保存 OpenMAIC API 返回的原始 Scene/Canvas JSON。

**理由**：
- 移植后的 Stage 组件期望的就是 OpenMAIC 原始数据格式
- 零适配，渲染效果 100% 一致
- 避免数据转换过程中的信息丢失

### D4: 移植范围 — 完全移植，一次到位

**选择**：不分批，全部模块一次性移植完成。

**模块对应关系**：

| OpenMAIC 模块 | 替换 LittleStar 的 | 效果 |
|---|---|---|
| Stage + Canvas + Chat | iframe 课堂 | 原生课堂体验 |
| Quiz/评分/Roundtable/PBL | 现有简化版交互 | 满血交互模式 |
| Generation Preview | "今日课程"选择页 | 更好看 + 可预览场景 |
| Dashboard/历史记录 | 现有复习功能 | 完整学习记录 |
| Settings 面板 | 现有设置面板 | 更丰富的配置项 |
| use-scene-generator | 无（新增能力） | 运行时动态生成 |

### D5: 路由结构

**选择**：

```
/                     → Home（保留 LittleStar 独有的智能排课首页）
/classroom            → 原生课堂（替代 /learning 的 iframe）
/preview              → 课程预览（OpenMAIC Generation Preview 替换 /lesson-picker）
/history              → 学习历史/复习（OpenMAIC Dashboard 替换现有复习）
/parent               → 家长面板（保留，整合 OpenMAIC 设置面板）
/parent/settings      → 设置（OpenMAIC Settings 替换现有设置）
```

**理由**：
- Home 首页保留 — LittleStar 的智能排课是独有能力
- 课程选择页用 Preview 替换 — 不仅选课还能预览场景内容
- 课堂页面原生化 — 不再用 iframe
- 新增历史/复习页面 — 用 OpenMAIC 的 Dashboard
- 设置整合到家长面板下 — 逻辑清晰

### D6: 样式策略 — 分区处理

**选择**：
- **课堂内部**（Stage/Canvas/Chat/Roundtable/Quiz）：保持 OpenMAIC 原样式
- **课堂外部**（Preview/History/Settings 等页面框架）：适配 LittleStar 儿童友好设计

**实现方式**：
1. shadcn/ui 组件全部移植，作为基础组件库
2. 用 LittleStar 的 Tailwind 主题变量覆盖 shadcn 默认主题
3. 课堂渲染区域用 OpenMAIC 原始样式（Canvas 内部不受外部主题影响）
4. 页面壳（导航栏、卡片布局等）用 LittleStar 儿童友好设计

### D7: 状态管理 — Zustand 统一

**选择**：以 Zustand 为主，将 OpenMAIC 的 Context 状态迁移到 Zustand store。

**理由**：
- LittleStar 已全面使用 Zustand
- 课堂状态需被多模块访问（课堂、家长面板、历史记录），全局 store 更合适
- OpenMAIC 本身也用了 Zustand（`canvas-store`, `stage-store`, `settings-store` 等），迁移成本低

**Store 规划**：
- 保留 LittleStar 现有 store：`useAppStore`, `useLearningStore`, `useParentStore`
- 移植 OpenMAIC store：`useCanvasStore`, `useStageStore`, `useSettingsStore`, `useSnapshotStore`
- 新增桥接 store：`useClassroomBridgeStore`（连接预生成数据和 Stage 组件）

### D8: Next.js → Vite 适配策略

**确定性技术工作**：
1. **服务端组件 → 客户端组件**：`async` 组件改为普通组件 + `useEffect`
2. **`next/image` → `<img>`**：直接替换，必要时用懒加载
3. **`next/link` → React Router `<Link>`**：直接替换
4. **`next/font` → Tailwind 字体配置**
5. **API 路由不移植**：直接调 OpenMAIC 后端
6. **文件路由 → React Router**：在 `router.tsx` 统一配置
7. **环境变量**：`NEXT_PUBLIC_xxx` → `VITE_xxx`
8. **`'use client'` 指令**：全部移除（Vite 中无意义）

### D9: 依赖升级

移植需要升级/新增以下依赖：

| 依赖 | 当前 | 目标 | 原因 |
|---|---|---|---|
| React | 18 | 19 | OpenMAIC 使用 React 19 |
| Zustand | 4.x | 5.x | OpenMAIC 使用 Zustand 5 |
| motion | framer-motion 10 | motion 12 | OpenMAIC 使用 motion 12 |
| ProseMirror | 无 | 新增 | 富文本编辑器 |
| Vercel AI SDK | 无 | 新增（`ai` 包） | Chat 模块 `UIMessage` 类型 |
| KaTeX | 无 | 新增 | LaTeX 公式渲染 |
| shadcn/ui | 部分 | 补齐至 32 组件 | UI 组件库 |

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 28,000+ 行代码一次性移植，工作量大 | 实施周期长，可能引入大量 bug | 按模块拆分任务，每个模块独立验证 |
| React 18→19 升级可能有 breaking changes | 现有功能回归 | 先升级 React，确保现有功能通过后再移植 |
| Next.js 特定 API 在 Vite 中不可用 | 编译错误或运行时错误 | 建立完整的 Next.js → Vite 适配清单 |
| OpenMAIC 上游更新后需要同步 | 长期维护成本 | 保持目录结构与上游一致，便于 diff 对比 |
| 数据格式从简化版改为原始 Canvas JSON | Pipeline Client 改动较大 | 同时更新缓存层，确保存取一致 |
| shadcn/ui 全量引入增加包体积 | 首屏加载变慢 | 代码分割（lazy import），按路由拆分 |
| Vercel AI SDK 在非 Next.js 环境可能有兼容问题 | Chat 功能异常 | 评估是否需要用纯 fetch 替代 AI SDK 的客户端调用 |
