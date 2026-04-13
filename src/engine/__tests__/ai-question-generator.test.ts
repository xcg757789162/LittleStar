import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateQuestion } from '../ai-question-generator'
import type { ChildSettings } from '@/types/models'

vi.mock('ai', () => ({
  generateObject: vi.fn(async () => ({
    object: {
      stem: '字母 A 是哪一个？',
      options: [
        { text: 'A', emoji: '🅰️' },
        { text: 'B', emoji: '🅱️' },
        { text: 'C', emoji: '🌜' },
        { text: 'D', emoji: '🎯' },
      ],
      correctIndex: 0,
      difficulty: 2,
    },
  })),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => 'mock-model'),
  })),
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
  llmBaseUrl: 'https://api.openai.com/v1',
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

describe('generateQuestion', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('应通过同源后端代理请求 AI 评测题目', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          question: {
            stem: '找出字母 A',
            options: [
              { text: 'A', emoji: '🅰️' },
              { text: 'B', emoji: '🅱️' },
              { text: 'C', emoji: '🌜' },
              { text: 'D', emoji: '🎯' },
            ],
            correctIndex: 0,
            difficulty: 2,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await generateQuestion(
      { id: 'english-letter-a', name: '字母 A', description: '识别英文字母 A' },
      'grade-1',
      'english',
      baseSettings,
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/pre-generate/question')

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.method).toBe('POST')
    expect(JSON.parse(String(request.body))).toMatchObject({
      node: { id: 'english-letter-a', name: '字母 A' },
      gradeLevel: 'grade-1',
      subject: 'english',
      settings: {
        llmModel: 'openai:gpt-4o-mini',
        llmApiKey: 'test-key',
      },
    })

    expect(result).toEqual({
      knowledgeNodeId: 'english-letter-a',
      stem: '找出字母 A',
      options: [
        { text: 'A', emoji: '🅰️' },
        { text: 'B', emoji: '🅱️' },
        { text: 'C', emoji: '🌜' },
        { text: 'D', emoji: '🎯' },
      ],
      correctIndex: 0,
      difficulty: 2,
    })
  })

  it('代理返回异常时应降级为 null', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'cors blocked' }), { status: 502 }),
    )

    await expect(
      generateQuestion(
        { id: 'english-letter-b', name: '字母 B', description: '识别英文字母 B' },
        'grade-1',
        'english',
        baseSettings,
      ),
    ).resolves.toBeNull()
  })
})
