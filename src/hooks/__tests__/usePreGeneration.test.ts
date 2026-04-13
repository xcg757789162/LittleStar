/**
 * usePreGeneration Hook — 预生成水位线行为测试
 *
 * 重点验证：最小水位线应按已完成评测的科目数动态计算，
 * 避免两科已测却仍然强制补到 3 节缓存。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { buildPreGenerationChildSettings, usePreGeneration } from '../usePreGeneration'

const mockApiGet = vi.fn()
const mockFetch = vi.fn()

vi.mock('@/services/api', () => ({
  apiClient: {
    get: mockApiGet,
  },
}))

const mockChild = {
  id: '1',
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
    enableTTS: true,
    ttsProviderId: '',
    ttsVoice: '',
    ttsSpeed: 1.0,
    enableImageGeneration: false,
    enableVideoGeneration: false,
    classroomAgentMode: 'preset' as const,
    selfIntroduction: '',
    llmModel: 'openai:gpt-4o',
    llmApiKey: 'sk-test-key',
    llmBaseUrl: '',
  },
}

vi.mock('@/stores/childStore', () => ({
  useChildStore: Object.assign(
    vi.fn(() => mockChild),
    {
      getState: vi.fn(() => ({
        currentChild: mockChild,
      })),
    },
  ),
}))

const mockGetCacheSize = vi.fn()
vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: vi.fn().mockImplementation(() => ({
    getCacheSize: mockGetCacheSize,
    getClassroom: vi.fn(),
    listCachedClassrooms: vi.fn(),
    deleteClassroom: vi.fn(),
    clearExpiredCache: vi.fn(),
    clearAll: vi.fn(),
  })),
}))

vi.mock('@/services/openmaic/postgres-cache-store', () => ({
  PostgresCacheStore: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@/services/lesson-planner', () => ({
  LessonPlanner: vi.fn().mockImplementation(() => ({
    planLessons: vi.fn().mockReturnValue([]),
  })),
  RequirementGenerator: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockReturnValue('test requirement'),
  })),
}))

async function flushMicrotasks(rounds = 6): Promise<void> {
  await act(async () => {
    for (let i = 0; i < rounds; i += 1) {
      await Promise.resolve()
    }
  })
}

describe('usePreGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue([])
    mockGetCacheSize.mockResolvedValue(0)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [],
        completedCount: 0,
        totalCount: 0,
        activeCount: 0,
        failedCount: 0,
        taskIds: [],
        message: 'ok',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should return initial idle state', () => {
    const { result } = renderHook(() => usePreGeneration(undefined, null, 0))

    expect(result.current.status).toBe('idle')
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.completedCount).toBe(0)
    expect(result.current.totalCount).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('should expose generation fields and trigger function', () => {
    const { result } = renderHook(() => usePreGeneration('1', null, 0))

    expect(result.current.generationStep).toBeDefined()
    expect(typeof result.current.generationProgress).toBe('number')
    expect(typeof result.current.currentSceneIndex).toBe('number')
    expect(typeof result.current.triggerGeneration).toBe('function')
  })

  it('should stay idle when childId is undefined', () => {
    const { result } = renderHook(() => usePreGeneration(undefined, true, 0))
    expect(result.current.status).toBe('idle')
  })

  it('should stay idle when no placement test', () => {
    const { result } = renderHook(() => usePreGeneration('1', false, 0))
    expect(result.current.status).toBe('idle')
  })

  it('should not auto-trigger when cached lessons already match completed subjects', async () => {
    mockApiGet.mockResolvedValue([
      { subject: 'math' },
      { subject: 'chinese' },
    ])
    mockGetCacheSize.mockResolvedValue(2)

    const { result } = renderHook(() => usePreGeneration('1', true, 2, 2))

    await flushMicrotasks()

    expect(result.current.status).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should stop manual generation when cache already reaches completed-subject waterline', async () => {
    mockApiGet.mockResolvedValue([
      { subject: 'math' },
      { subject: 'chinese' },
    ])
    mockGetCacheSize.mockResolvedValue(2)

    const { result } = renderHook(() => usePreGeneration('1', null, 0, 2))

    act(() => {
      result.current.triggerGeneration()
    })
    await flushMicrotasks()

    expect(result.current.status).toBe('completed')
    expect(result.current.completedCount).toBe(2)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should include child nickname and self introduction in submitted childSettings payload', () => {
    expect(buildPreGenerationChildSettings(mockChild)).toMatchObject({
      userNickname: '小明',
      userBio: '',
    })

    expect(buildPreGenerationChildSettings({
      ...mockChild,
      name: '  小星星  ',
      settings: {
        ...mockChild.settings,
        selfIntroduction: '我喜欢火箭和画画',
      },
    })).toMatchObject({
      userNickname: '小星星',
      userBio: '我喜欢火箭和画画',
    })
  })
})
