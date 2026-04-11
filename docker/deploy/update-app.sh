#!/bin/bash
set -e

# ============================================================
# LittleStar 快速更新脚本
# 合并代码后，仅重建变更的部分并热更新容器
#
# 用法:
#   ./update-app.sh              # 自动检测变更范围
#   ./update-app.sh --frontend   # 仅更新前端
#   ./update-app.sh --auth       # 仅更新 Auth Service
#   ./update-app.sh --full       # 全量重建
#   ./update-app.sh --no-cache   # 全量重建（无缓存）
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.local"
CONTAINER_NAME="littlestar-app"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 .env.local
if [ ! -f "$ENV_FILE" ]; then
  log_error "未找到 $ENV_FILE，请先运行: cp .env.example .env.local"
  exit 1
fi

# 检查容器是否存在
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_error "容器 ${CONTAINER_NAME} 不存在，请先执行 ./build.sh && ./run.sh"
  exit 1
fi

cd "$SCRIPT_DIR"
DC="docker compose --env-file .env.local"

# ============================================================
# 模式选择
# ============================================================
MODE="${1:-auto}"

case "$MODE" in
  --frontend)
    UPDATE_FRONTEND=true
    UPDATE_AUTH=false
    UPDATE_FULL=false
    ;;
  --auth)
    UPDATE_FRONTEND=false
    UPDATE_AUTH=true
    UPDATE_FULL=false
    ;;
  --full)
    UPDATE_FRONTEND=false
    UPDATE_AUTH=false
    UPDATE_FULL=true
    ;;
  --no-cache)
    UPDATE_FRONTEND=false
    UPDATE_AUTH=false
    UPDATE_FULL=true
    NO_CACHE="--no-cache"
    ;;
  auto|"")
    # 自动检测变更范围
    UPDATE_FRONTEND=false
    UPDATE_AUTH=false
    UPDATE_FULL=false

    cd "$PROJECT_ROOT"

    # 获取最近一次合并前后的文件变更
    # 先尝试 ORIG_HEAD（merge/pull 后存在），否则对比最近 2 个 commit
    if git rev-parse ORIG_HEAD > /dev/null 2>&1; then
      CHANGED_FILES=$(git diff --name-only ORIG_HEAD HEAD 2>/dev/null || echo "")
    else
      CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
    fi

    if [ -z "$CHANGED_FILES" ]; then
      log_warn "未检测到文件变更，跳过更新"
      exit 0
    fi

    log_info "检测到变更文件:"
    echo "$CHANGED_FILES" | head -20
    TOTAL=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
    if [ "$TOTAL" -gt 20 ]; then
      echo "  ... 及其他 $((TOTAL - 20)) 个文件"
    fi
    echo ""

    # 判断变更范围
    if echo "$CHANGED_FILES" | grep -qE '^(src/|index\.html|vite\.config|tsconfig|package\.json|package-lock\.json)'; then
      UPDATE_FRONTEND=true
      log_info "检测到前端源码变更 → 需要重建前端"
    fi

    if echo "$CHANGED_FILES" | grep -qE '^docker/auth-service/'; then
      UPDATE_AUTH=true
      log_info "检测到 Auth Service 变更 → 需要重建 Auth Service"
    fi

    if echo "$CHANGED_FILES" | grep -qE '^docker/deploy/(Dockerfile|supervisord|nginx-app|entrypoint)'; then
      UPDATE_FULL=true
      log_info "检测到 Docker 基础设施变更 → 需要全量重建"
    fi

    if echo "$CHANGED_FILES" | grep -qE '^docker/nginx/'; then
      UPDATE_FULL=true
      log_info "检测到 Nginx 配置变更 → 需要全量重建"
    fi

    # 没有需要更新的
    if [ "$UPDATE_FRONTEND" = false ] && [ "$UPDATE_AUTH" = false ] && [ "$UPDATE_FULL" = false ]; then
      log_ok "变更文件不影响 Docker 容器，无需更新"
      exit 0
    fi

    cd "$SCRIPT_DIR"
    ;;
  *)
    echo "用法: $0 [--frontend|--auth|--full|--no-cache|auto]"
    exit 1
    ;;
esac

# ============================================================
# 执行更新
# ============================================================
echo ""
echo "============================================"
echo " LittleStar 容器热更新"
echo "============================================"

START_TIME=$(date +%s)

if [ "$UPDATE_FULL" = true ]; then
  # 全量重建: 停止 → 构建 → 重启
  log_info "全量重建 ${CONTAINER_NAME} 镜像..."
  $DC build ${NO_CACHE:-} app
  log_info "重启容器..."
  $DC up -d app

elif [ "$UPDATE_FRONTEND" = true ] && [ "$UPDATE_AUTH" = true ]; then
  # 前端 + Auth 都变了，全量重建更安全
  log_info "前端 + Auth Service 均有变更，执行全量重建..."
  $DC build app
  $DC up -d app

elif [ "$UPDATE_FRONTEND" = true ]; then
  # ---- 仅前端更新: 容器内热替换 ----
  log_info "仅更新前端静态文件..."

  # 在宿主机构建前端
  cd "$PROJECT_ROOT"
  log_info "构建前端 (vite build)..."
  npm run build 2>&1 | tail -5

  # 复制构建产物到容器
  log_info "复制构建产物到容器..."
  docker cp dist/. "${CONTAINER_NAME}:/app/frontend/"

  # 重载 Nginx（无需重启容器）
  log_info "重载 Nginx..."
  docker exec "${CONTAINER_NAME}" nginx -s reload

  cd "$SCRIPT_DIR"

elif [ "$UPDATE_AUTH" = true ]; then
  # ---- 仅 Auth Service 更新 ----
  log_info "仅更新 Auth Service..."

  # 在宿主机编译 Auth Service
  cd "$PROJECT_ROOT/docker/auth-service"
  log_info "编译 Auth Service..."
  npm ci --ignore-scripts 2>&1 | tail -3
  npx tsc --skipLibCheck

  # 复制编译产物到容器
  log_info "复制编译产物到容器..."
  docker cp dist/. "${CONTAINER_NAME}:/app/auth-service/dist/"

  # 通过 supervisord 重启 Auth Service（无需重启容器）
  log_info "重启 Auth Service 进程..."
  docker exec "${CONTAINER_NAME}" supervisorctl restart auth-service

  cd "$SCRIPT_DIR"
fi

# ============================================================
# 等待健康检查
# ============================================================
log_info "等待服务就绪..."

MAX_WAIT=60
for i in $(seq 1 $MAX_WAIT); do
  if curl -sf "http://localhost:$(grep -E '^NGINX_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo 80)/health" > /dev/null 2>&1; then
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    echo ""
    log_ok "✅ 更新完成！耗时 ${ELAPSED}s"
    echo ""
    echo "  🌐 http://localhost:$(grep -E '^NGINX_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo 80)"
    echo ""
    exit 0
  fi
  sleep 1
done

log_error "服务在 ${MAX_WAIT}s 内未恢复健康"
log_warn "请检查日志: docker logs ${CONTAINER_NAME} --tail=50"
exit 1
