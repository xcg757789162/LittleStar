/**
 * TPR 全身反应法交互组件
 * 展示 TPR 指令 + emoji 动画 + 倒计时 + 完成按钮
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TPRCommand, TPRAnimationType } from '@/data/seed/english-tpr'

/** 动画配置映射 */
const ANIMATION_CONFIGS: Record<
  TPRAnimationType,
  {
    emoji: string
    animate: Record<string, number[]>
    transition: Record<string, unknown>
  }
> = {
  up: {
    emoji: '⬆️',
    animate: { y: [0, -40, 0, -40, 0] },
    transition: { duration: 2, repeat: Infinity, repeatDelay: 0.5 },
  },
  down: {
    emoji: '⬇️',
    animate: { y: [0, 40, 0, 40, 0] },
    transition: { duration: 2, repeat: Infinity, repeatDelay: 0.5 },
  },
  jump: {
    emoji: '🏃',
    animate: { y: [0, -60, 0, -60, 0], scale: [1, 1.2, 1, 1.2, 1] },
    transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.3 },
  },
  clap: {
    emoji: '👏',
    animate: { scale: [1, 1.3, 1, 1.3, 1], rotate: [0, -10, 10, -10, 0] },
    transition: { duration: 1, repeat: Infinity, repeatDelay: 0.2 },
  },
  turn: {
    emoji: '🔄',
    animate: { rotate: [0, 360] },
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
  touch: {
    emoji: '👆',
    animate: { y: [0, 10, -10, 10, 0], scale: [1, 1.1, 1, 1.1, 1] },
    transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.3 },
  },
  wave: {
    emoji: '👋',
    animate: { rotate: [0, 20, -20, 20, -20, 0] },
    transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.3 },
  },
}

export interface TPRActivityProps {
  /** TPR 指令数据 */
  command: TPRCommand
  /** 完成回调 */
  onComplete: (isCorrect: boolean) => void
}

/** 倒计时阶段 */
type Phase = 'countdown' | 'action' | 'done'

export function TPRActivity({ command, onComplete }: TPRActivityProps) {
  const [phase, setPhase] = useState<Phase>('countdown')
  const [countdown, setCountdown] = useState(3)

  // 倒计时逻辑
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdown <= 0) {
      setPhase('action')
      // 使用 TTS 播放指令
      try {
        const utterance = new SpeechSynthesisUtterance(command.command)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        utterance.pitch = 1.2
        window.speechSynthesis.speak(utterance)
      } catch {
        // TTS 不可用时静默处理
      }
      return
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [phase, countdown, command.command])

  const handleDone = useCallback(() => {
    setPhase('done')
    // TPR 互动默认记为正确（鼓励参与）
    onComplete(true)
  }, [onComplete])

  const handleReplay = useCallback(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(command.command)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      utterance.pitch = 1.2
      window.speechSynthesis.speak(utterance)
    } catch {
      // TTS 不可用
    }
  }, [command.command])

  const animConfig = ANIMATION_CONFIGS[command.animationType]

  return (
    <div
      data-testid="tpr-activity"
      style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      {/* 倒计时阶段 */}
      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <p style={{ fontSize: '20px', color: '#666' }}>准备好了吗？</p>
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: countdown === 1 ? '#FF5722' : countdown === 2 ? '#FF9800' : '#4CAF50',
                lineHeight: 1,
              }}
            >
              {countdown}
            </motion.div>
            <p style={{ fontSize: '16px', color: '#999' }}>
              {command.chineseHint}
            </p>
          </motion.div>
        )}

        {/* 动作阶段 */}
        {phase === 'action' && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {/* 标签 */}
            <div
              style={{
                padding: '6px 20px',
                borderRadius: '16px',
                backgroundColor: '#E3F2FD',
                color: '#1565C0',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              🏃 TPR 动起来！
            </div>

            {/* 英文指令 - 大字体 */}
            <motion.h2
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#1565C0',
                margin: 0,
                textShadow: '0 2px 4px rgba(21, 101, 192, 0.2)',
              }}
            >
              {command.command}
            </motion.h2>

            {/* 中文提示 */}
            <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              {command.chineseHint}
            </p>

            {/* 动画 emoji */}
            <motion.div
              animate={animConfig.animate}
              transition={animConfig.transition}
              style={{
                fontSize: '80px',
                lineHeight: 1,
                margin: '8px 0',
              }}
            >
              {command.emoji}
            </motion.div>

            {/* 示意动画 */}
            <motion.div
              animate={animConfig.animate}
              transition={{
                ...animConfig.transition,
                delay: 0.5,
              }}
              style={{
                fontSize: '48px',
                lineHeight: 1,
                opacity: 0.6,
              }}
            >
              {animConfig.emoji}
            </motion.div>

            {/* 操作按钮 */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px',
              }}
            >
              {/* 再听一次 */}
              <motion.button
                data-testid="tpr-replay-button"
                onClick={handleReplay}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '20px',
                  border: '2px solid #1565C0',
                  backgroundColor: 'white',
                  color: '#1565C0',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🔊 再听一次
              </motion.button>

              {/* 完成按钮 */}
              <motion.button
                data-testid="tpr-done-button"
                onClick={handleDone}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    '0 4px 16px rgba(76, 175, 80, 0.3)',
                    '0 8px 24px rgba(76, 175, 80, 0.5)',
                    '0 4px 16px rgba(76, 175, 80, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  padding: '12px 32px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ✅ 我做到了！
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
