/**
 * TeachingSlide 组件测试
 *
 * 测试教学幻灯片：渲染标题、教学内容、图片、TTS 触发
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeachingSlide } from '../TeachingSlide'
import type { Slide } from '@/services/openmaic/types'

describe('TeachingSlide', () => {
  const defaultSlide: Slide = {
    type: 'content',
    title: '认识数字 1-5',
    content: '今天我们来学习数字 1 到 5，每个数字都有它的小故事哦！',
    imageUrl: '/images/numbers-1-5.png',
    audioUrl: '/audio/numbers-intro.mp3',
  }

  let onAudioPlay: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAudioPlay = vi.fn()
  })

  it('应渲染幻灯片标题', () => {
    render(<TeachingSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('认识数字 1-5')).toBeInTheDocument()
  })

  it('应渲染教学文本内容', () => {
    render(<TeachingSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText(/今天我们来学习数字/)).toBeInTheDocument()
  })

  it('应渲染教学图片', () => {
    render(<TeachingSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/numbers-1-5.png')
  })

  it('无图片时不渲染 img 元素', () => {
    const slideWithoutImage: Slide = { ...defaultSlide, imageUrl: undefined }
    const { container } = render(
      <TeachingSlide slide={slideWithoutImage} onAudioPlay={onAudioPlay} />,
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('有 audioUrl 时应调用 onAudioPlay 回调', () => {
    render(<TeachingSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).toHaveBeenCalledWith('/audio/numbers-intro.mp3')
  })

  it('无 audioUrl 时不触发 onAudioPlay', () => {
    const slideNoAudio: Slide = { ...defaultSlide, audioUrl: undefined }
    render(<TeachingSlide slide={slideNoAudio} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).not.toHaveBeenCalled()
  })

  it('无标题时不渲染标题区域', () => {
    const slideNoTitle: Slide = { ...defaultSlide, title: undefined }
    render(<TeachingSlide slide={slideNoTitle} onAudioPlay={onAudioPlay} />)
    expect(screen.queryByText('认识数字 1-5')).not.toBeInTheDocument()
  })

  it('无内容时不渲染内容区域', () => {
    const slideNoContent: Slide = { ...defaultSlide, content: undefined }
    render(<TeachingSlide slide={slideNoContent} onAudioPlay={onAudioPlay} />)
    expect(screen.queryByText(/今天我们来学习数字/)).not.toBeInTheDocument()
  })

  it('应包含 teaching-slide 测试标识', () => {
    render(<TeachingSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('teaching-slide')).toBeInTheDocument()
  })

  it('title 类型的幻灯片也应正常渲染', () => {
    const titleSlide: Slide = {
      type: 'title',
      title: '欢迎来到数字王国',
      content: '准备好了吗？',
    }
    render(<TeachingSlide slide={titleSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('欢迎来到数字王国')).toBeInTheDocument()
    expect(screen.getByText('准备好了吗？')).toBeInTheDocument()
  })
})
