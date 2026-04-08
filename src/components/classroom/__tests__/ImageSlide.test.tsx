/**
 * ImageSlide 组件测试
 *
 * 测试图片展示幻灯片：渲染大图、标题、TTS 触发
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageSlide } from '../ImageSlide'
import type { Slide } from '@/services/openmaic/types'

describe('ImageSlide', () => {
  const defaultSlide: Slide = {
    type: 'image',
    title: '可爱的小猫咪',
    imageUrl: '/images/cat.png',
    audioUrl: '/audio/cat-meow.mp3',
    content: '看，这是一只毛茸茸的小猫！',
  }

  let onAudioPlay: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAudioPlay = vi.fn()
  })

  it('应渲染主图片', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/cat.png')
  })

  it('应渲染标题', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText('可爱的小猫咪')).toBeInTheDocument()
  })

  it('应渲染描述文本', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByText(/毛茸茸的小猫/)).toBeInTheDocument()
  })

  it('无 imageUrl 时显示占位提示', () => {
    const slideNoImage: Slide = { ...defaultSlide, imageUrl: undefined }
    render(<ImageSlide slide={slideNoImage} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument()
  })

  it('有 audioUrl 时应触发 onAudioPlay', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).toHaveBeenCalledWith('/audio/cat-meow.mp3')
  })

  it('无 audioUrl 时不触发 onAudioPlay', () => {
    const slideNoAudio: Slide = { ...defaultSlide, audioUrl: undefined }
    render(<ImageSlide slide={slideNoAudio} onAudioPlay={onAudioPlay} />)
    expect(onAudioPlay).not.toHaveBeenCalled()
  })

  it('应包含 image-slide 测试标识', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    expect(screen.getByTestId('image-slide')).toBeInTheDocument()
  })

  it('图片应有 alt 属性匹配标题', () => {
    render(<ImageSlide slide={defaultSlide} onAudioPlay={onAudioPlay} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', '可爱的小猫咪')
  })
})
