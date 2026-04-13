# stage-tracer progress

- 状态: 执行中
- 负责任务: 核对测评二阶段状态迁移与渲染条件
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

## TODO
- [x] 核对 `usePlacementTest.handlePhase1Complete` 的 phase2 触发参数
- [x] 核对 `ai-question-generator` 实际消费的 LLM 配置字段
- [x] 判断 AI 失败时 UI 是否会进入 error 页
- [ ] 继续核对最后一道 phase1 反馈态到 `dismissFeedback()` 的时间窗/异步 race

## 工作内容
- 已确认 `usePlacementTest.handlePhase1Complete()` 在进入 phase2 时直接读取 `useChildStore.getState().currentChild?.settings` 作为 `settings` 传给 `engine.generatePhase2Plan(...)`，没有 phase2 专属补全。
- 已确认 `placement-test-engine.generateSingleQuestion()` / `ai-question-generator.createModelFromSettings()` 实际只消费 `llmApiKey`、`llmModel`、`llmBaseUrl`，不依赖 `llmProviderId/provider`；因此“provider 缺失”不是硬 blocker。
- 已核对到 `src/engine/ai-question-generator.ts` 的当前实现并非简单 `settings.llmBaseUrl || undefined`：它已经通过 `resolveLLMBaseUrl()` 按 `llmProviderId` 或 `llmModel` 前缀回退 `BACKEND_LLM_PROVIDERS` 中的默认地址；对应 `src/engine/__tests__/ai-question-generator.test.ts` 的 5 条用例在 Node 环境下也已全部通过。
- 运行态新增证据：直接查询 PostgreSQL 中 `api.children`，当前 child 3（以及其他孩子）`settings->>llmProviderId / llmModel / llmApiKey / llmBaseUrl` 均为空，不只是 `llmBaseUrl` 缺失。
- 这意味着如果 phase2 真直接吃当前数据库里的 `child.settings`，更可能是 `generateSingleQuestion()` 因 `llmApiKey/llmModel` 缺失而直接跳过 AI，降级预设题库，而不是“仅因缺少 baseUrl 走错 OpenAI 地址”。
- 已确认 phase2 AI 生成失败不会直接 throw 到错误页：`generateQuestion()` catch 后返回 `null`，`generateSingleQuestion()` 降级预设题库；若计划为空，`handlePhase1Complete()` 走 `handleTestComplete()`，catch 分支也直接 `handleTestComplete()`。
- 当前更稳妥的判断是：如果现场仍停留在最后一张 phase1 题卡，更像还处于反馈动画/自动 dismiss 的时间窗，或者现场读取的是另一份内存/本地 settings，而不是数据库当前值；不能再把根因简单表述为“缺 llmBaseUrl 导致请求打错地址”。

## 环境信息
- 仅做代码阅读与链路核对，未修改业务代码
- 待继续补查 `dismissFeedback()` 前后的动画/定时器 race
