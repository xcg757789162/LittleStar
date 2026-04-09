## ADDED Requirements

### Requirement: 用户注册
系统 SHALL 提供用户注册 API。

#### Scenario: 注册成功
- **WHEN** 用户提交 `POST /auth/register` 包含 `username`、`password`、`nickname`
- **THEN** 系统 MUST 使用 bcrypt 哈希密码（cost factor ≥ 10）
- **AND** 系统 MUST 在 PostgreSQL `users` 表中插入新记录
- **AND** 系统 MUST 返回 JWT token（payload 包含 `role: "authenticated"`、`user_id`、`username`）

#### Scenario: 用户名已存在
- **WHEN** 用户提交的 `username` 已存在
- **THEN** 系统 MUST 返回 409 Conflict 错误，提示用户名已被占用

#### Scenario: 输入验证
- **WHEN** `username` 长度 < 3 或 > 50，或 `password` 长度 < 6
- **THEN** 系统 MUST 返回 400 Bad Request 错误，提示具体的验证失败原因

### Requirement: 用户登录
系统 SHALL 提供用户登录 API。

#### Scenario: 登录成功
- **WHEN** 用户提交 `POST /auth/login` 包含正确的 `username` 和 `password`
- **THEN** 系统 MUST 验证 bcrypt 密码哈希
- **AND** 系统 MUST 更新 `last_login_at` 字段
- **AND** 系统 MUST 返回 JWT token

#### Scenario: 密码错误
- **WHEN** 用户提交的密码不匹配
- **THEN** 系统 MUST 返回 401 Unauthorized 错误

### Requirement: Token 刷新
系统 SHALL 提供 JWT Token 刷新 API。

#### Scenario: 刷新成功
- **WHEN** 用户提交 `POST /auth/refresh` 包含有效的 JWT token（通过 Authorization header）
- **THEN** 系统 MUST 返回新的 JWT token（延长过期时间）

#### Scenario: Token 过期
- **WHEN** 提交的 JWT token 已过期
- **THEN** 系统 MUST 返回 401 Unauthorized 错误，前端重定向到登录页

### Requirement: JWT 与 PostgREST 对接
Auth Service 签发的 JWT MUST 与 PostgREST 完全兼容。

#### Scenario: JWT Secret 一致
- **WHEN** Auth Service 和 PostgREST 部署
- **THEN** 两者 MUST 使用相同的 JWT Secret（通过环境变量 `JWT_SECRET` 注入）

#### Scenario: JWT Payload 格式
- **WHEN** Auth Service 签发 JWT
- **THEN** payload MUST 包含 `role`（PostgreSQL 角色名）和 `user_id`（用户主键），PostgREST MUST 能通过 `current_setting('request.jwt.claims')` 获取这些值
