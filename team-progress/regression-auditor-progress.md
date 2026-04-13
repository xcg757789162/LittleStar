# regression-auditor progress

- 状态: ✅ 已更新增量基线；`ClassroomSettings` 竞态补丁与对应测试位点已核对，**TS 编译 blocker 已清零，当前进入 reviewer 最终 focused review / 回归最终复核阶段**
- 负责任务: 课堂媒体 / 旧缓存 / `phase2` / settings 切换的回归面审计与最小验收清单
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 更新时间: 2026-04-13 11:13

## TODO
- [x] 梳理课堂图片、音频、视频、旧缓存兼容、`phase2`、settings 切换的验收面
- [x] 收敛必须执行的单测、集成验证、手工验证与页面路径
- [x] 吸收媒体主链补丁后的最新测试覆盖并修正风险判断
- [x] 将 reviewer 新增验证面补入 blocking 矩阵
- [x] 同步主控复核确认的补丁已落地状态
- [x] 根据 reviewer focused review 收敛唯一 remaining blocker
- [ ] 等 `reviewer` 给出最终 focused review 结论后，增量核对整体矩阵是否可转为 `ready`

## 当前状态（截至 11:13）

### 已完成
- **媒体主链入口级自动化已补齐一层**：代码已确认 `SceneRenderer` 用 `MediaStageProvider` 包裹课堂渲染树，`BaseImageElement` / `BaseVideoElement` 可读取当前 `scene.stageId`，避免跨课堂串用媒体任务。
- **缓存恢复链路已接通到 stage**：`classroom-bridge` 会把 `classroom.outlines[].mediaGenerations` 注入 stage store，`stage.tsx` 在课堂加载后会先执行 `restoreFromDB(stageId)`，再按 outlines 调 `generateMediaForOutlines()`。
- **自动化回归状态已更新**：根据 `media-executor` 最新回归，`cache.test.ts`、`classroom-bridge.test.ts`、`pipeline-client.test.ts`、`pipeline-executor.test.ts`、`scene-renderer.test.tsx` 共 **5 个测试文件、41 条用例** 已通过。
- **focused review 已确认前两条链路 ready**：服务端 agent id 已切共享 `PRESET_AGENTS`；`child.name/selfIntroduction` 也已从 `usePreGeneration -> task-processor -> PipelineExecutor` 实传到 `userNickname/userBio`。
- **`ClassroomSettings` runtime 竞态补丁已完成最小代码复核**：`ClassroomSettings.tsx` 现已按 `childId` 维护 debounce `pending/timer`，切孩子前会 flush 上一个孩子、离页时会 flush 所有 pending child。
- **新增测试位点已直接覆盖四类课堂字段回归**：`ClassroomSettings.persistence.test.tsx` 已覆盖“正常写库并回写 childStore”“快速连续编辑只落最后快照”“250ms 内切孩子后仍写回原孩子”“卸载时立即 flush 未落库 debounce”。
- **`ClassroomSettings.tsx` 的定向 TS 编译 blocker 已清零**：执行侧确认此前 3 条 TypeScript 编译错误已修复，定向 `tsc` 对该文件结果无输出、退出码 0。

### 当前增量基线
- **当前不再存在已确认的 active blocker**：前两道 gate 已 ready，`ClassroomSettings` runtime 竞态补丁与回归测试位点已补齐，且此前唯一 active blocker 的 3 条 TS 编译错误已修复。
- **整体状态进入 reviewer 最终 focused review / 回归最终复核阶段**：在 reviewer 给出最终结论前，外部口径仍保持未放行，但**不要再把那 3 条 TS 错误列为 active blocker**。

### 背景项 / 自动化受限
- **目标测试命令当前仍受仓库既有 Vite/Vitest worker 问题影响**：`settings-executor` 回传的 Vitest JSON 结果为 `success:false` / `numTotalTests:0`；这说明自动化验证基础设施仍有限制，但**它不是当前未放行的直接原因**。

### 仍需人工复核 / 最终确认
- **整体结论暂仍维持未放行**：原因已从“存在 active blocker”切换为“等待 reviewer 最终 focused review / 回归最终复核结论”，当前不宜提前下调为 `ready`。
- **图片 / 视频真实渲染**：当前新增的是“入口链路自动化”，还不是完整浏览器级媒体播放验证；仍需在课堂页确认 `gen_img_* / gen_vid_*` 占位符真的恢复或继续生成。
- **页面刷新恢复**：需要人工确认进入课堂后刷新页面，`restoreFromDB(stageId)` + `generateMediaForOutlines()` 的组合能继续把媒体补齐，而不是只在单次首进生效。
- **`phase2` 两阶段状态机**：仓库里仍没有覆盖完整 `phase1 -> phase2 -> result` 的专门自动化，必须继续保留手工 gate。
- **reviewer focused review 仍是放行前置条件**：下一步是等待 reviewer 最终复核 `ClassroomSettings` 增量补丁、TS 编译修复与整体回归面，再决定是否更新矩阵结论。

## Reviewer focused review 后的增量基线

- **总口径**：前两条链路已闭环并可视为 `ready`；第 3 条 runtime 竞态测试位点已补齐、竞态补丁已在、`ClassroomSettings.tsx` 此前 3 条 TS 编译错误已修复清零。**当前进入 reviewer 最终 focused review / 回归最终复核阶段**；在 reviewer 最终结论返回前，整体仍暂不下调为 `ready`，但**不再存在已确认的 active blocker**。

### 1) 服务端 agent mapping

#### 最短可执行命令
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vitest run --watch=false --environment node src/server/services/__tests__/pipeline-executor.test.ts
```

#### 通过标准
- `preset` 模式下，`x-agent-profiles` 的 Base64 内容能在服务端正确解码成 `agents`，并带进 outlines / scene-content / scene-actions 请求体。
- 运行中不会因中文 header 触发 `ByteString` / header 非 ASCII 错误。
- `speech` 仍会继续补齐 `audioBase64`、`audioId`、`audioUrl`，说明 agent 透传没有把后续 pipeline 契约带坏。

#### 当前判断
- **focused review 已认可为 ready**：`headers-builder-server.ts` 已去掉旧 `student-*`，并切到共享 `PRESET_AGENTS`；这一项不再是当前活跃 blocker。
- **保留的回归门槛**：后续只需确保 `pipeline-executor.test.ts` 既有覆盖持续通过，不因其他补丁回退。

### 2) `userBio` / `userNickname` 进入 pre-generation

#### 最短可执行命令（代码审计门槛）
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && rg -n "generateUserRequirements|userNickname|userBio|submitTasks\(|requirements:" src/hooks/usePreGeneration.ts src/server/services/task-processor.ts src/services/lesson-planner/requirement-generator.ts
```

#### 通过标准
- `usePreGeneration.ts` 不能只调用 `RequirementGenerator.generate()`；必须把当前孩子的 `name/selfIntroduction` 一起带入预生成提交体。
- 服务端 `task-processor.ts` 在调用 `PipelineExecutor.runFullPipeline()` 时，`requirements` 必须包含 `userNickname` 与 `userBio`，而不是只传 `requirement` / `language`。
- 至少有一条自动化或接口级验证能证明上述两个字段确实从前端传到服务端 pipeline 输入。

#### 当前判断
- **focused review 已认可为 ready**：`child.name/selfIntroduction` 已从 `usePreGeneration -> task-processor -> PipelineExecutor.runFullPipeline({ requirements })` 实传到 `userNickname/userBio`；这一项不再是当前活跃 blocker。
- **保留的回归门槛**：后续只需确保该链路的提交体与 `requirements` 组装不再回退。

### 3) `ClassroomSettings` 课堂字段自动落库（最终 focused review 中）

#### 最短可执行命令（增量自动化基线）
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vitest run --watch=false src/pages/__tests__/ClassroomSettings.persistence.test.tsx
```

#### 通过标准
- 修改 **课堂模式 / 角色选择 / 老师音色 / 讨论轮数** 后，当前孩子的 `children.settings` 必须稳定写入数据库，并回写到本地 `childStore`。
- 在 **250ms debounce** 窗口内切孩子、离开页面（组件卸载）、或快速连续编辑上述课堂字段时，**不能出现前一个孩子丢写、写到后一个孩子、或只更新 OpenMAIC store 未落库**。
- `src/pages/ClassroomSettings.tsx` 的 TypeScript 编译错误需保持清零，不能回退到 `PersistedClassroomSettings` 缺失或错误断言导致的编译失败。
- 只有当“稳定落库”“无切孩/卸载丢写风险”“TS 编译持续通过”三条都成立，并经 reviewer 最终 focused review 认可后，这一项才可正式转为 `ready`。

#### 必补手工验证
- 路径：`/classroom-settings` → 孩子 A 修改课堂模式/角色/老师音色/讨论轮数 → **250ms 内** 立即切到孩子 B。
- 路径：`/classroom-settings` → 修改上述课堂字段后，**250ms 内** 立即离开页面或刷新。
- 路径：`/classroom-settings` → 连续快速改动课堂模式、角色、老师音色、讨论轮数，再停下观察最终落库结果。
- 必须看到：A/B 两个孩子的课堂字段互不串值；切回 A 后显示 A 自己最后一次编辑；刷新后数据库与 `childStore` 中的课堂字段保持一致。

#### 当前判断
- **runtime 方向已基本认可**：reviewer 最新 focused review 已不再把“测试位点缺失”或“250ms 竞态设计本身”作为当前直接 blocker。
- **测试覆盖与竞态补丁已补齐**：`ClassroomSettings.persistence.test.tsx` 已覆盖正常写库、快速连续编辑、切孩子、卸载 flush 四类课堂字段回归，当前代码路径也已按 `childId` 管理 debounce flush。
- **此前编译级 blocker 已清零**：执行侧已确认 `ClassroomSettings.tsx` 之前 3 条 TS 编译错误修复完成，定向 `tsc` 对该文件无输出、退出码 0。
- **当前未放行原因已切换为最终复核未完成**：在 reviewer 给出最终 focused review 结论前，这一项暂不直接标记为 `ready`，但也不再作为 active blocker 列示。

## 最小发布建议
- **当前仍不建议直接发版**：前两道 gate 已 ready，`ClassroomSettings` runtime 竞态测试位点已补齐，且此前 TS 编译 blocker 已清零；但 **reviewer 最终 focused review / 回归最终复核尚未完成**，当前放行条件仍未完全满足。
- **可进入最小灰度** 的前提：P0 的 5 个单测文件通过、`lesson-picker.spec.ts` 与 `core-learning-loop.spec.ts` 通过、课堂页完成一轮图片/TTS/视频手工验收、`phase2` 手工流完整通过，且 `ClassroomSettings.tsx` 编译持续通过并完成一轮 focused review 增量复核。
- **settings 不建议降级跳过**：如果本机仍受既有 Vite/Vitest worker 问题影响，可把它记录为自动化受限背景项，但不能用它替代 reviewer 最终 focused review 结论。
- **以下任一项失败即不建议发版**：legacy 课堂仍能回灌空舞台、语音有字幕无声音、`gen_img_* / gen_vid_*` 占位媒体不恢复、`phase1` 完成后直接跳结果页、或 `ClassroomSettings.tsx` 编译再次回退失败。

## 关键结论
- **服务端 agent mapping 与 `userNickname/userBio` 预生成链已被 focused review 认可为 ready**：它们仍需防回退，但已不是当前活跃 blocker。
- **`ClassroomSettings` 的测试位点与 runtime 竞态补丁已补齐**：正常写库、快速连续编辑、切孩子、卸载 flush 四类场景都已进入当前增量基线。
- **此前唯一 active blocker 的 3 条 TS 编译错误已清零**：Vitest worker 问题只是自动化受限背景项，不是当前未放行的直接原因；当前状态已进入 reviewer 最终 focused review / 回归最终复核阶段。
- **P0 最小自动化门槛仍是 5 文件**：`cache`、`classroom-bridge`、`pipeline-client`、`pipeline-executor`、`scene-renderer` 需要一起通过，才能说明媒体主链入口没有明显断层。
- **图片 / 视频链路已补“入口级自动化”，但浏览器级真实渲染仍需手工验收**：可以下调为“中风险必看”，不能再说完全无自动化。

## P0 — 上线阻断项（课堂图片/音频/视频 + 旧缓存兼容）

### 必过单测
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vitest run --watch=false --environment node src/services/openmaic/__tests__/cache.test.ts src/stores/openmaic/__tests__/classroom-bridge.test.ts src/services/openmaic/__tests__/pipeline-client.test.ts src/server/services/__tests__/pipeline-executor.test.ts src/components/openmaic/stage/__tests__/scene-renderer.test.tsx
```

- **当前状态**
  - 根据 `media-executor` 最新回归：**✅ 5 文件 / 41 用例已通过**。
- **必须通过的点**
  - `cache.test.ts`：纯 legacy `scene.slides[]` 课堂不会出现在课程列表，`getClassroom()` 也会清掉旧课。
  - `classroom-bridge.test.ts`：native 课堂能正常装载到 Stage；legacy 课堂会被拒绝并清空旧舞台；缓存里的 `outlines.mediaGenerations` 会被注入到 stage store。
  - `pipeline-client.test.ts`：前端 pipeline 既会为 `speech` action 同步补齐 `audioBase64`、`audioId`、`audioUrl`，也会保留 `outlines.mediaGenerations`。
  - `pipeline-executor.test.ts`：服务端 pipeline 也补齐 `audioBase64`、`audioId`、`audioUrl`，避免前后端契约漂移。
  - `scene-renderer.test.tsx`：`SceneRenderer` 会把 `scene.stageId` 传给 slide subtree，确保占位媒体能按当前课堂读取对应 stage 的媒体任务。

### 必过集成验证
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx playwright test e2e/tests/feature/lesson-picker.spec.ts e2e/tests/full/core-learning-loop.spec.ts --workers=1
```

```bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH" && docker exec littlestar-db psql -U postgres -d littlestar -At -c "SELECT 'cache_slides=' || COUNT(*) FROM api.classroom_cache WHERE classroom_data::text LIKE '%\"slides\"%' UNION ALL SELECT 'cache_content=' || COUNT(*) FROM api.classroom_cache WHERE classroom_data::text LIKE '%\"content\"%' UNION ALL SELECT 'cache_stage=' || COUNT(*) FROM api.classroom_cache WHERE classroom_data::text LIKE '%\"stage\"%' UNION ALL SELECT 'cache_audio_url=' || COUNT(*) FROM api.classroom_cache WHERE classroom_data::text LIKE '%audioUrl%' UNION ALL SELECT 'snapshot_slides=' || COUNT(*) FROM api.classroom_snapshots WHERE classroom_data::text LIKE '%\"slides\"%' UNION ALL SELECT 'snapshot_content=' || COUNT(*) FROM api.classroom_snapshots WHERE classroom_data::text LIKE '%\"content\"%' UNION ALL SELECT 'snapshot_stage=' || COUNT(*) FROM api.classroom_snapshots WHERE classroom_data::text LIKE '%\"stage\"%'"
```

- **必须通过的点**
  - `lesson-picker.spec.ts`：能从首页进入课堂选课页，旧缓存不会把选课页拖成空白或异常。
  - `core-learning-loop.spec.ts`：课堂能完整走到“完成课堂”，并写出一条新的 `/classroom_history` 记录。
  - 数据库抽检：活跃 `classroom_cache` / `classroom_snapshots` 不应继续出现以 `scene.slides[]` 为主的现行缓存；现行课堂至少应表现为 `content/stage` 结构，并保留现行 `outlines` 元数据。

### 必过手工验证
- **路径**：`/classroom-settings` → `/preview` 或正常学习流 → `/classroom`
- **手工步骤**
  - 在 `/classroom-settings` 打开 **TTS / 图片生成 / 视频生成**，保存后重新进入页面，确认开关状态保留。
  - 进入一节带媒体占位的课堂（优先包含 `gen_img_*`，如有 `gen_vid_*` 一并验证）。
  - 播放课堂并至少翻到首个媒体场景、首个语音场景、首个视频场景；再执行一次页面刷新，观察媒体是否能继续恢复/生成。
- **必须通过的点**
  - 图片：首屏不空白，不出现只剩 placeholder 文本或断图图标。
  - 音频：语音 action 可播放，不出现有字幕无声音；控制台无 `audioUrl` 缺失类报错。
  - 视频：视频场景不应把课堂卡死；若资源暂不可播，也必须有明确 fallback，而不是白屏/无限转圈。
  - 刷新恢复：刷新后课堂仍能把已有媒体从本地恢复，或继续为 `gen_img_* / gen_vid_*` 拉起生成。
  - 旧缓存兼容：如果误命中 legacy 课堂，页面必须明确报错并清空旧舞台，不能继续播放上一节课残影。

## P1 — `phase2` 推进必须通过

### 必过单测（前置门槛）
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vitest run --watch=false src/engine/__tests__/placement-test-engine.test.ts src/pages/__tests__/PlacementTestPage.test.tsx
```

- **必须通过的点**
  - `placement-test-engine.test.ts`：基础测评引擎仍能生成题目、推进进度、完成并落结果。
  - `PlacementTestPage.test.tsx`：测评页基础容器、开始按钮、进度条、退出流程可用。
- **备注**
  - 这组测试**不等于** `phase2` 已被充分覆盖；它只能作为前置冒烟。

### 必过手工验证
- **路径**：`/placement-test-select` → 任一科目，例如 `/placement-test/math/grade-2`
- **必须通过的点**
  - 完成 `phase1` 后，**不能直接跳到结果页**；必须依次看到 `phase1_analyzing` → `phase2_loading` → `phase2_testing`。
  - 第二阶段标题/徽标必须切换为“挑战 / 进阶 / 验证”之一，而不是继续停留在“摸底环节”。
  - 第二阶段至少进入一题，完成后才能进入最终结果页。
  - 完成测评后仍能正常回到后续导航，不出现卡死、重复提交或 phase 回退。

## P2 — settings 切换生效必须通过

### 必过单测
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vitest run --watch=false src/stores/openmaic/__tests__/settings-sync.test.ts src/stores/__tests__/settingsStore.test.ts src/hooks/__tests__/useInitializeApp.test.ts src/pages/__tests__/ParentSettings.test.tsx
```

- **必须通过的点**
  - `settings-sync.test.ts`：孩子设置与 OpenMAIC `settings/profile/agent registry` 正反向同步正确，`selfIntroduction` / legacy `bio` 兼容正确。
  - `settingsStore.test.ts`：TTS、图片、视频、Agent 模式等高级字段能正确读写并保留其他设置。
  - `useInitializeApp.test.ts`：应用初始化后，首个孩子的课堂设置会同步进 OpenMAIC store。
  - `ParentSettings.test.tsx`：家长设置页基础渲染正常。
- **风险提示**
  - 这组测试依赖 `jsdom`；若本机命中测试环境依赖噪音，应转到 CI / 干净容器执行，**不能因为环境噪音就跳过 settings 验收**。

### 必过手工验证
- **路径**：`/parent/settings`、`/classroom-settings`
- **必须通过的点**
  - 在 `/parent/settings` 修改孩子高级设置后刷新页面，值仍然存在。
  - 在 `/classroom-settings` 开关 `TTS / Image / Video` 后重新进入页面，开关与 provider/voice 选择仍保留。
  - **TTS 关闭**时，新生成课堂不应继续请求 `/api/generate/tts`；**TTS 打开**后，应重新出现 TTS 请求并在课堂内能听到语音。
  - **图片/视频开关切换**后，新生成课堂的媒体行为应随之变化，不能出现设置已关闭却仍继续跑媒体生成，或设置已打开却始终不生效。

## P3 — 补充冒烟（建议通过）

### 建议执行命令
```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npm run test:e2e:smoke
```

```bash
cd /Users/chenguoxie/CodeBuddy/OpenMAIC && export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:$PATH" && npx vite build
```

### 建议手工补看页面
- `/history`：完成课堂后能看到最新学习记录和“快速复习”入口。
- `/classroom`：从首页正常进课堂，不出现白屏。
- `/parent/settings`：页面能正常打开，不因高级设置字段报错。

## 当前仍需警惕的回归空白
- `SceneRenderer` / `classroom-bridge` / `pipeline-client` 的入口链路自动化已经补上，但 **`stage.tsx` 中 `restoreFromDB(stageId) -> generateMediaForOutlines()` 的页面级副作用还没有专门自动化**，因此图片/视频真实渲染与刷新恢复仍必须保留人工课堂验收。
- 仓库里暂未看到覆盖完整 `phase1 -> phase2 -> result` 状态机的专门自动化；`phase2` 目前仍是人工 gate。
- 旧 `OpenMAICClient` 旁路若再次被接回主流程，仍可能重新产出 legacy `scene.slides[]`，因此 P0 不能只跑课堂播放，还要看 cache / bridge / pipeline 三处门槛。
