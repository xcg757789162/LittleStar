#!/bin/bash
set -e

# ============================================================
# LittleStar All-in-One 容器入口脚本
# 1. 等待 PostgreSQL 就绪
# 2. 验证 OpenMAIC 构建产物
# 3. 启动 supervisord
# ============================================================

echo "============================================"
echo " LittleStar All-in-One 应用容器启动中..."
echo " OpenMAIC: 基于源码构建 (standalone)"
echo "============================================"

# --- 等待 PostgreSQL 就绪 ---
echo "[entrypoint] 等待 PostgreSQL 就绪..."

DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-littlestar}"

MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
  if PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo "[entrypoint] ✅ PostgreSQL 已就绪 (尝试 $i/$MAX_RETRIES)"
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] ❌ 错误: PostgreSQL 在 $(($MAX_RETRIES * $RETRY_INTERVAL))s 内未就绪，退出"
    exit 1
  fi

  echo "[entrypoint] ⏳ PostgreSQL 未就绪，等待 ${RETRY_INTERVAL}s... ($i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

# --- 验证 OpenMAIC 构建产物 ---
if [ -f /app/openmaic/server.js ]; then
  echo "[entrypoint] ✅ OpenMAIC standalone 构建产物已就绪"
else
  echo "[entrypoint] ❌ 错误: /app/openmaic/server.js 不存在"
  echo "[entrypoint] OpenMAIC 源码构建可能失败，请检查 Docker 构建日志"
  exit 1
fi

# --- 验证 Auth Service ---
if [ -f /app/auth-service/dist/index.js ]; then
  echo "[entrypoint] ✅ Auth Service 编译产物已就绪"
else
  echo "[entrypoint] ❌ 错误: /app/auth-service/dist/index.js 不存在"
  exit 1
fi

# --- 验证 LittleStar 前端 ---
if [ -f /app/frontend/index.html ]; then
  echo "[entrypoint] ✅ LittleStar 前端构建产物已就绪"
else
  echo "[entrypoint] ⚠️  警告: /app/frontend/index.html 不存在，前端页面将不可用"
fi

# --- 验证 Pre-Generation 后端服务 ---
if [ -f /app/pregeneration/dist/server/index.js ]; then
  echo "[entrypoint] ✅ Pre-Generation 后端服务已就绪"
else
  echo "[entrypoint] ⚠️  警告: /app/pregeneration/dist/server/index.js 不存在，预生成服务将不可用"
fi

# --- 验证 PostgREST ---
if command -v postgrest &> /dev/null; then
  echo "[entrypoint] ✅ PostgREST $(postgrest --version 2>/dev/null || echo 'installed')"
else
  echo "[entrypoint] ❌ 错误: PostgREST 未安装"
  exit 1
fi

# --- 确保数据目录权限正确 ---
chown -R root:root /app/openmaic/data 2>/dev/null || true
chown -R root:root /app/openmaic/logs 2>/dev/null || true

# --- 打印启动信息 ---
echo "============================================"
echo "[entrypoint] 启动 supervisord..."
echo "  - PostgREST       → :3000"
echo "  - Auth Service    → :3001"
echo "  - OpenMAIC        → :${OPENMAIC_PORT:-3002}"
echo "  - Pre-Generation  → :${PREGEN_PORT:-3003}"
echo "  - Nginx           → :80 (前端 + API 网关)"
echo "============================================"

# --- 启动 supervisord (前台运行) ---
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
