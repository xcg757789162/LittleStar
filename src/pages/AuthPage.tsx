/**
 * 登录/注册页面 — Sunny Playground 风格
 * 温暖阳光游乐场设计 · clay 质感 · 浮动装饰 · 弹性动画
 *
 * 适配新版 authStore API:
 * - isLoading (原 isLoggingIn)
 * - error (原 authError)
 * - clearError (原 clearAuthError)
 * - user (原 currentUser)
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuthStore } from '@/stores/authStore'

/* ═══════════════════════════════════════════
   设计 Token — Sunny Playground
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  successGreen: '#2EC4B6',
  errorRed: '#FF6B6B',
  errorBg: '#FFF0F0',
}

/* ═══════════════════════════════════════════
   装饰性 SVG 组件
   ═══════════════════════════════════════════ */

function Sparkle({ size = 24, color = T.starGold, style }: {
  size?: number; color?: string; style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  )
}

function Cloud({ size = 60, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="white" opacity="0.5" style={style}>
      <ellipse cx="50" cy="40" rx="40" ry="18" />
      <ellipse cx="30" cy="32" rx="22" ry="16" />
      <ellipse cx="65" cy="30" rx="26" ry="18" />
      <ellipse cx="48" cy="22" rx="20" ry="16" />
    </svg>
  )
}

/** 星星吉祥物 */
function StarMascot({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="starBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD166" />
          <stop offset="100%" stopColor="#FFC845" />
        </linearGradient>
      </defs>
      <path d="M60 8L73 42L108 46L82 70L89 105L60 88L31 105L38 70L12 46L47 42L60 8Z"
        fill="url(#starBody)" stroke="#FFB347" strokeWidth="2" />
      <circle cx="48" cy="52" r="5" fill="#2D3142" />
      <circle cx="72" cy="52" r="5" fill="#2D3142" />
      <circle cx="50" cy="53" r="2" fill="white" />
      <circle cx="74" cy="53" r="2" fill="white" />
      <path d="M52 65 Q60 73 68 65" stroke="#FF8C42" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="42" cy="62" rx="5" ry="3" fill="#FFB3B3" opacity="0.5" />
      <ellipse cx="78" cy="62" rx="5" ry="3" fill="#FFB3B3" opacity="0.5" />
    </svg>
  )
}

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [localError, setLocalError] = useState('')

  const isLoading = useAuthStore((s) => s.isLoading)
  const authError = useAuthStore((s) => s.error)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const clearError = useAuthStore((s) => s.clearError)

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode)
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setNickname('')
    setLocalError('')
    clearError()
  }, [clearError])

  const handleSubmit = useCallback(async () => {
    setLocalError('')
    clearError()

    if (!username.trim()) { setLocalError('请输入用户名'); return }
    if (username.trim().length < 2) { setLocalError('用户名至少 2 个字符'); return }
    if (!password) { setLocalError('请输入密码'); return }
    if (password.length < 4) { setLocalError('密码至少 4 位'); return }

    try {
      if (mode === 'register') {
        if (!nickname.trim()) { setLocalError('请输入昵称'); return }
        if (password !== confirmPassword) { setLocalError('两次密码不一致'); return }
        await register({ username: username.trim(), password, nickname: nickname.trim() })
      } else {
        await login({ username: username.trim(), password })
      }
    } catch {
      // authStore 已经设置了 error
    }
  }, [mode, username, password, confirmPassword, nickname, login, register, clearError])

  const displayError = localError || authError

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '16px',
    border: '2.5px solid #FFE8D6',
    fontSize: '16px',
    fontFamily: T.fontBody,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.25s, box-shadow 0.25s',
    backgroundColor: '#FFFCF8',
    color: T.textDark,
  }

  return (
    <div
      data-testid="auth-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bgGradient,
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: T.fontBody,
      }}
    >
      {/* 浮动装饰 */}
      <motion.div
        animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '8%', left: '8%' }}
      >
        <Cloud size={80} />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0], x: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', top: '15%', right: '5%' }}
      >
        <Cloud size={60} />
      </motion.div>
      <motion.div
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '6%', right: '20%' }}
      >
        <Sparkle size={20} color={T.sunOrange} />
      </motion.div>
      <motion.div
        animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ position: 'absolute', bottom: '18%', left: '12%' }}
      >
        <Sparkle size={16} color={T.candyPink} />
      </motion.div>
      <motion.div
        animate={{ rotate: [0, 20, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', bottom: '25%', right: '10%' }}
      >
        <Sparkle size={14} color={T.skyBlue} />
      </motion.div>

      {/* 吉祥物 + 标题 */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        style={{ marginBottom: '8px' }}
      >
        <StarMascot size={100} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: '38px',
          fontWeight: 'bold',
          fontFamily: T.fontDisplay,
          background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 4px',
        }}
      >
        小星辰
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          fontSize: '15px',
          color: T.textLight,
          marginBottom: '24px',
          fontFamily: T.fontBody,
        }}
      >
        ✨ 和小星老师一起快乐学习！
      </motion.p>

      {/* 表单卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: T.cardBg,
          borderRadius: T.cardRadius,
          padding: '32px 28px',
          boxShadow: T.cardShadow,
        }}
      >
        {/* Tab 切换 */}
        <div style={{
          display: 'flex',
          marginBottom: '28px',
          backgroundColor: '#FFF3E7',
          borderRadius: '18px',
          padding: '4px',
          position: 'relative',
        }}>
          {[
            { key: 'login' as AuthMode, label: '🚀 登录' },
            { key: 'register' as AuthMode, label: '🌟 注册' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchMode(tab.key)}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: mode === tab.key ? T.sunOrange : 'transparent',
                color: mode === tab.key ? T.textWhite : T.textLight,
                fontSize: '16px',
                fontWeight: 'bold',
                fontFamily: T.fontDisplay,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: mode === tab.key ? '0 4px 12px rgba(255, 140, 66, 0.3)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 表单字段 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* 用户名 */}
            <div>
              <label htmlFor="auth-username" style={{
                fontSize: '14px', color: T.textMedium, display: 'block',
                marginBottom: '6px', fontWeight: 600, fontFamily: T.fontBody,
              }}>
                👤 用户名
              </label>
              <input
                id="auth-username"
                data-testid="auth-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = T.sunOrange
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.sunOrange}22`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#FFE8D6'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* 注册时显示昵称 */}
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-nickname" style={{
                  fontSize: '14px', color: T.textMedium, display: 'block',
                  marginBottom: '6px', fontWeight: 600, fontFamily: T.fontBody,
                }}>
                  😊 昵称
                </label>
                <input
                  id="auth-nickname"
                  data-testid="auth-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给自己取个名字吧"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = T.sunOrange
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${T.sunOrange}22`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#FFE8D6'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            )}

            {/* 密码 */}
            <div>
              <label htmlFor="auth-password" style={{
                fontSize: '14px', color: T.textMedium, display: 'block',
                marginBottom: '6px', fontWeight: 600, fontFamily: T.fontBody,
              }}>
                🔒 密码
              </label>
              <input
                id="auth-password"
                data-testid="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = T.sunOrange
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.sunOrange}22`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#FFE8D6'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* 确认密码 */}
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" style={{
                  fontSize: '14px', color: T.textMedium, display: 'block',
                  marginBottom: '6px', fontWeight: 600, fontFamily: T.fontBody,
                }}>
                  🔒 确认密码
                </label>
                <input
                  id="auth-confirm-password"
                  data-testid="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = T.sunOrange
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${T.sunOrange}22`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#FFE8D6'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                />
              </div>
            )}

            {/* 错误信息 */}
            {displayError && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: '14px',
                  color: T.errorRed,
                  margin: 0,
                  padding: '10px 14px',
                  backgroundColor: T.errorBg,
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontFamily: T.fontBody,
                }}
              >
                {displayError}
              </motion.p>
            )}

            {/* 提交按钮 */}
            <motion.button
              data-testid="auth-submit-btn"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: T.btnRadius,
                border: 'none',
                background: isLoading
                  ? '#FFD1A9'
                  : `linear-gradient(135deg, ${T.sunOrange} 0%, ${T.candyPink} 100%)`,
                color: T.textWhite,
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: T.fontDisplay,
                cursor: isLoading ? 'default' : 'pointer',
                marginTop: '8px',
                boxShadow: isLoading
                  ? 'none'
                  : '0 6px 20px rgba(255, 140, 66, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading
                ? '⏳ 请稍候...'
                : mode === 'login'
                  ? '🚀 出发！'
                  : '🌟 加入星辰！'}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
