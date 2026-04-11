## 1. 数据库 — 新增 `generation_tasks` 任务队列表

- [ ] 1.1 在 `docker/postgresql/init/01-schema.sql` 中新增 `api.generation_tasks` 表：
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
- [ ] 1.2 添加索引：`child_id`、`status`、`child_id + status`
- [ ] 1.3 在 `02-roles.sql` 中添加 `generation_tasks` 的权限（authenticated 角色 CRUD）
- [ ] 1.4 在 `03-rls.sql` 中添加 RLS 策略（child_id 隔离）

## 2. 后端服务 — 预生成 API 端点

- [ ] 2.1 创建后端入口文件 `src/server/index.ts`（Express 应用），监听 3003 端口
- [ ] 2.2 实现 `POST /api/pre-generate` 端点：
  - 接收 body: `{ childId, childSettings, tasks: [{ knowledgeNodeId, date, requirement, language }] }`
  - 验证参数（childId 必填、settings 含必要 API Key）
  - 将每个 task 写入 `generation_tasks` 表（status: 'pending'）
  - 启动后台异步处理（不阻塞请求响应）
  - 返回: `{ taskIds: string[], message: string }`
- [ ] 2.3 实现 `GET /api/pre-generate/status?childId={id}` 端点：
  - 查询该 child 的所有活跃任务（status != 'completed' && status != 'cancelled'）
  - 返回: `{ tasks: [{ id, status, progress, currentStep, knowledgeNodeId, error }], completedCount, totalCount }`
- [ ] 2.4 实现 `POST /api/pre-generate/cancel` 端点：
  - 接收 body: `{ taskIds: string[] }` 或 `{ childId: number }`
  - 将匹配的 pending/running 任务标记为 cancelled

## 3. 后端服务 — Pipeline 编排引擎

- [ ] 3.1 创建 `src/server/services/pipeline-executor.ts`：
  - 从前端 `OpenMAICPipelineClient` 迁移 `runFullPipeline()` 核心逻辑
  - 改为后端 HTTP 调用（baseUrl = `http://localhost:3002`，Docker 内网直连）
  - 每个步骤完成后更新 `generation_tasks.checkpoint` JSONB（断点数据）
  - 每个步骤完成后更新 `generation_tasks.progress` 和 `current_step`
- [ ] 3.2 创建 `src/server/services/task-processor.ts`：
  - 从 `generation_tasks` 表取出 pending 任务（FIFO 顺序，串行处理）
  - 调用 `pipeline-executor` 执行完整 Pipeline
  - 成功后将 Classroom JSON 写入 `classroom_cache` 表
  - 失败后更新重试计数，未超限则重新标记为 pending
  - 支持断点恢复：检查 `checkpoint` 字段，从中断点继续
- [ ] 3.3 迁移 `buildHeadersFromSettings()` 到后端可用（isomorphic 或重新实现）：
  - 从请求 body 中的 `childSettings` 构建 OpenMAIC 子 API 所需的 HTTP Headers

## 4. 后端服务 — 课程规划迁移

- [ ] 4.1 将 `LessonPlanner`（`src/services/lesson-planner/planner.ts`）标记为 isomorphic：
  - 确保不依赖浏览器 API（当前已是纯算法，无浏览器依赖）
  - 后端 import 使用，或复制一份到 `src/server/services/`
- [ ] 4.2 将 `RequirementGenerator`（`src/services/lesson-planner/requirement-generator.ts`）标记为 isomorphic：
  - 同上，纯算法无浏览器依赖
- [ ] 4.3 实现后端课程规划流程：
  - 从数据库读取 `knowledge_nodes`、`mastery_records`、`placement_tests`
  - 调用 `LessonPlanner.planLessons()` + `RequirementGenerator.generate()`
  - 生成任务列表写入 `generation_tasks` 表

## 5. 前端重构 — `usePreGeneration` 瘦客户端

- [ ] 5.1 重构 `usePreGeneration` Hook（`src/hooks/usePreGeneration.ts`）：
  - 移除 `PipelineClient`、`GenerationScheduler`、`LessonPlanner`、`RequirementGenerator` 的直接依赖
  - 触发逻辑：检查条件满足后 → `POST /api/pre-generate`（body 含 childId, childSettings, 评测科目）
  - 进度监控：定时 `GET /api/pre-generate/status?childId=` 轮询（3-5 秒间隔）
  - 状态映射：后端任务状态 → 前端 `PreGenerationStatus`
  - 保留手动触发 `triggerGeneration()` 和事件监听（`classroom-completed`、`placement-test-completed`）
- [ ] 5.2 更新 Home 页面（`src/pages/Home.tsx`）：
  - 确保 `usePreGeneration` 接口不变（返回值类型兼容）
  - 进度展示组件不需要修改（已有 `stageText`、`generationProgress` 等）

## 6. Docker 部署配置

- [ ] 6.1 在 supervisord 配置中新增预生成服务进程（监听 3003 端口）
- [ ] 6.2 在 Nginx 配置中添加路由规则：`/api/pre-generate/*` → `:3003`
- [ ] 6.3 在 Vite 开发代理中添加 `/api/pre-generate` → `http://localhost:3003`
- [ ] 6.4 编写后端服务的 `tsconfig.json` 和构建脚本（编译 TypeScript → Node.js）

## 7. 端到端验证

- [ ] 7.1 本地开发环境验证：启动后端服务 + Vite dev server + Docker（OpenMAIC + PostgreSQL），触发预生成流程
- [ ] 7.2 验证前端页面跳转后生成不中断：触发预生成 → 立即切到其他页面 → 回到 Home → 看到已生成的课堂
- [ ] 7.3 验证断点续传：生成过程中手动重启后端服务 → 检查任务恢复执行
- [ ] 7.4 验证错误处理：API Key 无效/网络超时 → 重试逻辑 → 最终失败时前端展示错误
- [ ] 7.5 验证缓存写入：后端生成完成后 `classroom_cache` 表有正确数据，前端课程列表能展示
