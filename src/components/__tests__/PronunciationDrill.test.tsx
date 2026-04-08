import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PronunciationDrill } from '../voice/PronunciationDrill'

describe('PronunciationDrill', () => {
  const defaultProps = {
    word: 'apple',
    phase: 'listening' as const,
    stars: 0,
    feedbackText: '',
    passed: false,
    syllables: ['ap', 'ple'],
    currentSyllableIndex: 0,
    isRecording: false,
    onDemonstrate: vi.fn(),
    onRecord: vi.fn(),
    onRetry: vi.fn(),
    onDrill: vi.fn(),
    onContinue: vi.fn(),
    onPlayFeedback: vi.fn(),
  }

  it('应渲染纠音练习容器', () => {
    render(<PronunciationDrill {...defaultProps} />)
    const container = screen.getByTestId('pronunciation-drill')
    expect(container).toBeInTheDocument()
  })

  it('应显示当前练习的单词', () => {
    render(<PronunciationDrill {...defaultProps} />)
    expect(screen.getByTestId('drill-word')).toBeInTheDocument()
    expect(screen.getByTestId('drill-word').textContent).toContain('apple')
  })

  it('listening 阶段应显示录音按钮', () => {
    render(<PronunciationDrill {...defaultProps} phase="listening" />)
    const recordBtn = screen.getByTestId('voice-record-button')
    expect(recordBtn).toBeInTheDocument()
  })

  it('feedback 阶段应显示评分反馈', () => {
    render(
      <PronunciationDrill
        {...defaultProps}
        phase="feedback"
        stars={4}
        feedbackText="太棒了！"
        passed={true}
      />,
    )
    const starRating = screen.getByTestId('star-rating')
    expect(starRating).toBeInTheDocument()
  })

  it('drilling 阶段应显示音节高亮', () => {
    render(
      <PronunciationDrill
        {...defaultProps}
        phase="drilling"
        syllables={['ap', 'ple']}
      />,
    )
    const syllables = screen.getByTestId('syllable-highlight')
    expect(syllables).toBeInTheDocument()
  })

  it('recording 阶段应显示录音中状态', () => {
    render(
      <PronunciationDrill
        {...defaultProps}
        phase="recording"
        isRecording={true}
      />,
    )
    const recordBtn = screen.getByTestId('voice-record-button')
    expect(recordBtn).toHaveAttribute('data-recording', 'true')
  })

  it('idle 阶段应显示开始按钮', () => {
    render(<PronunciationDrill {...defaultProps} phase="idle" />)
    const startBtn = screen.getByTestId('btn-start')
    expect(startBtn).toBeInTheDocument()
  })

  it('点击开始应触发 onDemonstrate', () => {
    const onDemonstrate = vi.fn()
    render(<PronunciationDrill {...defaultProps} phase="idle" onDemonstrate={onDemonstrate} />)
    fireEvent.click(screen.getByTestId('btn-start'))
    expect(onDemonstrate).toHaveBeenCalledTimes(1)
  })

  it('retry 阶段应显示重试相关按钮', () => {
    render(<PronunciationDrill {...defaultProps} phase="retry" />)
    const retryBtn = screen.getByTestId('btn-retry')
    expect(retryBtn).toBeInTheDocument()
  })
})
