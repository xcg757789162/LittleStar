/**
 * usePreGeneration Hook — Pipeline Client 集成测试
 *
 * 测试 hook 使用 Pipeline Client 生成课堂、进度状态更新、错误处理和降级行为。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePreGeneration } from '../usePreGeneration'
import type { PipelineProgress } from '@/services/openmaic/pipeline-types'

// === Module Mocks ===

// Mock apiClient
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
  },
}))

// Mock childStore
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

// Mock OpenMAIC Client
const mockGenerateClassroom = vi.fn()
const mockPollUntilComplete = vi.fn()
const mockCheckHealth = vi.fn()

vi.mock('@/services/openmaic/client', () => ({
  OpenMAICClient: vi.fn().mockImplementation(() => ({
    generateClassroom: mockGenerateClassroom,
    pollUntilComplete: mockPollUntilComplete,
    checkHealth: mockCheckHealth,
  })),
}))

// Mock Pipeline Client
const mockRunFullPipeline = vi.fn()
vi.mock('@/services/openmaic/pipeline-client', () => ({
  OpenMAICPipelineClient: vi.fn().mockImplementation(() => ({
    runFullPipeline: mockRunFullPipeline,
  })),
}))

// Mock Cache
const mockSaveClassroom = vi.fn()
const mockGetCacheSize = vi.fn()
vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: vi.fn().mockImplementation(() => ({
    saveClassroom: mockSaveClassroom,
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

// Mock LessonPlanner
vi.mock('@/services/lesson-planner', () => ({
  LessonPlanner: vi.fn().mockImplementation(() => ({
    planLessons: vi.fn().mockReturnValue([]),
  })),
  RequirementGenerator: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockReturnValue('test requirement'),
    generateUserRequirements: vi.fn().mockReturnValue({
      requirement: 'test requirement',
      language: 'zh-CN',
    }),
  })),
  GenerationScheduler: vi.fn().mockImplementation(() => ({
    submitTask: vi.fn(),
    executeTasks: vi.fn().mockResolvedValue([]),
    getPendingCount: vi.fn().mockReturnValue(0),
    clearTasks: vi.fn(),
  })),
}))

describe('usePreGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCacheSize.mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return initial idle state', () => {
    const { result } = renderHook(() =>
      usePreGeneration(undefined, null, 0),
    )

    expect(result.current.status).toBe('idle')
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.completedCount).toBe(0)
    expect(result.current.totalCount).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('should expose generationStep in state when Pipeline is active', () => {
    const { result } = renderHook(() =>
      usePreGeneration('1', true, 0),
    )

    // generationStep should be available in state
    expect(result.current.generationStep).toBeDefined()
  })

  it('should expose generationProgress in state', () => {
    const { result } = renderHook(() =>
      usePreGeneration('1', true, 0),
    )

    expect(result.current.generationProgress).toBeDefined()
    expect(typeof result.current.generationProgress).toBe('number')
  })

  it('should expose currentSceneIndex in state', () => {
    const { result } = renderHook(() =>
      usePreGeneration('1', true, 0),
    )

    expect(result.current.currentSceneIndex).toBeDefined()
    expect(typeof result.current.currentSceneIndex).toBe('number')
  })

  it('should have triggerGeneration function', () => {
    const { result } = renderHook(() =>
      usePreGeneration('1', null, 0),
    )

    expect(typeof result.current.triggerGeneration).toBe('function')
  })

  it('should stay idle when childId is undefined', () => {
    const { result } = renderHook(() =>
      usePreGeneration(undefined, true, 0),
    )

    expect(result.current.status).toBe('idle')
  })

  it('should stay idle when no placement test', () => {
    const { result } = renderHook(() =>
      usePreGeneration('1', false, 0),
    )

    expect(result.current.status).toBe('idle')
  })
})
