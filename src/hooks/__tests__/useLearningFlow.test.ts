/**
 * useLearningFlow Hook 测试
 * 测试学习主循环的完整编排逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLearningFlow } from '../useLearningFlow'
import { useLearningStore } from '@/stores/learningStore'
import type { KnowledgeNode, Subject, Question } from '@/types/models'

// 追踪 QuestionGenerator 构造函数参数
let lastGeneratorProvider: unknown = null
// 追踪 AITeacher.generateEncouragement 调用
let encouragementCallCount = 0
let lastEncouragementInput: unknown = null

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

vi.mock('@/services/ai/question-generator', () => {
  return {
    QuestionGenerator: class {
      constructor(provider: unknown) {
        lastGeneratorProvider = provider
      }
      async generate() {
        return {
          question: '1 + 1 = ?',
          options: [
            { id: 'a', text: '1', isCorrect: false },
            { id: 'b', text: '2', isCorrect: true },
            { id: 'c', text: '3', isCorrect: false },
          ],
          answer: '2',
          difficulty: 1,
          isFallback: lastGeneratorProvider !== null && typeof (lastGeneratorProvider as { chatCompletion?: unknown }).chatCompletion === 'function'
            ? false  // 真实 provider → 非 fallback
            : true,  // fallback provider
        }
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

// 追踪 DB 写入操作
let dbWriteTracker = {
  learningRecords: [] as unknown[],
  masteryRecordsPut: [] as unknown[],
  dailySessions: [] as unknown[],
  achievements: [] as unknown[],
  masterySnapshots: [] as unknown[],
}

vi.mock('@/db/database', () => ({
  db: {
    knowledgeNodes: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
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
          ]),
        }),
      }),
    },
    masteryRecords: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      put: vi.fn().mockImplementation(async (record: unknown) => {
        dbWriteTracker.masteryRecordsPut.push(record)
        return 1
      }),
    },
    learningRecords: {
      add: vi.fn().mockImplementation(async (record: unknown) => {
        dbWriteTracker.learningRecords.push(record)
        return 1
      }),
    },
    dailySessions: {
      add: vi.fn().mockImplementation(async (session: unknown) => {
        dbWriteTracker.dailySessions.push(session)
        return 1
      }),
    },
    achievements: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      add: vi.fn().mockImplementation(async (achievement: unknown) => {
        dbWriteTracker.achievements.push(achievement)
        return 1
      }),
    },
    masterySnapshots: {
      add: vi.fn().mockImplementation(async (snapshot: unknown) => {
        dbWriteTracker.masterySnapshots.push(snapshot)
        return 1
      }),
    },
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
    lastGeneratorProvider = null
    encouragementCallCount = 0
    lastEncouragementInput = null
    achievementCheckCount = 0
    gradeUnlockCheckCount = 0
    snapshotGenerateCount = 0
    dbWriteTracker = {
      learningRecords: [],
      masteryRecordsPut: [],
      dailySessions: [],
      achievements: [],
      masterySnapshots: [],
    }
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

  describe('引擎串联', () => {
    it('startFlow 应通过 AdaptiveRouter 推荐知识点并生成题目队列', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 应该有题目可用
      expect(result.current.currentQuestion).not.toBeNull()
    })

    it('startFlow 后应加载题目到队列', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // learningStore 的 questionQueue 应有题目
      const storeState = useLearningStore.getState()
      expect(storeState.questionQueue.length).toBeGreaterThan(0)
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
    it('题目队列耗尽时应标记为完成', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 消耗所有题目
      const queueLength = useLearningStore.getState().questionQueue.length
      for (let i = 0; i < queueLength; i++) {
        act(() => {
          result.current.handleAnswer(true)
        })
        act(() => {
          result.current.dismissFeedback()
        })
      }

      expect(result.current.isComplete).toBe(true)
    })

    it('完成后应提供 sessionSummary', async () => {
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // 消耗所有题目
      const queueLength = useLearningStore.getState().questionQueue.length
      for (let i = 0; i < queueLength; i++) {
        act(() => {
          result.current.handleAnswer(i % 2 === 0) // 交替对错
        })
        act(() => {
          result.current.dismissFeedback()
        })
      }

      expect(result.current.sessionSummary).not.toBeNull()
      expect(result.current.sessionSummary?.questionsCompleted).toBe(queueLength)
    })
  })

  describe('AI 出题集成', () => {
    it('无 API Key 时 QuestionGenerator 使用 fallback provider', async () => {
      // 默认环境无 VITE_QWEN_API_KEY
      const { result } = renderHook(() => useLearningFlow())

      await act(async () => {
        await result.current.startFlow('math')
      })

      // fallback provider 的 chatCompletion 应该抛出错误
      expect(lastGeneratorProvider).not.toBeNull()
      const provider = lastGeneratorProvider as { chatCompletion: () => Promise<string> }
      await expect(provider.chatCompletion()).rejects.toThrow('No AI provider configured')
    })

    it('有 API Key 时应使用 QwenProvider', async () => {
      // 设置环境变量
      const originalEnv = import.meta.env.VITE_QWEN_API_KEY
      import.meta.env.VITE_QWEN_API_KEY = 'test-api-key-12345'

      try {
        const { result } = renderHook(() => useLearningFlow())

        await act(async () => {
          await result.current.startFlow('math')
        })

        // QwenProvider 应该有 chatCompletion 方法且不抛出
        expect(lastGeneratorProvider).not.toBeNull()
        const provider = lastGeneratorProvider as { chatCompletion: () => Promise<string> }
        const response = await provider.chatCompletion()
        expect(response).toBe('太棒了，你真聪明！')
      } finally {
        if (originalEnv === undefined) {
          delete import.meta.env.VITE_QWEN_API_KEY
        } else {
          import.meta.env.VITE_QWEN_API_KEY = originalEnv
        }
      }
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

      // 消耗所有题目
      const queueLength = useLearningStore.getState().questionQueue.length
      for (let i = 0; i < queueLength; i++) {
        act(() => {
          result.current.handleAnswer(true)
        })
        act(() => {
          result.current.dismissFeedback()
        })
      }

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

      const queueLength = useLearningStore.getState().questionQueue.length
      for (let i = 0; i < queueLength; i++) {
        act(() => {
          result.current.handleAnswer(true)
        })
        act(() => {
          result.current.dismissFeedback()
        })
      }

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

      const queueLength = useLearningStore.getState().questionQueue.length
      for (let i = 0; i < queueLength; i++) {
        act(() => {
          result.current.handleAnswer(true)
        })
        act(() => {
          result.current.dismissFeedback()
        })
      }

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
