/**
 * Settings Sync — 同步 LittleStar ChildSettings → OpenMAIC Settings Store
 *
 * LittleStar 的设置按孩子隔离（ChildSettings），存储在 PostgreSQL 中。
 * OpenMAIC 的 Settings Store 是全局单例，持久化在 localStorage。
 *
 * 在以下时机调用 syncSettingsToOpenMAIC：
 * 1. 进入课堂前（NativeClassroom 页面加载时）
 * 2. 家长切换孩子后
 * 3. 家长修改高级设置后
 *
 * 这样 OpenMAIC 的组件（Chat/Roundtable/TTS/ASR/ImageGen 等）
 * 可以直接从自己的 Settings Store 读取配置，无需了解 LittleStar 的 ChildSettings。
 *
 * 注意：方法名必须与 OpenMAIC Settings Store 中的实际 action 名称完全匹配：
 *   - setModel(providerId, modelId)  — 不是 setProviderId/setModelId
 *   - setTTSProvider(id)             — 不是 setTTSProviderId
 *   - setImageProvider(id)           — 不是 setImageProviderId
 *   - setImageGenerationEnabled(bool)
 *   - setTTSEnabled(bool)
 */

import type { ChildSettings } from '@/types/models'
import type { TTSProviderId, ASRProviderId } from '@/lib/openmaic/audio/types'
import type { PDFProviderId } from '@/lib/openmaic/pdf/types'
import type { WebSearchProviderId } from '@/lib/openmaic/web-search/types'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { createLogger } from '@/lib/openmaic/logger'

function mapChildTTSProviderId(providerId: string): TTSProviderId | null {
  switch (providerId) {
    case 'openai':
      return 'openai-tts'
    case 'minimax':
      return 'minimax-tts'
    case 'doubao':
    case 'volcengine':
      return 'doubao-tts'
    case 'azure':
      return 'azure-tts'
    case 'qwen':
      return 'qwen-tts'
    case 'glm':
      return 'glm-tts'
    case 'elevenlabs':
      return 'elevenlabs-tts'
    case 'browser-native':
    case 'browser-native-tts':
      return 'browser-native-tts'
    default:
      return null
  }
}

function mapChildASRProviderId(providerId: string): ASRProviderId | null {
  switch (providerId) {
    case 'openai-whisper':
      return 'openai-whisper'
    case 'qwen-asr':
      return 'qwen-asr'
    case 'browser-native':
      return 'browser-native'
    default:
      return null
  }
}

const log = createLogger('SettingsSync')

/**
 * 将 LittleStar ChildSettings 同步到 OpenMAIC Settings Store
 *
 * 只同步有实际值的字段，不覆盖用户在 OpenMAIC 面板中设置的其他高级配置。
 */
export function syncSettingsToOpenMAIC(settings: ChildSettings): void {
  const store = useSettingsStore.getState()
  log.info('开始同步设置到 OpenMAIC, llmModel:', settings.llmModel ?? '(未设置)')

  // === LLM 配置 ===
  if (settings.llmModel) {
    // LittleStar 的 llmModel 格式: "provider:model-id" (如 "openai:gpt-4o")
    const [provider, ...modelParts] = settings.llmModel.split(':')
    const modelId = modelParts.join(':')

    if (provider && modelId) {
      try {
        // setModel 同时设置 providerId 和 modelId（Store 中没有单独的 setter）
        store.setModel(provider as never, modelId)
        log.debug('LLM 模型设置成功:', provider, modelId)
      } catch (err) {
        // provider 不在 OpenMAIC 支持列表中
        log.warn('LLM 模型设置失败, provider 不支持:', provider, err)
      }
    }

    // 同步 API Key 和 Base URL 到 provider config
    if (settings.llmApiKey && provider) {
      try {
        store.setProviderConfig(provider as never, {
          apiKey: settings.llmApiKey,
          ...(settings.llmBaseUrl ? { baseUrl: settings.llmBaseUrl } : {}),
        })
        log.debug('Provider config 设置成功:', provider)
      } catch (err) {
        log.warn('Provider config 设置失败:', provider, err)
      }
    }
  }

  // === TTS 配置 ===
  if (settings.enableTTS !== undefined) {
    try {
      store.setTTSEnabled(settings.enableTTS)
    } catch (err) {
      log.warn('TTS 启用设置失败:', err)
    }
  }
  const mappedTTSProviderId = settings.ttsProviderId
    ? mapChildTTSProviderId(settings.ttsProviderId)
    : null

  if (mappedTTSProviderId) {
    try {
      // setTTSProvider — 不是 setTTSProviderId
      store.setTTSProvider(mappedTTSProviderId)
    } catch (err) {
      log.warn('TTS provider 设置失败:', settings.ttsProviderId, err)
    }
  }
  if (settings.ttsVoice) {
    try {
      store.setTTSVoice(settings.ttsVoice)
    } catch (err) {
      log.warn('TTS voice 设置失败:', err)
    }
  }
  if (settings.ttsSpeed) {
    try {
      store.setTTSSpeed(settings.ttsSpeed)
    } catch (err) {
      log.warn('TTS speed 设置失败:', err)
    }
  }

  // === TTS Provider API Key 同步 ===
  if (mappedTTSProviderId && settings.ttsApiKey) {
    try {
      store.setTTSProviderConfig(mappedTTSProviderId, {
        apiKey: settings.ttsApiKey,
        enabled: true,
      })
    } catch (err) {
      log.warn('TTS provider config 设置失败:', err)
    }
  }

  // === 图片生成配置 ===
  if (settings.enableImageGeneration !== undefined) {
    // 先设置 provider 和 apiKey，这样 setImageGenerationEnabled(true) 的校验才能通过
    if (settings.imageProviderId) {
      try {
        // setImageProvider — 不是 setImageProviderId
        store.setImageProvider(settings.imageProviderId as never)
      } catch (err) {
        log.warn('Image provider 设置失败:', settings.imageProviderId, err)
      }
    }
    if (settings.imageProviderId && settings.imageApiKey) {
      try {
        store.setImageProviderConfig(settings.imageProviderId as never, {
          apiKey: settings.imageApiKey,
          enabled: true,
        })
      } catch (err) {
        log.warn('Image provider config 设置失败:', err)
      }
    }
    try {
      store.setImageGenerationEnabled(settings.enableImageGeneration)
    } catch (err) {
      log.warn('图片生成启用设置失败:', err)
    }
  }

  // === 视频生成配置 ===
  if (settings.enableVideoGeneration !== undefined) {
    // 先设置 provider 和 apiKey，这样 setVideoGenerationEnabled(true) 的校验才能通过
    if (settings.videoProviderId) {
      try {
        store.setVideoProvider(settings.videoProviderId as never)
      } catch (err) {
        log.warn('Video provider 设置失败:', settings.videoProviderId, err)
      }
    }
    if (settings.videoProviderId && settings.videoApiKey) {
      try {
        store.setVideoProviderConfig(settings.videoProviderId as never, {
          apiKey: settings.videoApiKey,
          enabled: true,
        })
      } catch (err) {
        log.warn('Video provider config 设置失败:', err)
      }
    }
    try {
      store.setVideoGenerationEnabled(settings.enableVideoGeneration)
    } catch (err) {
      log.warn('视频生成启用设置失败:', err)
    }
  }

  // === ASR 配置 ===
  if (settings.enableASR !== undefined) {
    try {
      store.setASREnabled(settings.enableASR)
    } catch (err) {
      log.warn('ASR 启用设置失败:', err)
    }
  }

  const mappedASRProviderId = settings.asrProviderId
    ? mapChildASRProviderId(settings.asrProviderId)
    : null

  if (mappedASRProviderId) {
    try {
      store.setASRProvider(mappedASRProviderId)
    } catch (err) {
      log.warn('ASR provider 设置失败:', settings.asrProviderId, err)
    }
  }

  if (mappedASRProviderId) {
    try {
      store.setASRProviderConfig(mappedASRProviderId, {
        ...(settings.asrApiKey ? { apiKey: settings.asrApiKey } : {}),
        ...(settings.asrBaseUrl ? { baseUrl: settings.asrBaseUrl } : {}),
        ...(settings.enableASR !== undefined ? { enabled: settings.enableASR } : {}),
      })
    } catch (err) {
      log.warn('ASR provider config 设置失败:', err)
    }
  }

  if (settings.asrLanguage) {
    try {
      store.setASRLanguage(settings.asrLanguage)
    } catch (err) {
      log.warn('ASR language 设置失败:', err)
    }
  }

  // === WebSearch 配置 ===
  const webSearchProviderId = (settings.webSearchProviderId || 'tavily') as WebSearchProviderId

  try {
    store.setWebSearchProvider(webSearchProviderId)
  } catch (err) {
    log.warn('WebSearch provider 设置失败:', webSearchProviderId, err)
  }

  try {
    store.setWebSearchProviderConfig(webSearchProviderId, {
      ...(settings.webSearchApiKey ? { apiKey: settings.webSearchApiKey } : {}),
      ...(settings.enableWebSearch !== undefined ? { enabled: settings.enableWebSearch } : {}),
    })
  } catch (err) {
    log.warn('WebSearch provider config 设置失败:', err)
  }

  // === PDF 配置 ===
  const pdfProviderId = (settings.pdfProviderId || 'unpdf') as PDFProviderId

  try {
    store.setPDFProvider(pdfProviderId)
  } catch (err) {
    log.warn('PDF provider 设置失败:', pdfProviderId, err)
  }

  try {
    store.setPDFProviderConfig(pdfProviderId, {
      ...(settings.pdfApiKey ? { apiKey: settings.pdfApiKey } : {}),
      ...(settings.pdfBaseUrl ? { baseUrl: settings.pdfBaseUrl } : {}),
      ...(settings.enablePDF !== undefined ? { enabled: settings.enablePDF } : {}),
    })
  } catch (err) {
    log.warn('PDF provider config 设置失败:', err)
  }

  log.info('设置同步完成')
}
