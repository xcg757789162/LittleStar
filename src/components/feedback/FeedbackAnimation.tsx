/**
 * 即时反馈动画组件
 * 正确→星星粒子+鼓励，错误→温柔提示+重试引导
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type FeedbackType = 'correct' | 'wrong'

const CORRECT_MESSAGES = ['太棒了！', '真厉害！', '答对了！', '你好聪明！']
const WRONG_MESSAGES = ['没关系，再试一次！', '加油，想一想！', '别着急，慢慢来！']

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

export interface FeedbackAnimationProps {
  /** 反馈类型 */
  type: FeedbackType
  /** 自定义消息（可选） */
  message?: string
  /** 动画完成回调 */
  onComplete: () => void
  /** 自动消失时间（毫秒） */
  duration?: number
}

export function FeedbackAnimation({
  type,
  message,
  onComplete,
  duration = 2000,
}: FeedbackAnimationProps) {
  const isCorrect = type === 'correct'
  const displayMessage =
    message ?? (isCorrect ? getRandomMessage(CORRECT_MESSAGES) : getRandomMessage(WRONG_MESSAGES))

  useEffect(() => {
    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [onComplete, duration])

  return (
    <AnimatePresence>
      <motion.div
        data-testid="feedback-container"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isCorrect ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.2)',
          zIndex: 1000,
        }}
      >
        {/* 图标 */}
        <motion.div
          data-testid="feedback-icon"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          style={{
            fontSize: '80px',
            marginBottom: '16px',
          }}
        >
          {isCorrect ? '⭐' : '💪'}
        </motion.div>

        {/* 消息 */}
        <motion.p
          data-testid="feedback-message"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: isCorrect ? '#2E7D32' : '#E65100',
            textAlign: 'center',
            padding: '16px 32px',
            borderRadius: '20px',
            backgroundColor: isCorrect ? '#E8F5E9' : '#FFF3E0',
          }}
        >
          {displayMessage}
        </motion.p>

        {/* 正确时的星星粒子效果 */}
        {isCorrect && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: Math.cos((i * Math.PI) / 3) * 120,
                  y: Math.sin((i * Math.PI) / 3) * 120 - 60,
                }}
                transition={{
                  delay: 0.3 + i * 0.1,
                  duration: 0.8,
                }}
                style={{
                  position: 'absolute',
                  fontSize: '30px',
                }}
              >
                ✨
              </motion.span>
            ))}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
