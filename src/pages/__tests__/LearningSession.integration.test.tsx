/**
 * LearningSession 集成测试
 *
 * 测试新流程：缓存加载课堂 → 渲染 ClassroomIframe，缓存为空 → 显示"暂无课堂数据"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// vi.hoisted: 确保 mock 变量在 vi.mock hoisting 前可用
const {
  mockStartFlow,
  mockStopFlow,
  mockHandleAnswer,
  mockDismissFeedback,
  mockHandleClassroomAnswer,
  mockHandleClassroomComplete,
} = vi.hoisted(() => ({
  mockStartFlow: vi.fn(),
  mockStopFlow: vi.fn(),
  mockHandleAnswer: vi.fn(),
  mockDismissFeedback: vi.fn(),
  mockHandleClassroomAnswer: vi.fn(),
  mockHandleClassroomComplete: vi.fn(),
}))

// Mock useLearningFlow Hook
let mockFlowState: Record<string, unknown> = {}
vi.mock('@/hooks/useLearningFlow', () => ({
  useLearningFlow: vi.fn(() => mockFlowState),
}))

// Mock useSoundEffects
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: vi.fn(() => ({
    playCorrect: vi.fn(),
    playWrong: vi.fn(),
    playCelebration: vi.fn(),
    playStar: vi.fn(),
    playLevelUp: vi.fn(),
  })),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock ClassroomIframe
vi.mock('@/components/classroom/ClassroomIframe', () => ({
  ClassroomIframe: vi.fn(({ classroom, onComplete, onAnswer }: {
    classroom: { title: string }
    onComplete?: () => void
    onAnswer?: (data: { isCorrect: boolean; selectedAnswer: number; correctAnswer: number }) => void
  }) => (
    <div data-testid="classroom-view">
      <div data-testid="classroom-title">{classroom.title}</div>
      <button
        data-testid="classroom-complete-btn"
        onClick={onComplete}
      >
        完成课堂
      </button>
      <button
        data-testid="classroom-answer-btn"
        onClick={() => onAnswer?.({ isCorrect: true, selectedAnswer: 0, correctAnswer: 0 })}
      >
        答题
      </button>
    </div>
  )),
}))

// Mock feedback components
vi.mock('@/components/feedback/FeedbackAnimation', () => ({
  FeedbackAnimation: () => <div data-testid="feedback-animation" />,
}))
vi.mock('@/components/feedback/CelebrationAnimation', () => ({
  CelebrationAnimation: () => null,
}))
vi.mock('@/components/feedback/EncouragementOverlay', () => ({
  EncouragementOverlay: () => null,
}))

import { LearningSession } from '../LearningSession'

const mockClassroom = {
  id: 'classroom-001',
  title: '认识数字 1-5',
  status: 'completed' as const,
  scenes: [
    {
      id: 'scene-1',
      title: '学习数字',
      type: 'teaching' as const,
      slides: [
        { type: 'title' as const, title: '数字王国', content: '欢迎来到数字王国！' },
      ],
    },
  ],
}

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <LearningSession />
    </MemoryRouter>,
  )
}

describe('LearningSession 集成测试 - 新流程', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFlowState = {
      isActive: false,
      isLoading: false,
      currentQuestion: null,
      isCurrentReview: false,
      showFeedback: false,
      feedbackType: 'correct',
      isComplete: false,
      sessionSummary: null,
      encouragement: '',
      currentInterstitial: null,
      currentClassroom: null,
      isCacheEmpty: false,
      classroomAnswerCount: 0,
      startFlow: mockStartFlow,
      stopFlow: mockStopFlow,
      handleAnswer: mockHandleAnswer,
      handleClassroomAnswer: mockHandleClassroomAnswer,
      handleClassroomComplete: mockHandleClassroomComplete,
      dismissFeedback: mockDismissFeedback,
      completeInterstitial: vi.fn(),
    }
  })

  it('缓存加载课堂后应渲染 ClassroomIframe', async () => {
    // 模拟：选择科目 → 启动 → 有缓存课堂
    mockFlowState = {
      ...mockFlowState,
      isActive: true,
      currentClassroom: mockClassroom,
      isCacheEmpty: false,
    }

    renderWithRouter()

    // 应渲染 ClassroomIframe 而非旧的题目组件
    expect(screen.getByTestId('classroom-view')).toBeTruthy()
    expect(screen.getByTestId('classroom-title').textContent).toBe('认识数字 1-5')
  })

  it('缓存为空时应显示"课程准备中"提示', async () => {
    mockFlowState = {
      ...mockFlowState,
      isActive: true,
      currentClassroom: null,
      isCacheEmpty: true,
    }

    renderWithRouter()

    // 应显示课程准备中提示
    expect(screen.getByText(/课程准备中/)).toBeTruthy()
  })

  it('ClassroomIframe 答题时应调用 handleClassroomAnswer', async () => {
    mockFlowState = {
      ...mockFlowState,
      isActive: true,
      currentClassroom: mockClassroom,
      isCacheEmpty: false,
    }

    renderWithRouter()

    // 点击答题按钮
    fireEvent.click(screen.getByTestId('classroom-answer-btn'))

    // 应调用 handleClassroomAnswer
    expect(mockHandleClassroomAnswer).toHaveBeenCalledWith({
      selectedIndex: 0,
      isCorrect: true,
      responseTime: 0,
    })
  })

  it('ClassroomIframe 完成时应调用 handleClassroomComplete', async () => {
    mockFlowState = {
      ...mockFlowState,
      isActive: true,
      currentClassroom: mockClassroom,
      isCacheEmpty: false,
    }

    renderWithRouter()

    // 点击完成按钮
    fireEvent.click(screen.getByTestId('classroom-complete-btn'))

    // 应调用 handleClassroomComplete
    expect(mockHandleClassroomComplete).toHaveBeenCalled()
  })

  it('旧流程（无课堂缓存但有题目）应继续渲染旧组件', () => {
    mockFlowState = {
      ...mockFlowState,
      isActive: true,
      currentClassroom: null,
      isCacheEmpty: false,
      currentQuestion: {
        id: 'q-1',
        knowledgeNodeId: 'node-1',
        type: 'multiple-choice',
        content: {
          text: '1 + 1 = ?',
          options: [
            { id: 'a', text: '1', isCorrect: false },
            { id: 'b', text: '2', isCorrect: true },
          ],
        },
        answer: '2',
        difficulty: 1,
        isAIGenerated: false,
      },
    }

    renderWithRouter()

    // 不应渲染 ClassroomIframe
    expect(screen.queryByTestId('classroom-view')).toBeNull()
  })

  it('选择科目后点击开始应调用 startFlow', async () => {
    renderWithRouter()

    // 科目选择区域应可见
    const mathButton = screen.getByText('数学')
    fireEvent.click(mathButton)

    // 点击开始学习
    const startButton = screen.getByText('开始学习')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(mockStartFlow).toHaveBeenCalledWith('math')
    })
  })
})
