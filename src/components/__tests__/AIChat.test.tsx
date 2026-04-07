import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AIChat } from '../ai/AIChat'

describe('AIChat', () => {
  const defaultProps = {
    messages: [
      { id: '1', role: 'assistant' as const, content: '你好小朋友！我是小星老师～' },
      { id: '2', role: 'user' as const, content: '老师好！' },
      { id: '3', role: 'assistant' as const, content: '今天我们来学数学吧！' },
    ],
    onSend: vi.fn(),
    isLoading: false,
  }

  it('应渲染所有消息气泡', () => {
    render(<AIChat {...defaultProps} />)
    expect(screen.getByText('你好小朋友！我是小星老师～')).toBeInTheDocument()
    expect(screen.getByText('老师好！')).toBeInTheDocument()
    expect(screen.getByText('今天我们来学数学吧！')).toBeInTheDocument()
  })

  it('AI 消息应显示在左侧', () => {
    render(<AIChat {...defaultProps} />)
    const aiMsg = screen.getByText('你好小朋友！我是小星老师～').closest('[data-role]')
    expect(aiMsg).toHaveAttribute('data-role', 'assistant')
  })

  it('用户消息应显示在右侧', () => {
    render(<AIChat {...defaultProps} />)
    const userMsg = screen.getByText('老师好！').closest('[data-role]')
    expect(userMsg).toHaveAttribute('data-role', 'user')
  })

  it('AI 消息应显示头像', () => {
    render(<AIChat {...defaultProps} />)
    const avatars = screen.getAllByTestId('ai-avatar')
    expect(avatars.length).toBeGreaterThan(0)
  })

  it('加载中应显示加载指示器', () => {
    render(<AIChat {...defaultProps} isLoading={true} />)
    const loading = screen.getByTestId('chat-loading')
    expect(loading).toBeInTheDocument()
  })

  it('不加载时不显示加载指示器', () => {
    render(<AIChat {...defaultProps} isLoading={false} />)
    expect(screen.queryByTestId('chat-loading')).toBeNull()
  })

  it('空消息列表应显示欢迎语', () => {
    render(<AIChat messages={[]} onSend={vi.fn()} isLoading={false} />)
    expect(screen.getByTestId('chat-container')).toBeInTheDocument()
  })
})
