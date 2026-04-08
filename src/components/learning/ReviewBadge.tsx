/**
 * 复习标记组件
 * 在题目上方显示"🌙 复习时间"标记，区分新知识和复习内容
 */

import { motion } from 'framer-motion'

export interface ReviewBadgeProps {
  /** 是否为复习内容 */
  isReview: boolean
}

export function ReviewBadge({ isReview }: ReviewBadgeProps) {
  if (!isReview) return null

  return (
    <motion.div
      data-testid="review-badge"
      initial={{ opacity: 0, y: -10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 16px',
        borderRadius: '16px',
        backgroundColor: '#EDE7F6',
        color: '#5E35B1',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '12px',
      }}
    >
      <motion.span
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        style={{ fontSize: '16px' }}
      >
        🌙
      </motion.span>
      复习时间
    </motion.div>
  )
}
