# Spec: Dockerfile 新增前端构建阶段

## 概述

在 `docker/deploy/Dockerfile.app` 中新增 Stage 1.5（前端构建），将 LittleStar React/Vite 前端打包为静态文件，复制到最终镜像的 `/app/frontend/` 目录。

## 现有阶段（不变）

- Stage 1 (`auth-builder`): Auth Service TypeScript 编译
- Stage 2 (`openmaic-builder`): OpenMAIC Next.js standalone 构建
- Stage 3: 最终运行时镜像

## 新增阶段

### Stage 1.5: `frontend-builder`

```dockerfile
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend

# 复制依赖定义（利用 Docker 缓存层）
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 复制源码和构建配置
COPY src/ ./src/
COPY index.html ./
COPY vite.config.ts tsconfig.json tsconfig.node.json ./
# public 目录（如果存在）
COPY public/ ./public/ 2>/dev/null || true

# Vite 生产构建
RUN npm run build
# 产物在 /build/frontend/dist/
```

### Stage 3 新增复制

```dockerfile
# --- 创建前端目录 ---
RUN mkdir -p /app/frontend

# --- 复制前端构建产物 ---
COPY --from=frontend-builder /build/frontend/dist /app/frontend
```

## 要点

1. **COPY 顺序**：`package.json` + `npm ci` 先于源码 COPY，最大化 Docker 缓存命中
2. **`--ignore-scripts`**：避免 postinstall 脚本（如 `husky install`）在 Docker 内执行失败
3. **国内镜像**：可选添加 `RUN npm config set registry https://registry.npmmirror.com` 加速
4. **最终镜像不增加 Node.js 构建工具**：多阶段构建确保最终镜像只有 dist/ 静态文件

## 验证

- `docker build` 成功
- 最终镜像中 `/app/frontend/index.html` 存在
- `/app/frontend/assets/` 目录包含 JS/CSS 文件（带 content hash）
