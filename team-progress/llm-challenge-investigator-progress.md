# llm-challenge-investigator 进度

## TODO 清单
- [x] 定位评测挑战阶段的前端 LLM 触发入口
- [x] 定位当前项目里可用的服务端代理 / 后端 LLM 链路
- [x] 核对评测阶段为何落到浏览器直连而不是后端代理
- [x] 核查 ChildSettings / OpenMAIC Settings / 环境变量配置传递链
- [x] 输出最可能根因与最小修复建议

## 工作内容

### 1. 评测挑战阶段的前端触发点
- `src/hooks/usePlacementTest.ts`
  - `handlePhase1Complete()` 在阶段一结束后读取 `currentChild.settings`，经 `normalizeChildSettings()` 后传给 `engine.generatePhase2Plan(...)`。
  - 关键代码：`usePlacementTest.ts:394-403`
- `src/engine/placement-test-engine.ts`
  - `generatePhase2Plan()` 在 `challenge / mixed / verify` 三种模式下都会优先尝试 `generateQuestion(...)`。
  - `challenge` 分支直接在前端循环调用 AI 生成题目；`mixed/verify` 也会走 `generateSingleQuestion()`，内部同样先调 `generateQuestion(...)`。
  - 关键代码：`placement-test-engine.ts:559-566`、`896-904`
- `src/engine/ai-question-generator.ts`
  - 明确注释写着“从 ChildSettings 读取 LLM 配置，直接在前端调用”。
  - 实现里直接 `import { generateObject } from 'ai'` + `createOpenAI`，然后在浏览器里调用 `generateObject(...)`。
  - 关键代码：`ai-question-generator.ts:1-7`、`101-119`、`194-200`

### 2. 修复前调查结论（历史快照）
- 初始调查时，现有服务端 LLM 代理链只存在于**课堂预生成 / OpenMAIC pipeline**：
  - `src/server/index.ts` 原先只有 `/api/pre-generate` 系列接口。
  - `src/server/services/headers-builder-server.ts` 把 `llmModel / llmApiKey / llmBaseUrl` 组装成 `x-model / x-api-key / x-base-url`。
  - `src/server/services/pipeline-executor.ts` 再带着这些 headers 去请求 `http://localhost:3002` 的 OpenMAIC 服务。
- 这解释了用户最初截图为什么会命中浏览器直连：**当时评测题目生成没有走到服务端题目代理**。

### 3. 修复后复核：当前评测题目调用链
- `src/engine/ai-question-generator.ts`
  - 已改为同源 `fetch('/api/pre-generate/question', ...)`。
  - 浏览器端不再 `createOpenAI(...).chat(...)`，因此**当前代码不会再让浏览器直连第三方模型**。
- `src/server/index.ts`
  - 已新增 `POST /api/pre-generate/question`。
  - 该接口在预生成服务内调用 LLM，监听端口仍是 `3003`。
- `vite.config.ts`
  - `/api/pre-generate` 会先代理到 `http://localhost:8080`。
- `docker/deploy/nginx-app.conf`
  - `/api/pre-generate/` 再由 Nginx 转发到 `http://pregeneration/api/pre-generate/`。
- `docker/deploy/supervisord.conf`
  - `pregeneration` 进程实际启动的是 `/app/pregeneration/dist/server/index.js`，端口 `3003`。
- 结论：**当前链路已经变成 浏览器 → 8080 → Nginx → pregeneration(3003) → LLM**。

### 4. 为什么之前会出现 `https://api.minimaxi.com/anthropic/v1/chat/completions`
- `src/lib/openmaic/ai/providers.ts` 里 MiniMax LLM provider 仍被定义为：
  - `type: 'anthropic'`
  - `defaultBaseUrl: 'https://api.minimaxi.com/anthropic/v1'`
- 初始版本的 `src/engine/ai-question-generator.ts` 无论什么 provider 都强制 `createOpenAI(...)`，所以会把 Anthropic base URL 错打成 OpenAI 风格的 `/chat/completions`。
- 这和用户截图完全一致，因此截图对应的是**修复前的前端直连实现**。
- 修复后，浏览器本身不应再直接请求 `api.minimaxi.com`；如果仍看到该现象，优先怀疑旧 bundle 未刷新/未部署成功。

### 5. 修复后配置链 / 兼容性复核结果（再次更新）
- OpenMAIC 设置面板 → ChildSettings：
  - `src/stores/openmaic/settings-reverse-sync.ts`
  - 从 settings store 取 `providerId + modelId + providersConfig[providerId].apiKey/baseUrl`
  - 反向写成 `llmProviderId / llmModel / llmApiKey / llmBaseUrl`
- ChildSettings → 评测页：
  - `usePlacementTest.ts:394-403`
  - 从 `currentChild.settings` 读出后传入 phase2 生成逻辑
- ChildSettings → 新题目代理：
  - `src/engine/ai-question-generator.ts` 把 `llmProviderId / llmModel / llmApiKey / llmBaseUrl` 直接发给 `/api/pre-generate/question`
  - `src/server/index.ts` 通过新抽出的 `src/server/question-model.ts` 创建模型实例
- `src/server/question-model.ts` 已确认：
  - 按 `openai / anthropic / google` 三类 provider-aware 分流
  - `MiniMax` 明确映射到 `anthropic` 类型，默认 Base URL 为 `https://api.minimaxi.com/anthropic/v1`
  - `Gemini` 走 `createGoogleGenerativeAI(...)`
  - `backend-custom / custom-llm` 在模型前缀明确时也会优先按前缀分流，例如 `minimax:MiniMax-M2`
- `src/server/__tests__/question-model.test.ts` 已覆盖：
  - `backend-openai` → `createOpenAI(...)`
  - `minimax` 与 `backend-custom + minimax:*` → `createAnthropic(...)`
  - `backend-gemini` → `createGoogleGenerativeAI(...)`
- `src/engine/__tests__/ai-question-generator.test.ts` 已覆盖：
  - 前端只会请求同源 `/api/pre-generate/question`
  - 代理异常时会降级为 `null`
- 我本地复跑命令：
  - `npx vitest run --environment node src/server/__tests__/question-model.test.ts src/engine/__tests__/ai-question-generator.test.ts`
  - 使用项目约定 Node 路径补 `PATH` 后命令退出码为 `0`
- 结论：**浏览器直连/CORS 已修复，MiniMax 服务端协议错配也已收口；当前代码层面已具备正确的 provider-aware 代理能力。**

## 当前最可能根因（最终复核）
1. **历史根因已修复**：评测 challenge 阶段此前的浏览器直连 LLM 导致 `localhost:8080 -> api.minimaxi.com` CORS，这一条现在已被同源代理替换。
2. **次级协议根因已修复**：服务端题目代理此前若继续无条件走 `createOpenAI(...)`，MiniMax Anthropic URL 仍会错配；现在已由 `question-model.ts` 做 provider-aware 分流收口。
3. **本轮新增确认的真实根因**：运行时仍有两条链路直接读取 `currentChild.settings`——`usePlacementTest.handlePhase1Complete()` 的 phase2 配置与 `usePreGeneration.runPreGeneration()` 的 `api-key-missing` 判断/任务提交；当家长刚在前端高级设置改完、DB 尚未同步或当前页面仍持有旧 child 快照时，会表现为“前端显示已配置，但挑战阶段/首页仍认为未配置”。
4. **最小修复已落地**：新增 `mergeChildSettingsWithLiveStore()`，让 challenge phase2 与 pre-generation 在运行时优先读取 live settings 里的有效 LLM 配置，同时空值不会覆盖 DB 已有值。

## 最小验证建议（最终复核后）
1. 浏览器网络面板确认实际请求是同源 `/api/pre-generate/question`
2. 验证 `GET /api/pre-generate/health` 可通
3. 若仍失败，直接查看 `pregeneration` 日志，确认 `3003` 服务已部署到包含 `question-model.ts` 的最新版本

## 当前判断
- **最新代码口径下，“浏览器直连第三方模型导致 CORS” 与 “MiniMax 服务端协议错配” 两个主根因都已修复。**
- **若现场仍复现 challenge 失败，最可能是运行时未更新或 3003 代理链路未生效，而不是当前仓库代码仍在直连/错配。**

## 环境信息
- Workspace: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- OS: macOS (darwin)
- Shell: zsh
- 本次仅做代码与配置链调查，未改业务代码

## 状态标记
- 状态：已完成调查
- 结论可信度：高
- 是否阻塞：否（已有明确根因和最小修复点）
