/**
 * TPRSlide 组件测试
 *
 * 测试 TPR（全身反应法）活动幻灯片：
 * 动作指令渲染、动画引导、TTS 朗读指令
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TPRSlide } from '../TPRSlide'
import type { Slide } from '@/services/openmaic/types'

describe('TPRSlide', () => {
  const defaultSlide: Slide = {
    type: 'tpr',
    title: '动起来！',
    tprInstruction: '请站起来，用双手比出数字 5 的样子！',
    audioUrl: '/audio/tpr-count-5.mp3',
    animation: 'bounce',
    imageUrl: '/images/tpr-hand.png',
  }

  let onAudioPlay: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAudioPlay = vi.fn()
  })

  it('应渲染 TPR 指令文本', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText(/请站起来，用双手比出数字/)).toBeInTheDocument()
  })

  it('应渲染标题', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('动起来！')).toBeInTheDocument()
  })

  it('有 audioUrl 时应触发 onAudioPlay', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).toHaveBeenCalledWith('/audio/tpr-count-5.mp3')
  })

  it('无 audioUrl 时不触发 onAudioPlay', () => {
    const slideNoAudio: Slide = { ...defaultSlide, audioUrl: undefined }
    render(<TPRSlide slide={slideNoAudio} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).not.toHaveBeenCalled()
  })

  it('应渲染引导图片', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/images/tpr-hand.png')
  })

  it('无引导图片时不渲染 img', () => {
    const slideNoImage: Slide = { ...defaultSlide, imageUrl: undefined }
    const { container } = render(<TPRSlide slide={slideNoImage} onAudioPlay={onAudioPlay} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('应包含 tpr-slide 测试标识', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('tpr-slide')).toBeInTheDocument()
  })

  it('无 tprInstruction 时显示占位提示', () => {
    const slideNoInstruction: Slide = { type: 'tpr', title: '测试' }
    render(<TPRSlide slide={slideNoInstruction} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('tpr-placeholder')).toBeInTheDocument()
  })

  it('应展示动画类型标记', () => {
    render(<TPRSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('tpr-animation')).toHaveAttribute('data-animation', 'bounce')
  })
})
