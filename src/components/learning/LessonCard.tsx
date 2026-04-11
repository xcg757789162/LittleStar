/**
 * LessonCard — 课程选择卡片
 *
 * 展示缓存课程的缩略图、标题和锁定状态。
 * 第一节课可学习（高亮），其余锁定（半透明遮罩 + 🔒）。
 * 使用 Framer Motion 实现按压动画和锁定弹动反馈。
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import type { Subject } from '@/types/models'
import type { Slide } from '@/lib/openmaic/types/slides'
import { ThumbnailSlide } from '@/components/openmaic/slide-renderer/components/ThumbnailSlide'

/** 科目 → emoji 映射 */
const SUBJECT_EMOJI: Record<Subject, string> = {
  math: '🔢',
  chinese: '📖',
  english: '🔤',
}

/** 科目 → 渐变色映射 */
const SUBJECT_GRADIENT: Record<Subject, string> = {
  math: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
  chinese: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
  english: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
}

/** 科目 → 主色映射 */
const SUBJECT_COLOR: Record<Subject, string> = {
  math: '#FF8C42',
  chinese: '#2EC4B6',
  english: '#5BC0EB',
}

export interface LessonCardProps {
  /** 课程标题 */
  title: string
  /** 缩略图 URL（可选，降级用） */
  thumbnailUrl?: string
  /** 完整 slide 数据（可选，用于 ThumbnailSlide 高保真渲染） */
  slide?: Slide
  /** 科目（用于 emoji fallback 和配色） */
  subject: Subject
  /** 是否锁定 */
  isLocked: boolean
  /** 卡片序号（用于展示） */
  index: number
  /** 点击回调（仅未锁定时触发） */
  onTap: () => void
}

export function LessonCard({
  title,
  thumbnailUrl,
  slide,
  subject,
  isLocked,
  index,
  onTap,
}: LessonCardProps) {
  const [imgError, setImgError] = useState(false)
  const thumbRef = useRef<HTMLDivElement>(null)
  const [thumbWidth, setThumbWidth] = useState(0)

  // 获取缩略图区域实际宽度，用于 ThumbnailSlide 的 size 参数
  useEffect(() => {
    if (!slide || !thumbRef.current) return
    const el = thumbRef.current
    const update = () => setThumbWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [slide])

  // 渲染优先级：slide > thumbnailUrl > emoji
  const showSlide = !!slide && thumbWidth > 0
  const showImg = !slide && !!thumbnailUrl && !imgError
  const showEmoji = !slide && (!thumbnailUrl || imgError)

  const handleTap = useCallback(() => {
    if (!isLocked) {
      onTap()
    }
  }, [isLocked, onTap])

  const emoji = SUBJECT_EMOJI[subject] ?? '📚'
  const gradient = SUBJECT_GRADIENT[subject] ?? 'linear-gradient(135deg, #FFE0C2, #FFECD2)'
  const accentColor = SUBJECT_COLOR[subject] ?? '#FF8C42'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
      whileTap={isLocked ? { scale: 0.97 } : { scale: 0.93 }}
      whileHover={!isLocked ? { scale: 1.04, y: -4 } : undefined}
      onClick={handleTap}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 160,
        borderRadius: 22,
        overflow: 'hidden',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        background: '#FFFFFF',
        boxShadow: isLocked
          ? '0 4px 16px rgba(0,0,0,0.04)'
          : `0 12px 36px ${accentColor}33, 0 4px 12px rgba(0,0,0,0.06)`,
        border: isLocked ? '3px solid #F0F0F0' : `3px solid ${accentColor}44`,
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* 缩略图区域 */}
      <div ref={thumbRef} style={{
        width: '100%',
        height: 100,
        background: showSlide ? '#FFFFFF' : gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {showSlide ? (
          <div style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            filter: isLocked ? 'grayscale(0.5) brightness(0.85)' : 'none',
            transition: 'filter 0.3s ease',
          }}>
            <ThumbnailSlide
              slide={slide!}
              size={thumbWidth}
              viewportSize={slide!.viewportSize ?? 1000}
              viewportRatio={slide!.viewportRatio ?? 0.5625}
            />
          </div>
        ) : showImg ? (
          <img
            src={thumbnailUrl}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isLocked ? 'grayscale(0.5) brightness(0.85)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
        ) : showEmoji ? (
          <span style={{
            fontSize: 40,
            filter: isLocked ? 'grayscale(0.6)' : 'none',
            transition: 'filter 0.3s ease',
          }}>
            {emoji}
          </span>
        ) : null}

        {/* 课程序号徽标 */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: isLocked ? '#B8B8B8' : accentColor,
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          fontFamily: "'Baloo 2', 'Nunito', sans-serif",
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {index + 1}
        </div>

        {/* 可学习闪烁指示 */}
        {!isLocked && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 16,
            }}
          >
            ✨
          </motion.div>
        )}
      </div>

      {/* 标题区域 */}
      <div style={{
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Nunito', 'PingFang SC', sans-serif",
          color: isLocked ? '#B8B8B8' : '#2D3142',
          margin: 0,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {title}
        </p>
        {!isLocked && (
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 14, flexShrink: 0 }}
          >
            ▶️
          </motion.span>
        )}
      </div>

      {/* 锁定遮罩 */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(1px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: 22,
          }}
        >
          <motion.span
            style={{ fontSize: 28 }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🔒
          </motion.span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Nunito', 'PingFang SC', sans-serif",
            color: '#999',
            letterSpacing: 0.5,
          }}>
            按顺序解锁
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
