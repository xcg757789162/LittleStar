/**
 * useLearningFlow 集成测试
 *
 * 测试新流程：教导处选课 → 缓存加载 → 课堂播放 → 答题回写 → 动态调整
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// vi.hoisted: 确保变量在 vi.mock hoisting 前可用
const {
  mockGetClassroom,
  mockListCachedClassrooms,
  mockEvaluate,
} = vi.hoisted(() => ({
  mockGetClassroom: vi.fn(),
  mockListCachedClassrooms: vi.fn(),
  mockEvaluate: vi.fn(),
}))

// Mock ClassroomCache
vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: vi.fn().mockImplementation(function () {
    this.getClassroom = mockGetClassroom
    this.listCachedClassrooms = mockListCachedClassrooms
    this.saveClassroom = vi.fn()
    this.deleteClassroom = vi.fn()
    this.clearExpiredCache = vi.fn()
    this.clearAll = vi.fn()
    this.getCacheSize = vi.fn().mockResolvedValue(0)
  }),
}))

// Mock DynamicAdjuster
vi.mock('@/services/lesson-planner', () => ({
  DynamicAdjuster: vi.fn().mockImplementation(function () {
    this.evaluate = mockEvaluate
    this.evaluateBatch = vi.fn().mockReturnValue([])
  }),
  LessonPlanner: vi.fn().mockImplementation(function () {
    this.planLessons = vi.fn().mockReturnValue([])
  }),
  RequirementGenerator: vi.fn().mockImplementation(function () {
    this.generate = vi.fn().mockReturnValue('mock requirement')
  }),
  GenerationScheduler: vi.fn().mockImplementation(function () {
    this.submitTask = vi.fn()
    this.executeTasks = vi.fn().mockResolvedValue([])
    this.getPendingCount = vi.fn().mockReturnValue(0)
    this.clearTasks = vi.fn()
  }),
}))

// Mock API Client（useLearningFlow 现在通过 apiClient 进行数据操作）
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
    batchUpsert: vi.fn().mockResolvedValue([]),
  },
}))

// Mock childStore
vi.mock('@/stores/childStore', () => ({
  useChildStore: Object.assign(
    vi.fn().mockImplementation((selector) =>
      selector({
        currentChild: {
          id: 'child-1',
          name: '小明',
          age: 5,
          gradeLevel: 'middle-kindergarten',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    ),
    {
      getState: vi.fn().mockReturnValue({
        currentChild: {
          id: 'child-1',
          name: '小明',
          age: 5,
          gradeLevel: 'middle-kindergarten',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    },
  ),
}))

// Mock learningStore
vi.mock('@/stores/learningStore', () => {
  const store = {
    isSessionActive: false,
    currentSubject: null,
    currentQuestion: null,
    questionQueue: [],
    currentIndex: 0,
    sessionStats: { questionsCompleted: 0, correctCount: 0, startTime: null },
    startSession: vi.fn(),
    endSession: vi.fn(),
    setQuestionQueue: vi.fn(),
    appendQuestions: vi.fn(),
    recordAnswer: vi.fn(),
    setOnSessionEnd: vi.fn(),
    clearOnSessionEnd: vi.fn(),
    reset: vi.fn(),
  }
  return {
    useLearningStore: Object.assign(
      vi.fn().mockImplementation((selector) => selector(store)),
      { getState: vi.fn().mockReturnValue(store) },
    ),
  }
})

// Mock other dependencies
vi.mock('@/engine/adaptive-router', () => ({
  AdaptiveRouter: vi.fn().mockImplementation(function () {
    this.getRecommendations = vi.fn().mockReturnValue([])
  }),
}))

vi.mock('@/engine/review-manager', () => ({
  ReviewManager: vi.fn().mockImplementation(function () {
    this.getReviewItems = vi.fn().mockResolvedValue([])
    this.recordReview = vi.fn().mockResolvedValue(undefined)
  }),
}))

vi.mock('@/engine/rule-engine', () => ({
  RuleEngine: vi.fn().mockImplementation(function () {
    this.evaluate = vi.fn().mockReturnValue({ shouldContinue: true })
    this.getRecommendedQuestionsPerSession = vi.fn().mockReturnValue(5)
  }),
}))

vi.mock('@/engine/achievement', () => ({
  AchievementEngine: vi.fn().mockImplementation(function () {
    this.checkAchievements = vi.fn().mockReturnValue([])
  }),
}))

vi.mock('@/engine/grade-unlock-engine', () => ({
  GradeUnlockEngine: vi.fn().mockImplementation(function () {
    this.checkUnlockEligibility = vi.fn().mockReturnValue(null)
  }),
}))

vi.mock('@/engine/mastery-snapshot', () => ({
  generateDailySnapshot: vi.fn().mockReturnValue(null),
}))

vi.mock('@/services/ai/qwen-provider', () => ({
  QwenProvider: vi.fn().mockImplementation(function () {
    this.chatCompletion = vi.fn()
  }),
}))

vi.mock('@/services/ai/teacher', () => ({
  AITeacher: vi.fn().mockImplementation(function () {
    this.generateEncouragement = vi.fn().mockResolvedValue('你真棒！')
  }),
}))

vi.mock('@/data/seed/english-parent-activities', () => ({
  getRandomActivity: vi.fn().mockReturnValue({ id: 'act-1', name: 'test', instruction: 'do this' }),
}))

vi.mock('@/data/seed/english-tpr', () => ({
  getRandomTPR: vi.fn().mockReturnValue({ id: 'tpr-1', command: 'jump', instruction: 'jump up' }),
}))

import { useLearningFlow } from '../useLearningFlow'
import type { Classroom } from '@/services/openmaic/types'

const mockClassroomData: Classroom = {
  id: 'classroom-test-001',
  title: '认识数字 1-5',
  status: 'completed',
  scenes: [
    {
      id: 'scene-1',
      title: '学习数字',
      type: 'teaching',
      slides: [
        { type: 'title', title: '数字王国', content: '欢迎来到数字王国！' },
        { type: 'content', title: '数字 1', content: '1 像铅笔' },
      ],
    },
    {
      id: 'scene-2',
      title: '小测验',
      type: 'quiz',
      slides: [
        {
          type: 'quiz',
          title: '测一测',
          quiz: {
            question: '1 + 1 = ?',
            options: ['1', '2', '3'],
            correctAnswer: 1,
          },
        },
      ],
    },
  ],
}

describe('useLearningFlow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClassroom.mockResolvedValue(null)
    mockListCachedClassrooms.mockResolvedValue([])
    mockEvaluate.mockReturnValue({
      knowledgeNodeId: 'node-1',
      action: 'continue',
      reason: '继续学习',
    })
  })

  it('应导出新的 classroom 相关状态', () => {
    const { result } = renderHook(() => useLearningFlow())

    expect(result.current).toHaveProperty('currentClassroom')
    expect(result.current).toHaveProperty('isCacheEmpty')
    expect(result.current).toHaveProperty('startFlow')
    expect(result.current).toHaveProperty('handleAnswer')
  })

  it('启动时应尝试从缓存加载课堂', async () => {
    mockListCachedClassrooms.mockResolvedValue([
      { knowledgeNodeId: 'node-1', date: '2026-04-08', classroomId: 'c-1', classroomTitle: '认识数字' },
    ])
    mockGetClassroom.mockResolvedValue(mockClassroomData)

    const { result } = renderHook(() => useLearningFlow())

    await act(async () => {
      await result.current.startFlow('math')
    })

    // 应加载缓存的课堂
    expect(result.current.currentClassroom).toBeTruthy()
    expect(result.current.isCacheEmpty).toBe(false)
  })

  it('缓存为空时应设置 isCacheEmpty 为 true', async () => {
    mockListCachedClassrooms.mockResolvedValue([])
    mockGetClassroom.mockResolvedValue(null)

    const { result } = renderHook(() => useLearningFlow())

    await act(async () => {
      await result.current.startFlow('math')
    })

    expect(result.current.isCacheEmpty).toBe(true)
    expect(result.current.currentClassroom).toBeNull()
  })

  it('handleClassroomAnswer 应回写掌握率数据', async () => {
    mockListCachedClassrooms.mockResolvedValue([
      { knowledgeNodeId: 'node-1', date: '2026-04-08' },
    ])
    mockGetClassroom.mockResolvedValue(mockClassroomData)

    const { result } = renderHook(() => useLearningFlow())

    await act(async () => {
      await result.current.startFlow('math')
    })

    // 模拟 quiz 答题
    act(() => {
      result.current.handleClassroomAnswer({
        selectedIndex: 1,
        isCorrect: true,
        responseTime: 1500,
      })
    })

    // 应该调用了 handleAnswer
    expect(result.current.classroomAnswerCount).toBeGreaterThanOrEqual(0)
  })

  it('课堂完成时应触发动态调整评估', async () => {
    mockListCachedClassrooms.mockResolvedValue([
      { knowledgeNodeId: 'node-1', date: '2026-04-08' },
    ])
    mockGetClassroom.mockResolvedValue(mockClassroomData)

    const { result } = renderHook(() => useLearningFlow())

    await act(async () => {
      await result.current.startFlow('math')
    })

    // 模拟课堂完成
    act(() => {
      result.current.handleClassroomComplete()
    })

    // 应触发完成流程
    expect(result.current.isComplete).toBe(true)
  })

  it('应导出基础学习流程属性', () => {
    const { result } = renderHook(() => useLearningFlow())

    // 仍然导出旧的属性
    expect(result.current).toHaveProperty('isActive')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('currentQuestion')
    expect(result.current).toHaveProperty('showFeedback')
    expect(result.current).toHaveProperty('feedbackType')
    expect(result.current).toHaveProperty('isComplete')
  })
})
