/**
 * 亲子活动卡片组件
 * 展示亲子小任务，大卡片设计，有趣的 emoji 和友好语调
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { ParentActivity } from '@/services/api/types'

/** 活动类型 emoji 映射 */
const TYPE_EMOJI: Record<string, string> = {
  sing: '🎵',
  find: '🔍',
  play: '🎮',
  draw: '🎨',
  talk: '💬',
}

/** 活动类型背景色映射 */
const TYPE_BG_COLOR: Record<string, string> = {
  sing: '#FFF3E0',
  find: '#E3F2FD',
  play: '#F3E5F5',
  draw: '#E8F5E9',
  talk: '#FCE4EC',
}

/** 活动类型边框色映射 */
const TYPE_BORDER_COLOR: Record<string, string> = {
  sing: '#FFB74D',
  find: '#64B5F6',
  play: '#BA68C8',
  draw: '#81C784',
  talk: '#F06292',
}

export interface ParentActivityCardProps {
  /** 亲子活动数据 */
  activity: ParentActivity
  /** 完成回调 */
  onComplete: () => void
  /** 是否可见 */
  visible?: boolean
}

export function ParentActivityCard({
  activity,
  onComplete,
  visible = true,
}: ParentActivityCardProps) {
  const typeEmoji = TYPE_EMOJI[activity.type] ?? '✨'
  const bgColor = TYPE_BG_COLOR[activity.type] ?? '#FFF8E1'
  const borderColor = TYPE_BORDER_COLOR[activity.type] ?? '#FFB74D'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="parent-activity-card"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            padding: '32px 24px',
            borderRadius: '28px',
            backgroundColor: bgColor,
            border: `3px solid ${borderColor}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            textAlign: 'center',
          }}
        >
          {/* 活动类型标签 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '16px',
              backgroundColor: borderColor,
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '16px',
            }}
          >
            {typeEmoji} 亲子时光
          </motion.div>

          {/* 大 emoji */}
          <motion.div
            animate={{
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.1, 1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            style={{
              fontSize: '64px',
              marginBottom: '16px',
              lineHeight: 1,
            }}
          >
            {typeEmoji}
          </motion.div>

          {/* 任务描述 - 面向孩子 */}
          <h3
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#333',
              lineHeight: 1.5,
              marginBottom: '12px',
              margin: '0 0 12px 0',
            }}
          >
            和爸爸妈妈一起！
          </h3>
          <p
            style={{
              fontSize: '18px',
              color: '#555',
              lineHeight: 1.6,
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}
          >
            {activity.taskDescription}
          </p>

          {/* 预估时间 */}
          <div
            style={{
              fontSize: '14px',
              color: '#888',
              marginBottom: '24px',
            }}
          >
            ⏰ 大约 {activity.estimatedMinutes} 分钟
          </div>

          {/* 完成按钮 */}
          <motion.button
            data-testid="activity-complete-button"
            onClick={onComplete}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '16px 40px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: borderColor,
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${borderColor}66`,
            }}
          >
            ✅ 我们做完了！
          </motion.button>

          {/* 家长指导小字 */}
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              color: '#777',
              lineHeight: 1.5,
            }}
          >
            💡 <strong>家长小贴士：</strong>{activity.parentGuide}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
