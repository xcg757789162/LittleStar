## ADDED Requirements

### Requirement: PostgREST API Client
系统 SHALL 提供统一的 API Client 封装所有 PostgREST 调用。

#### Scenario: 自动 Token 注入
- **WHEN** 调用任何需要认证的 API
- **THEN** API Client MUST 自动从 localStorage 读取 JWT token 并添加到 `Authorization: Bearer <token>` header

#### Scenario: Token 过期处理
- **WHEN** API 响应 401 Unauthorized
- **THEN** API Client MUST 尝试 Token 刷新，刷新失败后清除本地 token 并重定向到登录页

#### Scenario: camelCase ↔ snake_case 自动转换
- **WHEN** 发送请求或接收响应
- **THEN** API Client MUST 自动将请求体的 camelCase 字段转换为 snake_case，将响应体的 snake_case 字段转换为 camelCase

#### Scenario: 错误处理
- **WHEN** API 返回非 2xx 状态码
- **THEN** API Client MUST 抛出标准化的错误对象，包含 `status`、`message`、`details` 字段

### Requirement: React Query Hooks
系统 SHALL 为每张需要前端访问的表提供 React Query hooks。

#### Scenario: 查询 hooks
- **WHEN** 组件需要读取服务端数据
- **THEN** 系统 MUST 提供 `useQuery` hooks（如 `useChildren()`、`useKnowledgeNodes()`、`useLearningRecords(childId)`），支持自动缓存、后台刷新、Loading/Error 状态

#### Scenario: 变更 hooks
- **WHEN** 组件需要创建/更新/删除数据
- **THEN** 系统 MUST 提供 `useMutation` hooks（如 `useCreateChild()`、`useCreateLearningRecord()`），变更成功后 MUST 自动 invalidate 相关查询缓存

#### Scenario: QueryClient 全局配置
- **WHEN** 应用初始化
- **THEN** 系统 MUST 创建 QueryClient 并用 `QueryClientProvider` 包裹应用根组件
- **AND** 默认配置 MUST 包含合理的 `staleTime`（5 分钟）、`retry`（1 次）、`refetchOnWindowFocus`（false）

## MODIFIED Requirements

### Requirement: authStore 重写
现有 `authStore` SHALL 从直接操作 Dexie 改为调用 Auth Service API。

#### Scenario: 登录流程
- **WHEN** 用户在登录页提交表单
- **THEN** `authStore.login()` MUST 调用 `POST /api/auth/login`，成功后将 JWT token 存入 localStorage，将用户信息存入 store

#### Scenario: 注册流程
- **WHEN** 用户在注册页提交表单
- **THEN** `authStore.register()` MUST 调用 `POST /api/auth/register`，成功后自动登录

#### Scenario: 恢复认证状态
- **WHEN** 应用启动时调用 `restoreAuth()`
- **THEN** 系统 MUST 从 localStorage 读取 JWT token，调用 `GET /api/auth/me` 验证 token 有效性，有效则恢复用户状态，无效则清除 token

### Requirement: 前端清理
系统 SHALL 移除所有 Dexie/IndexedDB 相关代码。

#### Scenario: 移除 Dexie 依赖
- **WHEN** 迁移完成
- **THEN** `package.json` MUST 不再包含 `dexie` 依赖
- **AND** `src/db/` 目录 MUST 被删除
- **AND** `src/data/seed/` 目录 MUST 被删除
- **AND** `src/main.tsx` 中的 `seedDatabase()` 调用 MUST 被移除

#### Scenario: 替换所有 db 引用
- **WHEN** 迁移完成
- **THEN** 所有 11 个直接引用 `db` 对象的文件 MUST 改为使用 React Query hooks 或 API Client
- **AND** 不 MUST 有任何文件 import `dexie` 或 `@/db/database`
