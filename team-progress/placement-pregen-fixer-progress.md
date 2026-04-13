# placement-pregen-fixer

- 状态: 已完成修复与最小验证
- 当前任务: 修复评测 phase2 出题代理、移除旧预生成触发链、按学科修正缓存水位线，并增强无课学科状态反馈
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 流程: Plan -> Review -> Execute -> Verify -> Report

## 任务拆分
- [x] 梳理评测出题与预生成回归链路
- [x] 让评测 AI 出题改走同源后端代理
- [x] 移除旧 `/pre_generation_tasks` 触发链
- [x] 把预生成/缓存判断改成按学科统计
- [x] 增强 `NativeClassroom` 无课学科的动态状态反馈
- [x] 完成最小验证并同步索引文档

## 已落地改动
- `src/server/index.ts`
  - 新增 `POST /api/pre-generate/question` 同源代理端点。
  - 后端使用孩子配置的 LLM 参数调模型，并复用题目 schema 校验；失败时返回 4xx/5xx 给前端降级。
- `src/shared/backend-llm-providers.ts`
  - 抽出后端 LLM provider 共享注册表，供前端设置页与预生成服务端共用，避免 server build 拉入浏览器专属配置实现。
- `src/server/question-model.ts` / `src/services/config.ts`
  - `question-model` 不再从前端 `config.ts` 读取 `BACKEND_LLM_PROVIDERS`，改为依赖共享模块；`config.ts` 保持原导出接口，改为 re-export。
  - `src/services/config.ts(263)` 的 `import.meta.env` 是 4 月 11 日已存在的代码；本轮新增服务端引用后才首次进入 `build:server` 编译链，因此这次构建报错属于“既有问题被本轮触发”，已通过解耦共享常量安全收口。
- `docker/deploy/Dockerfile.app`
  - 按最新 Docker 构建报错做最小修复：在 `pregen-builder` 里补充 `COPY src/lib/openmaic/media/types.ts ./src/lib/openmaic/media/types.ts`，满足 `src/services/openmaic/pipeline-types.ts` 第 11 行对 `MediaGenerationRequest` 的类型依赖。
  - 这次没有扩散修改服务端源码，只补 Docker 构建上下文范围。
- `src/engine/ai-question-generator.ts`
  - 改成只请求 `/api/pre-generate/question`，浏览器端不再直接连第三方模型，避免 MiniMax / Qwen / DeepSeek 等在 phase2 challenge 阶段触发 CORS。
- `src/hooks/usePlacementTest.ts`
  - 删除失效的 `/pre_generation_tasks` API 回退逻辑，仅保留 `placement-test-completed` 事件，统一交给当前有效的 `usePreGeneration` 链路处理。
- `src/services/openmaic/cache.ts`
  - `getCacheSize(subject?)` 支持按学科计数。
- `src/hooks/usePreGeneration.ts`
  - 新增 `getSubjectsMissingCache()`，按已评测学科逐科检查缓存，最低水位线改成“每个已评测学科至少 1 节课”。
  - 只为缺课学科提交生成任务。
  - 自动触发与课堂完成后补货改为直接跑逐科检查，不再被全局缓存总数误判挡住。
- `src/pages/NativeClassroom.tsx`
  - 接入 `usePreGeneration`，在选中无课学科时展示“检查中 / 生成中 / 失败”状态、进度条与任务数。
  - 预生成完成后会自动刷新课程列表，减少纯静态等待。
- `.codebuddy/project-index.md`
  - 已同步记录本轮修复点、验证命令和风险。

## 最小验证
- `./node_modules/.bin/vitest run --environment node src/engine/__tests__/ai-question-generator.test.ts src/hooks/__tests__/usePreGeneration.test.ts src/services/openmaic/__tests__/cache.test.ts`
  - 结果: **3 个文件 / 22 个测试全部通过**
- `./node_modules/.bin/vitest run --environment node src/server/__tests__/question-model.test.ts src/engine/__tests__/ai-question-generator.test.ts`
  - 结果: **2 个文件 / 6 个测试全部通过**（确认 `MiniMax` 走 Anthropic-compatible、`Gemini` 走 Google 客户端，前端同源代理链仍保持可用）
- `bash -n docker/deploy/update-app.sh`
  - 结果: **通过**（部署脚本在新增 pregen 自动重建判定和 question 路由探测后语法正常）
- `bash docker/deploy/update-app.sh --full`
  - 结果: **Docker build 已通过并拉起新 `littlestar-app` 容器**；随后 `docker compose ps -a` 显示 `littlestar-app` 为 `Up (healthy)`。
- `curl -X POST http://localhost:8080/api/pre-generate/question -d '{}'`
  - 结果: **400**（不再是 404，说明经 Nginx 的 question 路由已存在）
- `docker exec littlestar-app curl -X POST http://127.0.0.1:3003/api/pre-generate/question -d '{}'`
  - 结果: **400**（容器内 pregeneration 进程自身路由已存在，不是网关假象）
- `read_lints`
  - 结果: 本轮修改文件 **无新增 lint 错误**
- 全仓搜索 `pre_generation_tasks`
  - 结果: `src/` 下已无活跃引用

## 仍需关注的风险
- `docker/openmaic/docker-compose.yml` 当前未显式定义 pre-generation 服务；如果现场运行环境沿用这套 compose，需要确认 3003 服务是否由其他方式启动，否则新的题目代理与补货后端都会不可用。
- 本次补丁已把 `MiniMax` 和 `Gemini` 收口到正确的服务端客户端协议；但如果后续继续开放更多非 OpenAI 兼容 LLM（例如新的 Anthropic / Google 系分支），需要同步扩展 `src/server/question-model.ts` 的 provider 映射，避免题目代理再次只支持一部分 provider。
- `NativeClassroom` 现在已能展示动态状态并在补货完成后刷新，但首页 `Home.tsx` 的 ready/CTA 口径仍是全局缓存视角，没有完全做到“按学科显式告诉用户哪一科还在备课”。
