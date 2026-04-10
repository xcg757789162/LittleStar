/**
 * buildHeadersFromSettings 工具函数测试
 *
 * 测试从 ChildSettings 构建完整 HTTP Headers 用于 OpenMAIC 子 API 调用。
 * Headers 包含：x-model、x-api-key、x-base-url、x-image-generation-enabled 等。
 *
 * 参考设计决策 D2：Headers 配置从 settingsStore 一次性读取。
 */
import { describe, it, expect } from 'vitest'
import { buildHeadersFromSettings } from '../headers-builder'
import type { ChildSettings } from '@/types/models'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'

/** 创建完整的 ChildSettings 测试数据 */
function createTestSettings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    // 基础设置
    dailyLearningMinutes: 15,
    preferredSubjects: ['english'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
    // 高级课堂设置
    ...DEFAULT_ADVANCED_SETTINGS,
    ...overrides,
  }
}

describe('buildHeadersFromSettings', () => {
  describe('LLM configuration headers', () => {
    it('should map llmModel to x-model header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-model']).toBe('openai:gpt-4o')
    })

    it('should map llmApiKey to x-api-key header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key-123',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-api-key']).toBe('sk-test-key-123')
    })

    it('should map llmBaseUrl to x-base-url header when provided', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        llmBaseUrl: 'https://custom-api.example.com/v1',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-base-url']).toBe('https://custom-api.example.com/v1')
    })

    it('should NOT include x-base-url header when llmBaseUrl is empty', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        llmBaseUrl: '',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-base-url']).toBeUndefined()
    })
  })

  describe('TTS configuration headers', () => {
    it('should include x-tts-enabled header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableTTS: true,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-tts-enabled']).toBe('true')
    })

    it('should include x-tts-enabled as false when TTS is disabled', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableTTS: false,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-tts-enabled']).toBe('false')
    })

    it('should map TTS provider settings to headers', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableTTS: true,
        ttsProviderId: 'volcengine',
        ttsVoice: 'zh_female_01',
        ttsSpeed: 0.8,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-tts-provider']).toBe('volcengine')
      expect(headers['x-tts-voice']).toBe('zh_female_01')
      expect(headers['x-tts-speed']).toBe('0.8')
    })

    it('should NOT include TTS provider headers when values are empty', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableTTS: true,
        ttsProviderId: '',
        ttsVoice: '',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-tts-provider']).toBeUndefined()
      expect(headers['x-tts-voice']).toBeUndefined()
    })
  })

  describe('generation feature flags', () => {
    it('should include x-image-generation-enabled header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableImageGeneration: true,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-image-generation-enabled']).toBe('true')
    })

    it('should include x-video-generation-enabled header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableVideoGeneration: true,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-video-generation-enabled']).toBe('true')
    })

    it('should set feature flags to false when disabled', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        enableImageGeneration: false,
        enableVideoGeneration: false,
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-image-generation-enabled']).toBe('false')
      expect(headers['x-video-generation-enabled']).toBe('false')
    })
  })

  describe('agent mode header', () => {
    it('should include x-agent-mode header', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
        classroomAgentMode: 'auto',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-agent-mode']).toBe('auto')
    })

    it('should default to preset mode', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(headers['x-agent-mode']).toBe('preset')
    })
  })

  describe('validation', () => {
    it('should throw error when llmModel is empty', () => {
      const settings = createTestSettings({
        llmModel: '',
        llmApiKey: 'sk-test-key',
      })

      expect(() => buildHeadersFromSettings(settings)).toThrow(/模型/)
    })

    it('should throw error when llmApiKey is empty', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: '',
      })

      expect(() => buildHeadersFromSettings(settings)).toThrow(/API Key/)
    })

    it('should throw error when both llmModel and llmApiKey are empty', () => {
      const settings = createTestSettings({
        llmModel: '',
        llmApiKey: '',
      })

      expect(() => buildHeadersFromSettings(settings)).toThrow()
    })
  })

  describe('complete headers object', () => {
    it('should build complete headers with all settings', () => {
      const settings = createTestSettings({
        llmModel: 'doubao:doubao-pro-32k',
        llmApiKey: 'ff7c5ae7-test',
        llmBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        enableTTS: true,
        ttsProviderId: 'volcengine',
        ttsVoice: 'zh_female_sichuan',
        ttsSpeed: 1.2,
        enableImageGeneration: true,
        enableVideoGeneration: false,
        classroomAgentMode: 'auto',
      })

      const headers = buildHeadersFromSettings(settings)

      // 验证所有 headers 都正确生成
      expect(headers['x-model']).toBe('doubao:doubao-pro-32k')
      expect(headers['x-api-key']).toBe('ff7c5ae7-test')
      expect(headers['x-base-url']).toBe('https://ark.cn-beijing.volces.com/api/v3')
      expect(headers['x-tts-enabled']).toBe('true')
      expect(headers['x-tts-provider']).toBe('volcengine')
      expect(headers['x-tts-voice']).toBe('zh_female_sichuan')
      expect(headers['x-tts-speed']).toBe('1.2')
      expect(headers['x-image-generation-enabled']).toBe('true')
      expect(headers['x-video-generation-enabled']).toBe('false')
      expect(headers['x-agent-mode']).toBe('auto')
    })

    it('should return a Record<string, string> type', () => {
      const settings = createTestSettings({
        llmModel: 'openai:gpt-4o',
        llmApiKey: 'sk-test-key',
      })

      const headers = buildHeadersFromSettings(settings)

      expect(typeof headers).toBe('object')
      // All values should be strings
      for (const [key, value] of Object.entries(headers)) {
        expect(typeof key).toBe('string')
        expect(typeof value).toBe('string')
      }
    })
  })
})
