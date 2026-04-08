/**
 * 音节高亮组件
 * 分段展示 + 当前/已完成/待完成三种状态视觉区分
 */

import { motion } from 'framer-motion'

export interface SyllableHighlightProps {
  /** 音节数组 */
  syllables: string[]
  /** 当前高亮的音节索引 */
  currentIndex: number
}

export function SyllableHighlight({ syllables, currentIndex }: SyllableHighlightProps) {
  return (
    <div
      data-testid="syllable-highlight"
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {syllables.map((syllable, i) => {
        const isCurrent = i === currentIndex
        const isCompleted = i < currentIndex
        const isPending = i > currentIndex

        let testId: string
        if (isCurrent) testId = 'syllable-current'
        else if (isCompleted) testId = 'syllable-completed'
        else testId = 'syllable-pending'

        return (
          <motion.span
            key={i}
            data-testid={testId}
            animate={
              isCurrent
                ? { scale: 1.3, color: '#FF6F00' }
                : isCompleted
                  ? { scale: 1, color: '#4CAF50' }
                  : { scale: 1, color: '#9E9E9E' }
            }
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              fontSize: '32px',
              fontWeight: isCurrent ? 'bold' : 'normal',
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: isCurrent
                ? '#FFF3E0'
                : isCompleted
                  ? '#E8F5E9'
                  : '#F5F5F5',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {syllable}
            {isCompleted && (
              <span style={{ fontSize: '16px' }}>⭐</span>
            )}
          </motion.span>
        )
      })}
    </div>
  )
}
