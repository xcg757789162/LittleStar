#!/bin/bash
# ============================================================
# LittleStar 前端热更新脚本
# 无需重建 Docker 镜像，直接更新容器内的前端代码
#
# 用法:
#   ./scripts/hot-deploy.sh          # 构建 + 自动生效
#   ./scripts/hot-deploy.sh --skip-build  # 跳过构建，仅重载 nginx
# ============================================================

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist"
CONTAINER_NAME="littlestar-app"
DOCKER_CMD="${DOCKER_CMD:-/usr/local/bin/docker}"

cd "$PROJECT_ROOT"

# 加载 nvm（macOS 常见场景）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null

echo -e "${BLUE}🚀 LittleStar 前端热更新${NC}"
echo "─────────────────────────────"

# Step 1: 构建前端
if [ "$1" != "--skip-build" ]; then
    echo -e "${YELLOW}📦 Step 1: 构建前端 (vite build)...${NC}"
    npx vite build 2>&1 | tail -5
    echo -e "${GREEN}✅ 构建完成${NC}"
else
    echo -e "${YELLOW}⏭️  跳过构建${NC}"
fi

# Step 2: 检查 dist 目录
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
    echo -e "${RED}❌ dist/ 目录不存在或缺少 index.html，请先运行构建${NC}"
    exit 1
fi

# Step 3: 检查容器是否运行
if ! $DOCKER_CMD ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ 容器 ${CONTAINER_NAME} 未运行${NC}"
    echo -e "${YELLOW}💡 提示: cd docker/deploy && docker compose up -d${NC}"
    exit 1
fi

# Step 4: 检查是否使用了 volume 挂载
MOUNT_CHECK=$($DOCKER_CMD inspect "$CONTAINER_NAME" --format '{{range .Mounts}}{{.Destination}} {{end}}' 2>/dev/null)
if echo "$MOUNT_CHECK" | grep -q "/app/frontend"; then
    # 使用了 volume 挂载，只需 reload nginx 使新文件生效
    echo -e "${YELLOW}🔄 Step 2: 重载 Nginx 缓存...${NC}"
    $DOCKER_CMD exec "$CONTAINER_NAME" nginx -s reload 2>/dev/null || true
    echo -e "${GREEN}✅ Nginx 已重载，volume 挂载模式 — 即时生效！${NC}"
else
    # 未使用 volume 挂载，用 docker cp 拷贝
    echo -e "${YELLOW}📤 Step 2: 复制 dist/ → 容器 /app/frontend/ ...${NC}"
    $DOCKER_CMD cp "$DIST_DIR/." "${CONTAINER_NAME}:/app/frontend/"
    echo -e "${GREEN}✅ 文件已复制${NC}"

    echo -e "${YELLOW}🔄 Step 3: 重载 Nginx...${NC}"
    $DOCKER_CMD exec "$CONTAINER_NAME" nginx -s reload 2>/dev/null || true
    echo -e "${GREEN}✅ Nginx 已重载${NC}"
fi

echo ""
echo -e "${GREEN}🎉 前端更新完成！刷新浏览器即可看到变化${NC}"
echo -e "${BLUE}💡 如果浏览器有缓存，按 Cmd+Shift+R 强制刷新${NC}"
