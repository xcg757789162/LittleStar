/**
 * QuizSlide 组件测试
 *
 * 测试互动测验幻灯片：配图选择题、选择反馈、答题数据回调、FeedbackAnimation 集成
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuizSlide } from '../QuizSlide'
import type { Slide } from '@/services/openmaic/types'

// Mock FeedbackAnimation 避免 framer-motion 依赖
vi.mock('@/components/feedback/FeedbackAnimation', () => ({
  FeedbackAnimation: ({ type, onComplete }: { type: string; onComplete: () => void }) => (
    <div data-testid="feedback-animation" data-type={type}>
      <button data-testid="feedback-dismiss" onClick={onComplete}>
        关闭
      </button>
    </div>
  ),
}))

describe('QuizSlide', () => {
  const defaultSlide: Slide = {
    type: 'quiz',
    title: '小测验',
    quiz: {
      question: '2 + 3 等于几？',
      options: ['4', '5', '6', '7'],
      correctAnswer: 1,
      imageUrl: '/images/quiz-math.png',
    },
  }

  let onAnswer: ReturnType<typeof vi.fn>
  let onAudioPlay: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAnswer = vi.fn()
    onAudioPlay = vi.fn()
  })

  it('应渲染题目文本', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('2 + 3 等于几？')).toBeInTheDocument()
  })

  it('应渲染所有选项按钮', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('应渲染题目配图', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/images/quiz-math.png')
  })

  it('无配图时不渲染 img 元素', () => {
    const slideNoImage: Slide = {
      ...defaultSlide,
      quiz: { ...defaultSlide.quiz!, imageUrl: undefined },
    }
    const { container } = render(
      <QuizSlide slide={slideNoImage} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />,
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('选择正确答案时触发 onAnswer 回调（isCorrect: true）', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    // 点击正确选项 "5"（index 1）
    fireEvent.click(screen.getByText('5'))

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedIndex: 1,
        isCorrect: true,
      }),
    )
  })

  it('选择错误答案时触发 onAnswer 回调（isCorrect: false）', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    // 点击错误选项 "4"（index 0）
    fireEvent.click(screen.getByText('4'))

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedIndex: 0,
        isCorrect: false,
      }),
    )
  })

  it('选择后应禁用所有选项（防止重复作答）', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    fireEvent.click(screen.getByText('5'))

    // 所有选项按钮应被禁用
    const optionButtons = screen.getAllByTestId(/^option-/)
    optionButtons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('选择正确答案后应有视觉反馈', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    fireEvent.click(screen.getByText('5'))

    // 正确选项应有 correct 标记
    expect(screen.getByTestId('option-1')).toHaveAttribute('data-result', 'correct')
  })

  it('选择错误答案后应显示正确答案', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    fireEvent.click(screen.getByText('4'))

    // 选中的错误选项标记 incorrect
    expect(screen.getByTestId('option-0')).toHaveAttribute('data-result', 'incorrect')
    // 正确选项应被高亮
    expect(screen.getByTestId('option-1')).toHaveAttribute('data-result', 'correct')
  })

  it('应包含 quiz-slide 测试标识', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('quiz-slide')).toBeInTheDocument()
  })

  it('无 quiz 数据时显示占位提示', () => {
    const slideNoQuiz: Slide = { type: 'quiz', title: '测试' }
    render(<QuizSlide slide={slideNoQuiz} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('quiz-placeholder')).toBeInTheDocument()
  })

  it('onAnswer 应包含 responseTime', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    fireEvent.click(screen.getByText('5'))

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        responseTime: expect.any(Number),
      }),
    )
  })

  // === I5 修复：FeedbackAnimation 集成 ===

  it('选择正确答案后应显示 FeedbackAnimation（correct 类型）', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    fireEvent.click(screen.getByText('5'))

    const feedback = screen.getByTestId('feedback-animation')
    expect(feedback).toBeInTheDocument()
    expect(feedback).toHaveAttribute('data-type', 'correct')
  })

  it('选择错误答案后应显示 FeedbackAnimation（wrong 类型）', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    fireEvent.click(screen.getByText('4'))

    const feedback = screen.getByTestId('feedback-animation')
    expect(feedback).toBeInTheDocument()
    expect(feedback).toHaveAttribute('data-type', 'wrong')
  })

  it('FeedbackAnimation 完成后应消失', () => {
    render(<QuizSlide slide={defaultSlide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />)

    fireEvent.click(screen.getByText('5'))
    expect(screen.getByTestId('feedback-animation')).toBeInTheDocument()

    // 点击关闭
    fireEvent.click(screen.getByTestId('feedback-dismiss'))
    expect(screen.queryByTestId('feedback-animation')).not.toBeInTheDocument()
  })
})
