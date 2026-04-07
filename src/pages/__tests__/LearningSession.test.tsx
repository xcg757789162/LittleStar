import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LearningSession } from '../LearningSession'

// Mock stores
vi.mock('@/stores/learningStore', () => ({
  useLearningStore: vi.fn(() => ({
    isInSession: false,
    currentQuestion: null,
    questionQueue: [],
    stats: { questionsCompleted: 0, correctCount: 0, startTime: null },
    startSession: vi.fn(),
    endSession: vi.fn(),
    recordAnswer: vi.fn(),
    setQuestionQueue: vi.fn(),
  })),
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: vi.fn(() => ({
    currentChild: {
      id: '1',
      name: '小明',
      age: 5,
      gradeLevel: 'senior-kindergarten',
      settings: { dailyLearningMinutes: 30, voiceEnabled: true },
    },
  })),
}))

describe('LearningSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应渲染学习会话页面', () => {
    render(<LearningSession />)
    const container = screen.getByTestId('learning-session')
    expect(container).toBeInTheDocument()
  })

  it('未开始会话时显示开始按钮', () => {
    render(<LearningSession />)
    const startBtn = screen.getByText(/开始学习|开始/)
    expect(startBtn).toBeInTheDocument()
  })

  it('应显示科目选择', () => {
    render(<LearningSession />)
    expect(screen.getByText(/数学/)).toBeInTheDocument()
    expect(screen.getByText(/语文/)).toBeInTheDocument()
    expect(screen.getByText(/英语/)).toBeInTheDocument()
  })

  it('选择科目后应能开始学习', () => {
    render(<LearningSession />)
    const mathBtn = screen.getByText(/数学/)
    fireEvent.click(mathBtn)
    const startBtn = screen.getByText(/开始学习|开始/)
    expect(startBtn).toBeInTheDocument()
  })

  it('应显示进度信息', () => {
    render(<LearningSession />)
    const progress = screen.getByTestId('session-progress')
    expect(progress).toBeInTheDocument()
  })

  it('应显示退出按钮', () => {
    render(<LearningSession />)
    const exitBtn = screen.getByTestId('exit-button')
    expect(exitBtn).toBeInTheDocument()
  })
})
