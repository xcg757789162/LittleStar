# AI 服务设置持久化 — 技术设计

## 架构概览

```
┌──────────────────────────────────────────────────────────┐
│  家长面板 → SettingsDialog (8 类 AI 服务设置 Tab)         │
│  ↓ 保存时                                                │
│  ChildSettings (扩展后) → PostgREST PATCH api/children   │
│  ↓ 登录/切换孩子时                                       │
│  syncSettingsToOpenMAIC() → OpenMAIC Settings Store       │
│  ↓ 进入课堂/生成课程时                                    │
│  Pipeline Client / Headers Builder → OpenMAIC 后端 API   │
│  ↓ OpenMAIC 后端                                         │
│  resolveXxxApiKey(clientKey) → 客户端 Key > 服务端 Key    │
└──────────────────────────────────────────────────────────┘
```

## Decisions

- 2026-04-12：`ChildSettings` 与 `DEFAULT_ADVANCED_SETTINGS` 先统一补齐 ASR、ISE、WebSearch、PDF 四组字段，默认值直接对齐当前 OpenMAIC store 的 provider 体系；其中 ISE 默认 provider 采用现有真实 ID `text-match-fallback`，避免与 UI/store 常量命名不一致。
- 2026-04-12：T1 已在 `src/types/models.ts` 中补齐 `DEFAULT_ADVANCED_SETTINGS` 的 Pick 字段和默认值；ISE 命名在 LittleStar 侧统一采用 `iflytek-ise` / `text-match-fallback`，不再使用旧草案里的 `iflytek` / `text-match`。
- 2026-04-12：T2 的 `settings-sync.ts` 除了同步 provider 与密钥外，还会同步 `enableASR` 到全局开关、把 ASR/WebSearch/PDF 的 `enabled` 状态写入对应 provider config，并在 WebSearch/PDF 缺省时分别回退到 `tavily` / `unpdf`。

## 1. ChildSettings 类型扩展

### 新增字段（`src/types/models.ts`）

```typescript
// === ASR 语音识别配置 ===
/** ASR 开关 */
enableASR: boolean
/** ASR 提供商 ID（'openai-whisper' | 'qwen-asr' | 'browser-native'） */
asrProviderId: string
/** ASR API Key */
asrApiKey: string
/** ASR Base URL */
asrBaseUrl: string
/** ASR 语言（默认 'auto'） */
asrLanguage: string

// === ISE 口语评测配置 ===
/** ISE 开关 */
enableISE: boolean
/** ISE 提供商 ID（'iflytek-ise' | 'text-match-fallback'） */
iseProviderId: string
/** ISE App ID（讯飞） */
iseAppId: string
/** ISE API Key（讯飞） */
iseApiKey: string
/** ISE API Secret（讯飞） */
iseApiSecret: string

// === WebSearch 网络搜索配置 ===
/** WebSearch 开关 */
enableWebSearch: boolean
/** WebSearch 提供商 ID（'tavily'） */
webSearchProviderId: string
/** WebSearch API Key（Tavily） */
webSearchApiKey: string

// === PDF 文档解析配置 ===
/** PDF 开关 */
enablePDF: boolean
/** PDF 提供商 ID（'unpdf' | 'mineru'） */
pdfProviderId: string
/** PDF API Key */
pdfApiKey: string
/** PDF Base URL */
pdfBaseUrl: string
```

### 默认值扩展（`DEFAULT_ADVANCED_SETTINGS`）

```typescript
// ASR 默认值
enableASR: true,
asrProviderId: 'openai-whisper',
asrApiKey: '',
asrBaseUrl: '',
asrLanguage: 'auto',

// ISE 默认值
enableISE: false,
iseProviderId: 'text-match-fallback',
iseAppId: '',
iseApiKey: '',
iseApiSecret: '',

// WebSearch 默认值
enableWebSearch: false,
webSearchProviderId: 'tavily',
webSearchApiKey: '',

// PDF 默认值
enablePDF: false,
pdfProviderId: 'unpdf',
pdfApiKey: '',
pdfBaseUrl: '',
```

### 数据库兼容性

- `api.children.settings` 是 `JSONB NOT NULL DEFAULT '{}'` 列
- 新增字段不需要 DDL 变更，JSONB 自然支持动态 schema
- 旧数据缺少新字段时，前端读取后合并 `DEFAULT_ADVANCED_SETTINGS` 即可
- PostgREST 的 PATCH 只更新传入的字段，不影响其他已有设置

## 2. Settings Sync 桥接补全

### 新增同步逻辑（`src/stores/openmaic/settings-sync.ts`）

在现有 `syncSettingsToOpenMAIC()` 函数末尾追加：

#### ASR 同步
```typescript
// === ASR 配置 ===
if (settings.asrProviderId) {
  store.setASRProvider(mapChildASRProviderId(settings.asrProviderId))
  if (settings.asrApiKey) {
    store.setASRProviderConfig(mapChildASRProviderId(settings.asrProviderId), {
      apiKey: settings.asrApiKey,
      ...(settings.asrBaseUrl ? { baseUrl: settings.asrBaseUrl } : {}),
    })
  }
}
if (settings.asrLanguage) {
  store.setASRLanguage(settings.asrLanguage)
}
```

#### WebSearch 同步
```typescript
// === WebSearch 配置 ===
if (settings.webSearchApiKey) {
  store.setWebSearchProviderConfig('tavily', {
    apiKey: settings.webSearchApiKey,
    enabled: true,
  })
}
```

#### PDF 同步
```typescript
// === PDF 配置 ===
if (settings.pdfProviderId) {
  store.setPDFProvider(settings.pdfProviderId)
  if (settings.pdfApiKey || settings.pdfBaseUrl) {
    store.setPDFProviderConfig(settings.pdfProviderId, {
      ...(settings.pdfApiKey ? { apiKey: settings.pdfApiKey } : {}),
      ...(settings.pdfBaseUrl ? { baseUrl: settings.pdfBaseUrl } : {}),
    })
  }
}
```

#### ISE 同步
ISE（讯飞口语评测）不走 OpenMAIC Settings Store，而是直接从 ChildSettings 读取，因此 **T2 不处理 ISE 的 store 同步**。

ISE 的后续工作放在 **T3**：更新 `src/services/config.ts` 中 `getISEConfig()` 的读取源，从 localStorage 迁移为优先读取当前孩子的 `ChildSettings`。

### Provider ID 映射函数

新增 `mapChildASRProviderId()` 映射：
```typescript
function mapChildASRProviderId(providerId: string): ASRProviderId {
  switch (providerId) {
    case 'openai-whisper': return 'openai-whisper'
    case 'qwen-asr': return 'qwen-asr'
    case 'browser-native': return 'browser-native'
    default: return 'openai-whisper'
  }
}
```

## 3. OpenMAIC API 配置传递补全

### 3.1 OpenMAIC 各 API 实际读取的配置（来自官方源码分析）

| API | 配置传递方式 | 读取字段 |
|-----|------------|---------|
| `/api/generate/scene-outlines-stream` | HTTP Headers | `x-model`, `x-api-key`, `x-base-url`, `x-provider-type`, `x-image-generation-enabled`, `x-video-generation-enabled` |
| `/api/generate/scene-content` | HTTP Headers | 同上（通过 `resolveModelFromHeaders`） |
| `/api/generate/scene-actions` | HTTP Headers | 同上 |
| `/api/generate/tts` | JSON Body | `ttsProviderId`, `ttsApiKey`, `ttsBaseUrl`, `ttsModelId`, `ttsVoice`, `ttsSpeed` |
| `/api/generate/image` | HTTP Headers | `x-image-provider`, `x-image-model`, `x-api-key`, `x-base-url` |
| `/api/generate/video` | HTTP Headers | `x-video-provider`, `x-video-model`, `x-api-key`, `x-base-url` |
| `/api/transcription` | FormData | `providerId`, `modelId`, `language`, `apiKey`, `baseUrl` |
| `/api/parse-pdf` | FormData | `providerId`, `apiKey`, `baseUrl` |
| `/api/web-search` | 混合 | Headers: `x-model`, `x-api-key`（LLM）；Body: `apiKey`（Tavily） |
| `/api/chat` | JSON Body | `model`, `apiKey`, `baseUrl`, `providerType` |

### 3.2 Pipeline Client 传递方案

**LLM / Image / Video**：已通过 Headers Builder 覆盖，无需修改。

**TTS**：OpenMAIC 的 `use-scene-generator.ts` 中 `generateAndStoreTTS()` 从 Settings Store 读取 `ttsProviderId`、`ttsApiKey` 等，通过 JSON body 传给 `/api/generate/tts`。这个路径已经被 settings-sync 覆盖（同步 ChildSettings → Settings Store），**无需额外修改**。

**ASR**：OpenMAIC 的 `use-audio-recorder.ts` 从 Settings Store 读取 `asrProviderId`、`asrApiKey`、`asrBaseUrl`，通过 FormData 传给 `/api/transcription`。新增的 ASR settings-sync 会确保 ChildSettings → Settings Store 同步，**路径自动打通**。

**WebSearch**：OpenMAIC 的 `generation-preview/page.tsx` 从 Settings Store 读取 `webSearchProvidersConfig[tavily].apiKey`，通过 JSON body `apiKey` 传给 `/api/web-search`。新增的 WebSearch settings-sync 会覆盖，**路径自动打通**。

**PDF**：OpenMAIC 的 `generation-preview/page.tsx` 从 session 中读取 `pdfProviderId`、`pdfProviderConfig.apiKey`、`pdfProviderConfig.baseUrl`。LittleStar 的 Pipeline Client 需要在调用 PDF 相关接口时传入 ChildSettings 中的 PDF 配置。

**ISE**：讯飞口语评测是前端直连 WebSocket，不走 OpenMAIC 后端。`src/services/voice/pronunciation/iflytek-ise-provider.ts` 需要从 ChildSettings 读取 `iseAppId`、`iseApiKey`、`iseApiSecret`。

### 3.3 Headers Builder 补充

`headers-builder.ts` 当前未构建 ASR/PDF/WebSearch 的 Headers，但**实际上这些服务不走 HTTP Headers**（ASR/PDF 走 FormData，WebSearch 走 JSON body），所以 **headers-builder.ts 不需要为这三类添加 Headers**。

唯一需要确认的是：Pipeline Client 在调用这些 API 时，正确地从 ChildSettings 或 OpenMAIC Settings Store 中读取配置并以正确方式传递。

## 4. ISE 配置迁移

### 当前状态
`src/services/config.ts` 中的 `getISEConfig()` 从 localStorage 读取：
```typescript
const raw = localStorage.getItem('ise-config')
```

### 迁移方案
- 删除 localStorage 读取逻辑
- 新增 `getISEConfigFromSettings(settings: ChildSettings)` 函数
- 从 ChildSettings 的 `iseProviderId`、`iseAppId`、`iseApiKey`、`iseApiSecret` 读取
- `iflytek-ise-provider.ts` 调用处更新，从当前孩子的 ChildSettings 获取配置

## 5. SettingsDialog UI 确认

OpenMAIC 原生的 SettingsDialog 已支持 8 类 AI 服务 Tab（providers/tts/asr/ise/image/video/webSearch/pdf）。LittleStar 已复用这些组件。

**需要确认**：
1. SettingsDialog 的「保存」按钮触发时，所有 8 类设置都被写入 ChildSettings
2. SettingsDialog 打开时，从 ChildSettings 加载所有 8 类设置到 OpenMAIC Settings Store
3. 新增的 4 类字段（ASR/ISE/WebSearch/PDF）在 SettingsDialog 中有对应的 UI 控件

## 6. .env.local 配置模板

创建 `docker/openmaic/.env.local.example` 作为服务端回退 Key 的配置参考：

```bash
# ===== LLM Providers =====
# QWEN_API_KEY=sk-xxx
# DEEPSEEK_API_KEY=sk-xxx
# OPENAI_API_KEY=sk-xxx

# ===== TTS Providers =====
# TTS_MINIMAX_API_KEY=xxx
# TTS_DOUBAO_API_KEY=appId:accessKey

# ===== ASR Providers =====
# ASR_OPENAI_API_KEY=sk-xxx
# ASR_QWEN_API_KEY=sk-xxx

# ===== Image Providers =====
# IMAGE_SEEDREAM_API_KEY=xxx

# ===== Video Providers =====
# VIDEO_SEEDANCE_API_KEY=xxx

# ===== WebSearch =====
# TAVILY_API_KEY=tvly-xxx

# ===== PDF Providers =====
# PDF_MINERU_BASE_URL=http://your-mineru-server:8080
```

## 7. 数据流完整路径

### 写入路径（家长配置保存）
```
SettingsDialog UI
  → onSave() 回调
  → 提取 OpenMAIC Settings Store 的 8 类配置
  → 映射为 ChildSettings 字段
  → PATCH /rest/children/{id} (settings JSONB)
  → PostgreSQL 持久化
```

### 读取路径（孩子登录/切换）
```
API GET /rest/children?user_id=eq.xxx
  → ChildSettings JSON 解析
  → 合并 DEFAULT_ADVANCED_SETTINGS（填充缺失字段）
  → syncSettingsToOpenMAIC(settings)
  → OpenMAIC Settings Store 更新
  → 各 Hook/组件从 Store 读取
```

### 调用路径（课程生成）
```
Pipeline Client
  → buildHeadersFromSettings(childSettings) — LLM/Image/Video Headers
  → 调用 OpenMAIC /api/generate/scene-outlines-stream (Headers)
  → 调用 OpenMAIC /api/generate/scene-content (Headers)
  → 调用 OpenMAIC /api/generate/scene-actions (Headers)
  → 调用 OpenMAIC /api/generate/tts (JSON body — 从 Settings Store 读取)
  → 调用 OpenMAIC /api/generate/image (Headers)
  → 调用 OpenMAIC /api/generate/video (Headers)
```

### 辅助调用路径
```
ASR: use-audio-recorder → /api/transcription (FormData — 从 Settings Store)
PDF: generation-preview → /api/parse-pdf (FormData — 从 Settings Store)
WebSearch: generation-preview → /api/web-search (JSON body — 从 Settings Store)
ISE: iflytek-ise-provider → 讯飞 WebSocket (直接从 ChildSettings)
```

## 8. 边界情况处理

### 旧数据兼容
- JSONB 中缺少新字段 → `DEFAULT_ADVANCED_SETTINGS` 自动填充
- 无 API Key → 回退到 `.env.local` 环境变量（OpenMAIC 内置 resolve 机制）
- 无环境变量 → 报错提示用户配置

### 安全考虑
- API Key 存储在 PostgreSQL JSONB 中，受 RLS 策略保护（children 表按 user_id 隔离）
- PostgREST 需要 JWT 认证才能访问
- API Key 不会通过 `/api/server-providers` 暴露给前端（OpenMAIC 设计原则）
- 前端传给 OpenMAIC 后端的 Key 通过 HTTPS 加密传输

### 并发和缓存
- ChildSettings 从数据库加载后缓存在 Zustand Store 中
- `syncSettingsToOpenMAIC` 是同步操作，不存在竞态
- 家长修改设置后，下一次进入课堂会自动 re-sync
