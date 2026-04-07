/**
 * 星空地图
 * 星球收集，掌握后点亮
 */

import { motion } from 'framer-motion'

const PLANETS = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function StarMap() {
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
        已点亮 0/3 颗星球
      </div>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {PLANETS.map((planet) => (
          <motion.div
            key={planet.key}
            whileHover={{ scale: 1.1 }}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: planet.color,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
              boxShadow: '0 0 20px rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: '40px' }}>{planet.emoji}</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
              {planet.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
