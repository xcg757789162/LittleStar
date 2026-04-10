/**
 * AudioSlide — 音频/拟声词幻灯片组件
 *
 * 渲染 audio 类型的幻灯片：
 * - 拟声词以大号字体高亮展示
 * - 自动触发音频播放
 * - 标题和描述文本
 */

import { useEffect } from 'react'
import type { Slide } from '@/services/openmaic/types'
import { resolveMediaUrl } from '@/utils/media-url'

export interface AudioSlideProps {
  /** 幻灯片数据 */
  slide: Slide
  /** 音频播放回调（TODO: 当前 iframe 模式下未使用，保留接口供自渲染模式使用） */
  onAudioPlay?: (audioUrl: string) => void
}

export function AudioSlide({ slide, onAudioPlay }: AudioSlideProps) {
  // 自动触发音频播放
  useEffect(() => {
    const audioSrc = resolveMediaUrl(slide.audioUrl)
    if (audioSrc && onAudioPlay) {
      onAudioPlay(audioSrc)
    }
  }, [slide.audioUrl, onAudioPlay])

  return (
    <div
      data-testid="audio-slide"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '20px',
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

      {/* 拟声词大号高亮展示 */}
      {slide.onomatopoeia && (
        <div
          data-testid="onomatopoeia-text"
          style={{
            fontSize: '48px',
            fontWeight: 800,
            textAlign: 'center',
            color: '#D53F8C',
            padding: '24px',
            borderRadius: '20px',
            backgroundColor: '#FFF5F7',
            border: '3px solid #FED7E2',
            lineHeight: 1.4,
          }}
        >
          {slide.onomatopoeia}
        </div>
      )}

      {/* 音频播放按钮区域 */}
      <button
        data-testid="audio-play-button"
        onClick={() => { const src = resolveMediaUrl(slide.audioUrl); if (src) onAudioPlay?.(src) }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#4299E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(66, 153, 225, 0.4)',
          border: 'none',
          padding: 0,
        }}
        aria-label="播放音频"
      >
        🔊
      </button>

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
