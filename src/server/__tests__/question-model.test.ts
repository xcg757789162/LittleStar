import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChildSettings } from '@/types/models'
import { createQuestionModel, resolveLLMBaseUrl, resolveQuestionProviderType } from '../question-model'

const mocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  openaiChat: vi.fn(),
  createAnthropic: vi.fn(),
  anthropicChat: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  googleChat: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mocks.createOpenAI,
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mocks.createAnthropic,
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}))

const baseSettings = {
  dailyLearningMinutes: 20,
  preferredSubjects: ['english'],
  difficultyAdjustment: 0,
  voiceEnabled: true,
  soundEffectsEnabled: true,
  llmProviderId: 'backend-openai',
  llmModel: 'openai:gpt-4o-mini',
  llmApiKey: 'test-key',
  llmBaseUrl: '',
  enableTTS: false,
  ttsProviderId: '',
  ttsApiKey: '',
  ttsVoice: '',
  ttsSpeed: 1,
  enableASR: false,
  asrProviderId: '',
  asrApiKey: '',
  asrBaseUrl: '',
  asrLanguage: 'auto',
  enableISE: false,
  iseProviderId: '',
  iseAppId: '',
  iseApiKey: '',
  iseApiSecret: '',
  enableWebSearch: false,
  webSearchProviderId: '',
  webSearchApiKey: '',
  enablePDF: false,
  pdfProviderId: '',
  pdfApiKey: '',
  pdfBaseUrl: '',
  enableImageGeneration: false,
  imageProviderId: '',
  imageApiKey: '',
  imageBaseUrl: '',
  imageModel: '',
  enableVideoGeneration: false,
  videoProviderId: '',
  videoApiKey: '',
  videoBaseUrl: '',
  videoModel: '',
  userNickname: 'Tester',
  userBio: '',
} as unknown as ChildSettings

describe('question-model', () => {
  beforeEach(() => {
    mocks.openaiChat.mockReset()
    mocks.anthropicChat.mockReset()
    mocks.googleChat.mockReset()
    mocks.createOpenAI.mockReset()
    mocks.createAnthropic.mockReset()
    mocks.createGoogleGenerativeAI.mockReset()

    mocks.openaiChat.mockReturnValue('openai-model')
    mocks.anthropicChat.mockReturnValue('anthropic-model')
    mocks.googleChat.mockReturnValue('google-model')

    mocks.createOpenAI.mockReturnValue({
      chat: mocks.openaiChat,
    })
    mocks.createAnthropic.mockReturnValue({
      chat: mocks.anthropicChat,
    })
    mocks.createGoogleGenerativeAI.mockReturnValue({
      chat: mocks.googleChat,
    })
  })

  it('should use OpenAI-compatible client for backend-openai models', () => {
    const model = createQuestionModel({
      ...baseSettings,
      llmProviderId: 'backend-openai',
      llmModel: 'openai:gpt-4o-mini',
    })

    expect(resolveQuestionProviderType(baseSettings)).toBe('openai')
    expect(resolveLLMBaseUrl(baseSettings)).toBe('https://api.openai.com/v1')
    expect(mocks.createOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
    })
    expect(mocks.openaiChat).toHaveBeenCalledWith('gpt-4o-mini')
    expect(model).toBe('openai-model')
  })

  it('should route MiniMax provider through Anthropic-compatible client', () => {
    const minimaxSettings = {
      ...baseSettings,
      llmProviderId: 'minimax',
      llmModel: 'minimax:MiniMax-M2',
    }

    const model = createQuestionModel(minimaxSettings)

    expect(resolveQuestionProviderType(minimaxSettings)).toBe('anthropic')
    expect(resolveLLMBaseUrl(minimaxSettings)).toBe('https://api.minimaxi.com/anthropic/v1')
    expect(mocks.createAnthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.minimaxi.com/anthropic/v1',
    })
    expect(mocks.anthropicChat).toHaveBeenCalledWith('MiniMax-M2')
    expect(model).toBe('anthropic-model')
  })

  it('should infer MiniMax protocol from model prefix even when provider id is custom', () => {
    const minimaxSettings = {
      ...baseSettings,
      llmProviderId: 'backend-custom',
      llmModel: 'minimax:MiniMax-M2.1',
    }

    const model = createQuestionModel(minimaxSettings)

    expect(resolveQuestionProviderType(minimaxSettings)).toBe('anthropic')
    expect(resolveLLMBaseUrl(minimaxSettings)).toBe('https://api.minimaxi.com/anthropic/v1')
    expect(mocks.createAnthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.minimaxi.com/anthropic/v1',
    })
    expect(mocks.anthropicChat).toHaveBeenCalledWith('MiniMax-M2.1')
    expect(model).toBe('anthropic-model')
  })

  it('should use Google client for Gemini models', () => {
    const geminiSettings = {
      ...baseSettings,
      llmProviderId: 'backend-gemini',
      llmModel: 'google:gemini-2.0-flash',
    }

    const model = createQuestionModel(geminiSettings)

    expect(resolveQuestionProviderType(geminiSettings)).toBe('google')
    expect(resolveLLMBaseUrl(geminiSettings)).toBeUndefined()
    expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: undefined,
    })
    expect(mocks.googleChat).toHaveBeenCalledWith('gemini-2.0-flash')
    expect(model).toBe('google-model')
  })
})
