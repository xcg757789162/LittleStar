## 1. PostgreSQL Schema + 种子数据（基础层）

- [x] 1.1 创建 `docker/postgresql/` 目录结构：`init/01-schema.sql`（建表 DDL）、`init/02-roles.sql`（角色和权限）、`init/03-rls.sql`（RLS 策略）、`init/04-seed.sql`（种子数据）
- [x] 1.2 编写 14+1 张表的 DDL（snake_case 命名）：`users`、`children`、`knowledge_nodes`、`learning_records`、`mastery_records`、`questions`、`question_templates`、`achievements`、`daily_sessions`、`grade_unlocks`、`placement_tests`、`report_data`、`mastery_snapshots`、`classroom_history`、`classroom_snapshots`（拆表）
- [x] 1.3 编写索引：所有 Dexie 定义中的复合索引转为 PostgreSQL B-tree 索引
- [x] 1.4 创建 PostgreSQL 角色：`anon`（匿名只读）、`authenticated`（已认证），配置 `GRANT` 权限
- [x] 1.5 编写 RLS 策略：用户表直接隔离、孩子表通过 `user_id` 隔离、其他子表通过 `child_id → children.user_id` 间接隔离、公共表（`knowledge_nodes`/`questions`/`question_templates`）对 `anon` 开放只读
- [x] 1.6 将 `src/data/seed/` 中的 TypeScript 种子数据转换为 SQL INSERT 语句（知识点、题目、出题模板）
- [x] 1.7 创建 `classroom_history_list` 视图（不含 classroomData，供列表查询）

## 2. Auth Service 开发

- [x] 2.1 创建 `docker/auth-service/` 项目结构：`package.json`、`tsconfig.json`、`Dockerfile`、`src/index.ts`
- [x] 2.2 实现 `POST /auth/register`：输入验证 → bcrypt 哈希（cost 10）→ INSERT users → 签发 JWT（payload: `{ role, user_id, username, exp }`）→ 返回 token
- [x] 2.3 实现 `POST /auth/login`：查询用户 → bcrypt.compare → 更新 last_login_at → 签发 JWT → 返回 token
- [x] 2.4 实现 `POST /auth/refresh`：验证旧 token → 签发新 token（延长过期时间）
- [x] 2.5 实现 `GET /auth/me`：解析 JWT → 查询用户信息（不含密码）→ 返回
- [x] 2.6 错误处理中间件：统一的 JSON 错误格式（`{ error, message, details }`）
- [x] 2.7 编写 Dockerfile：基于 `node:20-alpine`，多阶段构建

## 3. PostgREST + Nginx 配置

- [x] 3.1 创建 `docker/postgrest/postgrest.conf`：配置 `db-uri`、`db-schemas = "api"`、`db-anon-role = "anon"`、`jwt-secret`、`server-port = 3000`
- [x] 3.2 在 PostgreSQL init 脚本中创建 `api` schema，将所有表移到 `api` schema 下或创建视图
- [x] 3.3 创建 `docker/nginx/nginx.conf`：路由规则（`/api/auth/*` → auth:3001、`/api/rest/*` → postgrest:3000、`/openmaic/*` → openmaic:3002），CORS 配置，iframe header 处理
- [x] 3.4 创建 `docker/nginx/Dockerfile`：基于 `nginx:alpine`

## 4. Docker Compose 扩展

- [x] 4.1 重写 `docker/openmaic/docker-compose.yml`：新增 5 个服务（postgres、postgrest、auth-service、nginx、openmaic），配置网络、卷、depends_on、healthcheck
- [x] 4.2 创建 `.env.example`：列出所有环境变量（JWT_SECRET、POSTGRES_PASSWORD、POSTGRES_DB 等）及说明
- [x] 4.3 配置资源限制和重启策略：每个服务的 memory limit + `restart: unless-stopped`
- [ ] 4.4 验证 `docker-compose up` 全部服务正常启动，PostgREST 能访问 PostgreSQL，Auth Service 能签发 JWT

## 5. 前端 API Client + React Query 基础

- [x] 5.1 `npm install @tanstack/react-query`，在 `src/main.tsx` 中配置 `QueryClientProvider`（staleTime: 5min, retry: 1, refetchOnWindowFocus: false）
- [x] 5.2 创建 `src/services/api/client.ts`：PostgREST API Client，封装 GET/POST/PATCH/DELETE，自动 Token 注入、camelCase↔snake_case 转换、401 Token 刷新、统一错误处理
- [x] 5.3 创建 `src/services/api/auth.ts`：Auth Service API Client，封装 register/login/refresh/me
- [x] 5.4 创建 `src/services/api/types.ts`：API 请求/响应类型定义

## 6. React Query Hooks + authStore 重写

- [x] 6.1 创建 `src/hooks/queries/useChildren.ts`：`useChildren()` 查询、`useCreateChild()` / `useUpdateChild()` mutation
- [x] 6.2 创建 `src/hooks/queries/useKnowledgeNodes.ts`：`useKnowledgeNodes()` 查询（公共数据，长 staleTime）
- [x] 6.3 创建 `src/hooks/queries/useLearningRecords.ts`：按 childId 查询、创建 mutation
- [x] 6.4 创建 `src/hooks/queries/useMasteryRecords.ts`：按 childId+knowledgeNodeId 查询、upsert mutation
- [x] 6.5 创建 `src/hooks/queries/useClassroomHistory.ts`：列表查询（不含 classroomData）、详情查询（含 snapshot）、创建 mutation
- [x] 6.6 创建其他 hooks：`useQuestions`、`useDailySessions`、`useAchievements`、`useGradeUnlocks`、`usePlacementTests`、`useReportData`、`useMasterySnapshots`
- [x] 6.7 重写 `src/stores/authStore.ts`：register/login/logout/restoreAuth 改为调用 Auth API，JWT token 存 localStorage

## 7. 前端迁移 — 替换 Dexie 调用（11 个文件）

- [x] 7.1 迁移 `src/main.tsx`：移除 `seedDatabase()` 调用和 `db` import，添加 `QueryClientProvider`（已在任务组 5 中完成，另提取 queryClient 到 lib/queryClient.ts）
- [x] 7.2 迁移 `src/hooks/useInitializeApp.ts`：移除 `db.children.where()` 调用，改用 authStore.restoreAuth + apiClient.get('/children')
- [x] 7.3 迁移 `src/hooks/useLearningFlow.ts`：所有 `db.dailySessions/masteryRecords/achievements/knowledgeNodes/masterySnapshots` 操作改用 apiClient 调用
- [x] 7.4 迁移 `src/hooks/usePlacementTest.ts`：`db.placementTests.add()` 改用 `apiClient.post('/placement_tests')`
- [x] 7.5 迁移 `src/pages/Home.tsx`：`db.placementTests.where()` 改用 `usePlacementTests()` React Query hook
- [x] 7.6 迁移 `src/pages/StarMap.tsx`：`db.masteryRecords` 改用 `useMasteryRecords()` + useMemo
- [x] 7.7 迁移 `src/pages/ParentDashboard.tsx`：所有 db 查询改用 apiClient 直接调用
- [x] 7.8 迁移 `src/pages/CreateChildPage.tsx`：改用 `apiClient.post()` 创建孩子，修复 post 返回值处理（单对象而非数组）
- [x] 7.9 迁移 `src/engine/review-manager.ts`：db 操作改用 apiClient 调用（get/getOne/patch），更新注释
- [x] 7.10 迁移 `src/services/review-learning.ts`：完全从 Dexie 重写为 apiClient 调用，修复 PostgRESTFilter 类型和 order 数组格式

## 8. 清理 + Vite Proxy 更新 + RLS 验证

- [x] 8.1 删除 `src/db/` 目录（database.ts、knowledge-graph.ts 及测试文件）
- [x] 8.2 删除 `src/data/seed/index.ts`（seedDatabase 函数）和 `src/data/__tests__/`
- [x] 8.2b 删除 6 个无引用的旧种子数据文件（chinese/english/math/songs/letters/dialogues），保留 2 个仍被组件引用的（english-parent-activities/english-tpr）
- [x] 8.3 `npm uninstall dexie fake-indexeddb`
- [x] 8.4 更新 `vite.config.ts`：开发环境代理到 Nginx（:8080），路由 /api/auth、/api/rest、/openmaic
- [ ] 8.5 RLS 安全验证：创建两个测试用户，验证用户 A 无法通过 PostgREST 查看/修改用户 B 的数据（需部署环境）
- [ ] 8.6 端到端验证：注册 → 登录 → 创建孩子 → 学习流程 → 数据持久化 → 换浏览器登录验证数据同步（需部署环境）

## 9. PreCI 检查

- [x] 9.1 TypeScript 类型检查通过（源码无错误，测试文件有预存问题待后续修复）
- [x] 9.2 ESLint 检查通过（源码无新增错误，预存错误不在迁移范围内）
- [x] 9.3 确认无 `dexie` 或 `@/db/database` 残留 import（非测试源码已全部清除）
- [ ] 9.4 Docker Compose `docker-compose config` 验证配置有效（需部署环境）
