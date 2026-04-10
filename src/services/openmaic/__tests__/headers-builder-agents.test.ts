/**
 * 测试 Headers Builder 角色配置扩展
 * TDD 步骤 2.2.1：测试 3 个新 Headers 的构建逻辑
 */
import { describe, it, expect } from 'vitest'
import { buildHeadersFromSettings } from '../headers-builder'
import type { ChildSettings } from '@/types/models'
import { PRESET_AGENTS } from '@/types/models'

/** 创建完整的测试用 ChildSettings */
function createTestSettings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    dailyLearningMinutes: 30,
    preferredSubjects: ['english'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
    enableTTS: true,
    ttsProviderId: 'minimax',
    ttsVoice: 'female-tianmei',
    ttsSpeed: 1.0,
    enableImageGeneration: false,
    enableVideoGeneration: false,
    classroomAgentMode: 'preset',
    selectedAgents: ['assistant', 'showoff', 'curious'],
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

describe('Headers Builder — 角色配置 Headers', () => {
  describe('x-agent-profiles（preset 模式）', () => {
    it('preset 模式下应包含 x-agent-profiles Header', () => {
      const settings = createTestSettings({ classroomAgentMode: 'preset' })
      const headers = buildHeadersFromSettings(settings)
      expect(headers).toHaveProperty('x-agent-profiles')
    })

    it('x-agent-profiles 应包含 teacher + selectedAgents', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        selectedAgents: ['assistant', 'showoff'],
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      expect(profiles).toHaveLength(3) // teacher + assistant + showoff
      expect(profiles[0].id).toBe('teacher')
      expect(profiles[1].id).toBe('assistant')
      expect(profiles[2].id).toBe('showoff')
    })

    it('x-agent-profiles 中 voiceId 应优先取 agentVoiceMap', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        selectedAgents: ['assistant'],
        agentVoiceMap: { assistant: 'male-qn-daxuesheng' },
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      const assistantProfile = profiles.find((p: { id: string }) => p.id === 'assistant')
      expect(assistantProfile.voiceId).toBe('male-qn-daxuesheng')
    })

    it('agentVoiceMap 为空时应 fallback 到 defaultVoice', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        selectedAgents: ['assistant'],
        agentVoiceMap: {},
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      const assistantProfile = profiles.find((p: { id: string }) => p.id === 'assistant')
      const assistantAgent = PRESET_AGENTS.find(a => a.id === 'assistant')!
      expect(assistantProfile.voiceId).toBe(assistantAgent.defaultVoice)
    })

    it('教师 voiceId 应取 teacherVoice，有值时', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        teacherVoice: 'female-yujie',
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      expect(profiles[0].voiceId).toBe('female-yujie')
    })

    it('教师 teacherVoice 为空时应 fallback 到 teacher 的 defaultVoice', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        teacherVoice: '',
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      const teacherAgent = PRESET_AGENTS.find(a => a.id === 'teacher')!
      expect(profiles[0].voiceId).toBe(teacherAgent.defaultVoice)
    })

    it('selectedAgents 为空时应只包含 teacher', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        selectedAgents: [],
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      expect(profiles).toHaveLength(1)
      expect(profiles[0].id).toBe('teacher')
    })

    it('每个 profile 应包含 id, name, emoji, description, voiceId', () => {
      const settings = createTestSettings({
        classroomAgentMode: 'preset',
        selectedAgents: ['curious'],
      })
      const headers = buildHeadersFromSettings(settings)
      const profiles = JSON.parse(headers['x-agent-profiles'])
      profiles.forEach((profile: Record<string, unknown>) => {
        expect(profile).toHaveProperty('id')
        expect(profile).toHaveProperty('name')
        expect(profile).toHaveProperty('emoji')
        expect(profile).toHaveProperty('description')
        expect(profile).toHaveProperty('voiceId')
      })
    })
  })

  describe('x-agent-profiles（auto 模式）', () => {
    it('auto 模式下不应包含 x-agent-profiles Header', () => {
      const settings = createTestSettings({ classroomAgentMode: 'auto' })
      const headers = buildHeadersFromSettings(settings)
      expect(headers).not.toHaveProperty('x-agent-profiles')
    })
  })

  describe('x-teacher-voice', () => {
    it('应始终包含 x-teacher-voice Header', () => {
      const settings = createTestSettings()
      const headers = buildHeadersFromSettings(settings)
      expect(headers).toHaveProperty('x-teacher-voice')
    })

    it('有值时应使用 teacherVoice', () => {
      const settings = createTestSettings({ teacherVoice: 'female-yujie' })
      const headers = buildHeadersFromSettings(settings)
      expect(headers['x-teacher-voice']).toBe('female-yujie')
    })

    it('为空时应 fallback 到 female-tianmei', () => {
      const settings = createTestSettings({ teacherVoice: '' })
      const headers = buildHeadersFromSettings(settings)
      expect(headers['x-teacher-voice']).toBe('female-tianmei')
    })
  })

  describe('x-max-discussion-rounds', () => {
    it('应始终包含 x-max-discussion-rounds Header', () => {
      const settings = createTestSettings()
      const headers = buildHeadersFromSettings(settings)
      expect(headers).toHaveProperty('x-max-discussion-rounds')
    })

    it('应使用 maxDiscussionRounds 的值', () => {
      const settings = createTestSettings({ maxDiscussionRounds: 5 })
      const headers = buildHeadersFromSettings(settings)
      expect(headers['x-max-discussion-rounds']).toBe('5')
    })

    it('默认值应为 3', () => {
      const settings = createTestSettings({ maxDiscussionRounds: 3 })
      const headers = buildHeadersFromSettings(settings)
      expect(headers['x-max-discussion-rounds']).toBe('3')
    })
  })
})
