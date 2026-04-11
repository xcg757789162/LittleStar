/**
 * 统一配置读取模块（前端直接消费的 AI 服务配置）
 *
 * 设计理念：功能 ≠ 提供商
 *   每个功能类型（LLM、TTS、STT、ISE）可自由切换提供商，
 *   配置按「功能类型 + 当前选中的 provider」动态读取。
 *
 * 优先级：localStorage（家长在高级设置中配置的）> .env 环境变量 > 默认值
 *
 * 后端 OpenMAIC 的 LLM / TTS / 图片生成配置**不在此处管理**：
 *   - 出厂默认值 → docker/.env.local（OPENAI_API_KEY / TTS_MINIMAX_API_KEY 等）
 *   - 家长覆盖值 → ChildSettings（llmModel / llmApiKey / llmBaseUrl）
 *                → headers-builder.ts 构建 HTTP Headers → Pipeline Client 传给 OpenMAIC
 */

// ===== 工具函数 =====

function getLS(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

// ===== 功能类型 =====

export type ServiceType = 'llm' | 'tts' | 'stt' | 'ise'

// ===== 提供商注册表 =====

/** 提供商定义 */
export interface ProviderDefinition {
  /** 提供商 ID（唯一标识，写入 localStorage） */
  id: string
  /** 显示名称 */
  label: string
  /** 所属功能类型 */
  serviceType: ServiceType
  /** 该提供商需要配置的字段 */
  fields: ProviderField[]
  /** 默认值（字段名 → 默认值映射） */
  defaults: Record<string, string>
  /** .env 环境变量映射（字段名 → env 变量名） */
  envKeys?: Record<string, string>
}

/** 提供商字段定义 */
export interface ProviderField {
  /** 字段名（如 apiKey, baseUrl, model） */
  name: string
  /** 显示标签 */
  label: string
  /** 输入类型 */
  type: 'text' | 'password'
  /** placeholder */
  placeholder?: string
  /** 说明文字 */
  description?: string
}

/**
 * 全局提供商注册表
 * 扩展新提供商只需在此添加条目，无需改动其他代码
 */
export const PROVIDER_REGISTRY: ProviderDefinition[] = [
  // ============================================================
  // LLM 对话（AI 老师）
  // ============================================================
  {
    id: 'qwen',
    label: '通义千问（Qwen）',
    serviceType: 'llm',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入阿里云 DashScope API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      { name: 'model', label: '模型', type: 'text', placeholder: 'qwen-turbo' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
    envKeys: { apiKey: 'VITE_QWEN_API_KEY', baseUrl: 'VITE_QWEN_BASE_URL', model: 'VITE_QWEN_MODEL' },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    serviceType: 'llm',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 OpenAI API Key（sk-...）' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
      { name: 'model', label: '模型', type: 'text', placeholder: 'gpt-4o-mini' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    serviceType: 'llm',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 DeepSeek API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.deepseek.com/v1' },
      { name: 'model', label: '模型', type: 'text', placeholder: 'deepseek-chat' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  },
  {
    id: 'custom-llm',
    label: '自定义（OpenAI 兼容）',
    serviceType: 'llm',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://your-api.example.com/v1' },
      { name: 'model', label: '模型', type: 'text', placeholder: '模型名称' },
    ],
    defaults: { apiKey: '', baseUrl: '', model: '' },
  },

  // ============================================================
  // TTS 语音合成
  // ============================================================
  {
    id: 'cosyvoice',
    label: 'CosyVoice（阿里云）',
    serviceType: 'tts',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入阿里云 DashScope API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://dashscope.aliyuncs.com/api/v1' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
    envKeys: { apiKey: 'VITE_COSYVOICE_API_KEY', baseUrl: 'VITE_COSYVOICE_BASE_URL' },
  },
  {
    id: 'openai-tts',
    label: 'OpenAI TTS',
    serviceType: 'tts',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 OpenAI API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
      { name: 'model', label: '模型', type: 'text', placeholder: 'tts-1' },
      { name: 'voice', label: '音色', type: 'text', placeholder: 'nova', description: '可选: alloy, echo, fable, onyx, nova, shimmer' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'tts-1', voice: 'nova' },
  },
  {
    id: 'webspeech-tts',
    label: '浏览器内置 TTS（免费）',
    serviceType: 'tts',
    fields: [],
    defaults: {},
  },

  // ============================================================
  // STT 语音识别
  // ============================================================
  {
    id: 'paraformer',
    label: 'Paraformer（阿里云）',
    serviceType: 'stt',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入阿里云 DashScope API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://dashscope.aliyuncs.com/api/v1' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
    envKeys: { apiKey: 'VITE_PARAFORMER_API_KEY', baseUrl: 'VITE_PARAFORMER_BASE_URL' },
  },
  {
    id: 'openai-whisper',
    label: 'OpenAI Whisper',
    serviceType: 'stt',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 OpenAI API Key' },
      { name: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
    ],
    defaults: { apiKey: '', baseUrl: 'https://api.openai.com/v1' },
  },

  // ============================================================
  // 发音评测（ISE）
  // ============================================================
  {
    id: 'iflytek-ise',
    label: '讯飞口语评测（ISE）',
    serviceType: 'ise',
    fields: [
      { name: 'appId', label: 'App ID', type: 'text', placeholder: '输入讯飞开放平台 App ID' },
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入讯飞 API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', placeholder: '输入讯飞 API Secret' },
    ],
    defaults: { appId: '', apiKey: '', apiSecret: '' },
  },
  {
    id: 'text-match-fallback',
    label: '文本匹配降级（免费）',
    serviceType: 'ise',
    fields: [],
    defaults: {},
  },
]

// ===== 提供商查询工具 =====

/** 获取某功能类型下的所有可选提供商 */
export function getProvidersForService(serviceType: ServiceType): ProviderDefinition[] {
  return PROVIDER_REGISTRY.filter(p => p.serviceType === serviceType)
}

/** 根据 ID 获取提供商定义 */
export function getProviderById(id: string): ProviderDefinition | undefined {
  return PROVIDER_REGISTRY.find(p => p.id === id)
}

// ===== 功能类型元信息 =====

export interface ServiceTypeInfo {
  type: ServiceType
  label: string
  emoji: string
  description: string
  defaultProviderId: string
}

export const SERVICE_TYPES: ServiceTypeInfo[] = [
  { type: 'llm', label: 'AI 对话', emoji: '🤖', description: '用于 AI 老师对话补全', defaultProviderId: 'qwen' },
  { type: 'tts', label: '语音合成', emoji: '🔊', description: '用于 AI 老师语音播报', defaultProviderId: 'cosyvoice' },
  { type: 'stt', label: '语音识别', emoji: '🎤', description: '用于识别幼儿语音回答', defaultProviderId: 'paraformer' },
  { type: 'ise', label: '发音评测', emoji: '📝', description: '用于评估幼儿英语发音', defaultProviderId: 'iflytek-ise' },
]

// ===== localStorage 键名规则 =====

/** 获取「某功能当前选中的 provider」的 localStorage 键 */
function providerSelectKey(serviceType: ServiceType): string {
  return `littlestar_${serviceType}_provider`
}

/** 获取「某 provider 的某字段值」的 localStorage 键 */
function providerFieldKey(providerId: string, fieldName: string): string {
  return `littlestar_provider_${providerId}_${fieldName}`
}

// ===== 选中 provider 的读写 =====

/** 获取某功能当前选中的 provider ID */
export function getSelectedProviderId(serviceType: ServiceType): string {
  const stored = getLS(providerSelectKey(serviceType))
  if (stored) return stored
  const info = SERVICE_TYPES.find(s => s.type === serviceType)
  return info?.defaultProviderId ?? ''
}

/** 设置某功能选中的 provider ID */
export function setSelectedProviderId(serviceType: ServiceType, providerId: string): void {
  try { localStorage.setItem(providerSelectKey(serviceType), providerId) } catch { /* ignore */ }
}

// ===== 通用配置读写 =====

/** 读取某 provider 的某字段配置值 */
export function getProviderFieldValue(providerId: string, fieldName: string): string {
  const provider = getProviderById(providerId)
  if (!provider) return ''

  // 1. localStorage
  const lsVal = getLS(providerFieldKey(providerId, fieldName))
  if (lsVal) return lsVal

  // 2. .env 环境变量
  if (provider.envKeys?.[fieldName]) {
    const envVal = (import.meta.env[provider.envKeys[fieldName]] as string | undefined) ?? ''
    if (envVal) return envVal
  }

  // 3. 默认值
  return provider.defaults[fieldName] ?? ''
}

/** 写入某 provider 的某字段配置值 */
export function setProviderFieldValue(providerId: string, fieldName: string, value: string): void {
  try { localStorage.setItem(providerFieldKey(providerId, fieldName), value) } catch { /* ignore */ }
}

/** 读取某 provider 的所有字段配置（返回 Record<fieldName, value>） */
export function getProviderConfig(providerId: string): Record<string, string> {
  const provider = getProviderById(providerId)
  if (!provider) return {}
  const result: Record<string, string> = {}
  for (const field of provider.fields) {
    result[field.name] = getProviderFieldValue(providerId, field.name)
  }
  return result
}

/** 写入某 provider 的所有字段配置 */
export function setProviderConfig(providerId: string, values: Record<string, string>): void {
  const provider = getProviderById(providerId)
  if (!provider) return
  for (const field of provider.fields) {
    if (field.name in values) {
      setProviderFieldValue(providerId, field.name, values[field.name])
    }
  }
}

// ===== 向后兼容的便捷函数 =====
// 旧代码通过 getQwenConfig() / getCosyVoiceConfig() 等读取，
// 现在改为：根据当前选中的 provider 读取对应配置

/**
 * 获取当前选中的 LLM 配置（兼容旧 getQwenConfig）
 * 返回统一格式：{ providerId, apiKey, baseUrl, model }
 */
export function getLLMConfig() {
  const providerId = getSelectedProviderId('llm')
  const cfg = getProviderConfig(providerId)
  return {
    providerId,
    apiKey: cfg.apiKey ?? '',
    baseUrl: cfg.baseUrl ?? '',
    model: cfg.model ?? '',
  }
}

// 向后兼容别名
export const getQwenConfig = getLLMConfig

/**
 * 获取当前选中的 TTS 配置（兼容旧 getCosyVoiceConfig）
 * 返回统一格式：{ providerId, apiKey, baseUrl, model?, voice? }
 */
export function getTTSConfig() {
  const providerId = getSelectedProviderId('tts')
  const cfg = getProviderConfig(providerId)
  return {
    providerId,
    apiKey: cfg.apiKey ?? '',
    baseUrl: cfg.baseUrl ?? '',
    model: cfg.model,
    voice: cfg.voice,
  }
}

// 向后兼容别名
export const getCosyVoiceConfig = getTTSConfig

/**
 * 获取当前选中的 STT 配置（兼容旧 getParaformerConfig）
 */
export function getSTTConfig() {
  const providerId = getSelectedProviderId('stt')
  const cfg = getProviderConfig(providerId)
  return {
    providerId,
    apiKey: cfg.apiKey ?? '',
    baseUrl: cfg.baseUrl ?? '',
  }
}

// 向后兼容别名
export const getParaformerConfig = getSTTConfig

/**
 * 获取当前选中的 ISE 配置（兼容旧 getIflytekConfig）
 */
export function getISEConfig() {
  const providerId = getSelectedProviderId('ise')
  const cfg = getProviderConfig(providerId)
  return {
    providerId,
    appId: cfg.appId ?? '',
    apiKey: cfg.apiKey ?? '',
    apiSecret: cfg.apiSecret ?? '',
  }
}

// 向后兼容别名
export const getIflytekConfig = getISEConfig

// ============================================================
// OpenMAIC 服务（不属于 provider 可切换体系，保持独立）
// ============================================================

export function getOpenMAICConfig() {
  return {
    url: getLS('littlestar_openmaic_url') || '/openmaic',
    apiKey: getLS('littlestar_openmaic_api_key') || '',
  }
}

// ============================================================
// 后端 OpenMAIC 课堂提供商选择器
// ============================================================
// 这些提供商用于 OpenMAIC 后端（通过 HTTP Headers 传递），
// 与上面的「前端 AI 服务」提供商体系（config.ts PROVIDER_REGISTRY）是分离的。
// 前端用 PROVIDER_REGISTRY，后端用以下注册表。

/** 后端提供商定义（简化版，仅需 id/label/modelFormat/fields） */
export interface BackendProviderDef {
  id: string
  label: string
  /** OpenMAIC 格式的 provider:model 前缀（如 'openai:' → 'openai:gpt-4o'） */
  providerPrefix: string
  /** 推荐的默认模型名称 */
  defaultModel: string
  /** 默认 Base URL（为空时使用 OpenMAIC 内置默认） */
  defaultBaseUrl: string
  /** 说明文字 */
  description?: string
}

/** 后端 LLM 提供商 */
export const BACKEND_LLM_PROVIDERS: BackendProviderDef[] = [
  {
    id: 'backend-qwen',
    label: '通义千问（Qwen）',
    providerPrefix: 'openai',
    defaultModel: 'qwen-plus',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: '阿里云 DashScope，通过 OpenAI 兼容接口调用',
  },
  {
    id: 'backend-openai',
    label: 'OpenAI',
    providerPrefix: 'openai',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'backend-deepseek',
    label: 'DeepSeek',
    providerPrefix: 'openai',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'backend-gemini',
    label: 'Google Gemini',
    providerPrefix: 'google',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: '',
    description: 'Google AI Studio，需填写 Google API Key',
  },
  {
    id: 'backend-doubao',
    label: '豆包（字节跳动）',
    providerPrefix: 'openai',
    defaultModel: 'doubao-pro-32k',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    description: '火山方舟 API，需使用 OpenAI 兼容格式',
  },
  {
    id: 'backend-custom',
    label: '自定义',
    providerPrefix: '',
    defaultModel: '',
    defaultBaseUrl: '',
    description: '手动输入 provider:model 格式的模型标识',
  },
]

/** 后端 TTS 提供商 */
export interface BackendTTSProviderDef {
  id: string
  label: string
  /** 传给 x-tts-provider 的值 */
  ttsProviderId: string
  /** 推荐的默认语音 */
  defaultVoice: string
  /** 是否需要独立 API Key */
  needsApiKey: boolean
  /** 说明文字 */
  description?: string
}

export const BACKEND_TTS_PROVIDERS: BackendTTSProviderDef[] = [
  {
    id: 'backend-tts-minimax',
    label: 'MiniMax TTS',
    ttsProviderId: 'minimax',
    defaultVoice: 'female-tianmei',
    needsApiKey: true,
    description: 'MiniMax 语音合成，支持多种音色',
  },
  {
    id: 'backend-tts-openai',
    label: 'OpenAI TTS',
    ttsProviderId: 'openai',
    defaultVoice: 'nova',
    needsApiKey: true,
    description: 'OpenAI Text-to-Speech，支持 alloy/echo/nova 等',
  },
  {
    id: 'backend-tts-default',
    label: '使用后端默认',
    ttsProviderId: '',
    defaultVoice: '',
    needsApiKey: false,
    description: '不覆盖后端配置，使用 docker .env.local 中的默认值',
  },
]

/** 后端图片生成提供商 */
export interface BackendImageProviderDef {
  id: string
  label: string
  /** 传给 x-image-provider 的值 */
  imageProviderId: string
  /** 是否需要独立 API Key */
  needsApiKey: boolean
  /** 默认 Base URL */
  defaultBaseUrl: string
  /** 说明文字 */
  description?: string
}

export const BACKEND_IMAGE_PROVIDERS: BackendImageProviderDef[] = [
  {
    id: 'backend-img-qwen',
    label: '通义万象（阿里云）',
    imageProviderId: 'qwen-image',
    needsApiKey: true,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: '阿里云通义万象图片生成',
  },
  {
    id: 'backend-img-minimax',
    label: 'MiniMax 图片生成',
    imageProviderId: 'minimax',
    needsApiKey: true,
    defaultBaseUrl: '',
    description: 'MiniMax 图片生成 API',
  },
  {
    id: 'backend-img-default',
    label: '使用后端默认',
    imageProviderId: '',
    needsApiKey: false,
    defaultBaseUrl: '',
    description: '不覆盖后端配置，使用 docker .env.local 中的默认值',
  },
]

/** 后端视频生成提供商 */
export interface BackendVideoProviderDef {
  id: string
  label: string
  /** 传给 x-video-provider 的值 */
  videoProviderId: string
  /** 是否需要独立 API Key */
  needsApiKey: boolean
  /** 默认 Base URL */
  defaultBaseUrl: string
  /** 说明文字 */
  description?: string
}

export const BACKEND_VIDEO_PROVIDERS: BackendVideoProviderDef[] = [
  {
    id: 'backend-vid-seedance',
    label: 'Seedance（字节跳动）',
    videoProviderId: 'seedance',
    needsApiKey: true,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com',
    description: '字节跳动 Seedance 视频生成，支持 1.5 Pro / 1.0 Pro 等多模型',
  },
  {
    id: 'backend-vid-kling',
    label: 'Kling（快手）',
    videoProviderId: 'kling',
    needsApiKey: true,
    defaultBaseUrl: 'https://api-beijing.klingai.com',
    description: '快手可灵视频生成 API',
  },
  {
    id: 'backend-vid-minimax',
    label: 'MiniMax Video（海螺）',
    videoProviderId: 'minimax-video',
    needsApiKey: true,
    defaultBaseUrl: '',
    description: 'MiniMax 海螺视频生成 API',
  },
  {
    id: 'backend-vid-default',
    label: '使用后端默认',
    videoProviderId: '',
    needsApiKey: false,
    defaultBaseUrl: '',
    description: '不覆盖后端配置，使用 docker .env.local 中的默认值',
  },
]

// ===== 旧数据迁移（首次运行时自动执行） =====

/**
 * 将旧版 localStorage 键迁移到新版 provider 键
 * 只在旧键存在且新键不存在时执行（幂等）
 */
export function migrateOldConfig(): void {
  const migrations: Array<{ oldKey: string; providerId: string; fieldName: string }> = [
    // LLM
    { oldKey: 'littlestar_qwen_api_key', providerId: 'qwen', fieldName: 'apiKey' },
    { oldKey: 'littlestar_qwen_base_url', providerId: 'qwen', fieldName: 'baseUrl' },
    { oldKey: 'littlestar_qwen_model', providerId: 'qwen', fieldName: 'model' },
    // TTS
    { oldKey: 'littlestar_cosyvoice_api_key', providerId: 'cosyvoice', fieldName: 'apiKey' },
    { oldKey: 'littlestar_cosyvoice_base_url', providerId: 'cosyvoice', fieldName: 'baseUrl' },
    // STT
    { oldKey: 'littlestar_paraformer_api_key', providerId: 'paraformer', fieldName: 'apiKey' },
    { oldKey: 'littlestar_paraformer_base_url', providerId: 'paraformer', fieldName: 'baseUrl' },
    // ISE
    { oldKey: 'littlestar_iflytek_app_id', providerId: 'iflytek-ise', fieldName: 'appId' },
    { oldKey: 'littlestar_iflytek_api_key', providerId: 'iflytek-ise', fieldName: 'apiKey' },
    { oldKey: 'littlestar_iflytek_api_secret', providerId: 'iflytek-ise', fieldName: 'apiSecret' },
  ]

  for (const { oldKey, providerId, fieldName } of migrations) {
    const oldVal = getLS(oldKey)
    if (oldVal) {
      const newKey = providerFieldKey(providerId, fieldName)
      const newVal = getLS(newKey)
      if (!newVal) {
        try { localStorage.setItem(newKey, oldVal) } catch { /* ignore */ }
      }
    }
  }
}
