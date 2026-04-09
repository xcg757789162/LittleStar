import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useChildStore } from '../childStore'
import { useLearningStore } from '../learningStore'
import { useUIStore } from '../uiStore'
import type { Child, Question } from '@/types/models'

describe('Zustand Stores', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useChildStore.getState().reset()
    useLearningStore.getState().reset()
    useUIStore.getState().reset()
  })

  // ─────────────────────────────────────────
  // childStore
  // ─────────────────────────────────────────
  describe('childStore', () => {
    const mockChild: Child = {
      id: '1',
      name: '小明',
      avatar: '🧒',
      age: 5,
      gradeLevel: 'senior-kindergarten',
      createdAt: new Date('2026-01-01'),
      settings: {
        dailyLearningMinutes: 15,
        preferredSubjects: ['math', 'chinese'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
      },
    }

    it('初始状态应该没有当前孩子', () => {
      const state = useChildStore.getState()
      expect(state.currentChild).toBeNull()
      expect(state.children).toEqual([])
    })

    it('应该能设置当前孩子', () => {
      act(() => {
        useChildStore.getState().setCurrentChild(mockChild)
      })
      const state = useChildStore.getState()
      expect(state.currentChild).toEqual(mockChild)
    })

    it('应该能添加孩子到列表', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
      })
      const state = useChildStore.getState()
      expect(state.children).toHaveLength(1)
      expect(state.children[0].name).toBe('小明')
    })

    it('添加第一个孩子时应自动设为当前孩子', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
      })
      const state = useChildStore.getState()
      expect(state.currentChild).toEqual(mockChild)
    })

    it('应该能更新孩子信息', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
        useChildStore.getState().updateChild('1', { name: '小红' })
      })
      const state = useChildStore.getState()
      expect(state.children[0].name).toBe('小红')
      // 如果更新的是当前孩子，currentChild 也应更新
      expect(state.currentChild?.name).toBe('小红')
    })

    it('应该能移除孩子', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
        useChildStore.getState().removeChild('1')
      })
      const state = useChildStore.getState()
      expect(state.children).toHaveLength(0)
      expect(state.currentChild).toBeNull()
    })

    it('应该能更新孩子设置', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
        useChildStore.getState().updateChildSettings('1', {
          dailyLearningMinutes: 20,
          voiceEnabled: false,
        })
      })
      const state = useChildStore.getState()
      expect(state.children[0].settings.dailyLearningMinutes).toBe(20)
      expect(state.children[0].settings.voiceEnabled).toBe(false)
      // 其他设置应保持不变
      expect(state.children[0].settings.soundEffectsEnabled).toBe(true)
    })

    it('reset 应该恢复初始状态', () => {
      act(() => {
        useChildStore.getState().addChild(mockChild)
        useChildStore.getState().reset()
      })
      const state = useChildStore.getState()
      expect(state.currentChild).toBeNull()
      expect(state.children).toEqual([])
    })
  })

  // ─────────────────────────────────────────
  // learningStore
  // ─────────────────────────────────────────
  describe('learningStore', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q-1',
        knowledgeNodeId: 'math-1',
        type: 'multiple-choice',
        content: {
          text: '1 + 1 = ?',
          options: [
            { id: 'a', text: '1', isCorrect: false },
            { id: 'b', text: '2', isCorrect: true },
          ],
        },
        answer: 'b',
        difficulty: 1,
        isAIGenerated: false,
      },
      {
        id: 'q-2',
        knowledgeNodeId: 'math-1',
        type: 'flashcard',
        content: { text: '数字 3', hint: '三只小猪 🐷' },
        answer: 3,
        difficulty: 1,
        isAIGenerated: false,
      },
    ]

    it('初始状态应该是空闲', () => {
      const state = useLearningStore.getState()
      expect(state.isSessionActive).toBe(false)
      expect(state.currentQuestion).toBeNull()
      expect(state.questionQueue).toEqual([])
      expect(state.currentSubject).toBeNull()
      expect(state.sessionStats.questionsCompleted).toBe(0)
      expect(state.sessionStats.correctCount).toBe(0)
    })

    it('应该能开始学习会话', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
      })
      const state = useLearningStore.getState()
      expect(state.isSessionActive).toBe(true)
      expect(state.currentSubject).toBe('math')
      expect(state.sessionStats.questionsCompleted).toBe(0)
    })

    it('应该能设置题目队列', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
      })
      const state = useLearningStore.getState()
      expect(state.questionQueue).toHaveLength(2)
      expect(state.currentQuestion).toEqual(mockQuestions[0])
    })

    it('应该能记录答题结果并前进到下一题', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
        useLearningStore.getState().recordAnswer(true)
      })
      const state = useLearningStore.getState()
      expect(state.sessionStats.questionsCompleted).toBe(1)
      expect(state.sessionStats.correctCount).toBe(1)
      expect(state.currentQuestion).toEqual(mockQuestions[1])
    })

    it('答错也应记录并前进到下一题', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
        useLearningStore.getState().recordAnswer(false)
      })
      const state = useLearningStore.getState()
      expect(state.sessionStats.questionsCompleted).toBe(1)
      expect(state.sessionStats.correctCount).toBe(0)
      expect(state.currentQuestion).toEqual(mockQuestions[1])
    })

    it('所有题目答完后当前题应为 null', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
        useLearningStore.getState().recordAnswer(true) // q-1
        useLearningStore.getState().recordAnswer(true) // q-2
      })
      const state = useLearningStore.getState()
      expect(state.currentQuestion).toBeNull()
      expect(state.sessionStats.questionsCompleted).toBe(2)
    })

    it('应该能结束学习会话', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
        useLearningStore.getState().recordAnswer(true)
        useLearningStore.getState().endSession()
      })
      const state = useLearningStore.getState()
      expect(state.isSessionActive).toBe(false)
      expect(state.currentQuestion).toBeNull()
      expect(state.currentSubject).toBeNull()
      // stats 保留直到下次 reset 或 startSession
    })

    it('追加题目到队列尾部', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue([mockQuestions[0]])
        useLearningStore.getState().appendQuestions([mockQuestions[1]])
      })
      const state = useLearningStore.getState()
      expect(state.questionQueue).toHaveLength(2)
    })

    it('reset 应该恢复初始状态', () => {
      act(() => {
        useLearningStore.getState().startSession('math')
        useLearningStore.getState().setQuestionQueue(mockQuestions)
        useLearningStore.getState().recordAnswer(true)
        useLearningStore.getState().reset()
      })
      const state = useLearningStore.getState()
      expect(state.isSessionActive).toBe(false)
      expect(state.currentQuestion).toBeNull()
      expect(state.questionQueue).toEqual([])
      expect(state.sessionStats.questionsCompleted).toBe(0)
    })
  })

  // ─────────────────────────────────────────
  // uiStore
  // ─────────────────────────────────────────
  describe('uiStore', () => {
    it('初始状态应该有合理默认值', () => {
      const state = useUIStore.getState()
      expect(state.theme).toBe('light')
      expect(state.voiceEnabled).toBe(true)
      expect(state.soundEffectsEnabled).toBe(true)
      expect(state.isParentMode).toBe(false)
      expect(state.fontSize).toBe('large')
    })

    it('应该能切换主题', () => {
      act(() => {
        useUIStore.getState().setTheme('dark')
      })
      expect(useUIStore.getState().theme).toBe('dark')
    })

    it('应该能切换语音开关', () => {
      act(() => {
        useUIStore.getState().setVoiceEnabled(false)
      })
      expect(useUIStore.getState().voiceEnabled).toBe(false)
    })

    it('应该能切换音效开关', () => {
      act(() => {
        useUIStore.getState().setSoundEffectsEnabled(false)
      })
      expect(useUIStore.getState().soundEffectsEnabled).toBe(false)
    })

    it('应该能进入/退出家长模式', () => {
      act(() => {
        useUIStore.getState().enterParentMode()
      })
      expect(useUIStore.getState().isParentMode).toBe(true)

      act(() => {
        useUIStore.getState().exitParentMode()
      })
      expect(useUIStore.getState().isParentMode).toBe(false)
    })

    it('应该能设置字体大小', () => {
      act(() => {
        useUIStore.getState().setFontSize('extra-large')
      })
      expect(useUIStore.getState().fontSize).toBe('extra-large')
    })

    it('应该能设置加载状态', () => {
      act(() => {
        useUIStore.getState().setLoading(true)
      })
      expect(useUIStore.getState().isLoading).toBe(true)

      act(() => {
        useUIStore.getState().setLoading(false)
      })
      expect(useUIStore.getState().isLoading).toBe(false)
    })

    it('应该能设置错误消息', () => {
      act(() => {
        useUIStore.getState().setError('网络连接失败')
      })
      expect(useUIStore.getState().error).toBe('网络连接失败')

      act(() => {
        useUIStore.getState().clearError()
      })
      expect(useUIStore.getState().error).toBeNull()
    })

    it('reset 应该恢复初始状态', () => {
      act(() => {
        useUIStore.getState().setTheme('dark')
        useUIStore.getState().enterParentMode()
        useUIStore.getState().setVoiceEnabled(false)
        useUIStore.getState().reset()
      })
      const state = useUIStore.getState()
      expect(state.theme).toBe('light')
      expect(state.isParentMode).toBe(false)
      expect(state.voiceEnabled).toBe(true)
    })
  })
})
