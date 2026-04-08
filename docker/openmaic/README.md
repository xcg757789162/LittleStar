# OpenMAIC Docker 部署

本目录包含 OpenMAIC AI 课堂生成服务的 Docker 部署配置。

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 LLM API Key（推荐使用 Qwen）。

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 验证服务

```bash
# 检查容器状态
docker ps

# 访问服务
curl http://localhost:3000
```

## 配置说明

### LLM 提供商

OpenMAIC 支持多种 LLM 提供商。LittleStar 项目推荐使用 **Qwen（通义千问）**，通过 OpenAI 兼容接口调用：

```env
OPENAI_API_KEY=sk-your-qwen-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEFAULT_MODEL=openai:qwen-plus
```

### 端口配置

默认端口 `3000`，可通过 `OPENMAIC_PORT` 环境变量修改：

```env
OPENMAIC_PORT=3001
```

### 数据持久化

- `openmaic-data`: 课堂数据持久化存储
- `openmaic-logs`: 运行时日志

## 常用命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f openmaic

# 重启
docker compose restart openmaic

# 清理数据（危险：会删除所有课堂数据）
docker compose down -v
```

## 健康检查

服务内置健康检查，每 30 秒检测一次。可通过 `docker ps` 查看 `STATUS` 列是否显示 `healthy`。

## 与 LittleStar 集成

LittleStar 前端通过 `OpenMAIC API Client` 调用本服务的 API：

- `POST /api/generate-classroom` — 提交课堂生成请求
- `GET /api/classroom/[id]` — 获取课堂数据和状态

默认服务地址: `http://localhost:3000`（可在家长面板高级设置中修改）
