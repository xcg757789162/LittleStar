/**
 * 闪卡学习组件
 * 大图+文字+语音的闪卡，支持翻转动画
 */

import { motion } from 'framer-motion'

export interface FlashCardProps {
  /** 正面文字 */
  frontText: string
  /** 背面文字 */
  backText: string
  /** 图片 URL */
  imageUrl?: string
  /** 是否翻转 */
  isFlipped?: boolean
  /** 翻转回调 */
  onFlip: () => void
  /** 下一个回调 */
  onNext: () => void
  /** 语音播放回调 */
  onPlayVoice: () => void
}

export function FlashCard({
  frontText,
  backText,
  imageUrl,
  isFlipped = false,
  onFlip,
  onNext,
  onPlayVoice,
}: FlashCardProps) {
  return (
    <div
      data-testid="flashcard"
      onClick={onFlip}
      style={{
        perspective: '1000px',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        cursor: 'pointer',
      }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{
          width: '100%',
          minHeight: '300px',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 正面 */}
        <div
          style={{
            position: isFlipped ? 'absolute' : 'relative',
            width: '100%',
            minHeight: '300px',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            borderRadius: '24px',
            backgroundColor: '#FFF8E1',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            visibility: isFlipped ? 'hidden' : 'visible',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={frontText}
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: '16px',
                marginBottom: '16px',
                objectFit: 'contain',
              }}
            />
          )}
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {frontText}
          </p>
          <button
            data-testid="voice-button"
            onClick={(e) => {
              e.stopPropagation()
              onPlayVoice()
            }}
            style={{
              marginTop: '16px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#FFB74D',
              cursor: 'pointer',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="播放语音"
          >
            🔊
          </button>
        </div>

        {/* 背面 */}
        {isFlipped && (
          <div
            style={{
              width: '100%',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              borderRadius: '24px',
              backgroundColor: '#E8F5E9',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            <p
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#2E7D32',
                textAlign: 'center',
                margin: 0,
              }}
            >
              {backText}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNext()
              }}
              style={{
                marginTop: '24px',
                padding: '12px 32px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: '#66BB6A',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              下一个
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
