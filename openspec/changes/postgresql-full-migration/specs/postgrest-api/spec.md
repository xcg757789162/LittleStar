## ADDED Requirements

### Requirement: PostgREST 配置
系统 SHALL 通过 PostgREST 自动暴露 PostgreSQL 表为 REST API。

#### Scenario: 角色配置
- **WHEN** PostgREST 启动
- **THEN** MUST 配置两个 PostgreSQL 角色：
  - `anon` — 匿名角色，用于未认证请求，只读访问公共表
  - `authenticated` — 认证角色，用于已认证请求，通过 RLS 访问用户数据

#### Scenario: JWT 验证
- **WHEN** 请求携带 `Authorization: Bearer <token>`
- **THEN** PostgREST MUST 验证 JWT 签名，提取 `role` claim 切换 PostgreSQL 角色
- **AND** JWT 中的 `user_id` claim MUST 可通过 `current_setting('request.jwt.claims')::json->>'user_id'` 在 RLS 策略中访问

#### Scenario: Schema 暴露
- **WHEN** PostgREST 运行
- **THEN** MUST 暴露 `api` schema 下的所有表和视图
- **AND** 不暴露 `public` schema 的内部管理表

### Requirement: 课堂历史列表视图
系统 SHALL 提供不含 classroomData 的课堂历史列表视图。

#### Scenario: 列表查询优化
- **WHEN** 前端请求课堂历史列表
- **THEN** PostgREST MUST 提供 `classroom_history_list` 视图，不包含 `classroom_snapshots` 关联的大 JSON 数据
- **AND** 需要详细数据时，前端 MUST 通过 `?select=*,classroom_snapshots(classroom_data)` 显式加载
