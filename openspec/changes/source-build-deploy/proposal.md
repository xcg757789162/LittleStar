## Why

当前 OpenMAIC 服务依赖第三方 Docker Hub 镜像 (`devprincekumar/openmaic:latest`)，存在以下问题：
1. **不可控** — 第三方镜像版本/内容不透明，随时可能变更或下线
2. **不可定制** — 无法基于特定分支或 fork 构建，阻碍二次开发
3. **多容器架构复杂** — 当前 5 容器编排（PostgreSQL + PostgREST + Auth + Nginx + OpenMAIC）增加运维负担

需要一套完全自主可控的部署方案，基于 OpenMAIC 开源仓库源码构建，同时简化容器架构。

## What Changes

- **新增** `docker/deploy/` 一键部署方案，将 5 容器简化为 2 容器（db + app）
- **新增** 多阶段 Dockerfile，从 GitHub 源码 `git clone → pnpm install → pnpm build` 得到 Next.js standalone 产物
- **新增** supervisord 多进程管理，在单个应用容器内运行 Nginx + PostgREST + Auth Service + OpenMAIC
- **新增** 一键构建 (`build.sh`) 和运行 (`run.sh`) 脚本
- **新增** 容器入口脚本 (`entrypoint.sh`)，含 PostgreSQL 就绪等待、构建产物验证
- **新增** Nginx 反向代理配置 (`nginx-app.conf`)，统一路由前端和所有后端 API
- **新增** 环境变量模板 (`.env.example`)，支持自定义 OpenMAIC 仓库/分支/API Keys
- 不影响现有 `docker/openmaic/` 旧方案，两套方案可并存

## Capabilities

### New Capabilities

- `source-build`: 从 OpenMAIC GitHub 源码多阶段构建 Docker 镜像（Auth Service 编译 + Next.js standalone 构建）
- `all-in-one-container`: supervisord 管理的单应用容器，内含 Nginx + PostgREST + Auth Service + OpenMAIC 四个进程
- `deploy-scripts`: 一键构建/运行/管理脚本集（build.sh、run.sh、entrypoint.sh）
- `nginx-routing`: 应用容器内 Nginx 反向代理配置，统一路由 API、OpenMAIC iframe、静态资源

### Modified Capabilities

<!-- 无现有 spec 需要修改 -->

## Impact

- **Docker 构建**: 新增 `docker/deploy/Dockerfile.app` 多阶段构建，首次构建需 5-15 分钟（含 git clone + pnpm install + pnpm build）
- **基础设施**: 从 5 容器简化为 2 容器（PostgreSQL 独立 + All-in-One 应用），降低运维复杂度
- **网络**: 应用容器内部进程通过 localhost 通信，对外只暴露 Nginx 80 端口 + PostgreSQL 5432 端口
- **依赖**: 构建时需要访问 GitHub（`git clone`）和 npm 注册源（`pnpm install`）
- **兼容性**: 旧版 `docker/openmaic/` 方案不受影响，可并行使用
- **数据库**: 使用独立 PostgreSQL 容器，volume 名称从旧版 `postgres-data` 变为 `pgdata`，迁移需手动导出/导入
