## Context

LittleStar（小星辰）是一个儿童学习应用，技术栈为 React 18 + TypeScript + Vite + Zustand + Dexie.js。当前所有数据（14 张表）存储在浏览器端 IndexedDB 中，通过 Dexie.js ORM 访问。

项目已有 Docker Compose 部署 OpenMAIC AI 课堂服务（端口 3000）。前端通过 Vite proxy 代理 API 请求。

### 当前数据层架构

```
React 组件/Hooks → Dexie.js ORM → IndexedDB（浏览器端）
                                    ↑
                              seedDatabase() — 前端初始化种子数据
```

### 14 张表概览

| 表名 | 类型 | 主键 | 数据量级 | RLS 需求 |
|------|------|------|----------|----------|
| users | 用户数据 | ++id, &username | 小 | 自身 |
| children | 用户数据 | ++id, userId | 小 | 通过 userId |
| knowledgeNodes | 静态教材 | id (预设) | 中 (~200) | 无（公共只读） |
| questions | 静态教材 | id (预设) | 中 (~500) | 无（公共只读） |
| questionTemplates | 静态教材 | ++id | 小 | 无（公共只读） |
| learningRecords | 用户数据 | ++id, childId | 大 | 通过 childId→userId |
| masteryRecords | 用户数据 | ++id, childId | 中 | 通过 childId→userId |
| achievements | 用户数据 | ++id, childId | 小 | 通过 childId→userId |
| dailySessions | 用户数据 | ++id, childId | 中 | 通过 childId→userId |
| gradeUnlocks | 用户数据 | ++id, childId | 小 | 通过 childId→userId |
| placementTests | 用户数据 | ++id, childId | 小 | 通过 childId→userId |
| reportData | 用户数据 | ++id, childId | 中 | 通过 childId→userId |
| masterySnapshots | 用户数据 | ++id, childId | 大 | 通过 childId→userId |
| classroomHistory | 用户数据 | ++id, childId | 中（含大JSON） | 通过 childId→userId |

## Goals / Non-Goals

**Goals:**
- 将 14 张表从 IndexedDB 全量迁移到 PostgreSQL
- 通过 PostgREST + JWT + RLS 实现安全的数据访问
- 通过 Nginx 反向代理统一入口，简化前端配置
- 使用 React Query 管理服务端状态，保持优秀的用户体验
- 移除 Dexie.js 依赖，清理前端代码

**Non-Goals:**
- 不迁移旧数据，所有用户重新注册
- 不实现离线模式或数据同步
- 不修改 OpenMAIC Docker 镜像
- 不改变现有业务逻辑（学习流程、测评、报告等）
- 不实现管理后台

## Decisions

### D1: 数据库选型 — PostgreSQL + PostgREST

**选择**：PostgreSQL 作为数据库，PostgREST 自动生成 REST API。

**理由**：
- PostgreSQL 支持 JSONB、RLS（行级安全）、丰富的索引类型
- PostgREST 零代码生成 REST API，14 张表无需手写 CRUD
- PostgREST 原生支持 JWT 认证 + PostgreSQL RLS，安全模型一致
- 当前 14 张表都是标准 CRUD，无复杂业务逻辑在 API 层

**替代方案**：
- 自建 Express 后端 — 开发量大，14 张表 CRUD 重复代码多
- Supabase — 功能更完整但引入外部依赖，自托管复杂度高

### D2: 认证方案 — 轻量 Node.js Auth Service

**选择**：独立的 Express 认证服务，负责注册/登录/JWT 签发。

**实现**：
```
POST /auth/register  → bcrypt hash → INSERT users → 返回 JWT
POST /auth/login     → 验证密码 → 返回 JWT
POST /auth/refresh   → 验证旧 token → 返回新 JWT
GET  /auth/me        → 解析 JWT → 返回用户信息
```

**JWT Payload 设计**：
```json
{
  "role": "authenticated",
  "user_id": "uuid-xxx",
  "username": "parent1",
  "exp": 1712678400
}
```

**理由**：
- 技术栈一致（TypeScript/Node.js），维护成本低
- 代码量小（约 200-300 行），完全可控
- JWT claim 中包含 `role` 和 `user_id`，与 PostgREST RLS 无缝对接

### D3: RLS（行级安全）策略设计 — 多层数据隔离

**选择**：通过 PostgreSQL RLS + JWT claim 实现数据隔离。

**角色体系**：
- `anon` — 匿名用户，只能访问公共数据（knowledgeNodes、questions、questionTemplates）
- `authenticated` — 已登录用户，通过 RLS 只能访问自己的数据

**隔离链路**：
```
JWT → current_setting('request.jwt.claims')::json->>'user_id'
  → users.id = user_id（用户表直接隔离）
  → children.user_id = user_id（孩子表通过 userId 隔离）
  → 其他表.childId IN (SELECT id FROM children WHERE user_id = ...)（通过 childId 间接隔离）
```

**RLS 策略模板**：
```sql
-- 用户表：只能看到自己
CREATE POLICY users_isolation ON users
  USING (id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- 孩子表：只能看到自己的孩子
CREATE POLICY children_isolation ON children
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- 子表（learningRecords 等）：通过 childId 关联到 userId
CREATE POLICY child_data_isolation ON learning_records
  USING (child_id IN (
    SELECT id FROM children
    WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
  ));
```

**公共表（无 RLS）**：
- `knowledge_nodes` — `anon` 角色只读
- `questions` — `anon` 角色只读
- `question_templates` — `anon` 角色只读

### D4: classroomHistory.classroomData 大 JSON 处理

**选择**：将 `classroomData` 拆分为独立表 `classroom_snapshots`。

**Schema**：
```sql
-- 主表（列表查询用，不含大 JSON）
CREATE TABLE classroom_history (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id),
  knowledge_node_id TEXT NOT NULL,
  knowledge_node_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  classroom_title TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  is_review BOOLEAN NOT NULL DEFAULT FALSE,
  questions_completed INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- 快照表（详情查询时才加载）
CREATE TABLE classroom_snapshots (
  id SERIAL PRIMARY KEY,
  history_id INTEGER NOT NULL UNIQUE REFERENCES classroom_history(id) ON DELETE CASCADE,
  classroom_data JSONB NOT NULL
);
```

**理由**：
- 列表查询（学习历史页）不需要 `classroomData`，拆表后查询性能大幅提升
- PostgREST 支持 `?select=*,classroom_snapshots(classroom_data)` 关联查询，需要时才加载
- `JSONB` 类型支持索引和部分查询

### D5: 反向代理 — Nginx 统一入口

**选择**：Docker Compose 中加入 Nginx 作为反向代理。

**路由设计**：
```nginx
server {
    listen 80;

    # 前端静态资源（开发时由 Vite 提供，生产时由 Nginx 直接提供）
    location / {
        proxy_pass http://frontend:5173;
    }

    # Auth Service
    location /api/auth/ {
        proxy_pass http://auth-service:3001/auth/;
    }

    # PostgREST API
    location /api/rest/ {
        proxy_pass http://postgrest:3000/;
    }

    # OpenMAIC 服务
    location /openmaic/ {
        proxy_pass http://openmaic:3000/;
        proxy_hide_header X-Frame-Options;
        proxy_hide_header Content-Security-Policy;
        add_header X-Frame-Options SAMEORIGIN;
    }
}
```

**理由**：
- 前端只需要一个 baseUrl（当前域名），不用维护多个端口
- CORS 配置集中在 Nginx 一处
- 生产环境直接复用，不需要 Vite proxy
- 统一处理 SSL、日志、限流

### D6: 前端数据层 — React Query + API Client

**选择**：TanStack Query（React Query v5）管理服务端状态，Zustand 管理客户端状态。

**分层架构**：
```
┌─────────────────────────────────────────┐
│           React 组件层                    │
│  (只消费 hooks，不直接调用 API)           │
├──────────────┬──────────────────────────┤
│  Zustand     │    React Query           │
│  客户端状态    │    服务端状态              │
│  - UI 状态    │    - 用户数据              │
│  - 会话状态   │    - 学习记录              │
│  - 主题/配置  │    - 知识点               │
├──────────────┴──────────────────────────┤
│           API Client 层                  │
│  - PostgREST Client (CRUD)              │
│  - Auth Client (认证)                    │
│  - 统一错误处理/Token 注入                │
├─────────────────────────────────────────┤
│         Nginx → PostgREST/Auth           │
└─────────────────────────────────────────┘
```

**React Query hooks 设计**：
```typescript
// 例：查询孩子列表
export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: () => apiClient.get<Child[]>('/children'),
  })
}

// 例：创建学习记录
export function useCreateLearningRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: LearningRecordInput) =>
      apiClient.post('/learning_records', record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningRecords'] })
    },
  })
}
```

**Store 保留策略**：
| Store | 处理 |
|-------|------|
| authStore | 重写：调用 Auth API，管理 JWT token |
| childStore | 保留：纯内存状态（当前选中孩子） |
| learningStore | 保留：纯会话状态（当前学习进度） |
| uiStore | 保留：UI 状态 |
| gradeUnlockStore | 保留：纯内存状态 |
| reportStore | 保留：纯内存状态 |

### D7: Docker Compose 编排

**选择**：扩展现有 `docker-compose.yml`，统一编排 5 个服务。

**服务拓扑**：
```yaml
services:
  postgres:     # PostgreSQL 数据库
  postgrest:    # PostgREST API（依赖 postgres）
  auth-service: # Node.js 认证服务（依赖 postgres）
  nginx:        # 反向代理（依赖 postgrest, auth-service, openmaic）
  openmaic:     # AI 课堂服务（已有）
```

**启动顺序**：`postgres` → `postgrest` + `auth-service` → `nginx`

### D8: 种子数据策略

**选择**：SQL 迁移脚本初始化种子数据，前端删除 `seedDatabase()`。

**实现**：
- `docker/postgresql/init.sql` — 建表 DDL + 初始数据 INSERT
- `docker/postgresql/seed/` — 种子数据 SQL 文件（knowledgeNodes、questions、questionTemplates）
- Docker Compose 中 PostgreSQL 服务挂载 `init.sql` 到 `/docker-entrypoint-initdb.d/`

**数据来源**：从现有 `src/data/seed/` 中的 TypeScript 数据转换为 SQL INSERT 语句。

### D9: 数据库命名规范

**选择**：PostgreSQL 使用 snake_case，PostgREST 自动映射。

**映射规则**：
| TypeScript (camelCase) | PostgreSQL (snake_case) | PostgREST URL |
|----------------------|------------------------|---------------|
| learningRecords | learning_records | /learning_records |
| knowledgeNodes | knowledge_nodes | /knowledge_nodes |
| childId | child_id | ?child_id=eq.xxx |
| classroomHistory | classroom_history | /classroom_history |

前端 API Client 在请求/响应时做 camelCase ↔ snake_case 自动转换。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS 策略配置错误导致数据泄露 | 高 — 用户 A 看到用户 B 的数据 | 专门的 RLS 测试任务 + 多用户测试用例 |
| JWT Secret 不一致导致 PostgREST 拒绝请求 | 中 — 所有 API 403 | Docker Compose 统一环境变量管理 |
| PostgREST 不支持某些复杂查询 | 中 — 需要 fallback | 使用 PostgreSQL 视图/函数暴露给 PostgREST |
| classroomData 大 JSON 影响 DB 备份速度 | 低 — 数据量暂时不大 | 拆表 + 定期清理旧快照 |
| 14 张表同时迁移，回归测试覆盖不足 | 高 — 潜在 bug | 分批实施 + 每批完成后验证 |
| Nginx 配置不当导致 CORS 问题 | 中 — 前端请求失败 | 开发环境保留 Vite proxy 作为 fallback |
| 认证服务宕机导致所有功能不可用 | 高 — 完全不可用 | Docker restart policy + healthcheck |
