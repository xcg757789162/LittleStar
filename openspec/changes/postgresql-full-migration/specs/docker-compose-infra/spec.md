## ADDED Requirements

### Requirement: Docker Compose 多服务编排
系统 SHALL 通过单个 docker-compose.yml 文件编排所有服务。

#### Scenario: 服务定义
- **WHEN** 执行 `docker-compose up`
- **THEN** 系统 MUST 启动以下 5 个服务：PostgreSQL（:5432）、PostgREST（:3000）、Auth Service（:3001）、Nginx（:80）、OpenMAIC（:3002）
- **AND** 所有服务 MUST 在同一 Docker 网络中，通过服务名互相访问

#### Scenario: 启动顺序和健康检查
- **WHEN** 服务启动
- **THEN** PostgreSQL MUST 最先启动，PostgREST 和 Auth Service MUST 在 PostgreSQL 健康检查通过后启动，Nginx MUST 在所有后端服务就绪后启动
- **AND** 每个服务 MUST 配置 healthcheck

#### Scenario: 数据持久化
- **WHEN** 容器重启
- **THEN** PostgreSQL 数据 MUST 通过 Docker volume 持久化，不因容器重启丢失

#### Scenario: 环境变量管理
- **WHEN** 部署
- **THEN** JWT_SECRET、POSTGRES_PASSWORD 等敏感配置 MUST 通过 `.env` 文件注入
- **AND** `.env.example` 文件 MUST 提供所有环境变量的模板和说明

#### Scenario: 资源限制
- **WHEN** 在开发机器上运行
- **THEN** 每个服务 MUST 配置合理的内存限制（PostgreSQL 512M、PostgREST 128M、Auth Service 128M、Nginx 64M、OpenMAIC 2G）
