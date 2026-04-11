# ============================================================
# LittleStar All-in-One 应用容器 Dockerfile
# 多阶段构建: OpenMAIC 源码构建 + Auth Service 编译 → 最终镜像
# 运行时包含: Nginx + PostgREST + Auth Service + OpenMAIC
# ============================================================

# ============================================================
# Stage 1: 编译 Auth Service (TypeScript → JavaScript)
# ============================================================
FROM node:22-alpine AS auth-builder

WORKDIR /build/auth-service

COPY docker/auth-service/package.json docker/auth-service/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY docker/auth-service/tsconfig.json ./
COPY docker/auth-service/src/ ./src/

RUN npx tsc --skipLibCheck

# 单独准备 production 依赖（排除 devDependencies）
RUN mkdir -p /build/auth-prod \
    && cp package.json package-lock.json* /build/auth-prod/ \
    && cd /build/auth-prod \
    && npm ci --omit=dev --ignore-scripts

# ============================================================
# Stage 1.5: 编译 Pre-Generation 后端服务 (TypeScript → JavaScript)
# ============================================================
FROM node:22-alpine AS pregen-builder

WORKDIR /build/pregen

# 复制依赖文件并安装（复用前端 package.json，只需 pg + tsc-alias）
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# 复制 TypeScript 配置和源码
COPY tsconfig.server.json ./
COPY src/server/ ./src/server/
COPY src/services/openmaic/pipeline-types.ts ./src/services/openmaic/pipeline-types.ts

# 编译 + 路径别名解析
RUN npx tsc -p tsconfig.server.json && npx tsc-alias -p tsconfig.server.json

# 单独准备 production 依赖（只需 pg + express + cors）
RUN mkdir -p /build/pregen-prod \
    && cp package.json /build/pregen-prod/ \
    && cd /build/pregen-prod \
    && npm install --omit=dev --ignore-scripts pg express cors

# ============================================================
# Stage 2: 构建 LittleStar 前端 (Vite → 静态文件)
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

# 复制依赖文件并安装
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# 复制前端源码和配置
COPY src/ ./src/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json* ./

# 构建前端（仅 Vite 构建，跳过 tsc 类型检查——测试文件有预先存在的类型错误）
RUN npx vite build

# ============================================================
# Stage 3: 构建 OpenMAIC (Next.js standalone)
# 从 GitHub 源码克隆 → pnpm install → pnpm build
# ============================================================
FROM node:22-alpine AS openmaic-builder

# 替换 Alpine 源为国内镜像（腾讯云，加速 apk 下载）
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.cloud.tencent.com|g' /etc/apk/repositories

# 系统依赖：pnpm + 原生编译工具（sharp、@napi-rs/canvas 等需要）
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    build-base \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    git

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /build/openmaic

# 克隆 OpenMAIC 源码（使用 --depth 1 减少下载量）
ARG OPENMAIC_REPO=https://github.com/THU-MAIC/OpenMAIC.git
ARG OPENMAIC_BRANCH=main
RUN git clone --depth 1 --branch ${OPENMAIC_BRANCH} ${OPENMAIC_REPO} .

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建 Next.js（standalone 模式，输出到 .next/standalone）
RUN pnpm build

# ============================================================
# Stage 3: 最终运行时镜像
# 基于 nginx:1.27-alpine，叠加 Node.js + PostgREST + supervisord
# ============================================================
FROM nginx:1.27-alpine

LABEL maintainer="LittleStar Team"
LABEL description="LittleStar All-in-One: Nginx + PostgREST + Auth Service + OpenMAIC"

# --- 替换 Alpine 源为国内镜像（腾讯云），加速 apk 下载 ---
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.cloud.tencent.com|g' /etc/apk/repositories

# --- 修复 Alpine 3.21 pyexpat 兼容性问题 ---
# nginx:1.27-alpine 自带 libexpat 2.7.0，但 Python 3.12 的 pyexpat 编译时
# 引用了 expat 2.7.2+ 的 XML_SetAllocTrackerActivationThreshold 符号。
# 必须先升级 libexpat 到 2.7.5+，supervisord (Python) 才能正常启动。
RUN apk upgrade --no-cache libexpat

# --- 系统依赖（仅运行时，不包含构建工具） ---
RUN apk add --no-cache \
    nodejs \
    supervisor \
    curl \
    bash \
    libpq \
    postgresql-client \
    gmp \
    libffi \
    # OpenMAIC 运行时需要的图形库（sharp/canvas 等原生模块）
    libc6-compat \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    && rm -rf /var/cache/apk/*

# --- 安装 PostgREST ---
# PostgREST 二进制在宿主机预先下载（build.sh 负责），通过 COPY 安装
# 避免 Docker build 中的 GitHub DNS/网络问题
RUN apk add --no-cache gcompat || true
COPY docker/deploy/postgrest.tar.xz /tmp/postgrest.tar.xz
RUN tar -xJf /tmp/postgrest.tar.xz -C /usr/local/bin/ \
    && chmod +x /usr/local/bin/postgrest \
    && rm -f /tmp/postgrest.tar.xz \
    && postgrest --help > /dev/null 2>&1

# --- 创建目录结构 ---
RUN mkdir -p \
    /app/auth-service \
    /app/frontend \
    /app/pregeneration \
    /app/openmaic \
    /app/openmaic/data \
    /app/openmaic/logs \
    /app/openmaic/public \
    /app/openmaic/.next/static \
    /data/media \
    /var/log/supervisor \
    /etc/supervisor/conf.d

# --- 复制 LittleStar 前端构建产物 ---
COPY --from=frontend-builder /build/frontend/dist /app/frontend

# --- Auth Service 运行时依赖（从 auth-builder 复制 production node_modules，无需 npm） ---
COPY --from=auth-builder /build/auth-prod/node_modules /app/auth-service/node_modules
COPY docker/auth-service/package.json /app/auth-service/

# --- 复制 Auth Service 编译产物 ---
COPY --from=auth-builder /build/auth-service/dist /app/auth-service/dist

# --- Pre-Generation 后端服务运行时依赖 + 编译产物 ---
COPY --from=pregen-builder /build/pregen-prod/node_modules /app/pregeneration/node_modules
COPY --from=pregen-builder /build/pregen/dist-server /app/pregeneration/dist

# --- 复制 OpenMAIC 构建产物（standalone 模式） ---
# standalone 目录包含 server.js + 精简的 node_modules
COPY --from=openmaic-builder /build/openmaic/.next/standalone /app/openmaic/
# 静态资源（Next.js 不会自动包含在 standalone 中）
COPY --from=openmaic-builder /build/openmaic/.next/static /app/openmaic/.next/static
# public 目录（头像、logo 等公共资源）
COPY --from=openmaic-builder /build/openmaic/public /app/openmaic/public

# --- Nginx 配置 ---
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/deploy/nginx-app.conf /etc/nginx/conf.d/littlestar.conf
COPY docker/nginx/iframe-bridge.js /etc/nginx/iframe-bridge.js

# --- supervisord 配置 ---
COPY docker/deploy/supervisord.conf /etc/supervisor/supervisord.conf

# --- 入口脚本 ---
COPY docker/deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# --- 暴露端口 ---
# 80: Nginx 网关 (唯一对外端口)
# 内部端口不暴露: 3000 (PostgREST), 3001 (Auth), 3002 (OpenMAIC), 3003 (Pre-Generation)
EXPOSE 80

# --- 健康检查 ---
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -sf http://localhost/health || exit 1

# --- 启动入口 ---
ENTRYPOINT ["/entrypoint.sh"]
