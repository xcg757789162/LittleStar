## Context

LittleStar（小星辰）是基于 OpenMAIC 的幼儿英语启蒙应用。当前部署架构使用 5 个独立 Docker 容器（PostgreSQL、PostgREST、Auth Service、Nginx、OpenMAIC），其中 OpenMAIC 容器依赖第三方 Docker Hub 镜像 `devprincekumar/openmaic:latest`。

现有代码已经在 `docker/deploy/` 目录下实现了基于源码构建的两容器方案原型，需要将其规范化为正式的一键部署方案。

**当前状态**：
- `docker/openmaic/` — 旧版 5 容器方案，使用第三方镜像
- `docker/deploy/` — 新版 2 容器方案原型，已有 Dockerfile.app、docker-compose.yml、supervisord.conf 等文件

**约束**：
- OpenMAIC 是 Next.js 应用，使用 `pnpm` 管理依赖，`output: "standalone"` 模式构建
- 构建时需要访问 GitHub 和 npm/pnpm 注册源
- 生产运行时使用 `node server.js`（standalone 模式），监听 PORT 环境变量指定的端口

## Goals / Non-Goals

**Goals:**
- 完全脱离第三方 Docker 镜像依赖，基于 OpenMAIC GitHub 开源仓库源码构建
- 将 5 容器简化为 2 容器（db + app），降低运维复杂度
- 提供一键构建 (`build.sh`) 和一键运行 (`run.sh`) 脚本
- 支持自定义 OpenMAIC 仓库地址和分支（便于使用 fork 或特定版本）
- 环境变量统一管理（.env.local），透传 LLM/TTS/图片生成 API Keys 给 OpenMAIC

**Non-Goals:**
- 不替换旧版 `docker/openmaic/` 方案（两套方案并存）
- 不涉及 Kubernetes/Helm 编排或云原生部署
- 不修改 OpenMAIC 本身的源码
- 不实现自动 CI/CD Pipeline
- 不实现数据库自动迁移工具

## Decisions

### D1: 多阶段 Dockerfile 构建策略

**选择**: 3 阶段多阶段构建（auth-builder → openmaic-builder → 最终运行镜像）

**替代方案**:
- *单阶段构建*: 镜像体积过大（包含编译工具链）
- *预编译产物 + COPY*: 需要在 CI 中先编译，增加流程复杂度

**理由**: 多阶段构建保证最终镜像只包含运行时依赖，同时构建过程自包含，任何环境 `docker build` 即可。

### D2: 应用容器内多进程管理 — supervisord

**选择**: supervisord 管理 4 个进程（PostgREST + Auth Service + OpenMAIC + Nginx）

**替代方案**:
- *每个服务独立容器*: 回到多容器架构，增加运维负担
- *s6-overlay*: 更轻量，但 supervisord 配置更直观，团队更熟悉

**理由**: supervisord 是成熟的进程管理器，配置可读性好，支持自动重启、日志轮转、优先级控制。

### D3: OpenMAIC 源码获取方式 — git clone

**选择**: Dockerfile 中 `git clone --depth 1` 获取源码

**替代方案**:
- *git submodule*: 需要在宿主机管理 submodule，增加使用门槛
- *手动下载 tarball*: 缓存粒度差，每次都要全量下载

**理由**: `git clone --depth 1` 只下载最新提交，构建参数 `OPENMAIC_REPO` 和 `OPENMAIC_BRANCH` 支持自定义。

### D4: Nginx 路由策略 — 统一网关

**选择**: 所有请求通过 Nginx 80 端口，按路径转发到不同后端

路由规则:
- `/api/auth/*` → Auth Service (:3001)
- `/api/rest/*` → PostgREST (:3000)
- `/openmaic/*` → OpenMAIC (:3002)
- `/_next/*`、`/avatars/*`、`/images/*` 等 → OpenMAIC 静态资源
- `/media/*` → 本地媒体文件

**理由**: 单端口对外，简化防火墙/负载均衡配置，CORS 在 Nginx 层统一处理。

### D5: PostgreSQL 独立容器

**选择**: PostgreSQL 单独容器，通过 Docker network 与 app 容器通信

**理由**: 数据库是有状态服务，独立容器便于未来升级为外部 RDS/Cloud SQL，也方便独立备份和恢复。

## Risks / Trade-offs

- **[构建时间]** 首次构建需 5-15 分钟（git clone + pnpm install + pnpm build）→ 利用 Docker 层缓存，后续增量构建快速
- **[网络依赖]** 构建时需访问 GitHub 和 npm 注册源 → 可配置 mirror/proxy；离线环境需预先准备源码 tarball
- **[单点故障]** 应用容器内任一进程崩溃影响整体 → supervisord 自动重启 + Docker restart policy 双重保障
- **[调试复杂度]** 多进程容器内日志分散 → supervisord 按服务分文件记录，`run.sh logs` 聚合查看
- **[OpenMAIC 上游变更]** 源码构建可能因上游 breaking change 失败 → 通过 `OPENMAIC_BRANCH` 锁定版本/tag
- **[Volume 迁移]** 旧版 volume 名不同 → README 提供 pg_dump/psql 迁移指南
