/**
 * Settings Reverse Sync — 反向同步 OpenMAIC Settings Store → ChildSettings → PostgreSQL
 *
 * 当用户在 SettingsDialog（家长模块 → 高级设置）中修改了配置后，
 * 将 OpenMAIC Store 中当前生效的配置反向写入数据库，确保持久化。
 *
 * 设计原则：只存"当前生效的"provider 配置（apiKey/baseUrl 等），
 * 对应 ChildSettings 中已有的字段。简单直接，没有快照。
 *
 * 调用时机：SettingsDialog 关闭时（onOpenChange(false)）
 */

import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { useUserProfileStore } from '@/lib/openmaic/store/user-profile'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import { useChildStore } from '@/stores/childStore'
import type { ChildSettings } from '@/types/models'
import { createLogger } from '@/lib/openmaic/logger'
import {
  stripLegacyBioField,
  toPresetAgentId,
  toPresetSelectedAgents,
} from './child-settings-compat'
import { getSyncedChildId } from './settings-sync'

const log = createLogger('SettingsReverseSync')

/**
 * 将 OpenMAIC TTS Provider ID 反向映射为 ChildSettings 的 ttsProviderId
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
 * 从 OpenMAIC Settings Store 读取当前生效的所有配置，
 * 转换为 ChildSettings 格式的 Partial 对象。
 */
export function extractChildSettingsFromStore(): Partial<ChildSettings> {
  const s = useSettingsStore.getState()

  // === LLM ===
  const llmModel = s.providerId && s.modelId
    ? `${s.providerId}:${s.modelId}`
    : ''
  const llmProviderConfig = s.providersConfig[s.providerId]
  const llmApiKey = llmProviderConfig?.apiKey || ''
  const llmBaseUrl = llmProviderConfig?.baseUrl || ''

  // === TTS ===
  const ttsConfig = s.ttsProvidersConfig[s.ttsProviderId]
  const ttsApiKey = ttsConfig?.apiKey || ''

  // === ASR ===
  const asrConfig = s.asrProvidersConfig[s.asrProviderId]
  const asrApiKey = asrConfig?.apiKey || ''
  const asrBaseUrl = asrConfig?.baseUrl || ''

  // === ISE ===
  const iseConfig = s.iseProvidersConfig[s.iseProviderId]
  const iseApiKey = iseConfig?.apiKey || ''
  const iseAppId = (iseConfig as Record<string, unknown>)?.appId as string || ''
  const iseApiSecret = (iseConfig as Record<string, unknown>)?.apiSecret as string || ''

  // === Image ===
  const imageConfig = s.imageProvidersConfig[s.imageProviderId]
  const imageApiKey = imageConfig?.apiKey || ''
  const imageBaseUrl = imageConfig?.baseUrl || ''

  // === Video ===
  const videoConfig = s.videoProvidersConfig[s.videoProviderId]
  const videoApiKey = videoConfig?.apiKey || ''
  const videoBaseUrl = videoConfig?.baseUrl || ''

  // === PDF ===
  const pdfConfig = s.pdfProvidersConfig[s.pdfProviderId]
  const pdfApiKey = pdfConfig?.apiKey || ''
  const pdfBaseUrl = pdfConfig?.baseUrl || ''

  // === WebSearch ===
  const webSearchConfig = s.webSearchProvidersConfig[s.webSearchProviderId]
  const webSearchApiKey = webSearchConfig?.apiKey || ''

  // === Classroom profile / agent settings ===
  const selfIntroduction = useUserProfileStore.getState().bio || ''
  const selectedAgents = toPresetSelectedAgents(s.selectedAgentIds)
  const registry = useAgentRegistry.getState()
  const agentVoiceMap = Object.fromEntries(
    (s.selectedAgentIds || [])
      .map((agentId) => {
        const presetAgentId = toPresetAgentId(agentId)
        const voiceId = registry.getAgent(agentId)?.voiceConfig?.voiceId
        if (!presetAgentId || presetAgentId === 'teacher' || !voiceId) {
          return null
        }
        return [presetAgentId, voiceId]
      })
      .filter((entry): entry is [string, string] => Array.isArray(entry)),
  )

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
    imageModelId: s.imageModelId || '',
    imageApiKey,
    imageBaseUrl,

    // Video
    enableVideoGeneration: s.videoGenerationEnabled,
    videoProviderId: s.videoProviderId,
    videoModelId: s.videoModelId || '',
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

    // Classroom
    classroomAgentMode: s.agentMode,
    selectedAgents,
    teacherVoice: s.ttsVoice,
    maxDiscussionRounds: Number(s.maxTurns) || 3,
    agentVoiceMap,
    selfIntroduction,
  }
}

/**
 * 将 OpenMAIC Settings Store 中当前生效的配置反向同步到数据库。
 *
 * @returns true 成功，false 失败
 */
export async function syncOpenMAICToChild(): Promise<boolean> {
  const child = useChildStore.getState().currentChild
  if (!child?.id) {
    log.warn('反向同步跳过：没有 currentChild')
    return false
  }

  // Guard: only reverse-sync when the Store has been synced for THIS child.
  // If the Store contains another child's data (e.g. user switched children
  // but sync hasn't run yet), writing it to DB would corrupt the target child.
  const syncedId = getSyncedChildId()
  if (syncedId && syncedId !== String(child.id)) {
    log.warn('反向同步跳过：Store 数据属于 childId:', syncedId, '而当前 child:', child.id)
    return false
  }

  const settingsToSync = extractChildSettingsFromStore()
  log.info('反向同步开始, child_id:', child.id,
    'llmProvider:', settingsToSync.llmProviderId,
    'imageProvider:', settingsToSync.imageProviderId,
    'videoProvider:', settingsToSync.videoProviderId,
  )

  try {
    // 合并到现有 settings（保留非高级设置字段如 dailyLearningMinutes 等）
    const currentSettings = stripLegacyBioField(
      (child.settings || {}) as Record<string, unknown>,
    ) as Partial<ChildSettings>

    // === 防空值覆盖保护 ===
    // 场景：新浏览器打开 → localStorage 空 → Store 用默认空值初始化
    // → Dialog 关闭时 extractChildSettingsFromStore() 提取全部空值
    // → 如果直接写入 DB 会覆盖掉已有的 API Key
    //
    // 策略：对每个 API Key 字段，如果 Store 中是空的但 DB 中有非空值，
    // 就保留 DB 中的值，不用 Store 的空值覆盖。
    const safeSettings = { ...settingsToSync }
    const protectedKeyFields: (keyof ChildSettings)[] = [
      'llmApiKey', 'llmBaseUrl', 'llmModel', 'llmProviderId',
      'ttsApiKey', 'ttsProviderId', 'ttsVoice',
      'asrApiKey', 'asrBaseUrl', 'asrProviderId',
      'iseApiKey', 'iseAppId', 'iseApiSecret', 'iseProviderId',
      'imageApiKey', 'imageBaseUrl', 'imageProviderId', 'imageModelId',
      'videoApiKey', 'videoBaseUrl', 'videoProviderId', 'videoModelId',
      'pdfApiKey', 'pdfBaseUrl', 'pdfProviderId',
      'webSearchApiKey', 'webSearchProviderId',
    ]

    let protectedCount = 0
    for (const field of protectedKeyFields) {
      const storeValue = safeSettings[field as keyof typeof safeSettings]
      const dbValue = currentSettings[field]
      // Store 值为空（空字符串或 undefined）但 DB 有非空值 → 保留 DB 值
      if ((!storeValue || storeValue === '') && dbValue && dbValue !== '') {
        ;(safeSettings as Record<string, unknown>)[field] = dbValue
        protectedCount++
      }
    }
    if (protectedCount > 0) {
      log.info(`防空值覆盖：保护了 ${protectedCount} 个字段不被空值覆盖`)
    }

    const mergedSettings = { ...currentSettings, ...safeSettings }

    // 写入数据库
    const { apiClient } = await import('@/services/api')
    await apiClient.patch('/children', { settings: mergedSettings }, {
      filters: [{ column: 'id', operator: 'eq', value: Number(child.id) }],
    })

    // 同步更新内存中的 childStore
    useChildStore.getState().updateChildSettings(String(child.id), safeSettings)

    log.info('反向同步完成 ✅')
    return true
  } catch (err) {
    log.error('反向同步失败 ❌:', err)
    return false
  }
}
