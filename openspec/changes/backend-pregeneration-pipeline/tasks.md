## 1. 数据库 — 新增 `generation_tasks` 任务队列表

- [x] 1.1 在 `docker/postgresql/init/01-schema.sql` 中新增 `api.generation_tasks` 表：
  ```
  id SERIAL PRIMARY KEY
  child_id INTEGER NOT NULL REFERENCES api.children(id)
  status VARCHAR(20) NOT NULL DEFAULT 'pending'   -- pending/running/completed/failed/cancelled
  knowledge_node_id VARCHAR(100) NOT NULL
  date VARCHAR(10) NOT NULL
  requirement TEXT NOT NULL                         -- RequirementGenerator 生成的 prompt
  language VARCHAR(10) NOT NULL DEFAULT 'zh-CN'
  settings JSONB NOT NULL                           -- ChildSettings 快照（含 API Key 配置）
  progress INTEGER NOT NULL DEFAULT 0               -- 0-100 百分比
  current_step VARCHAR(30)                          -- 当前 Pipeline 步骤名
  checkpoint JSONB                                  -- 断点续传数据（已完成步骤的中间结果）
  result_cache_key VARCHAR(220)                     -- 成功后关联的 classroom_cache.cache_key
  error TEXT                                        -- 失败原因
  retry_count INTEGER NOT NULL DEFAULT 0
  max_retries INTEGER NOT NULL DEFAULT 2
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  started_at TIMESTAMPTZ
  completed_at TIMESTAMPTZ
  ```
- [x] 1.2 添加索引：`child_id`、`status`、`child_id + status`
- [x] 1.3 在 `02-roles.sql` 中添加 `generation_tasks` 的权限（authenticated 角色 CRUD）
- [x] 1.4 在 `03-rls.sql` 中添加 RLS 策略（child_id 隔离）

## 2. 后端服务 — 预生成 API 端点

- [x] 2.1 创建后端入口文件 `src/server/index.ts`（Express 应用），监听 3003 端口
- [x] 2.2 实现 `POST /api/pre-generate` 端点：
  - 接收 body: `{ childId, childSettings, tasks: [{ knowledgeNodeId, date, requirement, language }] }`
  - 验证参数（childId 必填、settings 含必要 API Key）
  - 将每个 task 写入 `generation_tasks` 表（status: 'pending'）— 使用事务批量 INSERT (I1 fix)
  - 启动后台异步处理（不阻塞请求响应）
  - 返回: `{ taskIds: string[], message: string }`
  - 新增: MAX_TASKS_PER_SUBMIT=50 验证 (I2 fix)
- [x] 2.3 实现 `GET /api/pre-generate/status?childId={id}` 端点：
  - 查询该 child 的所有活跃任务（status != 'completed' && status != 'cancelled'）
  - 返回: `{ tasks: [{ id, status, progress, currentStep, knowledgeNodeId, error }], completedCount, totalCount }`
- [x] 2.4 实现 `POST /api/pre-generate/cancel` 端点：
  - 接收 body: `{ taskIds: string[] }` 或 `{ childId: number }`
  - 将匹配的 pending/running 任务标记为 cancelled
  - 新增: taskIds 类型验证 (I3 fix)
- [x] 2.5 实现 `GET /api/pre-generate/health` 端点：
  - 健康检查含 DB 连通性验证 (I4 fix)
- [x] 2.6 添加 Graceful Shutdown (C1 fix):
  - SIGTERM/SIGINT → stopTaskProcessor + pool.end

## 3. 后端服务 — Pipeline 编排引擎

- [x] 3.1 创建 `src/server/services/pipeline-executor.ts`：
  - 从前端 `OpenMAICPipelineClient` 迁移 `runFullPipeline()` 核心逻辑
  - 改为后端 HTTP 调用（baseUrl = `http://localhost:3002`，Docker 内网直连）
  - 每个步骤完成后更新 `generation_tasks.checkpoint` JSONB（断点数据）
  - 每个步骤完成后更新 `generation_tasks.progress` 和 `current_step`
  - SSE 解析错误添加日志 (I6 fix)
- [x] 3.2 创建 `src/server/services/task-processor.ts`：
  - 从 `generation_tasks` 表取出 pending 任务（FIFO 顺序，串行处理）
  - 使用 UPDATE...RETURNING + FOR UPDATE SKIP LOCKED 原子拾取 (C2 fix)
  - 调用 `pipeline-executor` 执行完整 Pipeline
  - 成功后将 Classroom JSON 写入 `classroom_cache` 表
  - 失败后更新重试计数，未超限则重新标记为 pending
  - 支持断点恢复：检查 `checkpoint` 字段，从中断点继续
- [x] 3.3 迁移 `buildHeadersFromSettings()` 到后端可用（isomorphic 或重新实现）：
  - 从请求 body 中的 `childSettings` 构建 OpenMAIC 子 API 所需的 HTTP Headers

## 4. 后端服务 — 课程规划迁移

- [x] 4.1 将 `LessonPlanner`（`src/services/lesson-planner/planner.ts`）确认为 isomorphic：
  - 确认不依赖浏览器 API（纯算法，无浏览器依赖）✅
- [x] 4.2 将 `RequirementGenerator`（`src/services/lesson-planner/requirement-generator.ts`）确认为 isomorphic：
  - 同上，纯算法无浏览器依赖 ✅
- [x] 4.3 课程规划保留在前端（合理折衷决策）：
  - LessonPlanner 和 RequirementGenerator 为轻量纯算法，保留在前端 `usePreGeneration` Hook 中
  - 前端做轻量规划，后端做重型 LLM Pipeline 执行
  - 偏离原始 task 设计但架构上更合理

## 5. 前端重构 — `usePreGeneration` 瘦客户端

- [x] 5.1 重构 `usePreGeneration` Hook（`src/hooks/usePreGeneration.ts`）：
  - 移除 `PipelineClient`、`GenerationScheduler` 的直接依赖
  - 保留 `LessonPlanner`、`RequirementGenerator`（轻量规划在前端）
  - 触发逻辑：检查条件满足后 → `POST /api/pre-generate`（body 含 childId, childSettings, 任务数组）
  - 进度监控：定时 `GET /api/pre-generate/status?childId=` 轮询（3 秒间隔）
  - 状态映射：后端任务状态 → 前端 `PreGenerationStatus`
  - 保留手动触发 `triggerGeneration()` 和事件监听（`classroom-completed`、`placement-test-completed`）
- [x] 5.2 验证 Home 页面（`src/pages/Home.tsx`）无需修改：
  - `usePreGeneration` 接口不变（返回值类型兼容）✅
  - 进度展示组件不需要修改 ✅

## 6. Docker 部署配置

- [x] 6.1 在 supervisord 配置中新增预生成服务进程（监听 3003 端口，priority 400）
- [x] 6.2 在 Nginx 配置中添加路由规则：`/api/pre-generate/*` → `:3003`（含 upstream + CORS）
- [x] 6.3 在 Vite 开发代理中添加 `/api/pre-generate` → `http://localhost:3003`
- [x] 6.4 编写后端服务的 `tsconfig.server.json` 和构建脚本 `scripts/build-server.sh`
- [x] 6.5 更新 `Dockerfile.app`：新增 Stage 1.5 (pregen-builder) + COPY 产物到 `/app/pregeneration/`
- [x] 6.6 更新 `entrypoint.sh`：添加 Pre-Generation 服务验证和启动信息
- [x] 6.7 更新 deploy `docker-compose.yml`：添加 `PREGEN_PORT` 环境变量 + 09 号迁移脚本
- [x] 6.8 创建幂等迁移脚本 `09-generation-tasks.sql`（给已运行数据库用）

## 7. 端到端验证

- [x] 7.1 后端 TypeScript 编译验证：0 错误 ✅
- [x] 7.2 后端构建产物验证：6 个 JS 文件（`dist-server/server/`）✅
- [x] 7.3 前端构建产物验证：包含 `/api/pre-generate` 端点 ✅
- [x] 7.4 所有文件 lint 检查：0 diagnostics ✅
- [x] 7.5 配置文件验证：Vite proxy + Nginx upstream/location + supervisord program + DB schema/roles/rls ✅
- [x] 7.6 Dockerfile 路径一致性验证：supervisord command → `/app/pregeneration/dist/server/index.js` ✅

## 代码审查修复记录

| ID | 严重级 | 修复 | 文件 |
|---|---|---|---|
| C1 | Critical | Graceful shutdown (SIGTERM/SIGINT) | `src/server/index.ts` |
| C2 | Critical | FOR UPDATE SKIP LOCKED 原子拾取 | `src/server/services/task-processor.ts` |
| I1 | Important | 事务批量 INSERT (BEGIN/COMMIT/ROLLBACK) | `src/server/index.ts` |
| I2 | Important | MAX_TASKS_PER_SUBMIT=50 限制 | `src/server/index.ts` |
| I3 | Important | taskIds 类型验证 | `src/server/index.ts` |
| I4 | Important | Health check DB 连通性 | `src/server/index.ts` |
| I6 | Important | SSE 解析错误日志 | `src/server/services/pipeline-executor.ts` |
