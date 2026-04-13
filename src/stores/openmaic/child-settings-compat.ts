import type { ChildSettings } from '@/types/models'

type LegacyChildSettings = Partial<ChildSettings> & {
  bio?: unknown
}

const PRESET_TO_REGISTRY_AGENT_ID: Record<string, string> = {
  teacher: 'default-1',
  assistant: 'default-2',
  showoff: 'default-3',
  curious: 'default-4',
  notetaker: 'default-5',
  thinker: 'default-6',
}

const REGISTRY_TO_PRESET_AGENT_ID = Object.fromEntries(
  Object.entries(PRESET_TO_REGISTRY_AGENT_ID).map(([presetId, registryId]) => [registryId, presetId]),
) as Record<string, string>

export function getSelfIntroductionFromSettings(
  settings?: LegacyChildSettings | null,
): string {
  if (!settings) return ''

  if (typeof settings.selfIntroduction === 'string' && settings.selfIntroduction.trim()) {
    return settings.selfIntroduction
  }

  if (typeof settings.bio === 'string' && settings.bio.trim()) {
    return settings.bio
  }

  return ''
}

export function normalizeChildSettings(
  settings?: LegacyChildSettings | null,
): ChildSettings | null {
  if (!settings) return null

  return {
    ...settings,
    selfIntroduction: getSelfIntroductionFromSettings(settings),
  } as ChildSettings
}

/**
 * All ChildSettings fields that should prefer live Store values over DB values
 * when the Store has been synced for the current child.
 *
 * Covers all provider API keys, URLs, models, toggles, and classroom settings.
 */
const LIVE_STORE_PRIORITY_FIELDS: Array<keyof ChildSettings> = [
  // LLM
  'llmProviderId', 'llmModel', 'llmApiKey', 'llmBaseUrl',
  // TTS
  'enableTTS', 'ttsProviderId', 'ttsApiKey', 'ttsVoice', 'ttsSpeed',
  // ASR
  'enableASR', 'asrProviderId', 'asrApiKey', 'asrBaseUrl', 'asrLanguage',
  // ISE
  'enableISE', 'iseProviderId', 'iseApiKey', 'iseAppId', 'iseApiSecret',
  // Image
  'enableImageGeneration', 'imageProviderId', 'imageModelId', 'imageApiKey', 'imageBaseUrl',
  // Video
  'enableVideoGeneration', 'videoProviderId', 'videoModelId', 'videoApiKey', 'videoBaseUrl',
  // PDF
  'enablePDF', 'pdfProviderId', 'pdfApiKey', 'pdfBaseUrl',
  // WebSearch
  'enableWebSearch', 'webSearchProviderId', 'webSearchApiKey',
  // Classroom
  'classroomAgentMode', 'selectedAgents', 'teacherVoice', 'maxDiscussionRounds',
]

/**
 * Provider ID fields should only override DB values when the live store
 * has at least one substantive config field (API key, model, URL) in the
 * same group. This prevents Settings Store defaults (e.g. 'openai' for LLM)
 * from overwriting meaningful DB values when the store hasn't been synced.
 */
const PROVIDER_ID_SUBSTANCE_FIELDS: Partial<Record<keyof ChildSettings, Array<keyof ChildSettings>>> = {
  llmProviderId: ['llmModel', 'llmApiKey', 'llmBaseUrl'],
  ttsProviderId: ['ttsApiKey'],
  asrProviderId: ['asrApiKey', 'asrBaseUrl'],
  iseProviderId: ['iseApiKey', 'iseAppId', 'iseApiSecret'],
  imageProviderId: ['imageApiKey', 'imageBaseUrl', 'imageModelId'],
  videoProviderId: ['videoApiKey', 'videoBaseUrl', 'videoModelId'],
  pdfProviderId: ['pdfApiKey', 'pdfBaseUrl'],
  webSearchProviderId: ['webSearchApiKey'],
}

function hasSubstantiveLiveConfig(
  liveSettings: Partial<ChildSettings>,
  substanceFields: Array<keyof ChildSettings>,
): boolean {
  return substanceFields.some((f) => {
    const v = liveSettings[f]
    return typeof v === 'string' && v.trim() !== ''
  })
}

function shouldPreferLiveValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim() !== ''
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value)
  }

  if (typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return true
  }

  if (value && typeof value === 'object') {
    return true
  }

  return false
}

function cloneConfigValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, unknown>) } as T
  }

  return value
}

/**
 * Merge DB-backed ChildSettings with live Store values.
 *
 * When `liveSettings` is provided (i.e. the Store has been synced for this child),
 * all non-empty live values take priority over DB values. This handles the case
 * where the user modified settings in the Dialog but hasn't saved to DB yet.
 *
 * When `liveSettings` is null (Store not synced for this child), only DB values
 * are used — preventing cross-child data contamination.
 */
export function mergeChildSettingsWithLiveStore(
  settings?: LegacyChildSettings | null,
  liveSettings?: Partial<ChildSettings> | null,
): ChildSettings | null {
  if (!settings && !liveSettings) return null

  const merged = {
    ...(normalizeChildSettings(settings) ?? {}),
  } as ChildSettings

  if (liveSettings) {
    for (const field of LIVE_STORE_PRIORITY_FIELDS) {
      const substanceFields = PROVIDER_ID_SUBSTANCE_FIELDS[field]
      if (substanceFields && !hasSubstantiveLiveConfig(liveSettings, substanceFields)) continue

      const liveValue = liveSettings[field]
      if (!shouldPreferLiveValue(liveValue)) continue
      ;(merged as Record<string, unknown>)[field] = cloneConfigValue(liveValue)
    }
  }

  merged.selfIntroduction = getSelfIntroductionFromSettings(merged)
  return merged
}

export function stripLegacyBioField<T extends Record<string, unknown>>(
  settings?: T | null,
): Omit<T, 'bio'> {
  if (!settings) {
    return {} as Omit<T, 'bio'>
  }

  const rest = { ...settings } as Record<string, unknown>
  delete rest.bio
  return rest as Omit<T, 'bio'>
}

export function toRegistryAgentId(presetAgentId?: string | null): string | null {
  if (!presetAgentId) return null
  return PRESET_TO_REGISTRY_AGENT_ID[presetAgentId] ?? null
}

export function toPresetAgentId(registryAgentId?: string | null): string | null {
  if (!registryAgentId) return null
  return REGISTRY_TO_PRESET_AGENT_ID[registryAgentId] ?? null
}

export function toRegistrySelectedAgentIds(selectedAgents?: string[]): string[] {
  const mappedIds = (selectedAgents ?? [])
    .map((agentId) => toRegistryAgentId(agentId))
    .filter((agentId): agentId is string => Boolean(agentId) && agentId !== 'default-1')

  return ['default-1', ...mappedIds]
}

export function toPresetSelectedAgents(selectedAgentIds?: string[]): string[] {
  return (selectedAgentIds ?? [])
    .map((agentId) => toPresetAgentId(agentId))
    .filter((agentId): agentId is string => Boolean(agentId) && agentId !== 'teacher')
}

export function getAllMappedRegistryAgentIds(): string[] {
  return Object.values(PRESET_TO_REGISTRY_AGENT_ID)
}
