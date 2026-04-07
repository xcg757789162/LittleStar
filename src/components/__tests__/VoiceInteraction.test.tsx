import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoicePlayer } from '../voice/VoicePlayer'
import { VoiceRecorder } from '../voice/VoiceRecorder'

describe('VoicePlayer', () => {
  it('应渲染播放按钮', () => {
    render(<VoicePlayer onPlay={vi.fn()} isPlaying={false} />)
    const btn = screen.getByTestId('voice-play-button')
    expect(btn).toBeInTheDocument()
  })

  it('点击应触发 onPlay', () => {
    const onPlay = vi.fn()
    render(<VoicePlayer onPlay={onPlay} isPlaying={false} />)
    fireEvent.click(screen.getByTestId('voice-play-button'))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('播放中应显示不同状态', () => {
    render(<VoicePlayer onPlay={vi.fn()} isPlaying={true} />)
    const btn = screen.getByTestId('voice-play-button')
    expect(btn).toHaveAttribute('data-playing', 'true')
  })

  it('禁用时不应响应点击', () => {
    const onPlay = vi.fn()
    render(<VoicePlayer onPlay={onPlay} isPlaying={false} disabled={true} />)
    fireEvent.click(screen.getByTestId('voice-play-button'))
    expect(onPlay).not.toHaveBeenCalled()
  })
})

describe('VoiceRecorder', () => {
  it('应渲染录音按钮', () => {
    render(<VoiceRecorder onRecord={vi.fn()} isRecording={false} />)
    const btn = screen.getByTestId('voice-record-button')
    expect(btn).toBeInTheDocument()
  })

  it('点击应触发 onRecord', () => {
    const onRecord = vi.fn()
    render(<VoiceRecorder onRecord={onRecord} isRecording={false} />)
    fireEvent.click(screen.getByTestId('voice-record-button'))
    expect(onRecord).toHaveBeenCalledTimes(1)
  })

  it('录音中应显示不同状态', () => {
    render(<VoiceRecorder onRecord={vi.fn()} isRecording={true} />)
    const btn = screen.getByTestId('voice-record-button')
    expect(btn).toHaveAttribute('data-recording', 'true')
  })

  it('录音中应显示状态提示', () => {
    render(<VoiceRecorder onRecord={vi.fn()} isRecording={true} />)
    expect(screen.getByText(/录音中|正在听/)).toBeInTheDocument()
  })
})
