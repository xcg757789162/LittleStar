/**
 * 星星评分组件
 * 金色大星星 + 逐个点亮动画
 */

import { motion } from 'motion/react'

export interface StarRatingProps {
  /** 星级 1-5 */
  stars: number
  /** 是否播放点亮动画 */
  animated?: boolean
  /** 星星大小（px） */
  size?: number
}

export function StarRating({ stars, animated = false, size = 48 }: StarRatingProps) {
  const totalStars = 5
  const litCount = Math.max(0, Math.min(totalStars, Math.round(stars)))

  return (
    <div
      data-testid="star-rating"
      data-animated={animated ? 'true' : 'false'}
      style={{
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: totalStars }).map((_, i) => {
        const isLit = i < litCount
        return (
          <motion.span
            key={i}
            data-testid={isLit ? 'star-lit' : 'star-dim'}
            initial={animated ? { scale: 0, opacity: 0 } : false}
            animate={
              animated && isLit
                ? { scale: 1, opacity: 1 }
                : { scale: 1, opacity: 1 }
            }
            transition={
              animated
                ? { delay: i * 0.2, type: 'spring', stiffness: 300, damping: 15 }
                : {}
            }
            style={{
              fontSize: `${size}px`,
              lineHeight: 1,
              filter: isLit ? 'none' : 'grayscale(1) opacity(0.3)',
              cursor: 'default',
              userSelect: 'none',
            }}
          >
            ⭐
          </motion.span>
        )
      })}
    </div>
  )
}
