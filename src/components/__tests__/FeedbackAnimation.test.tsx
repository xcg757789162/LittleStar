import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedbackAnimation } from '../feedback/FeedbackAnimation'

describe('FeedbackAnimation', () => {
  it('正确反馈应显示鼓励文字', () => {
    render(<FeedbackAnimation type="correct" onComplete={vi.fn()} />)
    const text = screen.getByTestId('feedback-message')
    expect(text).toBeInTheDocument()
    expect(text.textContent).toMatch(/棒|太好了|真厉害|对了|聪明/)
  })

  it('错误反馈应显示引导文字', () => {
    render(<FeedbackAnimation type="wrong" onComplete={vi.fn()} />)
    const text = screen.getByTestId('feedback-message')
    expect(text).toBeInTheDocument()
    expect(text.textContent).toMatch(/再试|没关系|加油|想一想|别着急/)
  })

  it('正确反馈应显示星星/烟花图标', () => {
    render(<FeedbackAnimation type="correct" onComplete={vi.fn()} />)
    const icon = screen.getByTestId('feedback-icon')
    expect(icon).toBeInTheDocument()
  })

  it('错误反馈应显示温柔引导图标', () => {
    render(<FeedbackAnimation type="wrong" onComplete={vi.fn()} />)
    const icon = screen.getByTestId('feedback-icon')
    expect(icon).toBeInTheDocument()
  })

  it('应有反馈容器', () => {
    render(<FeedbackAnimation type="correct" onComplete={vi.fn()} />)
    const container = screen.getByTestId('feedback-container')
    expect(container).toBeInTheDocument()
  })

  it('自定义消息应被使用', () => {
    render(
      <FeedbackAnimation
        type="correct"
        message="你真棒！"
        onComplete={vi.fn()}
      />,
    )
    expect(screen.getByText('你真棒！')).toBeInTheDocument()
  })
})
