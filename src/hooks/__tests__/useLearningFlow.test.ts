/**
 * useLearningFlow Hook 测试
 * 测试学习主循环的完整编排逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLearningFlow } from '../useLearningFlow'
import { useLearningStore } from '@/stores/learningStore'
import type { KnowledgeNode, Subject, Question } from '@/types/models'

// 追踪 AITeacher.generateEncouragement 调用
let encouragementCallCount = 0
let lastEncouragementInput: unknown = null

// Mock ClassroomCache — 新流程缓存
const mockListCachedClassrooms = vi.fn()
const mockGetClassroom = vi.fn()

vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: class {
    listCachedClassrooms = mockListCachedClassrooms
    getClassroom = mockGetClassroom
  },
}))

// Mock DynamicAdjuster — 新流程动态调整
vi.mock('@/services/lesson-planner', () => ({
  DynamicAdjuster: class {
    evaluate = vi.fn().mockResolvedValue(undefined)
  },
}))

// Mock 引擎和服务 — 使用 class 语法确保可以 new
vi.mock('@/engine/adaptive-router', () => {
  return {
    AdaptiveRouter: class {
      getRecommendations() {
        return [
          {
            id: 'node-1',
            subject: 'math',
            gradeLevel: 'middle-kindergarten',
            name: '数字认识',
            description: '认识数字1-10',
            prerequisites: [],
            nextNodes: [],
            difficulty: 1,
            contentType: 'quiz',
            order: 1,
          },
          {
            id: 'node-2',
            subject: 'math',
            gradeLevel: 'middle-kindergarten',
            name: '数字比较',
            description: '比较大小',
            prerequisites: ['node-1'],
            nextNodes: [],
            difficulty: 2,
            contentType: 'quiz',
            order: 2,
          },
        ] satisfies KnowledgeNode[]
      }
    },
  }
})

vi.mock('@/engine/mastery', () => {
  return {
    MasteryCalculator: class {
      calculate() {
        return 75
      }
    },
  }
})

vi.mock('@/engine/rule-engine', () => {
  return {
    RuleEngine: class {
      evaluate() {
        return {
          adjustedDifficulty: 1,
          shouldContinue: true,
          isFatigued: false,
          difficultyReason: '保持当前难度',
        }
      }
      getRecommendedQuestionsPerSession() {
        return 10
      }
    },
  }
})

// 追踪 API 写入操作
let apiWriteTracker = {
  postCalls: [] as { path: string; body: unknown }[],
  patchCalls: [] as { path: string; body: unknown }[],
}

// Mock API Client（useLearningFlow 现在通过 apiClient 进行所有数据操作）
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/knowledge_nodes') {
        return [
          {
            id: 'node-1',
            subject: 'math',
            gradeLevel: 'middle-kindergarten',
            name: '数字认识',
            description: '认识数字1-10',
            prerequisites: [],
            nextNodes: [],
            difficulty: 1,
            contentType: 'quiz',
            order: 1,
          },
        ]
      }
      if (path === '/mastery_records') return []
      if (path === '/achievements') return []
      return []
    }),
    getOne: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockImplementation(async (path: string, body: unknown) => {
      apiWriteTracker.postCalls.push({ path, body })
      return { id: Date.now() }
    }),
    patch: vi.fn().mockImplementation(async (path: string, body: unknown) => {
      apiWriteTracker.patchCalls.push({ path, body })
      return {}
    }),
    upsert: vi.fn().mockResolvedValue({}),
    batchUpsert: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: {
    getState: vi.fn().mockReturnValue({
      currentChild: {
        id: 'child-1',
        name: '小星星',
        avatar: '⭐',
        age: 5,
        gradeLevel: 'middle-kindergarten',
        createdAt: new Date(),
        settings: {
          dailyLearningMinutes: 30,
          preferredSubjects: ['math', 'chinese', 'english'],
          difficultyAdjustment: 0,
          voiceEnabled: true,
          soundEffectsEnabled: true,
        },
      },
    }),
  },
}))

vi.mock('@/services/ai/qwen-provider', () => {
  return {
    QwenProvider: class {
      constructor() {
        // QwenProvider 被初始化
      }
      async chatCompletion() {
        return '太棒了，你真聪明！'
      }
    },
  }
})

vi.mock('@/services/ai/teacher', () => {
  return {
    AITeacher: class {
      async generateEncouragement(input: unknown) {
        encouragementCallCount++
        lastEncouragementInput = input
        return '你真棒！继续加油！'
      }
    },
  }
})

// 追踪引擎调用
let achievementCheckCount = 0
let gradeUnlockCheckCount = 0
let snapshotGenerateCount = 0

vi.mock('@/engine/achievement', () => {
  return {
    AchievementEngine: class {
      checkAchievements() {
        achievementCheckCount++
        return [] // 默认没有新成就
      }
    },
  }
})

vi.mock('@/engine/grade-unlock-engine', () => {
  return {
    GradeUnlockEngine: class {
      checkUnlockEligibility() {
        gradeUnlockCheckCount++
        return { eligible: false, nextGrade: null, masteredCount: 0, requiredCount: 0, totalNodes: 0, averageMastery: 0 }
      }
    },
  }
})

vi.mock('@/engine/mastery-snapshot', () => ({
  generateDailySnapshot: vi.fn().mockImplementation(() => {
    snapshotGenerateCount++
    return null // 默认返回 null（已保存过）
  }),
  resetSnapshotCache: vi.fn(),
}))

describe('useLearningFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLearningStore.getState().reset()
    encouragementCallCount = 0
    lastEncouragementInput = null
    achievementCheckCount = 0
    gradeUnlockCheckCount = 0
    snapshotGenerateCount = 0
    apiWriteTracker = {
      postCalls: [],
      patchCalls: [],
    }
    // 默认缓存为空 — 走降级路径
    mockListCachedClassrooms.mockResolvedValue([])
    mockGetClassroom.mockResolvedValue(null)
  })

  describe('基本生命周期', () => {
    it('初始状态应为未激活', () => {
      const { result } = renderHook(() => useLearningFlow())

      expect(result.current.isActive).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentQuestion).toBeNull()
      expect(result.current.isComplete).toBe(false)
    })

    it('startFlow 应启动学习流程', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      expect(result.current.isActive).toBe(true)
    })

    it('stopFlow 应结束学习流程', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.stopFlow()
      })

      expect(result.current.isActive).toBe(false)
    })
  })

  describe('引擎串联（新流程 — ClassroomCache）', () => {
    it('startFlow 应尝试从 ClassroomCache 加载课堂', async () => {
      const mockClassroom = {
        id: 'classroom-1',
        title: '数字认识',
        scenes: [],
        metadata: { subject: 'math', knowledgeNodeId: 'node-1' },
      }
      mockListCachedClassrooms.mockResolvedValue([
        { knowledgeNodeId: 'node-1', date: '2026-04-08' },
      ])
      mockGetClassroom.mockResolvedValue(mockClassroom)

      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 新流程：课堂数据应加载到 currentClassroom
      expect(result.current.currentClassroom).not.toBeNull()
      expect(result.current.isCacheEmpty).toBe(false)
    })

    it('缓存为空时应标记 isCacheEmpty', async () => {
      mockListCachedClassrooms.mockResolvedValue([])

      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 无缓存 → 标记缓存为空，UI 显示"课程准备中"
      expect(result.current.currentClassroom).toBeNull()
      expect(result.current.isCacheEmpty).toBe(true)
    })
  })

  describe('答题流程', () => {
    it('handleAnswer 正确应更新状态并显示反馈', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.handleAnswer(true)
      })

      expect(result.current.showFeedback).toBe(true)
      expect(result.current.feedbackType).toBe('correct')
    })

    it('handleAnswer 错误应显示错误反馈', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.handleAnswer(false)
      })

      expect(result.current.showFeedback).toBe(true)
      expect(result.current.feedbackType).toBe('wrong')
    })

    it('dismissFeedback 应隐藏反馈', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.handleAnswer(true)
      })

      act(() => {
        result.current.dismissFeedback()
      })

      expect(result.current.showFeedback).toBe(false)
    })
  })

  describe('会话结束条件', () => {
    it('stopFlow 应标记会话为完成', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 答一题
      act(() => {
        result.current.handleAnswer(true)
      })
      act(() => {
        result.current.dismissFeedback()
      })

      // 手动停止
      act(() => {
        result.current.stopFlow()
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('完成后应提供 sessionSummary', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 答几题再停止
      act(() => {
        result.current.handleAnswer(true) // 正确
      })
      act(() => {
        result.current.dismissFeedback()
      })
      act(() => {
        result.current.handleAnswer(false) // 错误
      })
      act(() => {
        result.current.dismissFeedback()
      })

      act(() => {
        result.current.stopFlow()
      })

      expect(result.current.sessionSummary).not.toBeNull()
      expect(result.current.sessionSummary?.questionsCompleted).toBe(2)
      expect(result.current.sessionSummary?.correctCount).toBe(1)
    })
  })

  describe('鼓励语生成', () => {
    it('答题后应调用 AITeacher.generateEncouragement', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      await act(async () => {
        result.current.handleAnswer(true)
        // 等待异步鼓励语生成
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(encouragementCallCount).toBeGreaterThan(0)
      expect(lastEncouragementInput).toMatchObject({
        childName: '小星星',
        isCorrect: true,
      })
    })

    it('鼓励语应更新到 Hook 状态', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      await act(async () => {
        result.current.handleAnswer(true)
        // 等待异步鼓励语生成
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.encouragement).toBe('你真棒！继续加油！')
    })
  })

  describe('会话结束 DB 写入', () => {
    it('会话结束时应调用 AchievementEngine.checkAchievements', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 答一题然后停止
      act(() => {
        result.current.handleAnswer(true)
      })
      act(() => {
        result.current.dismissFeedback()
      })
      act(() => {
        result.current.stopFlow()
      })

      // 等待异步 DB 写入
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(achievementCheckCount).toBeGreaterThan(0)
    })

    it('会话结束时应调用 GradeUnlockEngine.checkUnlockEligibility', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.handleAnswer(true)
      })
      act(() => {
        result.current.dismissFeedback()
      })
      act(() => {
        result.current.stopFlow()
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(gradeUnlockCheckCount).toBeGreaterThan(0)
    })

    it('会话结束时应调用 generateDailySnapshot', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      act(() => {
        result.current.handleAnswer(true)
      })
      act(() => {
        result.current.dismissFeedback()
      })
      act(() => {
        result.current.stopFlow()
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(snapshotGenerateCount).toBeGreaterThan(0)
    })

    it('stopFlow 也应触发 DB 写入', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 答一题然后手动停止
      act(() => {
        result.current.handleAnswer(true)
      })
      act(() => {
        result.current.dismissFeedback()
      })
      act(() => {
        result.current.stopFlow()
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(achievementCheckCount).toBeGreaterThan(0)
    })
  })
})
