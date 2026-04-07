import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlashCard } from '../learning/FlashCard'

describe('FlashCard', () => {
  const defaultProps = {
    frontText: '1 + 1 = ?',
    backText: '2',
    imageUrl: '/images/math-1.png',
    onFlip: vi.fn(),
    onNext: vi.fn(),
    onPlayVoice: vi.fn(),
  }

  it('应渲染正面内容', () => {
    render(<FlashCard {...defaultProps} />)
    expect(screen.getByText('1 + 1 = ?')).toBeInTheDocument()
  })

  it('应渲染图片（如果提供）', () => {
    render(<FlashCard {...defaultProps} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/math-1.png')
  })

  it('没有图片时不渲染 img', () => {
    const { container } = render(
      <FlashCard {...defaultProps} imageUrl={undefined} />
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('点击卡片应触发翻转回调', () => {
    render(<FlashCard {...defaultProps} />)
    const card = screen.getByTestId('flashcard')
    fireEvent.click(card)
    expect(defaultProps.onFlip).toHaveBeenCalledTimes(1)
  })

  it('翻转后应显示背面内容', () => {
    render(<FlashCard {...defaultProps} isFlipped={true} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('应有语音播放按钮', () => {
    render(<FlashCard {...defaultProps} />)
    const voiceBtn = screen.getByTestId('voice-button')
    expect(voiceBtn).toBeInTheDocument()
  })

  it('点击语音按钮应触发 onPlayVoice', () => {
    render(<FlashCard {...defaultProps} />)
    const voiceBtn = screen.getByTestId('voice-button')
    fireEvent.click(voiceBtn)
    expect(defaultProps.onPlayVoice).toHaveBeenCalledTimes(1)
  })

  it('应有"下一个"按钮', () => {
    render(<FlashCard {...defaultProps} isFlipped={true} />)
    const nextBtn = screen.getByText(/下一个|继续/)
    expect(nextBtn).toBeInTheDocument()
  })

  it('点击"下一个"应触发 onNext', () => {
    render(<FlashCard {...defaultProps} isFlipped={true} />)
    const nextBtn = screen.getByText(/下一个|继续/)
    fireEvent.click(nextBtn)
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1)
  })
})
