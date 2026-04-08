import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PronunciationFeedback } from '../voice/PronunciationFeedback'

describe('PronunciationFeedback', () => {
  const defaultProps = {
    stars: 3 as const,
    feedbackText: '你的 apple 说得很好哦！',
    onRetry: vi.fn(),
    onContinue: vi.fn(),
    onPlayFeedback: vi.fn(),
    passed: true,
  }

  it('应渲染 StarRating 组件', () => {
    render(<PronunciationFeedback {...defaultProps} />)
    const starRating = screen.getByTestId('star-rating')
    expect(starRating).toBeInTheDocument()
  })

  it('应展示 AI 老师反馈语', () => {
    render(<PronunciationFeedback {...defaultProps} />)
    const bubble = screen.getByTestId('feedback-bubble')
    expect(bubble).toBeInTheDocument()
    expect(bubble.textContent).toContain('你的 apple 说得很好哦！')
  })

  it('通过时应显示"继续"按钮', () => {
    render(<PronunciationFeedback {...defaultProps} passed={true} />)
    const continueBtn = screen.getByTestId('btn-continue')
    expect(continueBtn).toBeInTheDocument()
  })

  it('未通过时应显示"再试一次"按钮', () => {
    render(<PronunciationFeedback {...defaultProps} passed={false} />)
    const retryBtn = screen.getByTestId('btn-retry')
    expect(retryBtn).toBeInTheDocument()
  })

  it('点击"继续"应触发 onContinue', () => {
    const onContinue = vi.fn()
    render(<PronunciationFeedback {...defaultProps} onContinue={onContinue} />)
    fireEvent.click(screen.getByTestId('btn-continue'))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('点击"再试一次"应触发 onRetry', () => {
    const onRetry = vi.fn()
    render(<PronunciationFeedback {...defaultProps} passed={false} onRetry={onRetry} />)
    fireEvent.click(screen.getByTestId('btn-retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('应显示老师头像', () => {
    render(<PronunciationFeedback {...defaultProps} />)
    const avatar = screen.getByTestId('teacher-avatar')
    expect(avatar).toBeInTheDocument()
  })

  it('应有播放反馈语按钮', () => {
    render(<PronunciationFeedback {...defaultProps} />)
    const playBtn = screen.getByTestId('btn-play-feedback')
    expect(playBtn).toBeInTheDocument()
    fireEvent.click(playBtn)
    expect(defaultProps.onPlayFeedback).toHaveBeenCalledTimes(1)
  })
})
