# playwright-e2e-refactor

- 状态: 执行中
- 当前任务: Playwright E2E 标准化整合
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`
- 流程: Plan -> Review -> Execute -> Accept
- 基线情况: 已创建隔离 worktree；Node 路径已补齐；E2E Runner 骨架已完成并通过首个 smoke 用例

## 任务拆分
- [x] Task 1: 搭建 Playwright Runner 骨架
- [x] Task 2: 抽取共享夹具与辅助工具
- [x] Task 3: 迁移核心学习闭环到 full 用例
- [ ] Task 4: 迁移关键 bug 回归到 feature 用例
- [ ] Task 5: 归档 legacy bridge 诊断用例
- [ ] Task 6: 更新文档索引并清理旧脚本

## 当前进展
- `e2e-implementer-1` 已完成 Task 1 的首轮骨架搭建：新增 `playwright.config.ts`、`e2e/config/env.ts`、`e2e/fixtures/base.ts`、`e2e/tests/smoke/app-smoke.spec.ts`、`.env.e2e.example`，并更新 `package.json`、`package-lock.json`、`.gitignore`。
- `e2e-implementer-2` 已完成 Task 1 收尾：补齐真实 `gotoApp()`、`env`、`consoleErrors`、`networkErrors`、`stepShot()`，并新增 `waitForAppIdle()` 的短超时兜底，避免 `networkidle` 长时间等待导致 smoke 卡死。
- `e2e-implementer-3` 已完成 Task 2：新增 `e2e/fixtures/data.ts`、`e2e/fixtures/auth.ts`、`e2e/helpers/{tags,auth,api,screenshots,reporting,assertions,learning}.ts`、`e2e/reports/README.md`、`e2e/tests/feature/lesson-picker.spec.ts`，并修复 `e2e/fixtures/base.ts` 中缺失的 `captureAndAttach`，恢复 `stepShot()`。
- `lesson picker` feature 路径已验证通过：`npm run test:e2e:feature -- --grep "lesson picker"` 结果为 `1 passed`。
- 当前已进入 `Plan -> Review -> Execute -> Accept` 的 Task 3 阶段：团队 `playwright-e2e-continuation` 已创建；`planner` 已完成现状复核并给出最小 full-flow 验收清单，`architect-reviewer` 已完成方案评审并收敛最小真实修复边界，`executor` 已按最新结论继续执行 `core-learning-loop.spec.ts` 的 TDD。
- `planner` 最新结论已确认两个关键事实：一是 `SceneRenderer -> QuizView` 才是真实答题 DOM 链路，稳定最小流程应为 `quiz-start-button -> option-0 -> 提交答案 -> review态 -> ✅ 完成课堂`；二是 `ClassroomBridge` 未透传 `onAnswer`，导致 `learningStore.sessionStats.questionsCompleted` 无法增长，进而会被 `LearningHistory.tsx` 与 `ReviewLearningService` 的 `questionsCompleted > 0` 过滤直接卡住 history 验收。
- `planner` 与 `executor` 最新对齐后，Task 3 的真实业务阻塞已更新为**课堂路径布局塌高**，不再是 `ThemeProvider` 缺失，也不是简单的点击伪失败。当前已验证实际链路为 `Stage -> CanvasArea -> SceneRenderer -> QuizView`，但它挂在 `ClassroomBridge` 容器下时，多层祖先节点宽高为 `0`，导致 `quiz-start-button` 虽出现在 DOM 中却命中异常，无法把 quiz 真正推进到 answering。
- 最新运行态证据表明：对课堂容器链路临时注入 `height: 100%` / `width: 100%` 后，`option-0` 会立刻可见，说明 blocker 在于布局尺寸没有正确传递到 quiz 渲染链，而不是 provider 缺失或 Playwright 点击方式。进一步结合当前代码可把断点缩小到 `Stage` 根节点：`NativeClassroom` 已给 `playing` 外层 `100vw/100vh`，`ClassroomBridge` 根节点也有 `h-full w-full`，但 `Stage` 根节点仍只有 `flex-1`，而其父节点不是 flex 容器，这很可能导致高度没有真正传递下去。由此 Task 3 的优先级已收敛为：先修复 `ClassroomBridge` 下游到 `Stage/CanvasArea/QuizView` 之间的尺寸继承/撑满问题，再继续验证 `quiz-start-button -> option-0 -> 提交答案 -> review态 -> ✅ 完成课堂` 以及后续 `onAnswer` / history persistence 链路。
- 该结论也意味着此前 `ThemeProvider` 报错更可能是旧服务 / `reuseExistingServer` 复用导致的陈旧观察，不应再作为当前主 blocker。当前执行边界仍保持不变：`quiz-start-button` 不能再用 `click({ force: true })` 掩盖问题，修复后仍需在 `quiz-view.tsx` 的真实 phase 锚点上验证 answering / submit / review 切换，并继续确保最终 `/classroom_history` 新记录满足 `questionsCompleted > 0` 且 `correctCount === 1`。
- 根据 `planner` 最新回报，当前还**不能**提前更新 `.codebuddy/project-index.md`：必须先由 `executor` 落地布局修复并跑通最小课堂闭环，再由 `planner` 接手做交互一致性复核、确认 `onAnswer` / `learningStore.recordAnswer()` / `/classroom_history` 链路是否恢复，并在结论稳定后补写项目索引与必要的已知问题记录，避免把错误 root cause 写入长期文档。
- `planner` 已整理 Task 3 的后置验收清单，并作为团队统一验收口径：一是进入 `/classroom` 后必须确认 `Stage -> CanvasArea -> SceneRenderer -> QuizView` 祖先链获得非 0 宽高，不再出现 `quiz-start-button` 可见但命中异常；二是严格按真实点击路径完成 `quiz-start-button -> option-0 -> submit`，不得使用 `force: true`；三是 review 后需继续推进到 `✅ 完成课堂` 或等价完成态；四是必须验证 `QuizView` 结果能够上行触发 `onAnswer(...)`、使 `learningStore.sessionStats.questionsCompleted` 增长，并最终让 `/classroom_history` 新记录满足 `questionsCompleted > 0` 且 `correctCount === 1`；只有这些条件稳定通过后，才允许更新 `.codebuddy/project-index.md`。
- `executor` 已完成 Task 3 收口并给出真实绿证据：`ClassroomBridge.tsx` 补齐 `onAnswer` 事件桥接并修复根容器为 `flex h-full w-full min-h-0 overflow-hidden`，`stage.tsx` 根节点补齐 `h-full w-full min-h-0 min-w-0`，`quiz-view.tsx` 在判分进入 reviewing 时 dispatch `quiz-answer-results`，`core-learning-loop.spec.ts` 去掉 `force click` 后严格按 `quiz-start-button -> option-0 -> 提交答案 -> review -> ✅ 完成课堂 -> session-summary -> learning-history-page` 验证全链路。
- 最新独立验证结果：在 `playwright-e2e-runner-20260412` worktree 中执行 `E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test e2e/tests/full/core-learning-loop.spec.ts --workers=1 --reporter=line` 得到 `1 passed (48.3s)`；同时对 `ClassroomBridge.tsx`、`stage.tsx`、`quiz-view.tsx`、`core-learning-loop.spec.ts` 的 lints 检查结果为 `0`。这意味着 Task 3 已按验收口径完成，`.codebuddy/project-index.md` 可以从冻结状态转入更新。
- `architect-reviewer` 对家长设置“重置后整页无法点击”问题的二次评审也已收敛：当前 root cause 更像共享 `ui/dialog.tsx` / `ui/alert-dialog.tsx` 在嵌套受控 modal 关闭后遗留 `pointer-events` / inert 清理残留，而不是二级弹窗内容层级低于外层 dialog。后续最小修复边界应优先落在共享模态层 cleanup 与回归测试，验收需覆盖 reset/delete/model/add/clear-cache 等二级弹窗关闭后父级设置页可点击、关闭设置后课堂或页面主区恢复可点击，以及 `document.body.style.pointerEvents` 不残留。
- smoke 用例已调整为更稳定的真实契约：打开 `/`、等待 idle、断言 `home-page` 或 `auth-username` 至少一个可见，并执行 `stepShot('app-smoke-home-or-auth')`。
- 配置与脚本已统一：`playwright.config.ts`、`e2e/config/env.ts`、`.env.e2e.example` 统一到 `5173` 基准地址；`package.json` 补齐 `test:e2e`、`test:e2e:smoke`、`test:e2e:feature`、`test:e2e:full`、`test:e2e:legacy`、`test:e2e:ui`、`test:e2e:report`、`test:e2e:install`。
- 最终验证结果：`npm run test:e2e:smoke` 通过，结果 `1 passed (7.9s)`；额外校验 `package.json ok`。
- 关注项：当前 Node `20.18.0` 下 `npm install` 出现多条 `EBADENGINE` warning，但本次安装和 smoke / feature 执行均成功；若团队后续统一升级 Node，可顺手清理。

---

# pregeneration-fix-team

- 状态: 已完成
- 当前任务: 修复 PreGeneration 后端与 OpenMAIC upstream 契约漂移
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 流程: Plan -> Review -> Execute -> Accept
- 基线情况: 首页课程卡片在预生成 5% 后落入“备课失败了，点这里再试试”；数据库 `generation_tasks` 真实进入 `failed`，失败阶段锁定在 `outlines`

## 任务拆分
- [x] Task 1: 核对预生成流水线与 upstream 契约
- [x] Task 2: 修复预生成请求体与响应解析
- [x] Task 3: 补充验证覆盖关键失败链路
- [x] Task 4: 运行校验并更新索引文档

## 当前进展
- `planner` 已完成本仓预生成链路盘点，确认真正入口为 `task-processor -> PipelineExecutor.runFullPipeline()`，并指出当前后端对 `scene-outlines-stream`、`scene-content`、`scene-actions`、`tts` 的请求体/响应解析均停留在旧契约。
- `upstream-checker` 已完成 upstream 路由核对，确认 `scene-outlines-stream` 现要求 `{ requirements }` 包裹且返回 SSE；`scene-content` 现要求 `allOutlines + stageId` 并返回 `{ success, content, effectiveOutline }`；`scene-actions` 现要求 `allOutlines + stageId` 并返回 `{ success, scene, previousSpeeches }`；`tts` 现要求 `audioId + ttsProviderId + ttsVoice` 并返回 `{ success, audioId, base64, format }`。
- 已新增 `src/server/services/__tests__/pipeline-executor.test.ts`，用回归测试锁定 4 个子接口的请求体与响应适配；测试先红后绿，验证修复确实命中了根因。
- 已重写 `src/server/services/pipeline-executor.ts`：补齐 outlines 的 `requirements` 包裹、content/actions 的 `allOutlines/stageInfo/stageId`、跨场景 `previousSpeeches` 传递、以及 TTS 的 provider 参数映射与 `base64` 响应解析。
- 已完成本地验证：`pipeline-executor.test.ts` 通过、`npm run build:server` 通过。
- 已完成部署验证：执行 `bash docker/deploy/update-app.sh --full`，`littlestar-app` 重建成功，7 项端到端验证全部通过。
- 已完成知识沉淀：`.codebuddy/project-index.md` 已记录本次 upstream 契约漂移根因、修复方式，以及 `update-app.sh` auto 模式不会识别 `src/server/services/` 变更的注意点。
- 当前结论：本次预生成失败的主根因已经修复并完成部署验证；后续若页面仍出现异常，应优先转向真实业务数据验收或独立排查新的运行态问题，而不再是这条已定位的旧契约断链。
