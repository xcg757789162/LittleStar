/**
 * 统一配置读取模块
 *
 * 优先级：localStorage（家长在高级设置中配置的）> .env 环境变量 > 默认值
 * 所有 API Key 都可以在家长仪表盘 → 高级配置中查看和修改。
 */

// ===== localStorage 键名（与 ParentDashboard 中的 CONFIG_KEYS 保持一致） =====

function getLS(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

// ============================================================
// AI 对话（通义千问）
// ============================================================

export function getQwenConfig() {
  return {
    apiKey: getLS('littlestar_qwen_api_key') || import.meta.env.VITE_QWEN_API_KEY || '',
    baseUrl: getLS('littlestar_qwen_base_url') || import.meta.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: getLS('littlestar_qwen_model') || import.meta.env.VITE_QWEN_MODEL || 'qwen-turbo',
  }
}

// ============================================================
// TTS 语音合成（CosyVoice）
// ============================================================

export function getCosyVoiceConfig() {
  return {
    apiKey: getLS('littlestar_cosyvoice_api_key') || import.meta.env.VITE_COSYVOICE_API_KEY || '',
    baseUrl: getLS('littlestar_cosyvoice_base_url') || import.meta.env.VITE_COSYVOICE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  }
}

// ============================================================
// STT 语音识别（Paraformer）
// ============================================================

export function getParaformerConfig() {
  return {
    apiKey: getLS('littlestar_paraformer_api_key') || import.meta.env.VITE_PARAFORMER_API_KEY || '',
    baseUrl: getLS('littlestar_paraformer_base_url') || import.meta.env.VITE_PARAFORMER_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  }
}

// ============================================================
// 讯飞口语评测（ISE）
// ============================================================

export function getIflytekConfig() {
  return {
    appId: getLS('littlestar_iflytek_app_id') || '',
    apiKey: getLS('littlestar_iflytek_api_key') || '',
    apiSecret: getLS('littlestar_iflytek_api_secret') || '',
  }
}

// ============================================================
// 后端 OpenMAIC LLM
// ============================================================

export function getBackendLlmConfig() {
  return {
    apiKey: getLS('littlestar_backend_llm_api_key') || '',
    baseUrl: getLS('littlestar_backend_llm_base_url') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: getLS('littlestar_backend_llm_model') || 'openai:qwen-plus',
  }
}

// ============================================================
// 后端 TTS（MiniMax）
// ============================================================

export function getBackendTtsConfig() {
  return {
    apiKey: getLS('littlestar_backend_tts_api_key') || '',
  }
}

// ============================================================
// 后端图片生成
// ============================================================

export function getBackendImageConfig() {
  return {
    apiKey: getLS('littlestar_backend_image_api_key') || '',
    baseUrl: getLS('littlestar_backend_image_base_url') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  }
}

// ============================================================
// OpenMAIC 服务
// ============================================================

export function getOpenMAICConfig() {
  return {
    url: getLS('littlestar_openmaic_url') || 'http://localhost:3000',
    apiKey: getLS('littlestar_openmaic_api_key') || '',
  }
}
