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

export function stripLegacyBioField<T extends Record<string, unknown>>(
  settings?: T | null,
): Omit<T, 'bio'> {
  if (!settings) {
    return {} as Omit<T, 'bio'>
  }

  const { bio: _legacyBio, ...rest } = settings
  return rest
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
