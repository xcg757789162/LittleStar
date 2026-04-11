/**
 * ChildSettings 高级课堂设置扩展测试
 *
 * 测试 ChildSettings 接口新增的高级课堂设置字段：
 * - enableTTS / ttsProviderId / ttsVoice / ttsSpeed
 * - enableImageGeneration / enableVideoGeneration
 * - classroomAgentMode
 * - selfIntroduction
 * - llmModel / llmApiKey / llmBaseUrl
 *
 * 按设计 D6：高级课堂设置归入现有 ChildSettings，通过 childStore 管理
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useChildStore } from '../childStore'
import type { Child, ChildSettings } from '@/types/models'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'

/** 创建测试用 Child 对象 */
function createTestChild(overrides: Partial<Child> = {}): Child {
  return {
    id: 'child-1',
    userId: 'user-1',
    name: '小明',
    avatar: '🦊',
    age: 5,
    gradeLevel: 'senior-kindergarten',
    createdAt: new Date(),
    settings: {
      dailyLearningMinutes: 15,
      preferredSubjects: ['english'],
      difficultyAdjustment: 0,
      voiceEnabled: true,
      soundEffectsEnabled: true,
      // 新增字段应使用默认值
      ...DEFAULT_ADVANCED_SETTINGS,
    },
    ...overrides,
  }
}

describe('ChildSettings Advanced Classroom Settings', () => {
  beforeEach(() => {
    useChildStore.getState().reset()
  })

  describe('DEFAULT_ADVANCED_SETTINGS', () => {
    it('should export default values for all advanced settings', () => {
      expect(DEFAULT_ADVANCED_SETTINGS).toBeDefined()
      expect(DEFAULT_ADVANCED_SETTINGS.enableTTS).toBe(true)
      expect(DEFAULT_ADVANCED_SETTINGS.ttsProviderId).toBe('')
      expect(DEFAULT_ADVANCED_SETTINGS.ttsVoice).toBe('')
      expect(DEFAULT_ADVANCED_SETTINGS.ttsSpeed).toBe(1.0)
      expect(DEFAULT_ADVANCED_SETTINGS.enableImageGeneration).toBe(false)
      expect(DEFAULT_ADVANCED_SETTINGS.enableVideoGeneration).toBe(false)
      expect(DEFAULT_ADVANCED_SETTINGS.classroomAgentMode).toBe('preset')
      expect(DEFAULT_ADVANCED_SETTINGS.selfIntroduction).toBe('')
      expect(DEFAULT_ADVANCED_SETTINGS.llmModel).toBe('')
      expect(DEFAULT_ADVANCED_SETTINGS.llmApiKey).toBe('')
      expect(DEFAULT_ADVANCED_SETTINGS.llmBaseUrl).toBe('')
    })
  })

  describe('ChildSettings type structure', () => {
    it('should accept settings with all new advanced fields', () => {
      const settings: ChildSettings = {
        dailyLearningMinutes: 15,
        preferredSubjects: ['english'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
        // Advanced classroom settings
        ...DEFAULT_ADVANCED_SETTINGS,
        enableTTS: true,
        ttsProviderId: 'volcengine',
        ttsVoice: 'zh_female_01',
        ttsSpeed: 0.9,
        enableImageGeneration: true,
        enableVideoGeneration: false,
        classroomAgentMode: 'auto',
        selfIntroduction: '我叫小明，今年5岁',
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        llmBaseUrl: 'https://api.openai.com',
      }

      expect(settings.enableTTS).toBe(true)
      expect(settings.ttsProviderId).toBe('volcengine')
      expect(settings.ttsVoice).toBe('zh_female_01')
      expect(settings.ttsSpeed).toBe(0.9)
      expect(settings.enableImageGeneration).toBe(true)
      expect(settings.enableVideoGeneration).toBe(false)
      expect(settings.classroomAgentMode).toBe('auto')
      expect(settings.selfIntroduction).toBe('我叫小明，今年5岁')
      expect(settings.llmModel).toBe('openai:gpt-4o')
      expect(settings.llmApiKey).toBe('sk-test-key')
      expect(settings.llmBaseUrl).toBe('https://api.openai.com')
    })

    it('should allow classroomAgentMode to be preset or auto', () => {
      const preset: ChildSettings = {
        ...DEFAULT_ADVANCED_SETTINGS,
        dailyLearningMinutes: 15,
        preferredSubjects: ['english'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
        classroomAgentMode: 'preset',
      }
      const auto: ChildSettings = {
        ...preset,
        classroomAgentMode: 'auto',
      }
      expect(preset.classroomAgentMode).toBe('preset')
      expect(auto.classroomAgentMode).toBe('auto')
    })
  })

  describe('childStore.updateChildSettings with advanced fields', () => {
    it('should update TTS settings', () => {
      const child = createTestChild()
      useChildStore.getState().addChild(child)

      useChildStore.getState().updateChildSettings('child-1', {
        enableTTS: false,
        ttsProviderId: 'azure',
        ttsVoice: 'en-US-JennyNeural',
        ttsSpeed: 1.2,
      })

      const updated = useChildStore.getState().currentChild
      expect(updated?.settings.enableTTS).toBe(false)
      expect(updated?.settings.ttsProviderId).toBe('azure')
      expect(updated?.settings.ttsVoice).toBe('en-US-JennyNeural')
      expect(updated?.settings.ttsSpeed).toBe(1.2)
    })

    it('should update image/video generation settings', () => {
      const child = createTestChild()
      useChildStore.getState().addChild(child)

      useChildStore.getState().updateChildSettings('child-1', {
        enableImageGeneration: true,
        enableVideoGeneration: true,
      })

      const updated = useChildStore.getState().currentChild
      expect(updated?.settings.enableImageGeneration).toBe(true)
      expect(updated?.settings.enableVideoGeneration).toBe(true)
    })

    it('should update agent mode and self introduction', () => {
      const child = createTestChild()
      useChildStore.getState().addChild(child)

      useChildStore.getState().updateChildSettings('child-1', {
        classroomAgentMode: 'auto',
        selfIntroduction: '我喜欢画画和小动物',
      })

      const updated = useChildStore.getState().currentChild
      expect(updated?.settings.classroomAgentMode).toBe('auto')
      expect(updated?.settings.selfIntroduction).toBe('我喜欢画画和小动物')
    })

    it('should update LLM configuration', () => {
      const child = createTestChild()
      useChildStore.getState().addChild(child)

      useChildStore.getState().updateChildSettings('child-1', {
        llmModel: 'doubao:doubao-pro-32k',
        llmApiKey: 'ff7c5ae7-test',
        llmBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      })

      const updated = useChildStore.getState().currentChild
      expect(updated?.settings.llmModel).toBe('doubao:doubao-pro-32k')
      expect(updated?.settings.llmApiKey).toBe('ff7c5ae7-test')
      expect(updated?.settings.llmBaseUrl).toBe('https://ark.cn-beijing.volces.com/api/v3')
    })

    it('should preserve existing basic settings when updating advanced settings', () => {
      const child = createTestChild()
      useChildStore.getState().addChild(child)

      useChildStore.getState().updateChildSettings('child-1', {
        enableTTS: false,
      })

      const updated = useChildStore.getState().currentChild
      // Basic settings preserved
      expect(updated?.settings.dailyLearningMinutes).toBe(15)
      expect(updated?.settings.voiceEnabled).toBe(true)
      // Advanced setting updated
      expect(updated?.settings.enableTTS).toBe(false)
    })
  })
})
