/**
 * 404 页面 — Sunny Playground 风格
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  sunOrange: '#FF8C42',
  candyPink: '#FF6B9D',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  btnRadius: '22px',
}

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div
      data-testid="not-found"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: T.bgGradient,
        fontFamily: T.fontBody,
      }}
    >
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '80px', marginBottom: '16px' }}
      >
        🌙
      </motion.div>
      <h1 style={{
        fontSize: '26px', fontFamily: T.fontDisplay,
        background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px',
      }}>
        这颗星球还没被发现
      </h1>
      <p style={{ fontSize: '15px', color: T.textLight, marginBottom: '28px' }}>
        让我们回到星辰乐园吧！✨
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => navigate('/')}
        style={{
          padding: '14px 36px',
          borderRadius: T.btnRadius,
          border: 'none',
          background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
          color: T.textWhite,
          fontSize: '16px',
          fontWeight: 'bold',
          fontFamily: T.fontDisplay,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(255, 140, 66, 0.3)',
        }}
      >
        🏠 回到首页
      </motion.button>
    </div>
  )
}
