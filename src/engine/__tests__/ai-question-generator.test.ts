import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChildSettings } from '@/types/models'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'
import { generateQuestion } from '../ai-question-generator'

const { mockCreateOpenAI, mockChat, mockGenerateObject, mockModel } = vi.hoisted(() => {
  const mockModel = { provider: 'mock-model' } as never
  const mockChat = vi.fn(() => mockModel)
  const mockCreateOpenAI = vi.fn(() => ({ chat: mockChat }))
  const mockGenerateObject = vi.fn()

  return {
    mockModel,
    mockChat,
    mockCreateOpenAI,
    mockGenerateObject,
  }
})

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mockCreateOpenAI,
}))

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
}))

function createTestSettings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    dailyLearningMinutes: 15,
    preferredSubjects: ['chinese'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
    ...DEFAULT_ADVANCED_SETTINGS,
    ...overrides,
  }
}

describe('generateQuestion', () => {
  beforeEach(() => {
    mockChat.mockReturnValue(mockModel)
    mockCreateOpenAI.mockClear()
    mockChat.mockClear()
    mockGenerateObject.mockReset()
    mockGenerateObject.mockResolvedValue({
      object: {
        stem: '“山”字一共有几画？',
        options: [
          { text: '2画', emoji: '2️⃣' },
          { text: '3画', emoji: '3️⃣' },
          { text: '4画', emoji: '4️⃣' },
          { text: '5画', emoji: '5️⃣' },
        ],
        correctIndex: 0,
        difficulty: 1,
      },
    })
  })

  it.each([
    {
      llmProviderId: 'backend-qwen',
      llmModel: 'qwen:qwen-plus',
      llmApiKey: 'test-qwen-key',
      expectedBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      expectedModelId: 'qwen-plus',
    },
    {
      llmProviderId: 'backend-deepseek',
      llmModel: 'deepseek:deepseek-chat',
      llmApiKey: 'test-deepseek-key',
      expectedBaseUrl: 'https://api.deepseek.com/v1',
      expectedModelId: 'deepseek-chat',
    },
    {
      llmProviderId: 'backend-doubao',
      llmModel: 'doubao:doubao-pro-32k',
      llmApiKey: 'test-doubao-key',
      expectedBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      expectedModelId: 'doubao-pro-32k',
    },
    {
      llmProviderId: 'backend-openai',
      llmModel: 'openai:gpt-4o',
      llmApiKey: 'test-openai-key',
      expectedBaseUrl: 'https://api.openai.com/v1',
      expectedModelId: 'gpt-4o',
    },
  ])('缺失 llmBaseUrl 时应根据 provider 回退默认地址：$llmProviderId', async ({
    llmProviderId,
    llmModel,
    llmApiKey,
    expectedBaseUrl,
    expectedModelId,
  }) => {
    const settings = createTestSettings({
      llmProviderId,
      llmModel,
      llmApiKey,
      llmBaseUrl: '',
    })

    await generateQuestion(
      { id: 'node-1', name: '笔画', description: '认识基础笔画' },
      'grade-1',
      'chinese',
      settings,
    )

    expect(mockCreateOpenAI).toHaveBeenCalledWith({
      apiKey: llmApiKey,
      baseURL: expectedBaseUrl,
    })
    expect(mockChat).toHaveBeenCalledWith(expectedModelId)
  })

  it('缺失 llmProviderId 时应根据 llmModel 前缀推断 Qwen 默认地址', async () => {
    const settings = createTestSettings({
      llmProviderId: '',
      llmModel: 'qwen:qwen-plus',
      llmApiKey: 'test-qwen-key',
      llmBaseUrl: '',
    })

    await generateQuestion(
      { id: 'node-1', name: '笔画', description: '认识基础笔画' },
      'grade-1',
      'chinese',
      settings,
    )

    expect(mockCreateOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-qwen-key',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })
    expect(mockChat).toHaveBeenCalledWith('qwen-plus')
  })
})
