/**
 * 庆祝动画组件
 * 答对时的欢快庆祝动画
 * - 星星飞入效果（多个星星从屏幕各处飞向中心）
 * - 彩色纸屑飘落
 * - "+1⭐" 浮动动画
 * - "太棒了！" 文字弹出
 * 支持不同级别的庆祝（普通答对、连续答对3次、5次等）
 */

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/** 庆祝等级 */
export type CelebrationLevel = 'normal' | 'streak3' | 'streak5' | 'complete'

export interface CelebrationAnimationProps {
  /** 是否显示 */
  visible: boolean
  /** 庆祝等级 */
  level?: CelebrationLevel
  /** 自定义消息 */
  message?: string
  /** 动画完成回调 */
  onComplete: () => void
  /** 持续时间（毫秒） */
  duration?: number
}

/** 根据等级获取配置 */
function getLevelConfig(level: CelebrationLevel) {
  switch (level) {
    case 'streak3':
      return {
        starCount: 12,
        confettiCount: 20,
        message: '连续答对3题！太厉害了！🌟',
        emoji: '🌟🌟🌟',
        bgColor: 'rgba(255, 193, 7, 0.25)',
      }
    case 'streak5':
      return {
        starCount: 20,
        confettiCount: 35,
        message: '连续答对5题！你是超级星！✨',
        emoji: '🏆',
        bgColor: 'rgba(255, 152, 0, 0.3)',
      }
    case 'complete':
      return {
        starCount: 30,
        confettiCount: 50,
        message: '全部完成！你太棒了！🎉',
        emoji: '🎉',
        bgColor: 'rgba(255, 140, 66, 0.25)',
      }
    default:
      return {
        starCount: 6,
        confettiCount: 10,
        message: '太棒了！',
        emoji: '⭐',
        bgColor: 'rgba(76, 175, 80, 0.2)',
      }
  }
}

/** 纸屑颜色 */
const CONFETTI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#FFB074',
  '#F472B6', '#34D399', '#60A5FA', '#FBBF24',
]

/** 随机数工具 */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function CelebrationAnimation({
  visible,
  level = 'normal',
  message,
  onComplete,
  duration = 2500,
}: CelebrationAnimationProps) {
  const config = useMemo(() => getLevelConfig(level), [level])
  const displayMessage = message ?? config.message

  // 自动消失
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [visible, onComplete, duration])

  // 预计算星星和纸屑位置
  const stars = useMemo(
    () =>
      Array.from({ length: config.starCount }, (_, i) => ({
        id: i,
        startX: rand(-200, 200),
        startY: rand(-300, 300),
        delay: rand(0, 0.4),
        size: rand(20, 36),
      })),
    [config.starCount],
  )

  const confetti = useMemo(
    () =>
      Array.from({ length: config.confettiCount }, (_, i) => ({
        id: i,
        x: rand(-180, 180),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: rand(0, 0.6),
        rotation: rand(0, 360),
        size: rand(6, 12),
      })),
    [config.confettiCount],
  )

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="celebration-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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
            backgroundColor: config.bgColor,
            zIndex: 1100,
            pointerEvents: 'auto',
            overflow: 'hidden',
          }}
          onClick={onComplete}
        >
          {/* 星星飞入中心效果 */}
          {stars.map((star) => (
            <motion.span
              key={`star-${star.id}`}
              initial={{
                opacity: 0,
                scale: 0,
                x: star.startX,
                y: star.startY,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.5],
                x: [star.startX, 0],
                y: [star.startY, 0],
              }}
              transition={{
                delay: star.delay,
                duration: 0.8,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                fontSize: `${star.size}px`,
                zIndex: 2,
              }}
            >
              ⭐
            </motion.span>
          ))}

          {/* 彩色纸屑飘落 */}
          {confetti.map((c) => (
            <motion.div
              key={`confetti-${c.id}`}
              initial={{
                opacity: 0,
                y: -100,
                x: c.x,
                rotate: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0.5],
                y: [-100, 400],
                x: c.x + rand(-50, 50),
                rotate: c.rotation + 360,
              }}
              transition={{
                delay: c.delay,
                duration: 2,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                top: 0,
                width: `${c.size}px`,
                height: `${c.size * 1.5}px`,
                backgroundColor: c.color,
                borderRadius: '2px',
                zIndex: 1,
              }}
            />
          ))}

          {/* +1⭐ 浮动动画 */}
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -60],
              scale: [0.5, 1.2, 1],
            }}
            transition={{ delay: 0.2, duration: 1.2 }}
            style={{
              position: 'absolute',
              top: '35%',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#FFA000',
              zIndex: 3,
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            +1 ⭐
          </motion.div>

          {/* 中心 emoji */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 12,
            }}
            style={{
              fontSize: level === 'complete' ? '100px' : '80px',
              marginBottom: '16px',
              zIndex: 4,
            }}
          >
            {config.emoji}
          </motion.div>

          {/* 文字弹出 */}
          <motion.p
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#2E7D32',
              textAlign: 'center',
              padding: '12px 28px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              zIndex: 4,
            }}
          >
            {displayMessage}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
