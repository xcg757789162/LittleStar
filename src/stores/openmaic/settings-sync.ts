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
 * 设计原则：只同步当前生效的 provider 的配置，简单直接。
 *
 * 注意：方法名必须与 OpenMAIC Settings Store 中的实际 action 名称完全匹配：
 *   - setModel(providerId, modelId)
 *   - setTTSProvider(id)
 *   - setImageProvider(id)
 *   - setImageGenerationEnabled(bool)
 *   - setTTSEnabled(bool)
 */

import type { ChildSettings } from '@/types/models'
import type { TTSProviderId, ASRProviderId, ISEProviderId } from '@/lib/openmaic/audio/types'
import { DEFAULT_TTS_VOICES } from '@/lib/openmaic/audio/constants'
import type { PDFProviderId } from '@/lib/openmaic/pdf/types'
import type { ImageProviderId, VideoProviderId } from '@/lib/openmaic/media/types'
import type { WebSearchProviderId } from '@/lib/openmaic/web-search/types'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import { createLogger } from '@/lib/openmaic/logger'
import {
  getAllMappedRegistryAgentIds,
  toPresetAgentId,
  toRegistryAgentId,
  toRegistrySelectedAgentIds,
} from './child-settings-compat'

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
 * Tracks which child's data is currently loaded in the Settings Store.
 *
 * Module-level (not persisted) by design: on fresh page load this is null,
 * meaning "Store data hasn't been synced yet" — callers should not trust
 * the persisted Store values until syncSettingsToOpenMAIC is called.
 */
let syncedChildId: string | null = null

/** Returns the childId whose settings are currently in the Store, or null. */
export function getSyncedChildId(): string | null {
  return syncedChildId
}

/** Clears the synced childId (e.g. on logout). */
export function clearSyncedChildId(): void {
  syncedChildId = null
}

function getTeacherVoice(settings: ChildSettings): string {
  return settings.teacherVoice || settings.ttsVoice || ''
}

function syncAgentRegistry(settings: ChildSettings, mappedTTSProviderId: TTSProviderId | null): void {
  const registry = useAgentRegistry.getState()
  const providerId = mappedTTSProviderId ?? useSettingsStore.getState().ttsProviderId
  const teacherRegistryId = toRegistryAgentId('teacher')
  const teacherVoice = getTeacherVoice(settings) || DEFAULT_TTS_VOICES[providerId]

  if (teacherRegistryId) {
    registry.updateAgent(teacherRegistryId, {
      voiceConfig: {
        providerId,
        voiceId: teacherVoice,
      },
    })
  }

  for (const registryId of getAllMappedRegistryAgentIds()) {
    if (registryId === teacherRegistryId) continue

    const presetAgentId = toPresetAgentId(registryId)
    const voiceId = presetAgentId ? settings.agentVoiceMap?.[presetAgentId] : undefined

    registry.updateAgent(registryId, {
      voiceConfig: voiceId
        ? {
            providerId,
            voiceId,
          }
        : undefined,
    })
  }
}

/**
 * 将 LittleStar ChildSettings 同步到 OpenMAIC Settings Store
 *
 * 逐字段同步当前生效的 provider 配置（apiKey/baseUrl/enabled 等）
 *
 * @param settings 孩子的配置
 * @param childId  可选，记录当前同步的孩子 ID（用于防止跨孩子数据串用）
 */
export function syncSettingsToOpenMAIC(settings: ChildSettings, childId?: string): void {
  if (childId) {
    syncedChildId = childId
  }
  log.info('开始同步设置到 OpenMAIC, childId:', childId ?? '(未指定)', 'llmModel:',
    settings.llmModel ?? '(未设置)',
    'imageProvider:', settings.imageProviderId ?? '(未设置)',
    'videoProvider:', settings.videoProviderId ?? '(未设置)',
  )

  const store = useSettingsStore.getState()

  // === 1. LLM 配置 ===
  if (settings.llmModel) {
    const [provider, ...modelParts] = settings.llmModel.split(':')
    const modelId = modelParts.join(':')

    if (provider && modelId) {
      try {
        store.setModel(provider as never, modelId)
      } catch (err) {
        log.warn('LLM 模型设置失败:', provider, err)
      }
    }

    if (settings.llmApiKey && provider) {
      try {
        store.setProviderConfig(provider as never, {
          apiKey: settings.llmApiKey,
          ...(settings.llmBaseUrl ? { baseUrl: settings.llmBaseUrl } : {}),
        })
      } catch (err) {
        log.warn('LLM provider config 设置失败:', provider, err)
      }
    }
  }

  // === 2. TTS 配置 ===
  if (settings.enableTTS !== undefined) {
    try { store.setTTSEnabled(settings.enableTTS) } catch { /* */ }
  }
  const mappedTTSProviderId = settings.ttsProviderId
    ? mapChildTTSProviderId(settings.ttsProviderId)
    : null
  if (mappedTTSProviderId) {
    try { store.setTTSProvider(mappedTTSProviderId) } catch { /* */ }
  }
  const teacherVoice = getTeacherVoice(settings)
  if (teacherVoice) {
    try { store.setTTSVoice(teacherVoice) } catch { /* */ }
  }
  if (settings.ttsSpeed) {
    try { store.setTTSSpeed(settings.ttsSpeed) } catch { /* */ }
  }
  if (mappedTTSProviderId && settings.ttsApiKey) {
    try {
      store.setTTSProviderConfig(mappedTTSProviderId, {
        apiKey: settings.ttsApiKey,
        enabled: true,
      })
    } catch { /* */ }
  }

  // === 3. ASR 配置 ===
  if (settings.enableASR !== undefined) {
    try { store.setASREnabled(settings.enableASR) } catch { /* */ }
  }
  const mappedASRProviderId = settings.asrProviderId
    ? mapChildASRProviderId(settings.asrProviderId)
    : null
  if (mappedASRProviderId) {
    try { store.setASRProvider(mappedASRProviderId) } catch { /* */ }
    try {
      store.setASRProviderConfig(mappedASRProviderId, {
        ...(settings.asrApiKey ? { apiKey: settings.asrApiKey } : {}),
        ...(settings.asrBaseUrl ? { baseUrl: settings.asrBaseUrl } : {}),
        ...(settings.enableASR !== undefined ? { enabled: settings.enableASR } : {}),
      })
    } catch { /* */ }
  }
  if (settings.asrLanguage) {
    try { store.setASRLanguage(settings.asrLanguage) } catch { /* */ }
  }

  // === 4. ISE（发音评测）配置 ===
  if (settings.iseProviderId) {
    try { store.setISEProvider(settings.iseProviderId as ISEProviderId) } catch { /* */ }
  }
  if (settings.iseProviderId && (settings.iseApiKey || settings.iseAppId || settings.iseApiSecret)) {
    try {
      store.setISEProviderConfig(settings.iseProviderId as ISEProviderId, {
        ...(settings.iseApiKey ? { apiKey: settings.iseApiKey } : {}),
        ...(settings.iseAppId ? { appId: settings.iseAppId } : {}),
        ...(settings.iseApiSecret ? { apiSecret: settings.iseApiSecret } : {}),
        ...(settings.enableISE !== undefined ? { enabled: settings.enableISE } : {}),
      })
    } catch { /* */ }
  }

  // === 5. 图片生成配置 ===
  if (settings.imageProviderId) {
    try { store.setImageProvider(settings.imageProviderId as ImageProviderId) } catch { /* */ }
  }
  if (settings.imageProviderId && settings.imageApiKey) {
    try {
      store.setImageProviderConfig(settings.imageProviderId as ImageProviderId, {
        apiKey: settings.imageApiKey,
        ...(settings.imageBaseUrl ? { baseUrl: settings.imageBaseUrl } : {}),
        enabled: true,
      })
    } catch { /* */ }
  }
  if (settings.imageModelId) {
    try { store.setImageModelId(settings.imageModelId) } catch { /* */ }
  }
  {
    // Auto-enable: if provider + API key are configured but generation is off, enable it.
    // Users who explicitly configured a provider clearly intend to use it.
    const hasImageConfig = !!(settings.imageProviderId && settings.imageApiKey)
    const shouldEnable = hasImageConfig && settings.enableImageGeneration !== true
    const enabled = shouldEnable ? true : (settings.enableImageGeneration ?? false)
    try { store.setImageGenerationEnabled(enabled) } catch { /* */ }
  }

  // === 6. 视频生成配置 ===
  if (settings.videoProviderId) {
    try { store.setVideoProvider(settings.videoProviderId as VideoProviderId) } catch { /* */ }
  }
  if (settings.videoProviderId && settings.videoApiKey) {
    try {
      store.setVideoProviderConfig(settings.videoProviderId as VideoProviderId, {
        apiKey: settings.videoApiKey,
        ...(settings.videoBaseUrl ? { baseUrl: settings.videoBaseUrl } : {}),
        enabled: true,
      })
    } catch { /* */ }
  }
  if (settings.videoModelId) {
    try { store.setVideoModelId(settings.videoModelId) } catch { /* */ }
  }
  {
    const hasVideoConfig = !!(settings.videoProviderId && settings.videoApiKey)
    const shouldEnable = hasVideoConfig && settings.enableVideoGeneration !== true
    const enabled = shouldEnable ? true : (settings.enableVideoGeneration ?? false)
    try { store.setVideoGenerationEnabled(enabled) } catch { /* */ }
  }

  // === 7. WebSearch 配置 ===
  const webSearchProviderId = (settings.webSearchProviderId || 'tavily') as WebSearchProviderId
  try { store.setWebSearchProvider(webSearchProviderId) } catch { /* */ }
  try {
    store.setWebSearchProviderConfig(webSearchProviderId, {
      ...(settings.webSearchApiKey ? { apiKey: settings.webSearchApiKey } : {}),
      ...(settings.enableWebSearch !== undefined ? { enabled: settings.enableWebSearch } : {}),
    })
  } catch { /* */ }

  // === 8. PDF 配置 ===
  const pdfProviderId = (settings.pdfProviderId || 'unpdf') as PDFProviderId
  try { store.setPDFProvider(pdfProviderId) } catch { /* */ }
  try {
    store.setPDFProviderConfig(pdfProviderId, {
      ...(settings.pdfApiKey ? { apiKey: settings.pdfApiKey } : {}),
      ...(settings.pdfBaseUrl ? { baseUrl: settings.pdfBaseUrl } : {}),
      ...(settings.enablePDF !== undefined ? { enabled: settings.enablePDF } : {}),
    })
  } catch { /* */ }

  // === 9. 课堂模式 / 角色配置 ===
  try { store.setAgentMode(settings.classroomAgentMode || 'preset') } catch { /* */ }
  try { store.setSelectedAgentIds(toRegistrySelectedAgentIds(settings.selectedAgents)) } catch { /* */ }
  try { store.setMaxTurns(String(settings.maxDiscussionRounds || 3)) } catch { /* */ }
  syncAgentRegistry(settings, mappedTTSProviderId)

  log.info('设置同步完成 ✅')
}
