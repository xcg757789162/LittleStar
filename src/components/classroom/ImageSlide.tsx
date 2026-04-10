/**
 * ImageSlide — 图片展示幻灯片组件
 *
 * 渲染 image 类型的幻灯片：
 * - 大图卡片（居中展示）
 * - 标题和描述文本
 * - 自动触发 TTS 语音播放
 */

import { useEffect } from 'react'
import type { Slide } from '@/services/openmaic/types'
import { ImageWithFallback } from '@/components/common/ImageWithFallback'

export interface ImageSlideProps {
  /** 幻灯片数据 */
  slide: Slide
  /** TTS 音频播放回调 */
  onAudioPlay?: (audioUrl: string) => void
}

export function ImageSlide({ slide, onAudioPlay }: ImageSlideProps) {
  // 自动触发 TTS
  useEffect(() => {
    if (slide.audioUrl && onAudioPlay) {
      onAudioPlay(slide.audioUrl)
    }
  }, [slide.audioUrl, onAudioPlay])

  return (
    <div
      data-testid="image-slide"
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

      {/* 主图片 — ImageWithFallback 自动处理 gen_img_* 占位符与加载失败 */}
      <div
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          maxWidth: '90%',
          boxShadow: slide.imageUrl ? '0 8px 24px rgba(0, 0, 0, 0.1)' : 'none',
        }}
      >
        <ImageWithFallback
          src={slide.imageUrl}
          alt={slide.title ?? '图片'}
          width="100%"
          height="auto"
        />
      </div>

      {/* 描述文本 */}
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
