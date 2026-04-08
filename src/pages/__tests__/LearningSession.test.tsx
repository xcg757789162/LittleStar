import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LearningSession } from '../LearningSession'

// Mock useLearningFlow Hook
const mockStartFlow = vi.fn()
const mockStopFlow = vi.fn()
const mockHandleAnswer = vi.fn()
const mockDismissFeedback = vi.fn()

let mockFlowState = {
  isActive: false,
  isLoading: false,
  currentQuestion: null as null | {
    id: string
    knowledgeNodeId: string
    type: string
    content: { text: string; options?: { id: string; text: string; isCorrect: boolean }[] }
    answer: string
    difficulty: number
    isAIGenerated: boolean
  },
  showFeedback: false,
  feedbackType: 'correct' as 'correct' | 'wrong',
  isComplete: false,
  sessionSummary: null as null | {
    questionsCompleted: number
    correctCount: number
    accuracy: number
    subject: string
  },
  encouragement: '',
  startFlow: mockStartFlow,
  stopFlow: mockStopFlow,
  handleAnswer: mockHandleAnswer,
  dismissFeedback: mockDismissFeedback,
}

vi.mock('@/hooks/useLearningFlow', () => ({
  useLearningFlow: () => mockFlowState,
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLearningSession() {
  return render(
    <MemoryRouter>
      <LearningSession />
    </MemoryRouter>,
  )
}

describe('LearningSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFlowState = {
      isActive: false,
      isLoading: false,
      currentQuestion: null,
      showFeedback: false,
      feedbackType: 'correct',
      isComplete: false,
      sessionSummary: null,
      encouragement: '',
      startFlow: mockStartFlow,
      stopFlow: mockStopFlow,
      handleAnswer: mockHandleAnswer,
      dismissFeedback: mockDismissFeedback,
    }
  })

  describe('科目选择阶段', () => {
    it('应渲染学习会话页面', () => {
      renderLearningSession()
      expect(screen.getByTestId('learning-session')).toBeInTheDocument()
    })

    it('应显示科目选择', () => {
      renderLearningSession()
      expect(screen.getByText(/数学/)).toBeInTheDocument()
      expect(screen.getByText(/语文/)).toBeInTheDocument()
      expect(screen.getByText(/英语/)).toBeInTheDocument()
    })

    it('选择科目并点击开始学习后调用 startFlow', () => {
      renderLearningSession()
      fireEvent.click(screen.getByText('数学'))
      fireEvent.click(screen.getByText('开始学习'))
      expect(mockStartFlow).toHaveBeenCalledWith('math')
    })

    it('未选科目时开始学习按钮应禁用', () => {
      renderLearningSession()
      const startBtn = screen.getByText('开始学习')
      expect(startBtn).toBeDisabled()
    })
  })

  describe('学习中阶段 — 旧题型降级', () => {
    it('multiple-choice 类型在新流程中不再渲染（已迁移到 ClassroomView）', () => {
      mockFlowState.isActive = true
      mockFlowState.currentQuestion = {
        id: 'q1',
        knowledgeNodeId: 'node-1',
        type: 'multiple-choice',
        content: {
          text: '1 + 1 = ?',
          options: [
            { id: 'a', text: '1', isCorrect: false },
            { id: 'b', text: '2', isCorrect: true },
            { id: 'c', text: '3', isCorrect: false },
          ],
        },
        answer: '2',
        difficulty: 1,
        isAIGenerated: false,
      }

      renderLearningSession()
      // multiple-choice 已迁移到 ClassroomView，旧 renderQuestion 不处理此类型
      expect(screen.queryByText('1 + 1 = ?')).not.toBeInTheDocument()
    })

    it('flashcard 类型在新流程中不再渲染（已迁移到 ClassroomView）', () => {
      mockFlowState.isActive = true
      mockFlowState.currentQuestion = {
        id: 'q2',
        knowledgeNodeId: 'node-2',
        type: 'flashcard',
        content: {
          text: '认识字：大',
        },
        answer: '大',
        difficulty: 1,
        isAIGenerated: false,
      }

      renderLearningSession()
      // flashcard 已迁移到 ClassroomView，旧 renderQuestion 不处理此类型
      expect(screen.queryByText('认识字：大')).not.toBeInTheDocument()
    })
  })

  describe('学习中阶段 — 手写板', () => {
    it('应渲染 WritingPad 组件', () => {
      mockFlowState.isActive = true
      mockFlowState.currentQuestion = {
        id: 'q3',
        knowledgeNodeId: 'node-3',
        type: 'handwriting',
        content: {
          text: '请写出数字 3',
        },
        answer: '3',
        difficulty: 1,
        isAIGenerated: false,
      }

      renderLearningSession()
      expect(screen.getByText('请写出数字 3')).toBeInTheDocument()
    })
  })

  describe('反馈动画', () => {
    it('showFeedback 为 true 时应显示反馈动画', () => {
      mockFlowState.isActive = true
      mockFlowState.showFeedback = true
      mockFlowState.feedbackType = 'correct'
      mockFlowState.currentQuestion = {
        id: 'q1',
        knowledgeNodeId: 'node-1',
        type: 'multiple-choice',
        content: { text: '1+1=?', options: [] },
        answer: '2',
        difficulty: 1,
        isAIGenerated: false,
      }

      renderLearningSession()
      expect(screen.getByTestId('feedback-container')).toBeInTheDocument()
    })
  })

  describe('会话总结', () => {
    it('会话完成后显示总结面板', () => {
      mockFlowState.isComplete = true
      mockFlowState.sessionSummary = {
        questionsCompleted: 5,
        correctCount: 4,
        accuracy: 80,
        subject: 'math',
      }

      renderLearningSession()
      expect(screen.getByText(/5/)).toBeInTheDocument() // 题数
      expect(screen.getByText(/80%/)).toBeInTheDocument() // 正确率
    })

    it('总结面板应有回到首页按钮', () => {
      mockFlowState.isComplete = true
      mockFlowState.sessionSummary = {
        questionsCompleted: 5,
        correctCount: 4,
        accuracy: 80,
        subject: 'math',
      }

      renderLearningSession()
      expect(screen.getByText('回到首页')).toBeInTheDocument()
    })

    it('点击回到首页应导航到 /', () => {
      mockFlowState.isComplete = true
      mockFlowState.sessionSummary = {
        questionsCompleted: 5,
        correctCount: 4,
        accuracy: 80,
        subject: 'math',
      }

      renderLearningSession()
      fireEvent.click(screen.getByText('回到首页'))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('退出按钮', () => {
    it('学习中点击退出应调用 stopFlow 并导航回首页', () => {
      mockFlowState.isActive = true
      mockFlowState.currentQuestion = {
        id: 'q1',
        knowledgeNodeId: 'node-1',
        type: 'multiple-choice',
        content: { text: '1+1=?', options: [] },
        answer: '2',
        difficulty: 1,
        isAIGenerated: false,
      }

      renderLearningSession()
      fireEvent.click(screen.getByTestId('exit-button'))
      expect(mockStopFlow).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
