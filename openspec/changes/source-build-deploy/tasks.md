## 1. 多阶段 Dockerfile（源码构建）

- [x] 1.1 完善 Dockerfile.app Stage 1: Auth Service 编译阶段，确保 `npm ci` + `npx tsc --skipLibCheck` 正确产出 `dist/index.js`
- [x] 1.2 完善 Dockerfile.app Stage 2: OpenMAIC 构建阶段，确保 `git clone --depth 1` + `pnpm install --frozen-lockfile` + `pnpm build` 正确产出 standalone 产物
- [x] 1.3 完善 Dockerfile.app Stage 3: 最终镜像，验证只包含运行时依赖（Node.js、Nginx、PostgREST、supervisord、native libs），不包含构建工具
- [x] 1.4 验证构建参数 `OPENMAIC_REPO` 和 `OPENMAIC_BRANCH` 支持自定义仓库和分支

## 2. supervisord 多进程管理

- [x] 2.1 完善 supervisord.conf 四进程配置（PostgREST → Auth → OpenMAIC → Nginx），验证优先级、自动重启、日志轮转
- [x] 2.2 验证环境变量透传：PostgREST 数据库连接、Auth Service JWT 配置、OpenMAIC PORT/HOSTNAME

## 3. Nginx 反向代理路由

- [x] 3.1 完善 nginx-app.conf 路由规则：`/api/auth/*` → :3001、`/api/rest/*` → :3000、`/openmaic/*` → :3002
- [x] 3.2 验证 CORS 预检处理和响应头注入
- [x] 3.3 验证 OpenMAIC iframe 嵌入支持：X-Frame-Options 移除、CSP 设置、iframe-bridge.js 注入
- [x] 3.4 验证静态资源缓存策略：`/_next/*` 30 天 immutable、`/media/*` 30 天、`/avatars/*` 7 天

## 4. 部署脚本和配置

- [x] 4.1 完善 entrypoint.sh: PostgreSQL 就绪等待 + 构建产物验证（server.js、dist/index.js、postgrest）
- [x] 4.2 完善 build.sh: 环境文件检查 + 镜像构建 + 数据库镜像拉取
- [x] 4.3 创建或完善 run.sh: 支持 up/down/restart/logs/status/reset-db/shell 子命令
- [x] 4.4 完善 .env.example: 所有配置项带注释说明和合理默认值
- [x] 4.5 完善 docker-compose.yml: 两容器编排、健康检查、volume 持久化、资源限制

## 5. 端到端验证

- [x] 5.1 执行 `./build.sh` 完成镜像构建（验证多阶段构建全流程）
- [x] 5.2 执行 `./run.sh up` 启动服务，验证 4 个进程全部 RUNNING
- [x] 5.3 验证各端点可访问：`/health`、`/api/auth/health`、`/api/rest/`、`/openmaic/`
- [x] 5.4 验证 LittleStar 前端通过 Nginx 网关正常访问和交互
