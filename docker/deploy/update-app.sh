#!/bin/bash
set -e

# ============================================================
# LittleStar 快速更新脚本 (v2 — 带端到端验证)
#
# 架构: littlestar-db (PostgreSQL) + littlestar-app (All-in-One)
#       All-in-One 内含: Nginx + PostgREST + Auth Service + OpenMAIC
#       前端通过 volume 挂载: 本地 dist/ → /app/frontend
#
# 用法:
#   ./update-app.sh              # 自动检测变更范围
#   ./update-app.sh --frontend   # 仅更新前端（vite build，volume 自动同步）
#   ./update-app.sh --auth       # 仅更新 Auth Service（重建镜像）
#   ./update-app.sh --nginx      # 仅更新 Nginx 配置（容器内 reload）
#   ./update-app.sh --full       # 全量重建 app 容器
#   ./update-app.sh --no-cache   # 全量重建（无 Docker 缓存）
#   ./update-app.sh --verify     # 仅运行端到端验证（不做构建）
#   ./update-app.sh --help       # 显示帮助
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.local"
CONTAINER_APP="littlestar-app"
CONTAINER_DB="littlestar-db"

# ============================================================
# 颜色和日志
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[  OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }
log_section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
log_check()   { printf "  %-50s" "$1"; }

# ============================================================
# 帮助信息
# ============================================================
show_help() {
  cat << 'EOF'

  LittleStar 部署更新脚本 (v2)

  架构: littlestar-db (PostgreSQL) + littlestar-app (All-in-One)
        前端 dist/ 通过 Docker volume 映射到容器 /app/frontend

  用法: ./update-app.sh [选项]

  选项:
    (无参数)      自动检测 git 变更范围，智能选择更新策略
    --frontend    仅更新前端（npx vite build → volume 自动同步 → 刷新浏览器）
    --auth        仅重建 Auth Service（需 docker compose build）
    --nginx       仅更新 Nginx 配置（容器内 nginx -s reload）
    --full        全量重建 app 容器（Dockerfile/supervisord/entrypoint 变更时用）
    --no-cache    全量重建（无 Docker 缓存，彻底重建）
    --verify      仅运行端到端验证（不做任何构建）
    --help        显示此帮助信息

  验证清单:
    每次更新完成后自动执行深度端到端验证:
    ✓ Nginx 网关 /health
    ✓ Auth Service /api/auth/health + /api/auth/me (401 校验)
    ✓ PostgREST /api/rest/ (Schema 可达)
    ✓ Pre-generation Service (可选)
    ✓ OpenMAIC /openmaic/ 入口
    ✓ 前端 index.html 内容检查

EOF
  exit 0
}

# ============================================================
# 读取端口配置
# ============================================================
get_port() {
  if [ -f "$ENV_FILE" ]; then
    local port
    port=$(grep -E '^NGINX_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    echo "${port:-8080}"
  else
    echo "8080"
  fi
}

BASE_URL="http://localhost:$(get_port)"

# ============================================================
# Node.js 环境检测（兼容 nvm / 系统安装）
# ============================================================
ensure_node() {
  if command -v npx &> /dev/null; then
    return 0
  fi

  # 尝试加载 nvm
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
  fi

  # 尝试 workbuddy 安装的 node
  local wb_node="$HOME/.workbuddy/binaries/node/versions/20.18.0/bin"
  if [ -d "$wb_node" ]; then
    export PATH="$wb_node:$PATH"
  fi

  if ! command -v npx &> /dev/null; then
    log_error "未找到 npx 命令。请确保已安装 Node.js"
    log_error "  安装 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash"
    return 1
  fi
}

# 统一前端构建函数
build_frontend() {
  ensure_node || return 1

  local prev_dir="$PWD"
  cd "$PROJECT_ROOT"

  log_info "构建前端 (npx vite build)..."
  if npx vite build 2>&1 | tail -10; then
    log_ok "前端已构建到 dist/（volume 自动同步到容器 /app/frontend）"
  else
    log_error "前端构建失败！"
    cd "$prev_dir"
    return 1
  fi

  cd "$prev_dir"
  return 0
}

# ============================================================
# 前置检查
# ============================================================
preflight_check() {
  # 检查 .env.local
  if [ ! -f "$ENV_FILE" ]; then
    log_error "未找到 ${ENV_FILE}"
    log_error "请先运行: cp .env.example .env.local 并填写配置"
    exit 1
  fi

  # 检查 docker
  if ! command -v docker &> /dev/null; then
    log_error "未找到 docker 命令"
    exit 1
  fi

  # 检查 app 容器是否在运行
  local app_status
  app_status=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_APP" 2>/dev/null || echo "not_found")

  if [ "$app_status" = "not_found" ]; then
    log_error "容器 ${CONTAINER_APP} 不存在"
    log_error "请先执行: cd docker/deploy && docker compose --env-file .env.local up -d"
    exit 1
  fi

  log_info "容器状态:"
  for c in "$CONTAINER_APP" "$CONTAINER_DB"; do
    local status health
    status=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "not_found")
    health=$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "none")
    if [ "$status" = "running" ]; then
      echo -e "  ${GREEN}●${NC} ${c} (${status}, health=${health})"
    else
      echo -e "  ${YELLOW}●${NC} ${c} (${status})"
    fi
  done
}

# ============================================================
# 深度端到端验证
# ============================================================
VERIFY_PASS=0
VERIFY_FAIL=0
VERIFY_WARN=0

verify_endpoint() {
  local description="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local method="${4:-GET}"

  log_check "$description"

  local http_code
  if [ "$method" = "POST" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$url" 2>/dev/null || echo "000")
  else
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  fi

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} ($http_code)"
    VERIFY_PASS=$((VERIFY_PASS + 1))
    return 0
  elif [ "$http_code" = "000" ]; then
    echo -e "${RED}✗ 连接失败${NC}"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
    return 1
  else
    echo -e "${RED}✗ 期望 $expected_status，实际 $http_code${NC}"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
    return 1
  fi
}

verify_endpoint_optional() {
  local description="$1"
  local url="$2"
  local expected_status="${3:-200}"

  log_check "$description"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} ($http_code)"
    VERIFY_PASS=$((VERIFY_PASS + 1))
  elif [ "$http_code" = "000" ]; then
    echo -e "${YELLOW}~ 服务未运行（可选）${NC}"
    VERIFY_WARN=$((VERIFY_WARN + 1))
  else
    echo -e "${YELLOW}~ 异常 ($http_code)，但为可选服务${NC}"
    VERIFY_WARN=$((VERIFY_WARN + 1))
  fi
}

verify_content() {
  local description="$1"
  local url="$2"
  local expected_content="$3"

  log_check "$description"

  local body
  body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")

  if [ -z "$body" ]; then
    echo -e "${RED}✗ 连接失败或空响应${NC}"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
    return 1
  fi

  if echo "$body" | grep -q "$expected_content"; then
    echo -e "${GREEN}✓${NC} (包含 '${expected_content}')"
    VERIFY_PASS=$((VERIFY_PASS + 1))
    return 0
  else
    echo -e "${RED}✗ 未包含 '${expected_content}'${NC}"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
    return 1
  fi
}

run_deep_verification() {
  log_section "端到端深度验证"
  echo ""

  VERIFY_PASS=0
  VERIFY_FAIL=0
  VERIFY_WARN=0

  # ---- 1. 基础设施 ----
  echo -e "  ${BOLD}▸ 基础设施${NC}"
  verify_content   "Nginx 网关 /health"           "${BASE_URL}/health"              '"status":"ok"'
  echo ""

  # ---- 2. Auth Service ----
  echo -e "  ${BOLD}▸ Auth Service${NC}"
  verify_endpoint  "Auth /api/auth/health"        "${BASE_URL}/api/auth/health"
  verify_endpoint  "Auth /api/auth/me (需 401)"   "${BASE_URL}/api/auth/me"         "401"
  echo ""

  # ---- 3. PostgREST ----
  echo -e "  ${BOLD}▸ PostgREST (数据库 API)${NC}"
  verify_endpoint  "PostgREST 根路径"             "${BASE_URL}/api/rest/"
  echo ""

  # ---- 4. Pre-generation Service（可选） ----
  echo -e "  ${BOLD}▸ Pre-generation Service (可选)${NC}"
  verify_endpoint_optional "Pre-gen health"       "${BASE_URL}/api/pre-generate/health"
  echo ""

  # ---- 5. OpenMAIC 服务 ----
  echo -e "  ${BOLD}▸ OpenMAIC 服务${NC}"
  verify_endpoint  "OpenMAIC 入口"                "${BASE_URL}/openmaic/"
  echo ""

  # ---- 6. 前端 ----
  echo -e "  ${BOLD}▸ LittleStar 前端${NC}"
  verify_content   "前端 index.html"              "${BASE_URL}/"                    '<div id='
  echo ""

  # ---- 汇总 ----
  log_section "验证结果汇总"
  echo ""
  echo -e "  ${GREEN}通过: ${VERIFY_PASS}${NC}  |  ${RED}失败: ${VERIFY_FAIL}${NC}  |  ${YELLOW}警告: ${VERIFY_WARN}${NC}"
  echo ""

  if [ "$VERIFY_FAIL" -gt 0 ]; then
    log_error "⛔ 有 ${VERIFY_FAIL} 项验证失败！请排查后再确认完成。"
    echo ""
    echo "  排查命令:"
    echo "    docker logs ${CONTAINER_APP} --tail=50"
    echo "    docker exec ${CONTAINER_APP} supervisorctl status"
    echo "    docker exec ${CONTAINER_APP} nginx -t"
    echo ""
    return 1
  else
    log_ok "✅ 所有验证通过！服务已就绪。"
    echo ""
    echo "  🌐 ${BASE_URL}"
    echo ""
    return 0
  fi
}

# ============================================================
# 等待服务就绪
# ============================================================
wait_for_healthy() {
  local service_name="${1:-Nginx}"
  local check_url="${2:-${BASE_URL}/health}"
  local max_wait="${3:-60}"

  log_info "等待 ${service_name} 就绪（最多 ${max_wait}s）..."

  for i in $(seq 1 "$max_wait"); do
    if curl -s --max-time 5 "$check_url" > /dev/null 2>&1; then
      log_ok "${service_name} 已就绪（${i}s）"
      return 0
    fi
    sleep 1
  done

  log_error "${service_name} 在 ${max_wait}s 内未恢复健康"
  return 1
}

# ============================================================
# 模式选择
# ============================================================
MODE="${1:-auto}"

case "$MODE" in
  --help|-h)
    show_help
    ;;
  --verify)
    preflight_check
    run_deep_verification
    exit $?
    ;;
esac

preflight_check

UPDATE_FRONTEND=false
UPDATE_AUTH=false
UPDATE_NGINX=false
UPDATE_FULL=false
NO_CACHE=""

case "$MODE" in
  --frontend)
    UPDATE_FRONTEND=true
    ;;
  --auth)
    UPDATE_AUTH=true
    ;;
  --nginx)
    UPDATE_NGINX=true
    ;;
  --full)
    UPDATE_FULL=true
    ;;
  --no-cache)
    UPDATE_FULL=true
    NO_CACHE="--no-cache"
    ;;
  auto|"")
    # ============================================================
    # 自动检测变更范围
    # ============================================================
    cd "$PROJECT_ROOT"

    # 获取 committed + uncommitted 变更
    COMMITTED=""
    if git rev-parse ORIG_HEAD > /dev/null 2>&1; then
      COMMITTED=$(git diff --name-only ORIG_HEAD HEAD 2>/dev/null || echo "")
    else
      COMMITTED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
    fi
    UNSTAGED=$(git diff --name-only 2>/dev/null || echo "")
    STAGED=$(git diff --name-only --cached 2>/dev/null || echo "")
    ALL_CHANGES=$(printf "%s\n%s\n%s" "$COMMITTED" "$UNSTAGED" "$STAGED" | sort -u | grep -v '^$' || true)

    if [ -z "$ALL_CHANGES" ]; then
      log_warn "未检测到文件变更，跳过构建"
      log_info "运行验证确认当前服务状态..."
      run_deep_verification
      exit $?
    fi

    log_section "变更检测"
    echo ""
    echo "$ALL_CHANGES" | head -25
    TOTAL=$(echo "$ALL_CHANGES" | wc -l | tr -d ' ')
    if [ "$TOTAL" -gt 25 ]; then
      echo "  ... 及其他 $((TOTAL - 25)) 个文件"
    fi
    echo ""

    # ---- 判断变更范围 ----

    # 前端源码 → vite build（volume 自动同步）
    if echo "$ALL_CHANGES" | grep -qE '^(src/|index\.html|vite\.config|tsconfig|package\.json|package-lock\.json|public/)'; then
      UPDATE_FRONTEND=true
      log_info "📦 前端源码变更 → npx vite build（volume 自动同步）"
    fi

    # Auth Service → 需要重建镜像
    if echo "$ALL_CHANGES" | grep -qE '^docker/auth-service/'; then
      UPDATE_AUTH=true
      log_info "🔐 Auth Service 变更 → 需要重建容器"
    fi

    # Nginx 配置（容器内 nginx-app.conf 或网关 nginx.conf）
    if echo "$ALL_CHANGES" | grep -qE '^docker/(deploy/nginx-app\.conf|nginx/)'; then
      UPDATE_NGINX=true
      log_info "🌐 Nginx 配置变更 → 需要重建容器或 reload"
    fi

    # Docker 基础设施
    if echo "$ALL_CHANGES" | grep -qE '^docker/deploy/(Dockerfile|supervisord|entrypoint|docker-compose)'; then
      UPDATE_FULL=true
      log_info "🐳 Docker 基础设施变更 → 需要全量重建"
    fi

    # SQL schema
    if echo "$ALL_CHANGES" | grep -qE '^docker/postgresql/'; then
      log_warn "⚠️  SQL schema 变更 — 需要手动处理（本次不自动执行）"
      log_warn "   全量重建: cd docker/deploy && docker compose --env-file .env.local down -v && docker compose --env-file .env.local up -d"
      log_warn "   增量执行: docker exec -i ${CONTAINER_DB} psql -U postgres -d littlestar < docker/postgresql/init/XX-xxx.sql"
    fi

    # Pre-generation service
    if echo "$ALL_CHANGES" | grep -qE '^src/hooks/usePreGeneration|^docker/deploy/.*(pregen|pre-gen)'; then
      log_info "🔄 Pre-generation 相关变更检测到"
    fi

    if [ "$UPDATE_FRONTEND" = false ] && [ "$UPDATE_AUTH" = false ] && [ "$UPDATE_NGINX" = false ] && [ "$UPDATE_FULL" = false ]; then
      log_ok "变更文件不影响 Docker 容器，无需构建"
      log_info "运行验证确认当前服务状态..."
      run_deep_verification
      exit $?
    fi

    cd "$SCRIPT_DIR"
    ;;
  *)
    echo "未知选项: $MODE"
    echo "用法: $0 [--frontend|--auth|--nginx|--full|--no-cache|--verify|--help|auto]"
    exit 1
    ;;
esac

# ============================================================
# 执行更新
# ============================================================
echo ""
echo "============================================"
echo " LittleStar 容器热更新 (v2)"
echo "============================================"
echo ""

START_TIME=$(date +%s)

cd "$SCRIPT_DIR"
DC="docker compose --env-file .env.local"

if [ "$UPDATE_FULL" = true ]; then
  # ---- 全量重建 ----
  log_section "全量重建"
  log_info "停止容器..."
  $DC stop app
  log_info "重建 app 镜像..."
  $DC build ${NO_CACHE:-} app
  log_info "重启容器..."
  $DC up -d
  wait_for_healthy "所有服务" "${BASE_URL}/health" 90

elif [ "$UPDATE_NGINX" = true ]; then
  # ---- Nginx 配置更新 ----
  log_section "Nginx 配置更新"

  # 判断是容器内 nginx-app.conf 还是网关 nginx
  if docker exec "$CONTAINER_APP" test -f /etc/nginx/conf.d/littlestar.conf 2>/dev/null; then
    # All-in-One 容器: nginx-app.conf 是镜像内构建的，需要 docker cp + reload
    log_info "复制 nginx-app.conf 到容器..."
    docker cp "${SCRIPT_DIR}/nginx-app.conf" "${CONTAINER_APP}:/etc/nginx/conf.d/littlestar.conf"
    log_info "测试 Nginx 配置..."
    if docker exec "$CONTAINER_APP" nginx -t 2>&1; then
      log_info "重载 Nginx..."
      docker exec "$CONTAINER_APP" nginx -s reload
      log_ok "Nginx 配置已热更新"
    else
      log_error "Nginx 配置测试失败！回退到之前的配置。"
      log_warn "容器内旧配置仍在生效，请修正配置后重试。"
      # 不 exit，继续验证看看服务是否还正常
    fi
  else
    # 网关 Nginx 容器: 需要重建
    log_info "重建 Nginx 容器..."
    $DC build nginx 2>/dev/null || true
    $DC up -d nginx 2>/dev/null || true
  fi

  # 如果前端也变了
  if [ "$UPDATE_FRONTEND" = true ]; then
    log_section "前端更新"
    build_frontend
  fi

  # 如果 Auth 也变了
  if [ "$UPDATE_AUTH" = true ]; then
    log_section "Auth Service 更新"
    log_info "重建 app 容器（Auth Service 在 All-in-One 内）..."
    $DC build app
    $DC up -d app
    wait_for_healthy "App 容器" "${BASE_URL}/health" 60
  fi

  sleep 2
  wait_for_healthy "Nginx" "${BASE_URL}/health" 30

elif [ "$UPDATE_FRONTEND" = true ] && [ "$UPDATE_AUTH" = true ]; then
  # ---- 前端 + Auth ----
  log_section "前端 + Auth Service 更新"

  # 前端: vite build（volume 同步）
  build_frontend

  # Auth Service: 在 All-in-One 容器内，需要重建
  log_info "重建 app 容器（Auth Service 变更）..."
  $DC build app
  $DC up -d app
  wait_for_healthy "App 容器" "${BASE_URL}/health" 60

elif [ "$UPDATE_FRONTEND" = true ]; then
  # ---- 仅前端更新（最常见场景）----
  log_section "前端更新"
  build_frontend
  log_info "💡 浏览器硬刷新 (Cmd+Shift+R) 即可看到变化"
  cd "$SCRIPT_DIR"

elif [ "$UPDATE_AUTH" = true ]; then
  # ---- 仅 Auth Service ----
  log_section "Auth Service 更新"
  log_info "重建 app 容器（Auth Service 在 All-in-One 内）..."
  $DC build app
  $DC up -d app
  wait_for_healthy "App 容器" "${BASE_URL}/health" 60
fi

# ============================================================
# 构建完成 → 执行深度验证
# ============================================================
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
echo ""
log_ok "构建阶段完成，耗时 ${ELAPSED}s"

sleep 2

run_deep_verification
VERIFY_RESULT=$?

# ============================================================
# 最终汇总
# ============================================================
TOTAL_TIME=$(( $(date +%s) - START_TIME ))
echo ""
if [ $VERIFY_RESULT -eq 0 ]; then
  echo "============================================"
  echo -e " ${GREEN}${BOLD}✅ 部署成功，验证通过${NC}"
  echo "============================================"
  echo ""
  echo "  🌐 ${BASE_URL}"
  echo "  ⏱️  总耗时: ${TOTAL_TIME}s"
  echo ""
else
  echo "============================================"
  echo -e " ${RED}${BOLD}⛔ 部署完成但验证未通过${NC}"
  echo "============================================"
  echo ""
  echo "  构建成功但部分服务验证失败。"
  echo "  请根据上方失败项排查问题。"
  echo ""
  echo "  常用排查命令:"
  echo "    docker logs ${CONTAINER_APP} --tail=50"
  echo "    docker exec ${CONTAINER_APP} supervisorctl status"
  echo "    docker exec ${CONTAINER_APP} nginx -t"
  echo "    docker exec ${CONTAINER_APP} curl -s http://localhost:3001/auth/health"
  echo "    docker exec ${CONTAINER_APP} curl -s http://localhost:3000/"
  echo ""
  exit 1
fi
