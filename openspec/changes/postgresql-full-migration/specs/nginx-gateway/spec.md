## ADDED Requirements

### Requirement: Nginx 反向代理统一入口
系统 SHALL 通过 Nginx 提供统一的 HTTP 入口，路由分发到各个后端服务。

#### Scenario: Auth Service 路由
- **WHEN** 请求路径匹配 `/api/auth/*`
- **THEN** Nginx MUST 将请求代理到 Auth Service（:3001），去除 `/api/auth` 前缀

#### Scenario: PostgREST 路由
- **WHEN** 请求路径匹配 `/api/rest/*`
- **THEN** Nginx MUST 将请求代理到 PostgREST（:3000），去除 `/api/rest` 前缀

#### Scenario: OpenMAIC 路由
- **WHEN** 请求路径匹配 `/openmaic/*`
- **THEN** Nginx MUST 将请求代理到 OpenMAIC 服务，去除 `/openmaic` 前缀
- **AND** Nginx MUST 删除响应中的 `X-Frame-Options` 和 `Content-Security-Policy` header，添加 `X-Frame-Options: SAMEORIGIN`

#### Scenario: CORS 统一处理
- **WHEN** 浏览器发送跨域请求
- **THEN** Nginx MUST 在响应中添加正确的 CORS header（`Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers`）
- **AND** 对 OPTIONS 预检请求 MUST 返回 204 No Content
