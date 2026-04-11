#!/usr/bin/env bash
# ============================================================
# build-server.sh — 构建预生成后端服务
#
# 编译 src/server → dist-server，处理 @/ 路径别名
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 构建预生成后端服务..."
cd "$PROJECT_ROOT"

# 清理
rm -rf dist-server

# 编译 TypeScript
echo "📦 编译 TypeScript..."
npx tsc -p tsconfig.server.json

# 处理路径别名 @/ → 相对路径
echo "🔗 处理路径别名..."
npx tsc-alias -p tsconfig.server.json

echo "✅ 后端服务构建完成 → dist-server/"
echo "   入口: dist-server/server/index.js"
