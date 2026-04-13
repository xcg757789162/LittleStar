# classroom-loading-debug

- 状态: 已完成
- 当前任务: 修复 `/classroom` 页面因预生成恢复链路异常导致的长时间卡住
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 流程: Plan -> Review -> Execute -> Accept

## 任务拆分
- [x] 核对 `/api/pre-generate` 真实入口与代理路径
- [x] 定位运行态卡住的新增根因
- [x] 用 TDD 修复进度写库整数报错
- [x] 重建服务并重新生成真实课堂缓存
- [x] 通过浏览器验收 `/classroom` 恢复正常

## 当前进展
- 已确认无尾斜杠访问 `/api/pre-generate` 会被 Nginx 301 到 `/api/pre-generate/`；之前手工 404/异常提交属于入口使用错误，不是服务没挂。
- 已在预生成服务 stderr 中定位到新根因：`generation_tasks.progress` 为 PostgreSQL `INTEGER`，但 `PipelineExecutor` 会产生浮点进度（如 `70.666...`），导致 `task-processor` 写库时报 `invalid input syntax for type integer`。
- 已新增 `src/server/services/task-progress.ts` 与 `src/server/services/__tests__/task-processor.test.ts`，并把 `task-processor.ts` 的 `onProgress/onCheckpoint` 统一切到 `normalizeTaskProgress()`。
- 已完成 `bash scripts/build-server.sh` 与 `bash docker/deploy/update-app.sh --full`，7 项端到端验证通过。
- 已重新提交 child 3 的数学预生成任务，数据库确认 `classroom_cache` 成功生成 `math-numbers-1-5`，`title=数字王国探险开始啦！`，`scenes_count=5`。
- 已通过浏览器自动化验收：以 child 3 身份打开 `/classroom` → 选择数学 → 打开“数字王国探险开始啦！”，页面出现 `✅ 完成课堂`，且 `正在准备课堂...` 不可见。

## 补充任务：评测二阶段 AI 出题 provider 回退修复（2026-04-13 00:49）
- 已按 TDD 新增 `src/engine/__tests__/ai-question-generator.test.ts`，先复现 Qwen 缺失 `llmBaseUrl` 时 `createOpenAI({ baseURL: undefined })` 的错误行为。
- 已在 `src/engine/ai-question-generator.ts` 增加 `resolveLLMBaseUrl()`，未显式配置 `llmBaseUrl` 时改为按 `llmProviderId` 回退到 `BACKEND_LLM_PROVIDERS` 的默认地址，避免误打到 OpenAI。
- 已在 Node `22.12.0` 下运行 `vitest.config.ts`：新增回归测试转绿，连同 `placement-test-engine.test.ts` 共 16 条断言通过。
- 已同步更新 `.codebuddy/project-index.md`，记录本次根因、修复和验证结果。
