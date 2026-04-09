## Why

LittleStar 当前使用 Dexie.js（IndexedDB）作为本地数据库，所有 14 张表的数据存储在浏览器端。这种架构存在严重局限：

1. **数据隔离**：换设备或换浏览器数据丢失，无法跨端同步
2. **安全性**：用户密码使用 `btoa` 编码存本地，无真正认证
3. **多用户**：无法支持家庭成员共享设备时的数据隔离
4. **可扩展性**：无法实现后端业务逻辑（如排行榜、班级管理）
5. **数据安全**：用户可通过 DevTools 直接修改 IndexedDB 数据

需要将数据层从浏览器端 IndexedDB 全量迁移到服务端 PostgreSQL，建立真正的 C/S 架构。

## What Changes

- **PostgreSQL 数据库**：14 张表从 Dexie schema 转换为 PostgreSQL DDL，包含完整的索引、约束和 RLS（行级安全）策略
- **PostgREST API 层**：零代码 REST API，直接映射 PostgreSQL 表，通过 JWT 认证 + RLS 实现数据隔离
- **轻量 Node.js 认证服务**：Express + JWT + bcrypt，负责注册/登录/Token 签发
- **Nginx 反向代理**：统一入口，`/api/auth/*` → Auth Service，`/api/rest/*` → PostgREST，解决 CORS 和多端口管理问题
- **React Query + API Client**：TanStack Query 管理服务端状态，统一 API Client 封装 PostgREST 调用
- **前端清理**：移除 Dexie 依赖，删除 IndexedDB 相关代码，种子数据改为 SQL 迁移脚本
- **Docker Compose 扩展**：新增 PostgreSQL + PostgREST + Auth Service + Nginx 四个服务

## Capabilities

### New Capabilities
- `postgresql-schema`: PostgreSQL 数据库 Schema 设计，14 张表 DDL + 索引 + RLS 策略
- `postgrest-api`: PostgREST 零代码 REST API 配置，角色/权限/JWT 对接
- `auth-service`: 轻量 Node.js 认证服务，注册/登录/JWT 签发/密码哈希
- `nginx-gateway`: Nginx 反向代理统一入口，路由分发 + CORS
- `api-client`: 统一 PostgREST API Client 封装 + React Query hooks
- `docker-compose-infra`: 扩展 Docker Compose，编排 5 个服务

### Modified Capabilities
- `auth-store`: 重写 authStore 对接 Auth Service API（原 Dexie 直接操作 → HTTP API 调用）
- `data-access`: 所有组件/hooks 的 Dexie 调用替换为 React Query hooks（11 个文件）
- `seed-data`: 种子数据从前端 `seedDatabase()` 迁移为 SQL 初始化脚本

## Impact

- **新增文件**：
  - `docker/postgresql/` — PostgreSQL 配置、init.sql、迁移脚本
  - `docker/postgrest/` — PostgREST 配置
  - `docker/auth-service/` — Node.js 认证服务完整代码
  - `docker/nginx/` — Nginx 配置
  - `src/services/api/client.ts` — PostgREST API Client
  - `src/services/api/auth.ts` — Auth Service API Client
  - `src/hooks/queries/` — React Query hooks（每表一个文件）
- **删除文件**：
  - `src/db/database.ts` — Dexie 数据库定义
  - `src/db/knowledge-graph.ts` — Dexie 知识图谱查询
  - `src/data/seed/` — 前端种子数据
- **修改文件**（11 个直接引用 db 的文件）：
  - `src/main.tsx` — 移除 seedDatabase 调用
  - `src/stores/authStore.ts` — 重写为调用 Auth API
  - `src/hooks/useInitializeApp.ts` — 改用 React Query
  - `src/hooks/useLearningFlow.ts` — 改用 React Query mutations
  - `src/hooks/usePlacementTest.ts` — 改用 React Query mutations
  - `src/pages/Home.tsx` — 改用 React Query
  - `src/pages/StarMap.tsx` — 改用 React Query
  - `src/pages/ParentDashboard.tsx` — 改用 React Query
  - `src/pages/CreateChildPage.tsx` — 改用 React Query
  - `src/engine/review-manager.ts` — 改用 API Client
  - `src/services/review-learning.ts` — 改用 API Client
  - `docker/openmaic/docker-compose.yml` — 扩展为多服务编排
  - `package.json` — 移除 dexie，新增 @tanstack/react-query
- **依赖变更**：
  - 移除：`dexie`、`fake-indexeddb`（dev）
  - 新增：`@tanstack/react-query`、`@tanstack/react-query-devtools`（dev）
- **风险**：
  - PostgREST RLS 配置不当可能导致数据泄露
  - JWT Secret 在 Auth Service 和 PostgREST 之间必须一致
  - 14 张表同时迁移工作量大，需按优先级分批实施
  - classroomHistory.classroomData 大 JSON 字段需要特殊处理
