#!/bin/bash
set -e

# ============================================================
# LittleStar 两容器部署 — 构建脚本
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${SCRIPT_DIR}/.env.local"

echo "============================================"
echo " LittleStar 两容器部署 — 构建镜像"
echo "============================================"

# 检查 .env.local
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "⚠️  未找到 .env.local 配置文件"
  echo "   请先复制模板并填入配置:"
  echo ""
  echo "   cp ${SCRIPT_DIR}/.env.example ${ENV_FILE}"
  echo "   vi ${ENV_FILE}"
  echo ""
  exit 1
fi

# 进入 docker 目录（docker-compose context 的父目录）
cd "$SCRIPT_DIR"

# --- 预下载 PostgREST 二进制（避免 Docker build 中的网络问题） ---
POSTGREST_VERSION="v12.2.3"
POSTGREST_FILE="${SCRIPT_DIR}/postgrest.tar.xz"

if [ ! -f "$POSTGREST_FILE" ]; then
  echo ""
  echo "[0/2] 下载 PostgREST ${POSTGREST_VERSION}..."

  # 检测宿主机架构
  HOST_ARCH="$(uname -m)"
  case "$HOST_ARCH" in
    x86_64|amd64)   POSTGREST_ASSET="linux-static-x64" ;;
    arm64|aarch64)   POSTGREST_ASSET="ubuntu-aarch64" ;;
    *)               echo "❌ 不支持的架构: $HOST_ARCH"; exit 1 ;;
  esac

  POSTGREST_URL="https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/postgrest-${POSTGREST_VERSION}-${POSTGREST_ASSET}.tar.xz"
  echo "  URL: ${POSTGREST_URL}"

  curl -L -o "$POSTGREST_FILE" "$POSTGREST_URL"
  if [ $? -ne 0 ]; then
    echo "❌ PostgREST 下载失败"
    rm -f "$POSTGREST_FILE"
    exit 1
  fi
  echo "  ✅ PostgREST 已下载到 ${POSTGREST_FILE}"
else
  echo "[0/2] PostgREST 已存在，跳过下载"
fi

echo ""
echo "[1/2] 构建应用容器镜像（含 OpenMAIC 源码编译）..."
echo "  Context: ${DOCKER_DIR}"
echo "  Dockerfile: deploy/Dockerfile.app"
echo "  OpenMAIC: 从 GitHub 源码构建 (standalone 模式)"
echo ""
echo "  ⏱️  首次构建需要克隆 OpenMAIC 仓库并编译，预计 5-15 分钟"
echo "     后续构建会利用 Docker 缓存加速"
echo ""

docker compose --env-file "$ENV_FILE" build app

echo ""
echo "[2/2] 拉取数据库镜像..."
docker compose --env-file "$ENV_FILE" pull db

echo ""
echo "============================================"
echo " ✅ 构建完成！"
echo ""
echo " 启动服务:"
echo "   cd ${SCRIPT_DIR} && ./run.sh"
echo ""
echo " 或手动启动:"
echo "   docker compose --env-file .env.local up -d"
echo "============================================"
