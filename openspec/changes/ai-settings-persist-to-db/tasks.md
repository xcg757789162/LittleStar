# AI 服务设置持久化 — 实现任务

## 任务概览

| # | 任务 | 预估 | 依赖 |
|---|------|------|------|
| T1 | 扩展 ChildSettings 类型定义 | 30min | 无 |
| T2 | 补全 Settings Sync 桥接层 | 45min | T1 |
| T3 | 迁移 ISE 配置读取源 | 30min | T1 |
| T4 | SettingsDialog 保存/加载补全 | 60min | T1 |
| T5 | Pipeline 配置传递验证与补全 | 45min | T2 |
| T6 | 创建 .env.local 配置模板 | 15min | 无 |
| T7 | 端到端验证 | 30min | T1-T6 |

---

## T1: 扩展 ChildSettings 类型定义

**文件**: `src/types/models.ts`

**操作**:
1. 在 `ChildSettings` 接口中新增以下字段组：

```typescript
// === ASR 语音识别配置 ===
enableASR: boolean
asrProviderId: string        // 'openai-whisper' | 'qwen-asr' | 'browser-native'
asrApiKey: string
asrBaseUrl: string
asrLanguage: string           // 默认 'auto'

// === ISE 口语评测配置 ===
enableISE: boolean
iseProviderId: string         // 'iflytek-ise' | 'text-match-fallback'
iseAppId: string              // 讯飞 App ID
iseApiKey: string             // 讯飞 API Key
iseApiSecret: string          // 讯飞 API Secret

// === WebSearch 网络搜索配置 ===
enableWebSearch: boolean
webSearchProviderId: string   // 'tavily'
webSearchApiKey: string       // Tavily API Key

// === PDF 文档解析配置 ===
enablePDF: boolean
pdfProviderId: string         // 'unpdf' | 'mineru'
pdfApiKey: string
pdfBaseUrl: string
```

2. 在 `DEFAULT_ADVANCED_SETTINGS` 中新增对应默认值：

```typescript
enableASR: true,
asrProviderId: 'openai-whisper',
asrApiKey: '',
asrBaseUrl: '',
asrLanguage: 'auto',

enableISE: false,
iseProviderId: 'text-match',
iseAppId: '',
iseApiKey: '',
iseApiSecret: '',

enableWebSearch: false,
webSearchProviderId: 'tavily',
webSearchApiKey: '',

enablePDF: false,
pdfProviderId: 'unpdf',
pdfApiKey: '',
pdfBaseUrl: '',
```

3. 更新 `DEFAULT_ADVANCED_SETTINGS` 的 Pick 类型参数，加入新字段名。

**验证**: TypeScript 编译通过，无类型错误。

---

## T2: 补全 Settings Sync 桥接层

**文件**: `src/stores/openmaic/settings-sync.ts`

**操作**:
1. 导入 ASR 相关类型：
```typescript
import type { ASRProviderId } from '@/lib/openmaic/audio/types'
```

2. 新增 `mapChildASRProviderId()` 映射函数（参考已有的 `mapChildTTSProviderId`）：
```typescript
function mapChildASRProviderId(providerId: string): ASRProviderId | null {
  switch (providerId) {
    case 'openai-whisper': return 'openai-whisper'
    case 'qwen-asr': return 'qwen-asr'
    case 'browser-native': return 'browser-native'
    default: return null
  }
}
```

3. 在 `syncSettingsToOpenMAIC()` 函数末尾（`log.info('设置同步完成')` 之前）追加：

**ASR 同步**:
```typescript
// === ASR 配置 ===
const mappedASRProviderId = settings.asrProviderId
  ? mapChildASRProviderId(settings.asrProviderId)
  : null
if (mappedASRProviderId) {
  try { store.setASRProvider(mappedASRProviderId) } catch (err) { log.warn('ASR provider 设置失败:', err) }
}
if (mappedASRProviderId && settings.asrApiKey) {
  try {
    store.setASRProviderConfig(mappedASRProviderId, {
      apiKey: settings.asrApiKey,
      ...(settings.asrBaseUrl ? { baseUrl: settings.asrBaseUrl } : {}),
    })
  } catch (err) { log.warn('ASR provider config 设置失败:', err) }
}
if (settings.asrLanguage) {
  try { store.setASRLanguage(settings.asrLanguage) } catch (err) { log.warn('ASR language 设置失败:', err) }
}
```

**WebSearch 同步**:
```typescript
// === WebSearch 配置 ===
if (settings.webSearchApiKey) {
  try {
    store.setWebSearchProviderConfig('tavily' as never, {
      apiKey: settings.webSearchApiKey,
      enabled: true,
    })
  } catch (err) { log.warn('WebSearch provider config 设置失败:', err) }
}
```

**PDF 同步**:
```typescript
// === PDF 配置 ===
if (settings.pdfProviderId) {
  try { store.setPDFProvider(settings.pdfProviderId as never) } catch (err) { log.warn('PDF provider 设置失败:', err) }
  if (settings.pdfApiKey || settings.pdfBaseUrl) {
    try {
      store.setPDFProviderConfig(settings.pdfProviderId as never, {
        ...(settings.pdfApiKey ? { apiKey: settings.pdfApiKey } : {}),
        ...(settings.pdfBaseUrl ? { baseUrl: settings.pdfBaseUrl } : {}),
      })
    } catch (err) { log.warn('PDF provider config 设置失败:', err) }
  }
}
```

**注意**: 需要先确认 OpenMAIC Settings Store（`src/lib/openmaic/store/settings.ts`）中存在以下 action：
- `setASRProvider`, `setASRProviderConfig`, `setASRLanguage`
- `setWebSearchProviderConfig`
- `setPDFProvider`, `setPDFProviderConfig`

如果不存在，需要在 Store 中添加。

**验证**: `syncSettingsToOpenMAIC()` 调用后，OpenMAIC Settings Store 中所有 8 类配置都被正确设置。

---

## T3: 迁移 ISE 配置读取源

**文件**: `src/services/config.ts`, `src/services/voice/pronunciation/iflytek-ise-provider.ts`

**操作**:
1. 在 `src/services/config.ts` 中：
   - 修改 `getISEConfig()` 函数，新增可选参数 `settings?: ChildSettings`
   - 优先从 `settings` 参数读取 ISE 配置
   - 如果无参数，回退到 localStorage（兼容过渡期）

```typescript
export function getISEConfig(settings?: ChildSettings): ISEConfig {
  if (settings?.iseProviderId) {
    return {
      providerId: settings.iseProviderId,
      appId: settings.iseAppId || '',
      apiKey: settings.iseApiKey || '',
      apiSecret: settings.iseApiSecret || '',
    }
  }
  // Fallback: localStorage (deprecated, will be removed)
  const raw = localStorage.getItem('ise-config')
  // ... existing fallback logic
}
```

2. 在 `iflytek-ise-provider.ts` 中：
   - 调用处传入当前孩子的 ChildSettings
   - 确保 `appId`、`apiKey`、`apiSecret` 从 ChildSettings 读取

**验证**: 讯飞口语评测能正常连接和评分。

---

## T4: SettingsDialog 保存/加载补全

**文件**: `src/components/settings/SettingsDialog.tsx` 及相关组件

**操作**:
1. **加载时**（SettingsDialog 打开时）：
   - 从当前孩子的 ChildSettings 中读取全部 8 类 AI 配置
   - 调用 `syncSettingsToOpenMAIC(childSettings)` 确保 OpenMAIC Store 与数据库一致
   - OpenMAIC Settings 组件从 Store 自动读取并显示

2. **保存时**（SettingsDialog 确认/关闭时）：
   - 从 OpenMAIC Settings Store 中提取全部 8 类配置
   - 映射为 ChildSettings 字段格式
   - 调用 `updateChildSettings(childId, mappedSettings)` 写入数据库
   - 具体映射逻辑：

```typescript
function extractSettingsFromStore(): Partial<ChildSettings> {
  const store = useSettingsStore.getState()
  return {
    // LLM（已有）
    llmProviderId: store.providerId,
    llmModel: `${store.providerId}:${store.modelId}`,
    llmApiKey: store.providersConfig?.[store.providerId]?.apiKey || '',
    llmBaseUrl: store.providersConfig?.[store.providerId]?.baseUrl || '',
    // TTS（已有）
    enableTTS: store.ttsEnabled,
    ttsProviderId: unmapTTSProviderId(store.ttsProviderId),
    ttsApiKey: store.ttsProvidersConfig?.[store.ttsProviderId]?.apiKey || '',
    ttsVoice: store.ttsVoice,
    ttsSpeed: store.ttsSpeed,
    // Image（已有）
    enableImageGeneration: store.imageGenerationEnabled,
    imageProviderId: store.imageProviderId,
    imageApiKey: store.imageProvidersConfig?.[store.imageProviderId]?.apiKey || '',
    imageBaseUrl: store.imageProvidersConfig?.[store.imageProviderId]?.baseUrl || '',
    // Video（已有）
    enableVideoGeneration: store.videoGenerationEnabled,
    videoProviderId: store.videoProviderId,
    videoApiKey: store.videoProvidersConfig?.[store.videoProviderId]?.apiKey || '',
    videoBaseUrl: store.videoProvidersConfig?.[store.videoProviderId]?.baseUrl || '',
    // ASR（新增）
    enableASR: true,
    asrProviderId: store.asrProviderId,
    asrApiKey: store.asrProvidersConfig?.[store.asrProviderId]?.apiKey || '',
    asrBaseUrl: store.asrProvidersConfig?.[store.asrProviderId]?.baseUrl || '',
    asrLanguage: store.asrLanguage || 'auto',
    // ISE（新增）— 从 ISE 设置面板读取
    enableISE: !!store.iseProvidersConfig,
    iseProviderId: store.iseProviderId || 'text-match',
    iseAppId: store.iseProvidersConfig?.[store.iseProviderId]?.appId || '',
    iseApiKey: store.iseProvidersConfig?.[store.iseProviderId]?.apiKey || '',
    iseApiSecret: store.iseProvidersConfig?.[store.iseProviderId]?.apiSecret || '',
    // WebSearch（新增）
    enableWebSearch: !!store.webSearchProvidersConfig?.tavily?.apiKey,
    webSearchProviderId: store.webSearchProviderId || 'tavily',
    webSearchApiKey: store.webSearchProvidersConfig?.[store.webSearchProviderId]?.apiKey || '',
    // PDF（新增）
    enablePDF: !!store.pdfProvidersConfig,
    pdfProviderId: store.pdfProviderId || 'unpdf',
    pdfApiKey: store.pdfProvidersConfig?.[store.pdfProviderId]?.apiKey || '',
    pdfBaseUrl: store.pdfProvidersConfig?.[store.pdfProviderId]?.baseUrl || '',
  }
}
```

3. **反向映射函数**：添加 `unmapTTSProviderId()` 将 OpenMAIC 的 TTSProviderId 映射回 ChildSettings 的 ttsProviderId。

**验证**: 在 SettingsDialog 中修改任意 AI 服务配置，关闭后重新打开，配置仍在。刷新页面后配置仍在。

---

## T5: Pipeline 配置传递验证与补全

**文件**: `src/services/openmaic/pipeline-client.ts`, `src/server/services/pipeline-executor.ts`

**操作**:
1. **审计 Pipeline Client**：
   - 确认 `generateOutlines()` 传递 LLM Headers ✓
   - 确认 `generateSceneContent()` 传递 LLM Headers ✓
   - 确认 `generateSceneActions()` 传递 LLM Headers ✓
   - 确认 Image/Video 生成调用传递正确的 Headers ✓
   - 确认 TTS 生成调用从 Settings Store 传递 JSON body ✓

2. **检查 ASR 调用路径**：
   - LittleStar 中 ASR 可能不直接通过 Pipeline Client 调用（它由 `use-audio-recorder` 在课堂中直接调用 `/api/transcription`）
   - 确认 settings-sync 后 OpenMAIC 的 `use-audio-recorder` 能从 Store 读到正确的 ASR 配置

3. **检查 WebSearch 调用路径**：
   - LittleStar 的 Pipeline 中不直接调用 WebSearch（这是 OpenMAIC generation-preview 页面的功能）
   - 如果 LittleStar 需要 WebSearch 功能，在 Pipeline Client 中添加：
   ```typescript
   async webSearch(query: string): Promise<WebSearchResult> {
     const wsApiKey = useSettingsStore.getState().webSearchProvidersConfig?.tavily?.apiKey
     // ... 调用 /api/web-search，body 中包含 apiKey
   }
   ```

4. **检查 PDF 调用路径**：
   - LittleStar 的 Pipeline 是否需要 PDF 解析？如果只在 OpenMAIC 的 generation-preview 中使用，则无需修改
   - 如果 LittleStar 需要，确保 FormData 中包含 ChildSettings 的 PDF 配置

5. **后端 Pipeline Executor**：
   - 确认 `src/server/services/pipeline-executor.ts` 在调用 OpenMAIC 时传递了所有必要的 Headers
   - 特别检查 `buildHeaders()` 方法

**验证**: 生成课程内容时，LLM/TTS/Image/Video 正常工作。ASR 在课堂中能正常识别语音。

---

## T6: 创建 .env.local 配置模板

**文件**: `docker/openmaic/.env.local.example`

**操作**:
创建完整的环境变量配置模板，列出 OpenMAIC 支持的所有 Provider 配置：

```bash
# ==================================
# OpenMAIC Server Provider Config
# ==================================
# 这些环境变量作为「服务端回退」：
# 当客户端（ChildSettings）未配置 API Key 时，
# OpenMAIC 会使用这里的值作为兜底。

# ===== LLM Providers =====
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=
# ANTHROPIC_API_KEY=sk-xxx
# GOOGLE_API_KEY=
# DEEPSEEK_API_KEY=sk-xxx
# QWEN_API_KEY=sk-xxx
# KIMI_API_KEY=
# MINIMAX_API_KEY=
# GLM_API_KEY=
# SILICONFLOW_API_KEY=
# DOUBAO_API_KEY=
# GROK_API_KEY=
# OLLAMA_BASE_URL=http://host.docker.internal:11434

# DEFAULT_MODEL=qwen/qwen-plus

# ===== TTS Providers =====
# TTS_OPENAI_API_KEY=sk-xxx
# TTS_AZURE_API_KEY=
# TTS_GLM_API_KEY=
# TTS_QWEN_API_KEY=
# TTS_MINIMAX_API_KEY=
# TTS_DOUBAO_API_KEY=appId:accessKey
# TTS_ELEVENLABS_API_KEY=

# ===== ASR Providers =====
# ASR_OPENAI_API_KEY=sk-xxx
# ASR_QWEN_API_KEY=

# ===== Image Providers =====
# IMAGE_SEEDREAM_API_KEY=xxx
# IMAGE_QWEN_IMAGE_API_KEY=
# IMAGE_NANO_BANANA_API_KEY=
# IMAGE_MINIMAX_API_KEY=
# IMAGE_GROK_API_KEY=

# ===== Video Providers =====
# VIDEO_SEEDANCE_API_KEY=xxx
# VIDEO_KLING_API_KEY=
# VIDEO_VEO_API_KEY=
# VIDEO_SORA_API_KEY=
# VIDEO_MINIMAX_API_KEY=
# VIDEO_GROK_API_KEY=

# ===== WebSearch (Tavily) =====
# TAVILY_API_KEY=tvly-xxx

# ===== PDF Providers =====
# PDF_UNPDF_BASE_URL=
# PDF_MINERU_BASE_URL=http://your-mineru-server:8080

# ===== Proxy =====
# HTTP_PROXY=
# HTTPS_PROXY=
# ALLOW_LOCAL_NETWORKS=true
```

**验证**: 文件格式正确，注释清晰。

---

## T7: 端到端验证

**操作**:
1. **配置持久化测试**：
   - 登录 → 选择孩子 → 打开 AI 服务设置 → 配置 LLM + TTS + Image Provider 和 API Key
   - 关闭设置 → 检查数据库 `api.children.settings` JSONB 是否包含配置
   - 刷新页面 → 重新打开 AI 服务设置 → 配置是否恢复

2. **孩子隔离测试**：
   - 孩子 A 配置 Provider X → 切换到孩子 B 配置 Provider Y
   - 切回孩子 A → 确认仍为 Provider X

3. **课程生成测试**：
   - 确保配置了 LLM API Key（如 Qwen）
   - 进入课堂 → 开始生成课程
   - 验证 LLM 调用成功（课程内容生成）
   - 验证 TTS 调用成功（语音合成）
   - 验证 Image 调用成功（图片生成，如果配置了 Image Provider）

4. **新增服务测试**：
   - 配置 ASR → 在课堂中测试语音识别
   - 配置 ISE（讯飞）→ 测试口语评测
   - 配置 WebSearch（Tavily）→ 如果有入口，测试网络搜索

5. **兜底回退测试**：
   - 不配置客户端 Key → 在 `.env.local` 中配置 → 验证 OpenMAIC 使用服务端 Key

**验证**: 所有 AI 服务正常工作，配置持久化可靠，孩子隔离正确。
