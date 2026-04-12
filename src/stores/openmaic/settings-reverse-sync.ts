/**
 * Settings Reverse Sync — 反向同步 OpenMAIC Settings Store → ChildSettings → PostgreSQL
 *
 * 与 settings-sync.ts (ChildSettings → OpenMAIC Store) 方向相反。
 * 当用户在 SettingsDialog（家长模块 → 高级设置）中修改了配置后，
 * 需要将 OpenMAIC Store 中的最新配置反向写入数据库，确保持久化。
 *
 * 调用时机：
 * 1. SettingsDialog 关闭时（onOpenChange(false)）
 * 2. 未来可扩展到其他需要持久化的场景
 *
 * 同步的字段：
 * - LLM：providerId + modelId → llmModel ("provider:model"), apiKey, baseUrl
 * - TTS：providerId, apiKey, voice, speed, enabled
 * - ASR：providerId, apiKey, baseUrl, enabled, language
 * - ISE：providerId, appId, apiKey, apiSecret, enabled
 * - Image：providerId, apiKey, baseUrl, enabled
 * - Video：providerId, apiKey, baseUrl, enabled
 * - PDF：providerId, apiKey, baseUrl, enabled
 * - WebSearch：providerId, apiKey, enabled
 */

import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { useChildStore } from '@/stores/childStore'
import type { ChildSettings } from '@/types/models'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('SettingsReverseSync')

/**
 * 将 OpenMAIC TTS Provider ID 反向映射为 ChildSettings 的 ttsProviderId
 * （settings-sync.ts 中 mapChildTTSProviderId 的反向操作）
 */
function reverseMapTTSProviderId(openmaicId: string): string {
  switch (openmaicId) {
    case 'openai-tts':
      return 'openai'
    case 'minimax-tts':
      return 'minimax'
    case 'doubao-tts':
      return 'doubao'
    case 'azure-tts':
      return 'azure'
    case 'qwen-tts':
      return 'qwen'
    case 'glm-tts':
      return 'glm'
    case 'elevenlabs-tts':
      return 'elevenlabs'
    case 'browser-native-tts':
      return 'browser-native'
    default:
      return openmaicId
  }
}

/**
 * 从 OpenMAIC Settings Store 读取所有配置，
 * 转换为 ChildSettings 格式的 Partial 对象。
 *
 * 只包含"高级设置"相关字段，不会覆盖孩子的基础信息（name/age/avatar等）。
 */
export function extractChildSettingsFromStore(): Partial<ChildSettings> {
  const s = useSettingsStore.getState()

  // LLM：组合 providerId + modelId → "provider:model" 格式
  const llmModel = s.providerId && s.modelId
    ? `${s.providerId}:${s.modelId}`
    : ''

  // 获取当前 LLM provider 的 apiKey 和 baseUrl
  const llmProviderConfig = s.providersConfig[s.providerId]
  const llmApiKey = llmProviderConfig?.apiKey || ''
  const llmBaseUrl = llmProviderConfig?.baseUrl || ''

  // TTS
  const ttsConfig = s.ttsProvidersConfig[s.ttsProviderId]
  const ttsApiKey = ttsConfig?.apiKey || ''

  // ASR
  const asrConfig = s.asrProvidersConfig[s.asrProviderId]
  const asrApiKey = asrConfig?.apiKey || ''
  const asrBaseUrl = asrConfig?.baseUrl || ''

  // ISE
  const iseConfig = s.iseProvidersConfig[s.iseProviderId]
  const iseApiKey = iseConfig?.apiKey || ''
  const iseAppId = (iseConfig as { appId?: string })?.appId || ''
  const iseApiSecret = (iseConfig as { apiSecret?: string })?.apiSecret || ''

  // Image
  const imageConfig = s.imageProvidersConfig[s.imageProviderId]
  const imageApiKey = imageConfig?.apiKey || ''
  const imageBaseUrl = imageConfig?.baseUrl || ''

  // Video
  const videoConfig = s.videoProvidersConfig[s.videoProviderId]
  const videoApiKey = videoConfig?.apiKey || ''
  const videoBaseUrl = videoConfig?.baseUrl || ''

  // PDF
  const pdfConfig = s.pdfProvidersConfig[s.pdfProviderId]
  const pdfApiKey = pdfConfig?.apiKey || ''
  const pdfBaseUrl = pdfConfig?.baseUrl || ''

  // WebSearch
  const webSearchConfig = s.webSearchProvidersConfig[s.webSearchProviderId]
  const webSearchApiKey = webSearchConfig?.apiKey || ''

  return {
    // LLM
    llmProviderId: s.providerId,
    llmModel,
    llmApiKey,
    llmBaseUrl,

    // TTS
    enableTTS: s.ttsEnabled,
    ttsProviderId: reverseMapTTSProviderId(s.ttsProviderId),
    ttsApiKey,
    ttsVoice: s.ttsVoice,
    ttsSpeed: s.ttsSpeed,

    // ASR
    enableASR: s.asrEnabled,
    asrProviderId: s.asrProviderId,
    asrApiKey,
    asrBaseUrl,
    asrLanguage: s.asrLanguage || 'auto',

    // ISE
    enableISE: iseConfig?.enabled ?? false,
    iseProviderId: s.iseProviderId,
    iseAppId,
    iseApiKey,
    iseApiSecret,

    // Image
    enableImageGeneration: s.imageGenerationEnabled,
    imageProviderId: s.imageProviderId,
    imageApiKey,
    imageBaseUrl,

    // Video
    enableVideoGeneration: s.videoGenerationEnabled,
    videoProviderId: s.videoProviderId,
    videoApiKey,
    videoBaseUrl,

    // PDF
    enablePDF: pdfConfig?.enabled ?? false,
    pdfProviderId: s.pdfProviderId,
    pdfApiKey,
    pdfBaseUrl,

    // WebSearch
    enableWebSearch: webSearchConfig?.enabled ?? false,
    webSearchProviderId: s.webSearchProviderId,
    webSearchApiKey,
  }
}

/**
 * 将 OpenMAIC Settings Store 中的配置反向同步到数据库（PostgreSQL）。
 *
 * 流程：
 * 1. 从 useSettingsStore.getState() 提取所有配置
 * 2. 转换字段名 → ChildSettings 格式
 * 3. 合并到当前孩子的 settings 中（不覆盖非高级设置字段）
 * 4. 写入数据库
 *
 * @returns true 成功，false 失败
 */
export async function syncOpenMAICToChild(): Promise<boolean> {
  const child = useChildStore.getState().currentChild
  if (!child?.id) {
    log.warn('反向同步跳过：没有 currentChild')
    return false
  }

  const settingsToSync = extractChildSettingsFromStore()
  log.info('反向同步开始, child_id:', child.id, 'llmModel:', settingsToSync.llmModel)

  try {
    // 1. 合并到现有 settings（保留非高级设置字段如 dailyLearningMinutes 等）
    const currentSettings = (child.settings || {}) as Partial<ChildSettings>
    const mergedSettings = { ...currentSettings, ...settingsToSync }

    // 2. 写入数据库
    const { apiClient } = await import('@/services/api')
    await apiClient.patch('/children', { settings: mergedSettings }, {
      filters: [{ column: 'id', operator: 'eq', value: Number(child.id) }],
    })

    // 3. 同步更新内存中的 childStore
    useChildStore.getState().updateChildSettings(String(child.id), settingsToSync)

    log.info('反向同步完成 ✅, child_id:', child.id)
    return true
  } catch (err) {
    log.error('反向同步失败 ❌:', err)
    return false
  }
}
