# OpenMAIC 源码全面分析报告

> 生成时间：2026-04-11
> 源码路径：`/Users/chenguoxie/CodeBuddy/OpenMAIC-upstream`
> GitHub：https://github.com/THU-MAIC/OpenMAIC
> 用途：LittleStar "满血版"移植参考

---

## 一、项目概况

- **框架**：Next.js (App Router) + React 19 + TypeScript
- **状态管理**：Zustand 5.x
- **动画**：motion 12.x (`motion/react`)
- **样式**：Tailwind CSS
- **图标**：Lucide React
- **UI 库**：shadcn/ui (32 个组件)
- **富文本**：ProseMirror
- **AI SDK**：Vercel AI SDK (`ai` 包, `UIMessage` 类型)

---

## 二、Components（渲染组件层）— 约 18,000+ 行

### 2.1 Stage 核心容器

| 文件 | 行数 | 说明 |
|------|------|------|
| `components/stage.tsx` | ~1,237 | **核心 Stage 容器** — PlaybackEngine 编排、场景切换、键盘快捷键（←→空格F键）、讨论 SSE（`/api/chat`）、全屏演示模式、ChatArea/Roundtable/CanvasArea 集成 |
| `components/stage/scene-renderer.tsx` | ~37 | 场景类型路由：slide→SlideEditor, quiz→QuizView, interactive→InteractiveRenderer, pbl→PBLRenderer |

**Stage 关键功能**：
- PlaybackEngine 状态机编排（idle/playing/paused/live）
- 场景切换逻辑（自动/手动）
- SSE 讨论流（`/api/chat` 端点）
- 全屏演示模式（F 键切换）
- 键盘快捷键（← → 空格 F）
- 布局：左侧 ChatArea + 中间 SceneRenderer/Roundtable + 右侧 CanvasArea
- 缩略图面板（上方）
- 音频播放控制

### 2.2 Slide Renderer（PPT 渲染引擎）

| 目录/文件 | 文件数 | 行数 | 说明 |
|-----------|--------|------|------|
| `components/slide-renderer/` | 93 | ~9,694 | 完整的 PPT 级幻灯片渲染引擎 |

**8 种元素类型**：
1. **Text** — ProseMirror 富文本编辑器（支持 HTML 渲染 + 编辑模式）
2. **Image** — 图片元素（含缩放、裁剪）
3. **Shape** — 矢量形状（矩形/圆/三角/箭头/星形等 50+ 种）
4. **Line** — 线条/箭头/连接器
5. **Chart** — 图表（柱状/折线/饼图/环形/面积/散点/雷达）
6. **Table** — 表格渲染
7. **LaTeX** — 数学公式（KaTeX 渲染）
8. **Video** — 视频元素

**核心子系统**：
- `editor/` — Canvas 编辑器（选择/拖拽/缩放/旋转）
- `thumbnail/` — 缩略图生成
- `scale/` — 视口缩放系统
- `overlay/` — 聚光灯、激光笔、高亮覆盖层
- `animations/` — 元素进入/退出动画
- `background/` — 背景渲染（纯色/渐变/图片/图案）

### 2.3 Scene Renderers（场景渲染器）

| 文件 | 行数 | 说明 |
|------|------|------|
| `scene-renderers/quiz-renderer.tsx` | ~84 | 测验渲染器入口 |
| `scene-renderers/quiz-view.tsx` | ~35KB | **完整 Quiz 系统** — 4 阶段：封面→答题→AI 评分(`/api/quiz-grade`)→成绩报告。支持单选/多选/填空/简答。AI 评分使用 SSE 流式返回 |
| `scene-renderers/interactive-renderer.tsx` | ~73 | 交互式内容渲染器（iframe 嵌入 + HTML 补丁注入） |
| `scene-renderers/pbl-renderer.tsx` | ~130 | **PBL 渲染器** — 角色选择→工作区 |
| `scene-renderers/pbl/chat-panel.tsx` | ~300+ | PBL 聊天面板 |
| `scene-renderers/pbl/guide.tsx` | ~100+ | PBL 引导 |
| `scene-renderers/pbl/issueboard-panel.tsx` | ~200+ | PBL 看板（Issue Board） |
| `scene-renderers/pbl/role-selection.tsx` | ~150+ | PBL 角色选择 |
| `scene-renderers/pbl/workspace.tsx` | ~200+ | PBL 工作区 |
| `scene-renderers/pbl/use-pbl-chat.ts` | ~300+ | PBL 聊天 Hook（调用 `/api/pbl/chat`） |

**Quiz 4 阶段状态机**：
```
cover → answering → grading → report
```
- cover：展示题目封面
- answering：用户答题（计时、选项选择）
- grading：AI 评分（SSE 流式，调用 `/api/quiz-grade`）
- report：成绩报告（分数/评语/详细反馈）

### 2.4 Roundtable（多 Agent 圆桌讨论）

| 文件 | 行数 | 说明 |
|------|------|------|
| `roundtable/index.tsx` | ~2,095 | **核心圆桌讨论 UI** |
| `roundtable/voice-wave.tsx` | ~200+ | 语音波形动画 |
| `roundtable/presentation-overlay.tsx` | ~200+ | 演示模式叠加层 |
| `roundtable/proactive-card.tsx` | ~144 | ProactiveCard（主动提示卡片） |

**圆桌讨论功能**：
- 多 Agent 头像展示（圆形排列）
- 演示模式（PPT 叠加 + Agent 头像缩小）
- 普通模式（Agent 全屏讨论）
- 语音输入（录音→ASR）
- 文本输入
- 讨论暂停/恢复
- 播放速度控制（0.5x/1x/1.5x/2x）
- 实时 TTS 播放（通过 `use-discussion-tts` Hook）
- ProactiveCard（AI 主动提示用户参与）

### 2.5 Canvas（画布区域）

| 文件 | 行数 | 说明 |
|------|------|------|
| `canvas/canvas-area.tsx` | ~10KB | 画布区域容器 |
| `canvas/canvas-toolbar.tsx` | ~15KB | 画布工具栏 |

**工具栏功能**：橡皮擦、画笔（颜色/粗细）、形状（矩形/圆/三角）、文本、撤销/重做、清除

### 2.6 Whiteboard（白板系统）

| 文件 | 行数 | 说明 |
|------|------|------|
| `whiteboard/index.tsx` | ~180 | 白板容器 |
| `whiteboard/whiteboard-canvas.tsx` | ~446 | 白板画布（缩放/平移/元素动画/渲染） |
| `whiteboard/whiteboard-history.tsx` | ~168 | 白板历史快照管理 |

### 2.7 Chat（聊天面板）

| 文件 | 行数 | 说明 |
|------|------|------|
| `chat/chat-area.tsx` | ~341 | **聊天面板容器** — Tabs: Lecture Notes + Chat |
| `chat/chat-session.tsx` | ~368 | 聊天会话（消息气泡/流式动画/Agent 头像） |
| `chat/session-list.tsx` | ~200+ | 会话列表 |
| `chat/lecture-notes-view.tsx` | ~200+ | 课堂笔记视图 |
| `chat/proactive-card.tsx` | ~144 | 主动提示卡片 |
| `chat/use-chat-sessions.ts` | ~1,493 | **聊天会话 Hook** — Agent Loop/SSE 流/StreamBuffer |

**use-chat-sessions 核心功能**：
- Agent Loop 实现（用户消息→AI 回复→工具调用→继续）
- SSE 流式接收（`/api/chat` 端点）
- StreamBuffer 逐字揭示
- 多会话管理（创建/切换/删除）
- 历史消息加载
- 工具调用处理（聚光灯/激光笔/白板绘制等）

### 2.8 Audio（语音）

| 文件 | 行数 | 说明 |
|------|------|------|
| `audio/voice-button.tsx` | ~200+ | 语音按钮（录音→ASR→发送） |
| `audio/tts-config-dialog.tsx` | ~126 | TTS 配置弹窗（语音选择/速度/音调） |

### 2.9 AI Elements（AI 元素组件）

| 目录 | 文件数 | 行数 | 说明 |
|------|--------|------|------|
| `ai-elements/` | ~30 | ~1,000+ | AI 元素组件集合 |

**30 个 AI 元素组件**（部分列表）：
- `prompt-input` — AI 提示输入框
- `message` — AI 消息气泡
- `chain-of-thought` — 思维链展示
- `code-block` — 代码块（语法高亮）
- `reasoning` — 推理过程展示
- `tool-invocation` — 工具调用展示
- `artifact` — AI 生成物展示
- `markdown-renderer` — Markdown 渲染
- `streaming-text` — 流式文本动画
- ... 等等

### 2.10 Agent（Agent UI）

| 文件 | 行数 | 说明 |
|------|------|------|
| `agent/agent-avatar.tsx` | ~100+ | Agent 头像 |
| `agent/agent-bar.tsx` | ~200+ | Agent 栏（语音预览/选择） |
| `agent/agent-config-panel.tsx` | ~200+ | Agent 配置面板 |
| `agent/agent-reveal-modal.tsx` | ~70 | Agent 揭示模态框 |

### 2.11 Generation（生成相关 UI）

| 文件 | 行数 | 说明 |
|------|------|------|
| `generation/generation-progress.tsx` | ~200+ | 生成进度条 |
| `generation/generation-toolbar.tsx` | ~200+ | 生成工具栏 |
| `generation/media-modal.tsx` | ~100+ | 媒体弹窗 |
| `generation/outline-editor.tsx` | ~67 | 大纲编辑器 |

### 2.12 Settings（设置面板）

| 文件 | 行数 | 说明 |
|------|------|------|
| `settings/settings-dialog.tsx` | ~300+ | 设置对话框容器 |
| `settings/model-settings.tsx` | ~300+ | LLM 模型设置（provider/model/apiKey/baseUrl） |
| `settings/audio-settings.tsx` | ~200+ | 音频设置（TTS provider/voice/ASR） |
| `settings/image-settings.tsx` | ~200+ | 图片生成设置 |
| `settings/video-settings.tsx` | ~200+ | 视频生成设置 |
| `settings/pdf-settings.tsx` | ~100+ | PDF 解析设置 |
| `settings/asr-settings.tsx` | ~100+ | ASR 语音识别设置 |
| `settings/agent-settings.tsx` | ~100+ | Agent 设置 |
| `settings/general-settings.tsx` | ~100+ | 通用设置 |
| ... | | 共 14 个文件 |

### 2.13 UI 组件库（shadcn/ui）

| 目录 | 文件数 | 行数 | 说明 |
|------|--------|------|------|
| `ui/` | 32 | ~2,000+ | shadcn/ui 组件库 |

**组件列表**：Button, Dialog, Tabs, Toast, Tooltip, Popover, Select, Input, Textarea, Slider, Switch, Checkbox, RadioGroup, Label, Card, Badge, Separator, ScrollArea, Sheet, DropdownMenu, ContextMenu, Alert, AlertDialog, Avatar, Command, Form, Menubar, NavigationMenu, Progress, Skeleton, Table, Toggle

---

## 三、Lib（核心引擎层）— 约 10,000+ 行

### 3.1 PlaybackEngine（播放引擎）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/playback/engine.ts` | ~742 | **PlaybackEngine 完整状态机** |

**状态机**：
```
idle → playing → paused → live
              ↗          ↙
```

**核心功能**：
- 场景播放编排（顺序/手动）
- Action 调度（依次执行场景内的 Actions）
- Browser TTS 集成
- 播放速度控制
- 暂停/恢复/跳转
- 场景切换回调
- 错误恢复

### 3.2 ActionEngine（动作引擎）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/action/engine.ts` | ~535 | **ActionEngine — 全部 Action 类型执行** |

**15 种 Action 类型**：
1. `speech` — TTS 语音播放
2. `spotlight` — 聚光灯效果
3. `laser-pointer` — 激光笔效果
4. `highlight` — 高亮元素
5. `whiteboard-draw` — 白板绘制
6. `whiteboard-clear` — 白板清除
7. `video-play` — 视频播放
8. `video-pause` — 视频暂停
9. `animation-trigger` — 触发元素动画
10. `navigate` — 场景导航
11. `quiz-start` — 开始测验
12. `zoom` — 缩放效果
13. `pan` — 平移效果
14. `wait` — 等待延时
15. `custom` — 自定义 Action

### 3.3 Types（类型定义）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/types/slides.ts` | ~830 | PPT 元素类型定义 — 9 种元素 + 背景/动画/主题 |
| `lib/types/action.ts` | ~222 | Action 类型定义 — 15 种 Action |
| `lib/types/stage.ts` | ~141 | Stage/Scene/SceneContent 类型定义 |
| `lib/types/chat.ts` | ~338 | 聊天类型定义 — Session/Message/SSE Events |
| `lib/types/generation.ts` | ~229 | 生成类型定义 |
| `lib/types/roundtable.ts` | ~29 | 圆桌讨论类型 |
| `lib/types/index.ts` | ~20 | 导出索引 |
| **总计** | **~2,161** | |

**slides.ts 核心类型**：
- `SlideElement`（联合类型，9 种元素）
- `TextElement`, `ImageElement`, `ShapeElement`, `LineElement`
- `ChartElement`, `TableElement`, `LatexElement`, `VideoElement`
- `SlideBackground`（solid/gradient/image/pattern）
- `SlideAnimation`（enter/exit/emphasis）
- `SlideTheme`（颜色/字体/间距）
- `Canvas`（画布，包含元素数组 + 尺寸 + 背景）

**stage.ts 核心类型**：
- `Stage` — 顶层容器（scenes 数组 + settings）
- `Scene` — 场景（type: slide/quiz/interactive/pbl）
- `SceneContent` — 场景内容（canvas/questions/url/pbl）
- `SceneOutline` — 场景大纲

### 3.4 Store（状态管理）

| 文件 | 说明 |
|------|------|
| `lib/store/canvas-store.ts` | 画布状态（缩放/选中元素/工具/画笔设置） |
| `lib/store/stage-store.ts` | 舞台状态（当前场景/播放状态/Agent 列表） |
| `lib/store/settings-store.ts` | 设置状态（模型/音频/图片/视频等全部配置） |
| `lib/store/snapshot-store.ts` | 快照状态（撤销/重做历史） |
| `lib/store/keyboard-store.ts` | 键盘状态（快捷键绑定） |
| `lib/store/whiteboard-history-store.ts` | 白板历史（快照列表） |
| `lib/store/media-generation-store.ts` | 媒体生成状态（图片/视频生成队列） |
| `lib/store/user-profile-store.ts` | 用户配置 |
| `lib/store/index.ts` | 导出索引 |
| **总计约 900+ 行** | |

### 3.5 Hooks

| 文件 | 说明 |
|------|------|
| `lib/hooks/use-audio-recorder.ts` | 音频录制（MediaRecorder API） |
| `lib/hooks/use-browser-asr.ts` | 浏览器 ASR（Web Speech API / 第三方） |
| `lib/hooks/use-browser-tts.ts` | 浏览器 TTS（SpeechSynthesis API） |
| `lib/hooks/use-canvas-operations.ts` | 画布操作（添加/删除/移动/缩放元素） |
| `lib/hooks/use-discussion-tts.ts` | 讨论 TTS（圆桌讨论语音播放） |
| `lib/hooks/use-scene-generator.ts` | **场景生成器** — 逐场景调用 API 生成 |
| `lib/hooks/use-tts-preview.ts` | TTS 预览播放 |
| `lib/hooks/use-keyboard-shortcuts.ts` | 键盘快捷键 |
| `lib/hooks/use-fullscreen.ts` | 全屏控制 |
| `lib/hooks/use-local-storage.ts` | localStorage 封装 |
| `lib/hooks/use-debounce.ts` | 防抖 |
| `lib/hooks/use-media-query.ts` | 媒体查询 |
| `lib/hooks/use-mounted.ts` | 挂载状态 |
| **总计约 800+ 行** | |

### 3.6 Buffer（流式缓冲）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/buffer/stream-buffer.ts` | ~22KB | **StreamBuffer** — SSE 流式文本缓冲 + 逐字揭示动画 |

**StreamBuffer 功能**：
- 接收 SSE 流式文本
- 按字/按词/按句逐步揭示
- 可配置揭示速度
- 支持 Markdown 格式保持
- 缓冲区管理（避免渲染卡顿）

### 3.7 Orchestration（AI 编排）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/orchestration/director-graph.ts` | ~300+ | Director 图（Agent 调度逻辑） |
| `lib/orchestration/prompt.ts` | ~200+ | 系统 Prompt 模板 |
| `lib/orchestration/prompt-builder.ts` | ~200+ | Prompt 构建器 |
| `lib/orchestration/stateless-generate.ts` | ~100+ | 无状态生成 |
| `lib/orchestration/tool-schemas.ts` | ~100+ | 工具 Schema 定义 |
| `lib/orchestration/registry.ts` | ~50+ | Agent 注册表 |
| **总计约 900+ 行** | |

### 3.8 Generation（场景生成管线）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/generation/outline-generator.ts` | ~200+ | 大纲生成器（SSE 流式） |
| `lib/generation/scene-generator.ts` | ~200+ | 场景生成器 |
| `lib/generation/scene-builder.ts` | ~200+ | 场景构建器（JSON→Scene 对象） |
| `lib/generation/action-parser.ts` | ~100+ | Action 解析器（文本→Action 对象） |
| `lib/generation/pipeline-runner.ts` | ~100+ | Pipeline 运行器 |
| **总计约 800+ 行** | |

### 3.9 ProseMirror（富文本编辑器）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/prosemirror/schema.ts` | ~100+ | ProseMirror Schema 定义 |
| `lib/prosemirror/plugins.ts` | ~80+ | 编辑器插件 |
| `lib/prosemirror/commands.ts` | ~40+ | 编辑器命令 |
| **总计约 220+ 行** | |

### 3.10 Media（媒体编排）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/media/orchestrator.ts` | ~200+ | 媒体编排器（统一调度图片/视频生成） |
| `lib/media/image-providers/` | ~500+ | 图片生成适配器（seedream/kling/minimax/flux/grok） |
| `lib/media/video-providers/` | ~300+ | 视频生成适配器（kling/minimax/veo） |
| **总计约 300+ 行（前端部分）** | |

**10 个媒体适配器**：seedream, kling-image, minimax-image, flux, grok-image, kling-video, minimax-video, veo, runway, luma

### 3.11 Audio（音频）

| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/audio/tts-providers.ts` | ~300+ | TTS 提供商（Azure/OpenAI/火山/MiniMax/Browser） |
| `lib/audio/asr-providers.ts` | ~200+ | ASR 提供商（Azure/OpenAI/火山/Browser） |
| `lib/audio/voice-resolver.ts` | ~100+ | 语音解析器（根据语言/角色选择语音） |
| `lib/audio/constants.ts` | ~100+ | 音频常量（采样率/格式等） |
| **总计约 700+ 行** | |

### 3.12 其他 Lib 模块

| 模块 | 行数 | 说明 |
|------|------|------|
| `lib/pbl/` | ~300+ | PBL 生成 + MCP 工具定义 |
| `lib/export/` | ~500+ | PPTX 导出（将 Stage 导出为 .pptx 文件） |
| `lib/pdf/` | ~150+ | PDF 解析（上传 PDF→提取文本/图片） |
| `lib/i18n/` | ~1,700+ | 4 语言国际化（en-US/zh-CN/ja-JP/ru-RU） |
| `lib/web-search/` | ~30+ | Tavily 搜索集成 |
| `lib/contexts/` | ~65+ | Scene Context API（React Context） |
| `lib/utils/` | ~500+ | 工具函数集合 |

**lib/utils 包含**：
- `audio-player.ts` — 音频播放器
- `database.ts` — 数据库操作
- `geometry.ts` — 几何计算（碰撞检测/距离/角度）
- `element.ts` — 元素操作（克隆/变换/对齐）
- `image-storage.ts` — 图片存储（上传/缓存）
- `color.ts` — 颜色工具
- `cn.ts` — className 合并（clsx + twMerge）
- 等等

---

## 四、API Routes（后端端点）— 25 个

### 4.1 核心生成 API

| 端点 | 方法 | 说明 | 依赖 lib |
|------|------|------|---------|
| `/api/generate/scene-outlines-stream` | POST | SSE 流式生成场景大纲 | `lib/generation/outline-generator`, `lib/ai/llm` |
| `/api/generate/scene-content` | POST | 生成单个场景内容（Canvas JSON） | `lib/generation/scene-generator`, `lib/ai/llm` |
| `/api/generate/scene-actions` | POST | 生成单个场景动作列表 | `lib/generation/action-parser`, `lib/ai/llm` |
| `/api/generate/tts` | POST | 生成 TTS 语音 | `lib/audio/tts-providers` |
| `/api/generate/agent-profiles` | POST | 生成 Agent 角色列表 | `lib/orchestration/`, `lib/ai/llm` |
| `/api/generate/image` | POST | 生成图片 | `lib/media/image-providers` |
| `/api/generate/video` | POST | 生成视频 | `lib/media/video-providers` |
| `/api/generate/generate-classroom` | POST | 一键生成完整课堂 | `lib/generation/pipeline-runner` |

### 4.2 运行时 API

| 端点 | 方法 | 说明 | 调用方 |
|------|------|------|--------|
| `/api/chat` | POST | **聊天/讨论 SSE 流** — Agent Loop 核心 | Stage, ChatArea, Roundtable |
| `/api/quiz-grade` | POST | **测验 AI 评分** — SSE 流式 | QuizView |
| `/api/pbl/chat` | POST | PBL 运行时对话 | PBL use-pbl-chat |
| `/api/transcription` | POST | 语音转文字（ASR） | use-audio-recorder, Settings |

### 4.3 辅助 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/classroom` | GET | 加载课堂数据 |
| `/api/classroom-media` | GET | 课堂媒体资源 |
| `/api/proxy-media` | GET | CORS 媒体代理 |
| `/api/parse-pdf` | POST | PDF 解析 |
| `/api/web-search` | POST | Web 搜索（Tavily） |
| `/api/azure-voices` | GET | Azure 语音列表 |
| `/api/server-providers` | GET | 服务端 Provider 配置 |

### 4.4 验证 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/verify-model` | POST | 验证 LLM 模型连接 |
| `/api/verify-image-provider` | POST | 验证图片生成商连接 |
| `/api/verify-video-provider` | POST | 验证视频生成商连接 |
| `/api/verify-pdf-provider` | POST | 验证 PDF 解析商连接 |

### 4.5 健康检查

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |

---

## 五、前端组件 → 后端 API 依赖图

```
Stage (stage.tsx)
  └→ /api/chat（讨论 SSE 流）

ChatArea / use-chat-sessions.ts
  └→ /api/chat（聊天 SSE 流，Agent Loop）

Roundtable
  └→ /api/generate/tts（讨论语音合成）via use-discussion-tts

QuizView (quiz-view.tsx)
  └→ /api/quiz-grade（AI 评分）

PBL (use-pbl-chat.ts)
  └→ /api/pbl/chat（PBL 运行时对话）

use-scene-generator.ts（内容生成引擎）
  ├→ /api/generate/scene-content
  ├→ /api/generate/scene-actions
  └→ /api/generate/tts

media-orchestrator.ts（媒体生成）
  ├→ /api/generate/image
  ├→ /api/generate/video
  └→ /api/proxy-media（CORS 代理）

use-audio-recorder.ts（语音识别）
  └→ /api/transcription

Settings 面板
  ├→ /api/verify-model
  ├→ /api/verify-image-provider
  ├→ /api/verify-video-provider
  ├→ /api/verify-pdf-provider
  ├→ /api/server-providers
  └→ /api/transcription

generation-preview/page.tsx
  ├→ /api/parse-pdf
  ├→ /api/web-search
  ├→ /api/generate/agent-profiles
  ├→ /api/generate/scene-outlines-stream (SSE)
  ├→ /api/generate/scene-content
  ├→ /api/generate/scene-actions
  └→ /api/generate/tts
```

---

## 六、服务端 Lib（仅在 API Routes 中使用）

这些模块运行在 Next.js 服务端，**不需要移植到前端**：

| 模块 | 说明 |
|------|------|
| `lib/ai/llm.ts` | LLM 调用封装（callLLM/streamLLM） |
| `lib/ai/providers/` | AI SDK Provider 注册表 |
| `lib/server/` | 服务端工具（模型解析/密钥管理/SSRF 防护） |
| `lib/generation/` 部分 | 服务端场景生成逻辑 |
| `lib/orchestration/` 部分 | 服务端 Agent 编排逻辑 |

---

## 七、技术栈对比

| 技术 | OpenMAIC | LittleStar | 适配方案 |
|------|:---:|:---:|---------|
| 框架 | Next.js (App Router) | Vite + React | 去掉 `'use client'`，替换 Next.js API |
| React | 19 | 18 → **升级到 19** | 升级 |
| Zustand | 5.x | 4.x → **升级到 5** | 升级 |
| Motion | motion 12.x | framer-motion 10.x → **升级到 motion** | 升级 |
| Tailwind | ✅ | ✅ | 零适配 |
| Lucide Icons | ✅ | ✅ | 零适配 |
| shadcn/ui | 32 组件 | 部分 | 补齐缺失组件 |
| ProseMirror | ✅ | ❌ | 新增依赖 |
| Vercel AI SDK | ✅ (`ai` 包) | ❌ | chat 模块适配 `UIMessage` 类型 |
| next-intl (i18n) | ✅ | ❌ | 适配/移植 |
| 路径别名 | `@/lib/xxx` | 需配置 | Vite alias |

---

## 八、LittleStar Pipeline Client 与 OpenMAIC 原生生成的关系

**Pipeline Client 调用的就是 OpenMAIC 的原生 API**：

| Pipeline Client 方法 | 调用的 OpenMAIC API | 说明 |
|---|---|---|
| `generateOutlines()` | `/api/generate/scene-outlines-stream` | SSE 流式 |
| `generateSceneContent()` | `/api/generate/scene-content` | |
| `generateSceneActions()` | `/api/generate/scene-actions` | |
| `generateTTS()` | `/api/generate/tts` | |
| `generateAgentProfiles()` | `/api/generate/agent-profiles` | |

**Pipeline Client 是 OpenMAIC API 的"客户端封装"**，额外添加了：
- 批量编排（`runFullPipeline` 一次性生成所有场景）
- 超时控制（`fetchWithTimeout`）
- 重试机制（`fetchWithRetry` 指数退避）
- 进度回调（`onProgress`）
- SSE 流解析（`parseSSEStream`）
- 缓存管理（配合 `ClassroomCache` + `GenerationScheduler`）

---

## 九、移植量总结

| 层级 | 行数 | 说明 |
|------|------|------|
| Components（前端组件） | ~18,000+ | 全部移植 |
| Lib（前端引擎） | ~10,000+ | 全部移植 |
| API Routes | 0 | 保留在 OpenMAIC Next.js 进程 |
| 服务端 Lib | 0 | 保留在 OpenMAIC Next.js 进程 |
| **总移植量** | **~28,000+** | |
| **删除量（iframe 中转层）** | **~3,900+** | |
