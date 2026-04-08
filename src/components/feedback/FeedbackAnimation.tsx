/**
 * 即时反馈动画组件（增强版）
 * 正确→星星粒子+收集动画+鼓励，错误→温柔提示+重试引导
 */

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type FeedbackType = 'correct' | 'wrong'

const CORRECT_MESSAGES = ['太棒了！', '真厉害！', '答对了！', '你好聪明！', '完美！']
const WRONG_MESSAGES = ['没关系，再试一次！', '加油，想一想！', '别着急，慢慢来！']

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

/** 随机数工具 */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
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

  // 星星粒子（增强版 - 更多数量和更丰富的运动）
  const starParticles = useMemo(
    () =>
      isCorrect
        ? Array.from({ length: 10 }, (_, i) => ({
            id: i,
            angle: (i * Math.PI * 2) / 10,
            distance: rand(80, 160),
            delay: rand(0.1, 0.5),
            size: rand(20, 36),
          }))
        : [],
    [isCorrect],
  )

  // 收集动画的小星星（从四周飞到中心上方的"收集区"）
  const collectStars = useMemo(
    () =>
      isCorrect
        ? Array.from({ length: 4 }, (_, i) => ({
            id: i,
            startX: rand(-150, 150),
            startY: rand(-100, 200),
            delay: 0.6 + i * 0.12,
          }))
        : [],
    [isCorrect],
  )

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
          overflow: 'hidden',
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

        {/* 星星粒子扩散效果（增强） */}
        {isCorrect &&
          starParticles.map((star) => (
            <motion.span
              key={`particle-${star.id}`}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: Math.cos(star.angle) * star.distance,
                y: Math.sin(star.angle) * star.distance - 60,
              }}
              transition={{
                delay: star.delay,
                duration: 0.8,
              }}
              style={{
                position: 'absolute',
                fontSize: `${star.size}px`,
              }}
            >
              ✨
            </motion.span>
          ))}

        {/* 星星收集动画 — 从四周飞向顶部收集区 */}
        {isCorrect &&
          collectStars.map((star) => (
            <motion.span
              key={`collect-${star.id}`}
              initial={{
                opacity: 0,
                x: star.startX,
                y: star.startY,
                scale: 0.5,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [star.startX, 0],
                y: [star.startY, -200],
                scale: [0.5, 1.2, 0.8],
              }}
              transition={{
                delay: star.delay,
                duration: 0.8,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                fontSize: '24px',
              }}
            >
              ⭐
            </motion.span>
          ))}

        {/* 正确时的脉冲光晕 */}
        {isCorrect && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ delay: 0.2, duration: 1 }}
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(76, 175, 80, 0.3)',
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
