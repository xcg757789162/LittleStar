/**
 * TPRSlide — TPR（全身反应法）活动幻灯片组件
 *
 * 渲染 tpr 类型的幻灯片：
 * - 动作指令卡片 + 动画引导
 * - 引导图片
 * - 自动触发 TTS 朗读指令
 */

import { useEffect } from 'react'
import type { Slide } from '@/services/openmaic/types'
import { resolveMediaUrl } from '@/utils/media-url'

export interface TPRSlideProps {
  /** 幻灯片数据 */
  slide: Slide
  /** TTS 音频播放回调 */
  onAudioPlay?: (audioUrl: string) => void
}

export function TPRSlide({ slide, onAudioPlay }: TPRSlideProps) {
  // 自动触发 TTS
  useEffect(() => {
    const audioSrc = resolveMediaUrl(slide.audioUrl)
    if (audioSrc && onAudioPlay) {
      onAudioPlay(audioSrc)
    }
  }, [slide.audioUrl, onAudioPlay])

  // 无指令时显示占位
  if (!slide.tprInstruction) {
    return (
      <div data-testid="tpr-placeholder" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '20px', color: '#A0AEC0' }}>活动加载中...</p>
      </div>
    )
  }

  return (
    <div
      data-testid="tpr-slide"
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

      {/* 动画容器 */}
      <div
        data-testid="tpr-animation"
        data-animation={slide.animation ?? 'none'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* 引导图片 */}
        {slide.imageUrl && (
          <div style={{ borderRadius: '20px', overflow: 'hidden', maxWidth: '60%' }}>
            <img
              src={resolveMediaUrl(slide.imageUrl)}
              alt={slide.title ?? 'TPR 活动'}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        )}

        {/* TPR 指令卡片 */}
        <div
          style={{
            backgroundColor: '#FFF3E7',
            borderRadius: '16px',
            padding: '24px 32px',
            border: '2px solid #FFD4B0',
            maxWidth: '500px',
          }}
        >
          <p
            style={{
              fontSize: '22px',
              fontWeight: 600,
              textAlign: 'center',
              color: '#E07030',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {slide.tprInstruction}
          </p>
        </div>
      </div>
    </div>
  )
}
