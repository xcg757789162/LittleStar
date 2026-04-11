/**
 * 鼓励覆盖层组件
 * 答错时的温柔鼓励，柔和暖色背景
 * 自动消失（2秒）
 */

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/** 鼓励消息列表 */
const ENCOURAGEMENT_MESSAGES = [
  { text: '没关系，再试一次！', emoji: '💪' },
  { text: '加油，你可以的！', emoji: '🤗' },
  { text: '别着急，慢慢来！', emoji: '🌈' },
  { text: '每次尝试都是进步！', emoji: '🌟' },
  { text: '再想一想，你很棒！', emoji: '💖' },
]

export interface EncouragementOverlayProps {
  /** 是否显示 */
  visible: boolean
  /** 自定义消息 */
  message?: string
  /** 自定义 emoji */
  emoji?: string
  /** 动画完成回调 */
  onComplete: () => void
  /** 持续时间（毫秒） */
  duration?: number
}

export function EncouragementOverlay({
  visible,
  message,
  emoji,
  onComplete,
  duration = 2000,
}: EncouragementOverlayProps) {
  // 随机选择鼓励消息
  const randomMsg = useMemo(
    () => ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible], // visible 变化时重新选择
  )

  const displayText = message ?? randomMsg.text
  const displayEmoji = emoji ?? randomMsg.emoji

  // 自动消失
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [visible, onComplete, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="encouragement-overlay"
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
            backgroundColor: 'rgba(255, 167, 38, 0.2)',
            zIndex: 1100,
            pointerEvents: 'auto',
          }}
          onClick={onComplete}
        >
          {/* Emoji 动画 */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            style={{
              fontSize: '72px',
              marginBottom: '16px',
            }}
          >
            {displayEmoji}
          </motion.div>

          {/* 鼓励文字 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#E65100',
              textAlign: 'center',
              padding: '14px 32px',
              borderRadius: '20px',
              backgroundColor: '#FFF3E0',
              boxShadow: '0 4px 16px rgba(230, 81, 0, 0.15)',
              maxWidth: '80%',
            }}
          >
            {displayText}
          </motion.div>

          {/* 柔和的光晕效果 */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ delay: 0.2, duration: 1.5 }}
            style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 183, 77, 0.4)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
