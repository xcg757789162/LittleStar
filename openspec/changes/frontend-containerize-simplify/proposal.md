# 前端容器化 & 架构精简

## 变更摘要

将 LittleStar 前端（React/Vite）构建产物打包进 `littlestar-app` 容器，由 Nginx 同时服务前端静态文件和反向代理后端 API，从而**彻底消除 iframe 跨域问题**，精简冗余配置，统一开发/生产环境行为。

## 背景与动机

### 现状

当前 LittleStar 的运行架构：

| 层 | 开发环境 | 生产环境（目标） |
|----|---------|--------------|
| **前端** | Vite dev server `:5173` | ❌ 无（前端代码未打包进容器） |
| **Nginx 网关** | `:8080` 容器 | `:80` 容器 |
| **后端服务** | 容器内（PostgREST + Auth + OpenMAIC） | 容器内（同） |
| **数据库** | 容器内 PostgreSQL | 容器内 PostgreSQL |

**核心痛点**：

1. **iframe 跨域问题**：前端 `:5173` 嵌入 OpenMAIC iframe `:8080`，跨域导致：
   - 图片 `gen_img_*` 占位符无法被 DOM Mutation Observer 正确监测
   - TTS speechSynthesis 跨域限制，语音不播放
   - postMessage 需额外 origin 白名单校验
   - iframe-bridge.js 需要 Monkey Patch 大量浏览器 API

2. **Vite proxy 额外复杂度**：`vite.config.ts` 配置 3 条 proxy 规则，仅开发环境需要，增加理解成本

3. **环境分裂**：`ClassroomIframe.tsx` 的 `toEmbedUrl()` 必须区分 `import.meta.env.DEV`；`OpenMAICClient` 浏览器环境走 `/openmaic-proxy`；config.ts 中多处 DEV 分支判断

4. **前端 AI 服务层冗余**：config.ts 维护 10 个 Provider（LLM/TTS/STT/ISE），部分功能已被 OpenMAIC 原生覆盖（TTS、图片生成），前端配置和后端配置存在重叠

### 目标

> **LittleStar = 教导处（Lesson Planner）**，上课和备课交给 OpenMAIC。

- ✅ 前端静态文件 → 容器内 Nginx 直接服务，消除跨域
- ✅ 精简 Vite proxy（仅保留本地开发用，不影响生产）
- ✅ 统一 URL 逻辑：前端和 OpenMAIC 同源，所有 API 走相对路径
- ✅ 精简前端 AI 服务层：OpenMAIC 已覆盖的功能不再前端重复实现
- ✅ iframe-bridge.js 大幅简化（同源后无需 Monkey Patch 跨域限制）

## 变更范围

### 需修改文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docker/deploy/Dockerfile.app` | **新增 Stage** | Stage 1.5：Vite build 前端 → 复制到 Nginx html 目录 |
| `docker/deploy/nginx-app.conf` | **修改** | 默认 location `/` 改为 SPA fallback |
| `vite.config.ts` | **修改** | 保留 proxy 但标记仅 dev 用；增加 build 配置 |
| `src/components/classroom/ClassroomIframe.tsx` | **精简** | `toEmbedUrl()` 统一用相对路径 |
| `src/hooks/useClassroomBridge.ts` | **精简** | origin 白名单简化为同源 |
| `src/services/openmaic/client.ts` | **精简** | baseUrl 统一为相对路径 `/openmaic` |
| `src/services/openmaic/pipeline-client.ts` | **精简** | baseUrl 逻辑同上 |
| `src/services/config.ts` | **重构** | 分离前端直用配置 vs 后端透传配置 |
| `docker/nginx/iframe-bridge.js` | **精简** | 移除跨域 Monkey Patch，保留核心桥接 |
| `docker/deploy/entrypoint.sh` | **修改** | 新增前端构建产物验证 |

### 不修改

- `docker/deploy/docker-compose.yml` — 两容器架构不变
- `docker/deploy/supervisord.conf` — 4 进程不变
- `docker/postgresql/init/*.sql` — 数据库 schema 不变
- `src/services/auth/` — Auth 认证流程不变

## 影响分析

### 风险

| 风险 | 等级 | 缓解策略 |
|------|------|---------|
| Docker 构建时间增加（新增 Vite build stage） | 低 | 利用 Docker 多阶段缓存，仅 src/ 变更时重建 |
| Nginx 路由冲突（前端 SPA 路由 vs API 路由） | 中 | 精确匹配 API 路由在前，SPA fallback 在后 |
| 开发体验退化（需 docker build 才能测试完整流程） | 低 | Vite dev server + proxy 仍然可用于日常开发 |
| OpenMAIC iframe 内部请求路由混乱 | 中 | 逐条验证 Nginx location 优先级 |

### 收益

1. **彻底解决跨域**：前端、OpenMAIC iframe、所有 API 全部同源（端口 80）
2. **配置精简 40%+**：移除 DEV 分支判断、跨域 origin 白名单、Monkey Patch
3. **一键部署**：`docker-compose up` 即可运行完整应用（含前端）
4. **开发/生产一致**：不再有"开发环境正常、生产环境跨域失败"的问题

## 成功标准

1. `docker-compose up` 后访问 `http://localhost` 可看到 LittleStar 前端界面
2. 点击"开始上课"→ iframe 正常加载 OpenMAIC 课堂
3. 课堂内图片正常显示（无 `gen_img_*` 占位符残留）
4. 课堂内 TTS 语音正常播放
5. 答题交互正常（postMessage 通信）
6. Vite dev server (`npm run dev`) 仍可正常开发调试
