/**
 * TeachingSlide — 教学幻灯片组件
 *
 * 渲染 title/content 类型的幻灯片：
 * - 大图卡片 + 标题 + 教学文本
 * - 自动触发 TTS 语音播放
 * - 渐变柔和背景、大字号、圆润按钮
 */

import { useEffect } from 'react'
import type { Slide } from '@/services/openmaic/types'
import { resolveMediaUrl } from '@/utils/media-url'

export interface TeachingSlideProps {
  /** 幻灯片数据 */
  slide: Slide
  /** TTS 音频播放回调 */
  onAudioPlay?: (audioUrl: string) => void
}

export function TeachingSlide({ slide, onAudioPlay }: TeachingSlideProps) {
  // 自动触发 TTS
  useEffect(() => {
    const audioSrc = resolveMediaUrl(slide.audioUrl)
    if (audioSrc && onAudioPlay) {
      onAudioPlay(audioSrc)
    }
  }, [slide.audioUrl, onAudioPlay])

  return (
    <div
      data-testid="teaching-slide"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '16px',
        minHeight: '100%',
      }}
    >
      {/* 标题 */}
      {slide.title && (
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 700,
            textAlign: 'center',
            color: '#2D3748',
            margin: 0,
          }}
        >
          {slide.title}
        </h2>
      )}

      {/* 教学图片 */}
      {slide.imageUrl && (
        <div
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            maxWidth: '80%',
          }}
        >
          <img
            src={resolveMediaUrl(slide.imageUrl)}
            alt={slide.title ?? '教学图片'}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* 教学文本 */}
      {slide.content && (
        <p
          style={{
            fontSize: '20px',
            lineHeight: 1.6,
            textAlign: 'center',
            color: '#4A5568',
            maxWidth: '600px',
            margin: 0,
          }}
        >
          {slide.content}
        </p>
      )}
    </div>
  )
}
