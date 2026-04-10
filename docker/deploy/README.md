# LittleStar 两容器部署方案

## 架构概览

```
┌─ littlestar-db ──────────┐    ┌─ littlestar-app ────────────────┐
│  PostgreSQL 16 Alpine     │    │  supervisord                     │
│  (暴露 :5432)             │◄───│  ├── PostgREST   (:3000 内部)   │
│                           │    │  ├── Auth Service (:3001 内部)   │
│  Volume: pgdata           │    │  ├── OpenMAIC    (:3002 内部)   │
└───────────────────────────┘    │  └── Nginx       (:80 对外)     │
                                 └──────────────────────────────────┘
```

**对外端口**: 只暴露 Nginx 的 `:80` (可通过 `NGINX_PORT` 配置) 和 PostgreSQL 的 `:5432`

## OpenMAIC 构建方式

**完全基于源码构建**，不依赖任何第三方 Docker 镜像。

构建过程（Dockerfile 多阶段构建）:
1. **Stage 1** — 编译 Auth Service (TypeScript → JavaScript)
2. **Stage 2** — 从 GitHub 克隆 OpenMAIC 源码 → `pnpm install` → `pnpm build` → 输出 Next.js standalone 产物
3. **Stage 3** — 最终运行镜像：Nginx + PostgREST + Auth Service + OpenMAIC standalone

> 源码地址: https://github.com/THU-MAIC/OpenMAIC

## 快速开始

### 1. 配置环境变量

```bash
cd docker/deploy
cp .env.example .env.local
vi .env.local  # 填入你的 JWT_SECRET 和 POSTGRES_PASSWORD
```

### 2. 构建镜像

```bash
./build.sh
```

> ⏱️ 首次构建需要克隆 OpenMAIC 仓库并编译，预计 5-15 分钟。后续构建会利用 Docker 缓存加速。

### 3. 启动服务

```bash
./run.sh up
```

### 4. 验证服务

```bash
./run.sh status
```

或手动检查:
```bash
# 健康检查
curl http://localhost:8080/health

# Auth 服务
curl http://localhost:8080/api/auth/health

# PostgREST
curl http://localhost:8080/api/rest/

# OpenMAIC
curl http://localhost:8080/openmaic/
```

## 管理命令

```bash
./run.sh up        # 启动所有服务
./run.sh down      # 停止并删除容器
./run.sh restart   # 重启所有服务
./run.sh logs      # 查看实时日志
./run.sh status    # 查看服务状态 + 健康检查
./run.sh reset-db  # 重置数据库 (⚠️ 删除所有数据)
./run.sh shell     # 进入应用容器 shell
```

## 自定义 OpenMAIC 版本

可以通过环境变量指定 OpenMAIC 的源码仓库和分支:

```bash
# 在 .env.local 中设置
OPENMAIC_REPO=https://github.com/your-fork/OpenMAIC.git
OPENMAIC_BRANCH=your-feature-branch
```

或在构建时指定:
```bash
docker compose --env-file .env.local build \
  --build-arg OPENMAIC_REPO=https://github.com/your-fork/OpenMAIC.git \
  --build-arg OPENMAIC_BRANCH=develop \
  app
```

## 目录结构

```
docker/deploy/
├── docker-compose.yml    # 两容器编排
├── Dockerfile.app        # 应用容器多阶段构建（含 OpenMAIC 源码编译）
├── supervisord.conf      # 多进程管理配置
├── nginx-app.conf        # Nginx 反向代理 (localhost)
├── entrypoint.sh         # 容器入口脚本
├── .env.example          # 环境变量模板
├── .env.local            # 实际环境变量 (git ignored)
├── build.sh              # 一键构建
├── run.sh                # 一键运行
└── README.md             # 本文件
```

## 与旧版 5 容器架构的对比

| 维度 | 旧版 (5 容器) | 新版 (2 容器) |
|------|---------------|---------------|
| 容器数 | 5 | 2 |
| 进程管理 | Docker Compose | supervisord + Docker Compose |
| 网络通信 | Docker bridge 跨容器 | localhost 内部 + 跨容器到 DB |
| 数据库 | 同网络容器 | 独立容器 (可升级为外部 RDS) |
| OpenMAIC | Docker Hub 第三方镜像 | **GitHub 源码构建** |
| 配置路径 | `docker/openmaic/` | `docker/deploy/` |

## 注意事项

### 构建缓存

Docker 的多阶段构建会自动缓存每一层。只要 OpenMAIC 仓库没有变化，`git clone` 和 `pnpm install` 这些耗时步骤不会重复执行。

如果需要强制更新 OpenMAIC:
```bash
docker compose --env-file .env.local build --no-cache app
```

### 数据库迁移

如果从旧版迁移，数据库 volume 名称不同:
- 旧版: `postgres-data`
- 新版: `pgdata`

需要手动导出/导入数据:
```bash
# 从旧版导出
docker exec littlestar-postgres pg_dump -U postgres littlestar > backup.sql

# 导入到新版
cat backup.sql | docker exec -i littlestar-db psql -U postgres littlestar
```

### PostgREST 架构

PostgREST v12.2.3 通过环境变量直接配置，不需要配置文件。
环境变量通过 supervisord 的 `%(ENV_xxx)s` 语法注入。
