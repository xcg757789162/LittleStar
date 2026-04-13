import { describe, expect, it } from 'vitest'
import { buildHeadersFromSettingsServer } from '../headers-builder-server'
import { PRESET_AGENTS, type ChildSettings } from '@/types/models'

function createTestSettings(overrides: Partial<ChildSettings> = {}): Record<string, unknown> {
  return {
    dailyLearningMinutes: 30,
    preferredSubjects: ['english'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
    enableTTS: true,
    ttsProviderId: 'minimax',
    ttsVoice: 'female-tianmei',
    ttsSpeed: 1,
    enableImageGeneration: false,
    enableVideoGeneration: false,
    classroomAgentMode: 'preset',
    selectedAgents: ['assistant', 'showoff'],
    agentVoiceMap: {},
    teacherVoice: '',
    maxDiscussionRounds: 3,
    selfIntroduction: '',
    llmModel: 'openai:gpt-4o',
    llmApiKey: 'sk-test-key',
    llmBaseUrl: '',
    ...overrides,
  }
}

function decodeProfiles(headers: Record<string, string>) {
  expect(headers['x-agent-profiles-encoding']).toBe('base64')
  return JSON.parse(Buffer.from(headers['x-agent-profiles'], 'base64').toString('utf-8')) as Array<{
    id: string
    name: string
    voiceId: string
  }>
}

describe('buildHeadersFromSettingsServer', () => {
  it('preset 模式下应复用当前 PRESET_AGENTS 的角色 id 体系', () => {
    const headers = buildHeadersFromSettingsServer(createTestSettings({
      selectedAgents: ['assistant', 'showoff', 'curious'],
    }))

    const profiles = decodeProfiles(headers)
    expect(profiles.map((profile) => profile.id)).toEqual(['teacher', 'assistant', 'showoff', 'curious'])
    expect(profiles.map((profile) => profile.name)).toEqual(
      PRESET_AGENTS
        .filter((agent) => ['teacher', 'assistant', 'showoff', 'curious'].includes(agent.id))
        .map((agent) => agent.name),
    )
  })

  it('应优先使用 teacherVoice 和 agentVoiceMap，否则回退 PRESET_AGENTS 默认音色', () => {
    const headers = buildHeadersFromSettingsServer(createTestSettings({
      selectedAgents: ['assistant', 'thinker'],
      teacherVoice: 'female-yujie',
      agentVoiceMap: {
        assistant: 'male-qn-daxuesheng',
      },
    }))

    const profiles = decodeProfiles(headers)
    const teacher = profiles.find((profile) => profile.id === 'teacher')
    const assistant = profiles.find((profile) => profile.id === 'assistant')
    const thinker = profiles.find((profile) => profile.id === 'thinker')

    expect(teacher?.voiceId).toBe('female-yujie')
    expect(assistant?.voiceId).toBe('male-qn-daxuesheng')
    expect(thinker?.voiceId).toBe(
      PRESET_AGENTS.find((agent) => agent.id === 'thinker')?.defaultVoice,
    )
  })
})
