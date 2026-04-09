/**
 * 星空地图
 * 星球收集，掌握后点亮
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useChildStore } from '@/stores/childStore'
import { useMasteryRecords } from '@/hooks/queries'
import type { Subject } from '@/types/models'

const PLANETS: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

/** 点亮阈值：平均掌握率 ≥ 80% 视为点亮 */
const LIGHT_UP_THRESHOLD = 80

interface SubjectMastery {
  subject: Subject
  averageMastery: number
  isLit: boolean
}

export function StarMap() {
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id

  // 通过 React Query 获取掌握率记录
  const { data: records = [] } = useMasteryRecords(childId)

  // 计算各科目掌握率
  const { masteries, litCount } = useMemo(() => {
    const childRecords = childId
      ? records.filter((r) => r.childId === Number(childId))
      : []

    // 按知识点 ID 前缀分组（math-1 → math, chinese-1 → chinese）
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
      return {
        subject: planet.key,
        averageMastery: avg,
        isLit: avg >= LIGHT_UP_THRESHOLD,
      }
    })

    return {
      masteries: results,
      litCount: results.filter((r) => r.isLit).length,
    }
  }, [records, childId])

  // 获取指定科目的掌握率信息
  const getMastery = (subject: Subject): SubjectMastery => {
    return masteries.find((m) => m.subject === subject) ?? {
      subject,
      averageMastery: 0,
      isLit: false,
    }
  }

  return (
    <div
      data-testid="star-map"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #1A237E 0%, #311B92 50%, #4A148C 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#FFD54F', marginBottom: '32px' }}>✨ 我的星空 ✨</h1>

      <div
        data-testid="achievement-progress"
        style={{
          color: '#B39DDB',
          fontSize: '14px',
          marginBottom: '32px',
        }}
      >
        已点亮 {litCount}/3 颗星球
      </div>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {PLANETS.map((planet) => {
          const mastery = getMastery(planet.key)
          return (
            <motion.div
              key={planet.key}
              whileHover={{ scale: 1.1 }}
              data-testid={`planet-${planet.key}`}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: planet.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: mastery.isLit ? 1 : 0.5,
                boxShadow: mastery.isLit
                  ? `0 0 30px ${planet.color}, 0 0 60px ${planet.color}`
                  : '0 0 20px rgba(255,255,255,0.1)',
                transition: 'opacity 0.3s, box-shadow 0.3s',
              }}
            >
              <span style={{ fontSize: '40px' }}>{planet.emoji}</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
                {planet.label}
              </span>
              {mastery.averageMastery > 0 && (
                <span style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                  {mastery.averageMastery}%
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
