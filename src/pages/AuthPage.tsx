/**
 * 登录/注册页面
 * 美观的儿童教育风格设计
 * 支持切换登录/注册模式
 *
 * 适配新版 authStore API:
 * - isLoading (原 isLoggingIn)
 * - error (原 authError)
 * - clearError (原 clearAuthError)
 * - user (原 currentUser)
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [localError, setLocalError] = useState('')

  // 适配新版 authStore 字段名
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

    // 基本验证
    if (!username.trim()) {
      setLocalError('请输入用户名')
      return
    }
    if (username.trim().length < 2) {
      setLocalError('用户名至少 2 个字符')
      return
    }
    if (!password) {
      setLocalError('请输入密码')
      return
    }
    if (password.length < 4) {
      setLocalError('密码至少 4 位')
      return
    }

    try {
      if (mode === 'register') {
        if (!nickname.trim()) {
          setLocalError('请输入昵称')
          return
        }
        if (password !== confirmPassword) {
          setLocalError('两次密码不一致')
          return
        }
        // 新版 authStore.register 接受 RegisterRequest 对象
        await register({
          username: username.trim(),
          password,
          nickname: nickname.trim(),
        })
      } else {
        // 新版 authStore.login 接受 LoginRequest 对象
        await login({
          username: username.trim(),
          password,
        })
      }
    } catch {
      // authStore 已经设置了 error，这里不需要额外处理
    }
  }, [mode, username, password, confirmPassword, nickname, login, register, clearError])

  const displayError = localError || authError

  return (
    <div
      data-testid="auth-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 50%, #FFF3E0 100%)',
        padding: '24px',
      }}
    >
      {/* Logo 区域 */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ marginBottom: '12px' }}
      >
        <span style={{ fontSize: '72px' }}>⭐</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#7C4DFF',
          margin: '0 0 8px',
        }}
      >
        小星辰
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ fontSize: '16px', color: '#999', marginBottom: '32px' }}
      >
        和小星老师一起快乐学习！
      </motion.p>

      {/* 表单卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '32px 28px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Tab 切换 */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            marginBottom: '28px',
            backgroundColor: '#F5F5F5',
            borderRadius: '16px',
            padding: '4px',
          }}
        >
          {[
            { key: 'login' as AuthMode, label: '登录' },
            { key: 'register' as AuthMode, label: '注册' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchMode(tab.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: mode === tab.key ? '#7C4DFF' : 'transparent',
                color: mode === tab.key ? 'white' : '#999',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
              <label
                htmlFor="auth-username"
                style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
              >
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
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #E0E0E0',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4DFF' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* 注册时显示昵称 */}
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-nickname"
                  style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
                >
                  😊 昵称
                </label>
                <input
                  id="auth-nickname"
                  data-testid="auth-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给自己取个名字吧"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4DFF' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0' }}
                />
              </div>
            )}

            {/* 密码 */}
            <div>
              <label
                htmlFor="auth-password"
                style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
              >
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
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #E0E0E0',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4DFF' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* 注册时显示确认密码 */}
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
                >
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
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4DFF' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0' }}
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
                  color: '#F44336',
                  margin: 0,
                  padding: '8px 12px',
                  backgroundColor: '#FFEBEE',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                {displayError}
              </motion.p>
            )}

            {/* 提交按钮 */}
            <motion.button
              data-testid="auth-submit-btn"
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: isLoading ? '#B39DDB' : '#7C4DFF',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: isLoading ? 'default' : 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 16px rgba(124, 77, 255, 0.3)',
              }}
            >
              {isLoading
                ? '请稍候...'
                : mode === 'login'
                  ? '🚀 登录'
                  : '🌟 注册'}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
