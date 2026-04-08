/**
 * 发音评分反馈组件
 * 组合 StarRating + 老师头像气泡 + 操作按钮
 */

import { motion } from 'framer-motion'
import { StarRating } from './StarRating'

export interface PronunciationFeedbackProps {
  /** 星级 */
  stars: number
  /** AI 老师反馈文本 */
  feedbackText: string
  /** 是否通过 */
  passed: boolean
  /** 重试回调 */
  onRetry: () => void
  /** 继续回调 */
  onContinue: () => void
  /** 播放反馈语回调 */
  onPlayFeedback: () => void
}

export function PronunciationFeedback({
  stars,
  feedbackText,
  passed,
  onRetry,
  onContinue,
  onPlayFeedback,
}: PronunciationFeedbackProps) {
  return (
    <motion.div
      data-testid="pronunciation-feedback"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
      }}
    >
      {/* 星星评分 */}
      <StarRating stars={stars} animated={true} size={48} />

      {/* AI 老师反馈气泡 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          maxWidth: '320px',
        }}
      >
        {/* 老师头像 */}
        <div
          data-testid="teacher-avatar"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          🌟
        </div>

        {/* 反馈气泡 */}
        <div
          data-testid="feedback-bubble"
          style={{
            backgroundColor: '#F3E5F5',
            borderRadius: '16px',
            borderTopLeftRadius: '4px',
            padding: '12px 16px',
            fontSize: '16px',
            lineHeight: 1.5,
            color: '#37474F',
            position: 'relative',
          }}
        >
          {feedbackText}

          {/* 播放反馈语按钮 */}
          <button
            data-testid="btn-play-feedback"
            onClick={onPlayFeedback}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '2px',
              verticalAlign: 'middle',
            }}
          >
            🔊
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {passed ? (
          <motion.button
            data-testid="btn-continue"
            onClick={onContinue}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            }}
          >
            继续 ▶
          </motion.button>
        ) : (
          <motion.button
            data-testid="btn-retry"
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#FF9800',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
            }}
          >
            再试一次 🔄
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
