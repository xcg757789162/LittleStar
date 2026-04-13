# planner progress

- 状态: 已完成
- 负责任务: Task 3 前置梳理 - Playwright E2E full 闭环现状与最小方案
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`

## TODO
- [x] 盘点 `e2e/tests/full`、`e2e/helpers`、`playwright.config.ts` 现状
- [x] 确认真实 UI 选择器（课堂答题 / 完成课堂 / session summary / history）
- [x] 判断 TDD 下首个 failing test
- [x] 输出最小实现方案与风险清单

## 工作内容
- 当前 `e2e/tests/` 已有 3 条 Playwright 用例：`smoke/app-smoke.spec.ts`、`feature/lesson-picker.spec.ts`、`full/core-learning-loop.spec.ts`。其中 `full/core-learning-loop.spec.ts` 已开始覆盖 Task 3 最小闭环：seed `/classroom_cache` → 登录 → 进入 `/classroom` → 打开第一节课 → 做题 → `✅ 完成课堂` → 断言 `session-summary` 与学习历史增长。
- `playwright.config.ts` 仍是单项目 chromium 配置：`testDir=./e2e/tests`、`outputDir=test-results`、`baseURL`/`workers` 走 `e2e/config/env.ts`，并通过 `npm run dev -- --host --port --strictPort` 自动起 Vite dev server。
- `e2e/helpers/` 当前已具备 full 最小闭环所需基础：`api.ts`（auth/PostgREST 请求）、`auth.ts`（清 token / UI 登录）、`learning.ts`（创建 E2E 用户、placement test 种子、seed `classroom_cache`、打开首个 lesson）、`assertions.ts`、`reporting.ts`、`screenshots.ts`、`tags.ts`。其中 `ensureCoreLoopClassroomCache()` 会写入一个仅含单选 quiz scene 的最小课堂，真实可配合 `quiz-start-button` + `option-0` 驱动。
- 真实课堂 DOM 走 `NativeClassroom -> ClassroomBridge -> Stage -> SceneRenderer -> openmaic/scene-renderers/quiz-view.tsx`。这里 `quiz-start-button` 是真实按钮；点击后只会在 `QuizView` 内部把 phase 从 `not_started` 切到 `answering`，随后可见单选题按钮 `data-testid="option-0"` 与文案按钮 `提交答案`。当前 answering 容器本身没有页面级 testid，因此应把 `option-0` 视为最稳的“已进入答题态”锚点。
- 稳定锚点：课堂完成 `✅ 完成课堂`；总结页 `session-summary`；历史页 `learning-history-page`；历史操作按钮文案 `快速复习` / `智能重学`。需要注意：`QuizView` 只有单选题选项带 `data-testid`，多选题/简答题没有等价 testid，因此 Task 3 的 seed 数据应继续锁定为单选 quiz。
- 关键断链已再次确认：1) `NativeClassroom` 虽传入 `onAnswer={handleAnswer}`，但 `ClassroomBridge` 将其命名为 `_onAnswer` 后未使用，只渲染裸 `Stage`；2) `QuizView` 全部答题、判分、review 状态都只存在组件内部，未调用 `useLearningStore.recordAnswer()`，`openmaic` 目录下也搜不到任何 `recordAnswer`/`sessionStats` 连接；3) `learningStore.recordAnswer()` 本身可正常累加 `questionsCompleted` / `correctCount`，但当前真实课堂没人触发它；4) `LearningHistory` 与 `ReviewLearningService` 都过滤 `questionsCompleted > 0`，所以即使完成课堂并写库，只要统计为 0，历史页也会把记录隐藏。
- 结论：当前更准确的 first failing test 已经落在 `full/core-learning-loop.spec.ts` 这条线上，但它的真正红点不该理解为“找不到选择器”，而是“真实 quiz 交互没有回流学习统计”。最小修复路径应先让真实 quiz 作答至少触发一次 `recordAnswer()`（或等价统计写入），再继续看 history 增长与页面展示；`reviewMode/historyId` 仍不应纳入本轮最小验收范围。

## 环境信息
- Node PATH 需包含 `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 仅允许修改 worktree 内文件
- 本次仅做搜索/阅读与进度记录，未改业务代码

---

## pregeneration-fix-team / planner

- 状态: 已完成
- 负责任务: 盘点本仓预生成流水线现状、测试入口与可复用实现
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

### 本次 TODO
- [x] 盘点 `task-processor.ts` 到 `pipeline-executor.ts` 的真实调用链
- [x] 确认仓内是否已有可复用的 pipeline 测试或实现参考
- [x] 汇总请求体/响应解析与 checkpoint 机制的旧契约位置
- [x] 向主控汇报最小修复边界与验证重点

### 本次工作内容
- 确认真正后端入口为 `src/server/services/task-processor.ts`，由其调用 `PipelineExecutor.runFullPipeline()` 执行 `agent-profiles -> outlines -> content -> actions -> tts`。
- 明确旧实现的 4 个关键偏差：`outlines` 发送 `{ ...requirements, agents }`；`scene-content` 缺 `allOutlines + stageId`；`scene-actions` 缺 `allOutlines + stageId` 且错误期待 `{ actions }`；`tts` 只发 `{ text }` 且错误期待 `{ audio, durationMs }`。
- 盘点现有测试后确认：仓内没有直接覆盖后端 `PipelineExecutor` 的测试，最接近的是前端侧 `src/services/openmaic/__tests__/pipeline-client.test.ts`，可作为回归测试结构参考但不是权威契约来源。
- 补充提醒：当前仓内 `pipeline-client.ts` / `pipeline-types.ts` 也保留了较多早期简化契约认知，修复时应以 upstream route 为准，而不是仅对齐本仓前端测试。

---

## classroom-media-fix / planner

- 状态: 已完成
- 负责任务: 收敛“课堂可加载但声音/图片/视频缺失”的最小可执行修复方案
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

### 本次 TODO
- [x] 核对 `integrated-investigation-report.md` 与仓内关键链路证据
- [x] 判断应修在缓存层过滤、桥接层转换还是双层护栏
- [x] 输出涉及文件、测试建议、风险与验收标准

### 本次工作内容
- 报告结论已与代码再次对齐：`src/services/openmaic/cache.ts` 的 `hasRenderableScenes()` 仍把 `scene.slides.length > 0` 视为“可渲染课堂”，`listCachedClassrooms()` 还会继续从旧 `slides[].imageUrl` 抽缩略图，所以旧课仍会出现在课程列表里。
- `src/stores/openmaic/classroom-bridge.ts` 遇到非 native scene 时，不做媒体迁移，而是直接构造 `content: { type: 'slide', canvas: {} }` 与 `actions: []`；旧 `slides[].imageUrl/audioUrl` 在这里被整体丢弃。
- `src/pages/NativeClassroom.tsx` 只会把缓存课交给 `loadClassroom()`，没有旧 `TeachingSlide/ImageSlide/AudioSlide` 回退；`src/components/openmaic/stage.tsx` 在 `currentScene.actions` 为空时直接让引擎保持 `idle`，`SceneRenderer` 也只消费 `scene.content`，因此旧课进入原生链路后只会得到空白画面 + 无音频。
- 当前最小可执行方案需要从“仅双层护栏”升级为 **分层并行修复**：
  - **P0-协议断层护栏**：在 `cache.ts` 把仅含旧 `scene.slides[]` 的课堂判为不可播放并从列表/计数/读取链路剔除；在 `classroom-bridge.ts` 对 legacy scene 直接报错拒绝，避免继续向 Stage 注入空 `canvas/actions`。
  - **P0-活跃毒源封堵**：`src/services/openmaic/client.ts` 仍保留 `convertTeachingScene()/convertQuizScene()` 把 native scene 压回旧 `slides[]` 的逻辑，虽然当前不是主预生成链，但仍是活跃降级写源，执行时必须同步封死或显式 fail-fast，避免继续写出旧协议。
  - **P0-媒体主合同修复**：当前 `pipeline-client` / `pipeline-executor` 仍主要挂 `audioBase64`，但 `PlaybackEngine` / `AudioPlayer` 消费的是 `audioId/audioUrl`；同时占位媒体链 `MediaStageProvider` / `generateMediaForOutlines()` / `restoreFromDB()` 没真正接上，`gen_img_*` / `gen_vid_*` 原生课也会丢媒体。若不同时修这层，即使 legacy 旧课被挡住，native 课仍可能继续无声/无图/无视频。
  - **P0-场景结构兼容**：`pipeline-client` 和 `pipeline-executor` 组 scene 时仍偏向 `content.canvas`，对裸 `elements` 会退化成纯文本 fallback；这也必须纳入同批修复，否则新协议课堂仍会出现“有场景但媒体不落画布”。
- **不建议**在桥接层尝试把旧 `slides[]` 转成原生 `content/actions`。旧 `Slide` 结构只有 `imageUrl/audioUrl`，缺少 canvas 元素、elementId、视频语义和动作时序，转换会是高风险、低保真的补丁。
- 库存判断也需要修正：大 JSON 当前真实落点是 `classroom_snapshots.classroom_data`，属于**潜在返毒库存**；`ReviewLearningService` 关联的 `classroom_history.classroomData` 属于陈旧实现，当前未见活跃 raw JSON 回流。必须优先处理的**活跃毒源**仍是 `OpenMAICClient` 降级写旧结构，以及 `classroom_cache` 的持久化与 fallback 读旧结构；`NativeClassroom.tsx` 学完课后把 `currentClassroom` 原样写入 snapshot，会让旧结构继续在 snapshot 库存中复制，适合作为治理项同步清理/迁移。

### 建议修改文件
- `src/services/openmaic/cache.ts`
- `src/stores/openmaic/classroom-bridge.ts`
- `src/services/openmaic/client.ts`
- `src/services/openmaic/pipeline-client.ts`
- `src/server/services/pipeline-executor.ts`
- `src/pages/NativeClassroom.tsx`
- `src/services/openmaic/__tests__/cache.test.ts`
- `src/server/services/__tests__/pipeline-executor.test.ts`
- `src/services/openmaic/__tests__/pipeline-client.test.ts`
- 新增 `src/stores/openmaic/__tests__/classroom-bridge.test.ts`
- 视实现补充媒体链相关 provider / store / restore 测试

### 测试建议
- `cache.test.ts`：把当前默认 `slides[]` mock 从“有效课”改为“legacy 无效课”，覆盖仅有 `slides[]` 的课堂不会出现在 `listCachedClassrooms()`、不会计入 `getCacheSize()`，且读取链路会视其为不可播放。
- `classroom-bridge.test.ts`：新增 native scene 正常注入 Stage store；legacy scene 会进入错误态/拒绝加载，而不是生成空 `canvas + actions[]`。
- `pipeline-client.test.ts` / `pipeline-executor.test.ts`：覆盖裸 `elements` 会被规范化进 `content.canvas`；`audioBase64` 会落成可播放的 `audioId/audioUrl` 或等价持久化引用；图片/视频占位任务会在 restore 后回填到课堂数据。
- 手工验收至少分两组：1 条 legacy cache + 1 条 native cache，确认课程列表只显示 native，强喂 legacy 数据时页面明确失败；再验证 1 条含语音、图片、视频占位媒体的 native 课，进入课堂后能看到图片/视频且语音可播。

### 风险与验收标准
- 风险 1：若只做 cache/bridge 护栏，不补 `audioBase64`、占位媒体链和裸 `elements` 兼容，问题会从“旧课空白”变成“新课仍缺媒体”，属于假修复。
- 风险 2：封死 `client.ts` 旧降级写链后，若仍有边缘路径依赖它，可能暴露新的失败态；因此执行阶段需要同步核对调用点并让失败信息可见。
- 风险 3：`classroom_snapshots` 里的旧数据属于库存污染，清理或迁移时要避免误伤有效 native snapshot。
- 验收标准：**课程列表不再展示 slides-only 旧课；原生课堂不会再静默加载 legacy 空场景；native 课堂的图片、视频、语音链路在真实播放链上恢复；旧协议写入源被封死且不会继续生成新的 legacy cache/snapshot。**
