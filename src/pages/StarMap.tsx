/**
 * 星空地图 — Sunny Playground 风格
 * 星球收集，掌握后点亮
 * 温暖阳光游乐场设计 · 浮动装饰 · 弹性动画
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useChildStore } from '@/stores/childStore'
import { useMasteryRecords } from '@/hooks/queries'
import type { Subject } from '@/types/models'

/* ═══════════════════════════════════════════
   设计 Token
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
}

const PLANETS: {
  key: Subject; label: string; emoji: string
  color: string; bg: string; glowColor: string
}[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: T.sunOrange, bg: 'linear-gradient(135deg, #FFE0C2, #FFECD2)', glowColor: 'rgba(255, 140, 66, 0.4)' },
  { key: 'chinese', label: '语文', emoji: '📖', color: T.grassGreen, bg: 'linear-gradient(135deg, #C8F7F1, #DEFFF9)', glowColor: 'rgba(46, 196, 182, 0.4)' },
  { key: 'english', label: '英语', emoji: '🔤', color: T.skyBlue, bg: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)', glowColor: 'rgba(91, 192, 235, 0.4)' },
]

const LIGHT_UP_THRESHOLD = 80

interface SubjectMastery {
  subject: Subject
  averageMastery: number
  isLit: boolean
}

function Sparkle({ size = 20, color = T.starGold, style }: {
  size?: number; color?: string; style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  )
}

export function StarMap() {
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const { data: records = [] } = useMasteryRecords(childId)

  const { masteries, litCount } = useMemo(() => {
    const childRecords = childId
      ? records.filter((r: { childId: string | number }) => String(r.childId) === String(childId))
      : []

    const subjectMap = new Map<Subject, number[]>()
    for (const record of childRecords) {
      const nodeId = record.knowledgeNodeId
      let subject: Subject | null = null
      if (nodeId.startsWith('math')) subject = 'math'
      else if (nodeId.startsWith('chinese')) subject = 'chinese'
      else if (nodeId.startsWith('english')) subject = 'english'
      if (subject) {
        const existing = subjectMap.get(subject) ?? []
        existing.push(record.masteryLevel)
        subjectMap.set(subject, existing)
      }
    }

    const results: SubjectMastery[] = PLANETS.map((planet) => {
      const levels = subjectMap.get(planet.key) ?? []
      const avg = levels.length > 0
        ? Math.round(levels.reduce((s, v) => s + v, 0) / levels.length)
        : 0
      return { subject: planet.key, averageMastery: avg, isLit: avg >= LIGHT_UP_THRESHOLD }
    })

    return { masteries: results, litCount: results.filter((r) => r.isLit).length }
  }, [records, childId])

  const getMastery = (subject: Subject): SubjectMastery => {
    return masteries.find((m) => m.subject === subject) ?? {
      subject, averageMastery: 0, isLit: false,
    }
  }

  return (
    <div
      data-testid="star-map"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #1B1464 0%, #2D1B69 35%, #4A2C8A 65%, #6B3FA0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: T.fontBody,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 浮动星星装饰 */}
      {[
        { top: '5%', left: '10%', size: 14, delay: 0, color: T.starGold },
        { top: '12%', right: '15%', size: 18, delay: 1, color: T.sunYellow },
        { top: '25%', left: '5%', size: 12, delay: 2, color: T.candyPink },
        { top: '8%', left: '45%', size: 10, delay: 0.5, color: T.skyBlue },
        { bottom: '20%', right: '8%', size: 16, delay: 1.5, color: T.starGold },
        { bottom: '30%', left: '15%', size: 11, delay: 3, color: T.sunYellow },
      ].map((s, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          style={{ position: 'absolute', ...s }}
        >
          <Sparkle size={s.size} color={s.color} />
        </motion.div>
      ))}

      {/* 标题 */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: '28px', fontFamily: T.fontDisplay, fontWeight: 'bold',
          color: T.starGold, marginBottom: '8px',
          textShadow: '0 2px 12px rgba(255, 200, 69, 0.4)',
        }}
      >
        ✨ 我的星空 ✨
      </motion.h1>

      <div
        data-testid="achievement-progress"
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '14px', marginBottom: '36px',
          fontFamily: T.fontBody,
        }}
      >
        已点亮 <span style={{ color: T.starGold, fontWeight: 'bold' }}>{litCount}</span>/3 颗星球
      </div>

      {/* 星球 */}
      <div style={{
        display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {PLANETS.map((planet, index) => {
          const mastery = getMastery(planet.key)
          return (
            <motion.div
              key={planet.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ scale: 1.08 }}
              data-testid={`planet-${planet.key}`}
              style={{
                width: '140px', height: '140px',
                borderRadius: '50%',
                background: mastery.isLit ? planet.bg : 'rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: mastery.isLit ? 1 : 0.4,
                boxShadow: mastery.isLit
                  ? `0 0 40px ${planet.glowColor}, 0 0 80px ${planet.glowColor}, 0 8px 24px rgba(0,0,0,0.2)`
                  : '0 4px 16px rgba(0,0,0,0.2)',
                transition: 'opacity 0.5s, box-shadow 0.5s',
                position: 'relative',
              }}
            >
              {/* 光晕效果 */}
              {mastery.isLit && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: '-12px', borderRadius: '50%',
                    background: `radial-gradient(circle, ${planet.glowColor} 0%, transparent 70%)`,
                  }}
                />
              )}
              <motion.span
                style={{ fontSize: '48px', position: 'relative', zIndex: 1 }}
                animate={mastery.isLit ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {planet.emoji}
              </motion.span>
              <span style={{
                fontSize: '15px', fontWeight: 'bold', fontFamily: T.fontDisplay,
                color: mastery.isLit ? planet.color : 'rgba(255,255,255,0.4)',
                marginTop: '4px', position: 'relative', zIndex: 1,
              }}>
                {planet.label}
              </span>
              {mastery.averageMastery > 0 && (
                <span style={{
                  fontSize: '12px', position: 'relative', zIndex: 1,
                  color: mastery.isLit ? planet.color : 'rgba(255,255,255,0.3)',
                  marginTop: '2px', fontWeight: 600,
                }}>
                  {mastery.averageMastery}%
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* 底部提示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          marginTop: '40px', fontSize: '13px',
          color: 'rgba(255,255,255,0.35)',
          textAlign: 'center', fontFamily: T.fontBody,
        }}
      >
        💡 掌握率达到 80% 以上可以点亮星球
      </motion.p>
    </div>
  )
}
