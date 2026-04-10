#!/bin/bash
set -e

# ============================================================
# LittleStar 两容器部署 — 运行脚本
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.local"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# 使用方式
usage() {
  echo "使用方式: $0 [命令]"
  echo ""
  echo "命令:"
  echo "  up        启动所有服务 (默认)"
  echo "  down      停止并删除容器"
  echo "  restart   重启所有服务"
  echo "  logs      查看实时日志"
  echo "  status    查看服务状态"
  echo "  reset-db  重置数据库 (⚠️ 删除所有数据)"
  echo "  shell     进入应用容器 shell"
  echo ""
}

# 检查 .env.local
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  未找到 .env.local，请先运行: cp .env.example .env.local"
  exit 1
fi

cd "$SCRIPT_DIR"

# Docker Compose 基础命令
DC="docker compose --env-file .env.local"

case "${1:-up}" in
  up)
    echo "🚀 启动 LittleStar 服务..."
    $DC up -d
    echo ""
    echo "✅ 服务已启动"
    echo ""
    echo "访问地址:"
    NGINX_PORT=$(grep -E "^NGINX_PORT=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "80")
    NGINX_PORT=${NGINX_PORT:-80}
    echo "  🌐 网关:    http://localhost:${NGINX_PORT}"
    echo "  📋 健康检查: http://localhost:${NGINX_PORT}/health"
    echo "  🔑 Auth API: http://localhost:${NGINX_PORT}/api/auth/health"
    echo "  📊 REST API: http://localhost:${NGINX_PORT}/api/rest/"
    echo "  🎓 OpenMAIC: http://localhost:${NGINX_PORT}/openmaic/"
    echo ""
    echo "查看日志: $0 logs"
    ;;

  down)
    echo "🛑 停止 LittleStar 服务..."
    $DC down
    echo "✅ 服务已停止"
    ;;

  restart)
    echo "🔄 重启 LittleStar 服务..."
    $DC restart
    echo "✅ 服务已重启"
    ;;

  logs)
    $DC logs -f --tail=100
    ;;

  status)
    echo "📊 LittleStar 服务状态:"
    echo ""
    $DC ps
    echo ""

    # 检查各服务健康状态
    echo "健康检查:"
    NGINX_PORT=$(grep -E "^NGINX_PORT=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "80")
    NGINX_PORT=${NGINX_PORT:-80}

    echo -n "  🗄️  数据库:    "
    if docker exec littlestar-db pg_isready -U postgres > /dev/null 2>&1; then
      echo "✅ 运行中"
    else
      echo "❌ 未就绪"
    fi

    echo -n "  🌐 Nginx:     "
    if curl -sf "http://localhost:${NGINX_PORT}/health" > /dev/null 2>&1; then
      echo "✅ 运行中"
    else
      echo "❌ 未就绪"
    fi

    echo -n "  🔑 Auth:      "
    if curl -sf "http://localhost:${NGINX_PORT}/api/auth/health" > /dev/null 2>&1; then
      echo "✅ 运行中"
    else
      echo "❌ 未就绪"
    fi

    echo -n "  📊 PostgREST: "
    if curl -sf "http://localhost:${NGINX_PORT}/api/rest/" > /dev/null 2>&1; then
      echo "✅ 运行中"
    else
      echo "❌ 未就绪"
    fi
    ;;

  reset-db)
    echo "⚠️  这将删除所有数据库数据！"
    read -p "确认继续？(y/N) " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      echo "🗑️  停止服务并删除数据..."
      $DC down -v
      echo "🚀 重新启动..."
      $DC up -d
      echo "✅ 数据库已重置，种子数据已重新导入"
    else
      echo "已取消"
    fi
    ;;

  shell)
    echo "进入应用容器..."
    docker exec -it littlestar-app /bin/bash
    ;;

  *)
    usage
    exit 1
    ;;
esac
