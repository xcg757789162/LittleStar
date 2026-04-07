/**
 * 首页
 */

import { motion } from 'framer-motion'

export function Home() {
  return (
    <div
      data-testid="home-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        padding: '24px',
      }}
    >
      <motion.h1
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          fontSize: '48px',
          color: '#7C4DFF',
          marginBottom: '16px',
        }}
      >
        ⭐ 小星辰
      </motion.h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
        和小星老师一起快乐学习！
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        style={{
          padding: '16px 48px',
          borderRadius: '24px',
          border: 'none',
          backgroundColor: '#7C4DFF',
          color: 'white',
          fontSize: '22px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(124, 77, 255, 0.4)',
        }}
      >
        开始学习
      </motion.button>
    </div>
  )
}
