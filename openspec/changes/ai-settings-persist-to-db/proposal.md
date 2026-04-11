# AI 服务设置持久化到数据库

## 概述

将 OpenMAIC 的 8 类 AI 服务设置（LLM/TTS/ASR/ISE/Image/Video/WebSearch/PDF）从 localStorage 迁移到 PostgreSQL 数据库，通过 `api.children.settings` JSONB 列持久化存储，确保 OpenMAIC 能正确识别和调用所有配置的大模型 API Key。

## 问题背景

当前 AI 服务设置存在以下问题：

### 1. 存储不可靠
- OpenMAIC Settings Store 使用 Zustand `persist` 中间件将配置存储在 `localStorage`（key: `settings-storage`）
- 浏览器清除缓存、换设备、或 localStorage 配额满时，配置全部丢失
- 多设备间无法同步配置

### 2. 配置覆盖不完整
- `ChildSettings`（PostgreSQL JSONB）只覆盖了 **4 类服务**：LLM、TTS、Image、Video
- **缺少 4 类服务**的配置字段：ASR（语音识别）、ISE（口语评测）、PDF（文档解析）、WebSearch（网络搜索）
- `settings-sync.ts` 桥接层也只同步了 LLM/TTS/Image/Video，缺少 ASR/ISE/PDF/WebSearch
- `headers-builder.ts` 只构建了 LLM/TTS/Image/Video 的 Headers，缺少其他服务的传递

### 3. OpenMAIC 后端需要的配置未完整传递
OpenMAIC 后端通过 `provider-config.ts` 的 `resolveXxxApiKey()` 系列函数实现**客户端 Key > 服务端 Key > 环境变量**的三级回退。如果我们不把 API Key 传过去，就只能依赖 `.env.local` 环境变量——这意味着所有用户共享同一个 Key，无法按孩子隔离。

### 4. 特殊服务的配置传递方式与 LLM 不同
通过深度分析 OpenMAIC 官方源码发现，不同服务的配置传递方式差异很大：

| 服务类型 | 后端 API | 配置传递方式 |
|---------|---------|------------|
| **LLM** | `/api/generate/scene-*`、`/api/chat` | HTTP Headers（x-model/x-api-key/x-base-url）或 JSON body |
| **TTS** | `/api/generate/tts` | **JSON body**（ttsProviderId/ttsApiKey/ttsBaseUrl） |
| **ASR** | `/api/transcription` | **FormData**（providerId/apiKey/baseUrl） |
| **PDF** | `/api/parse-pdf` | **FormData**（providerId/apiKey/baseUrl） |
| **WebSearch** | `/api/web-search` | **混合**：LLM headers + JSON body `apiKey`（Tavily key） |
| **Image** | `/api/generate/image` | HTTP Headers（x-image-provider/x-api-key/x-base-url） |
| **Video** | `/api/generate/video` | HTTP Headers（x-video-provider/x-api-key/x-base-url） |
| **ISE** | 讯飞 WebSocket | 前端直连（appId/apiKey/apiSecret），不走 OpenMAIC 后端 |

## 目标

1. **完整覆盖**：ChildSettings 类型扩展，覆盖全部 8 类 AI 服务的配置
2. **数据库持久化**：所有 AI 设置存入 `api.children.settings` JSONB，随孩子维度隔离
3. **Settings Sync 补全**：桥接层新增 ASR/ISE/PDF/WebSearch → OpenMAIC Settings Store 同步
4. **Pipeline 传递补全**：确保 Pipeline Client、Headers Builder、Backend Pipeline Executor 能正确传递所有服务的配置到 OpenMAIC API
5. **UI 覆盖**：家长面板 → 高级设置 → AI 服务设置（SettingsDialog）中可配置全部 8 类服务

## 设计原则

1. **非破坏性迁移**：向 ChildSettings 添加新字段，旧数据自动使用默认值
2. **按孩子隔离**：每个孩子独立的 AI 配置，家长可为不同孩子配不同 Provider
3. **OpenMAIC 兼容**：遵循 OpenMAIC 官方的配置传递协议（Headers / Body / FormData），不修改 OpenMAIC 源码
4. **三级回退**：客户端 Key > 服务端 `.env.local` Key > 空（报错）

## 受影响范围

### 类型定义
- `src/types/models.ts`（ChildSettings）— 新增 ASR/ISE/PDF/WebSearch 配置字段

### 数据同步
- `src/stores/openmaic/settings-sync.ts` — 新增 ASR/ISE/PDF/WebSearch 同步逻辑

### 配置传递
- `src/services/openmaic/headers-builder.ts` — 补充缺失的 Headers 构建
- `src/server/services/headers-builder-server.ts` — 服务端版同步补充
- `src/services/openmaic/pipeline-client.ts` — 确保 TTS/ASR/WebSearch/PDF 的 body/FormData 传递
- `src/server/services/pipeline-executor.ts` — 后端 Pipeline 同步

### UI 设置面板
- `src/components/openmaic/settings/` — 确认 ASR/WebSearch/PDF Tab 已存在并正常工作
- `src/components/settings/SettingsDialog.tsx` — 确认所有 8 类设置可编辑

### Docker 环境
- `docker/openmaic/.env.local` — 作为服务端回退 Key 的配置模板

## 成功标准

1. 家长在 AI 服务设置面板中配置的所有 Provider/API Key/Model 都持久化到数据库
2. 切换孩子后，AI 配置随之切换
3. 清除浏览器缓存后，登录即可恢复所有 AI 配置
4. OpenMAIC Pipeline 能正确调用所有 8 类 AI 服务（LLM 生成课程内容、TTS 语音合成、ASR 语音识别、Image 图片生成、Video 视频生成）
5. WebSearch、PDF、ISE 的配置不再丢失
