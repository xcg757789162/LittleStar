# Team Progress

## minimax-url-copy-fix
- researcher：已完成，定位 MiniMax Video Base URL 文案入口与自动拼接路径行为
- main：已完成 MiniMax Video Base URL 文案修复、提供商描述同步、项目索引同步、lint 检查

## placement-phase2-debug
- main：执行中，已确认 `usePlacementTest.handlePhase1Complete()` 直接读取 `currentChild?.settings` 进入 phase2，且 phase2 失败按状态机通常不会进入 `error` 页。
- stage-tracer：已确认 `llmProviderId` 不是 blocker；最新口径已修正为不能简单归因于 `llmBaseUrl` 漏写。
- repo-investigator：执行中，正在追查 phase2 现场是否读取了另一份内存/本地 settings，而不是数据库中的 `child.settings`。
- fix-executor：等待中，当前代码侧 `ai-question-generator.ts` 已具备默认 Base URL 回退逻辑，对应 5 条单测已通过，暂不应重复补丁。
- 运行态证据：当前数据库里多个孩子的 `llmProviderId / llmModel / llmApiKey / llmBaseUrl` 均为空；如果 phase2 真读取这份配置，更可能直接跳过 AI 出题并降级题库。
- 当前判断：页面仍停在最后一题更像反馈动画/自动 dismiss 的时间窗，或现场读取的是另一份非数据库 settings，而不是 phase2 专门报错卡死。

## classroom-media-compat-scan
- legacy-scanner：已完成旧媒体字段排查，当前最强根因是 **旧缓存课堂仍使用 `scene.slides[].imageUrl/audioUrl`，但 `NativeClassroom -> ClassroomBridge -> Stage` 只消费新协议 `scene.content/actions`**。
- 关键断层 1：`services/openmaic/cache.ts` 仍把旧 `scene.slides` 视为可渲染课堂，列表页还能抽出缩略图，因此用户会看到“有课可点开”。
- 关键断层 2：`stores/openmaic/classroom-bridge.ts` 遇到旧 scene 时会降成空的 `content.canvas + actions: []`，直接丢掉旧 `slides[].imageUrl/audioUrl`。
- 关键断层 3：`components/openmaic/stage.tsx` 对 `actions.length === 0` 会让播放引擎进入 idle；生产课堂入口 `pages/NativeClassroom.tsx` 也没有旧 `Slide` 组件回退。
- 次强来源：`services/openmaic/client.ts` 仍会把 native scene 压扁回旧 `slides[]`，可能就是历史缓存/旧课数据来源之一。
- 结论：这条链非常符合“列表里有缩略图、能进课堂，但声音/图片/视频全没”的现象；本质是 **v1/v1.5 课堂数据被当成有效课展示，但 v2 播放器无法消费旧媒体结构**。
- media-executor：已完成 P0 主链修复——`cache.ts` 现在会清理纯 legacy `scene.slides[]` 课堂，`classroom-bridge.ts` 会显式拒绝旧媒体结构并清空 Stage，`pipeline-client.ts` / `pipeline-executor.ts` 会把 TTS 结果补齐为 `audioId/audioUrl`；随后补齐 `outlines/mediaGenerations` 持久化、`SceneRenderer` 的 `MediaStageProvider`、`stage.tsx` 的 `restoreFromDB + generateMediaForOutlines` 启动链。新增/更新 5 个测试文件，`--environment node` 下共 41 条用例通过。

## classroom-media-fix / settings
- settings-executor：本轮 blocking 修复已真实落地，经 main 直接代码复核，关键补丁已进入源码，但**放行状态仍待 focused review / 增量验收确认**。
- 已新增 `src/stores/openmaic/child-settings-compat.ts` 与 `src/stores/openmaic/child-openmaic-sync.ts`，统一处理 `selfIntroduction` 兼容读取、legacy `bio` 清理、preset agent id ↔ registry `default-*` 映射，以及当前孩子 → OpenMAIC runtime 的整体验证入口。
- 已修改 `ChildSwitcher.tsx`、`useInitializeApp.ts`、`ClassroomSettings.tsx`、`components/openmaic/settings/index.tsx`、`settings-sync.ts`、`settings-reverse-sync.ts`、`usePlacementTest.ts`，覆盖孩子切换/初始化/SettingsDialog 打开时的正向同步、自我介绍写库收口、课堂模式与角色的正反向同步。
- 本轮 3 个 blocking 的最新代码结论：1) `src/server/services/headers-builder-server.ts` 已改为共享 `PRESET_AGENTS`，服务端 `x-agent-profiles` 对齐 `teacher/assistant/showoff/curious/notetaker/thinker`，**agent id gate 已 ready**；2) `src/hooks/usePreGeneration.ts` + `src/server/services/task-processor.ts` 已把 `child.name/selfIntroduction` 收口进 `UserRequirements.userNickname/userBio`，并透传到 `pipelineExecutor.runFullPipeline()`，**预生成画像链 gate 已 ready**；3) `src/pages/ClassroomSettings.tsx` 已把课堂字段 debounce 改成**按孩子维度缓存待写入快照 + 切孩/离页立即 flush**，同时补上 `PersistedClassroomSettings` / `toSettingsRecord()` 清掉 TS blocker，`reviewer` 最新 focused review 已给 **ready**。
- `settings-executor` 针对 reviewer 最新 blocking 的修复点：不再使用共享 `classroomSettingsTimerRef`；改为 `pendingClassroomSettingsRef`/`classroomSettingsTimersRef` 以 `childId` 为键保存待写入课堂设置快照，`currentChild.id` 变化时先 `flushClassroomSettingsToDb(previousChildId)` 再跳过当次调度，等 `syncChildToOpenMAIC(currentChild)` 完成后再为新孩子建立新的 debounce；组件卸载时也会遍历 flush 所有 pending child，而不是直接 `clearTimeout` 丢弃写库。
- `src/pages/__tests__/ClassroomSettings.persistence.test.tsx` 现在已覆盖四类课堂字段回归：1) 正常修改后应写库并回写 `childStore`；2) 250ms 内快速连续编辑时只允许最后一次快照落库并回写 `childStore`；3) 在 debounce 窗口内切孩子后仍应写回原孩子且不串到新孩子；4) 组件卸载时应立即 flush 未落库的 debounce。原有正常写库测试也已显式补上 `advanceTimersByTime(250)`。
- `regression-auditor` 的增量验收基线现在可以直接对照这四类场景核对：重点是 `ClassroomSettings` 课堂字段自动落库在正常写库、快速连续编辑、切孩子、卸载时，都不能丢写、串写或只改 runtime store；前两项 blocker 已稳定转为 ready。
- 验证现状：`read_lints` 已确认 `src/pages/ClassroomSettings.tsx`、`src/pages/__tests__/ClassroomSettings.persistence.test.tsx` 与进度文档无新增 lint 错误；按 reviewer 定向命令 `npx tsc --noEmit --pretty false 2>&1 | grep "ClassroomSettings.tsx" | cat` 复跑时已**无输出且退出码 0**，说明 `ClassroomSettings.tsx` 的三条 TypeScript blocker 已清零。按 `regression-auditor` 固定命令 `npx vitest run --watch=false src/pages/__tests__/ClassroomSettings.persistence.test.tsx` 复跑时，退出码仍为 `1`，继续被仓库既有 Vitest/Vite worker 环境拦在用例执行前；当前显式报错是 `Failed to start forks worker` + `ERR_REQUIRE_ESM`，附加 `NODE_OPTIONS=--experimental-require-module` / `--pool=threads` 后则收敛为 worker 启动阶段的 `Maximum call stack size exceeded`，说明验证基础设施问题仍独立于本轮补丁。
- 现状判断：**runtime 补丁与 TypeScript blocker 均已补齐，放行状态等待 reviewer / regression-auditor 最终确认。**
