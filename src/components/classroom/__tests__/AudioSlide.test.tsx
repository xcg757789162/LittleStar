/**
 * AudioSlide 组件测试
 *
 * 测试音频/拟声词幻灯片：
 * 音频播放、拟声词大字高亮展示、播放按钮交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioSlide } from '../AudioSlide'
import type { Slide } from '@/services/openmaic/types'

describe('AudioSlide', () => {
  const defaultSlide: Slide = {
    type: 'audio',
    title: '听听小动物的声音',
    onomatopoeia: 'Woof, woof! 汪汪！',
    audioUrl: '/audio/dog-bark.mp3',
    content: '这是小狗的叫声哦！',
  }

  let onAudioPlay: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAudioPlay = vi.fn()
  })

  it('应以大号字体渲染拟声词', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const onomatopoeia = screen.getByTestId('onomatopoeia-text')
    expect(onomatopoeia).toHaveTextContent('Woof, woof! 汪汪！')
  })

  it('应渲染标题', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('听听小动物的声音')).toBeInTheDocument()
  })

  it('应渲染描述文本', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText(/这是小狗的叫声/)).toBeInTheDocument()
  })

  it('有 audioUrl 时应触发 onAudioPlay', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).toHaveBeenCalledWith('/audio/dog-bark.mp3')
  })

  it('无 audioUrl 时不触发 onAudioPlay', () => {
    const slideNoAudio: Slide = { ...defaultSlide, audioUrl: undefined }
    render(<AudioSlide slide={slideNoAudio} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).not.toHaveBeenCalled()
  })

  it('应包含 audio-slide 测试标识', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('audio-slide')).toBeInTheDocument()
  })

  it('无拟声词时不渲染 onomatopoeia 区域', () => {
    const slideNoOnom: Slide = { ...defaultSlide, onomatopoeia: undefined }
    render(<AudioSlide slide={slideNoOnom} onAudioPlay={onAudioPlay} />)
    expect(screen.queryByTestId('onomatopoeia-text')).not.toBeInTheDocument()
  })

  it('仅有 audioUrl 无拟声词时仍可正常渲染', () => {
    const slideAudioOnly: Slide = {
      type: 'audio',
      title: '听一听',
      audioUrl: '/audio/test.mp3',
    }
    render(<AudioSlide slide={slideAudioOnly} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('audio-slide')).toBeInTheDocument()
  })

  // === I1 修复：播放按钮交互 ===

  it('点击播放按钮应触发 onAudioPlay', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)

    // 清除 useEffect 的自动触发
    onAudioPlay.mockClear()

    const playButton = screen.getByTestId('audio-play-button')
    fireEvent.click(playButton)

    expect(onAudioPlay).toHaveBeenCalledWith('/audio/dog-bark.mp3')
  })

  it('播放按钮应有无障碍标签', () => {
    render(<AudioSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const playButton = screen.getByTestId('audio-play-button')
    expect(playButton).toHaveAttribute('aria-label', '播放音频')
  })
})
