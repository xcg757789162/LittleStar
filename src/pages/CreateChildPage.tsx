/**
 * 创建孩子信息引导页面 — Sunny Playground 风格
 * 分步引导：名字 → 年龄 → 年级 → 头像 → 完成
 * 温暖阳光游乐场设计 · clay 质感 · 弹性动画
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import type { Child, GradeLevel } from '@/types/models'

/* ═══════════════════════════════════════════
   设计 Token
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
  errorRed: '#FF6B6B',
  errorBg: '#FFF0F0',
}

type Step = 'name' | 'age' | 'grade' | 'avatar' | 'done'

const AVATARS = ['⭐', '🌟', '🦊', '🐱', '🐰', '🦄', '🌈', '🎨', '🚀', '🌸', '🐝', '🦋']

const GRADE_OPTIONS: { key: GradeLevel; label: string; ageHint: string }[] = [
  { key: 'middle-kindergarten', label: '中班', ageHint: '4-5岁' },
  { key: 'senior-kindergarten', label: '大班', ageHint: '5-6岁' },
  { key: 'grade-1', label: '一年级', ageHint: '6-7岁' },
  { key: 'grade-2', label: '二年级', ageHint: '7-8岁' },
  { key: 'grade-3', label: '三年级', ageHint: '8-9岁' },
  { key: 'grade-4', label: '四年级', ageHint: '9-10岁' },
  { key: 'grade-5', label: '五年级', ageHint: '10-11岁' },
  { key: 'grade-6', label: '六年级', ageHint: '11-12岁' },
]

function suggestGrade(age: number): GradeLevel {
  if (age <= 4) return 'middle-kindergarten'
  if (age <= 5) return 'senior-kindergarten'
  if (age <= 6) return 'grade-1'
  if (age <= 7) return 'grade-2'
  if (age <= 8) return 'grade-3'
  if (age <= 9) return 'grade-4'
  if (age <= 10) return 'grade-5'
  return 'grade-6'
}

/** 步骤图标 */
const STEP_ICONS = ['✏️', '🎂', '📚', '🎭']

export function CreateChildPage() {
  const navigate = useNavigate()
  const addChild = useChildStore((s) => s.addChild)
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [age, setAge] = useState(5)
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('middle-kindergarten')
  const [avatar, setAvatar] = useState('⭐')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (!user) { setError('未登录，请重新登录'); return }
      const childData = {
        userId: user.id,
        name: name.trim(),
        avatar,
        age,
        gradeLevel,
        settings: {
          dailyLearningMinutes: 20,
          preferredSubjects: ['math', 'chinese', 'english'],
          difficultyAdjustment: 0,
          voiceEnabled: true,
          soundEffectsEnabled: true,
        },
      }
      const created = await apiClient.post<Child>('/children', childData)
      if (created) addChild(created)
      setStep('done')
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, user, name, avatar, age, gradeLevel, addChild, navigate])

  const handleNext = useCallback(() => {
    setError('')
    switch (step) {
      case 'name':
        if (!name.trim()) { setError('请输入孩子的名字'); return }
        if (name.trim().length > 10) { setError('名字不超过 10 个字'); return }
        setStep('age')
        break
      case 'age':
        setGradeLevel(suggestGrade(age))
        setStep('grade')
        break
      case 'grade':
        setStep('avatar')
        break
      case 'avatar':
        handleSave()
        break
    }
  }, [step, name, age, handleSave])

  const handleBack = useCallback(() => {
    setError('')
    switch (step) {
      case 'age': setStep('name'); break
      case 'grade': setStep('age'); break
      case 'avatar': setStep('grade'); break
    }
  }, [step])

  const currentStepIndex = ['name', 'age', 'grade', 'avatar'].indexOf(step)

  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            <motion.span
              style={{ fontSize: '64px' }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              👶
            </motion.span>
            <h2 style={{
              fontSize: '24px', color: T.textDark, margin: 0,
              fontFamily: T.fontDisplay, fontWeight: 'bold',
            }}>
              孩子叫什么名字？
            </h2>
            <input
              data-testid="child-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入孩子的名字"
              autoFocus
              style={{
                width: '100%',
                maxWidth: '280px',
                padding: '16px 20px',
                borderRadius: '18px',
                border: `2.5px solid #FFE8D6`,
                fontSize: '20px',
                fontFamily: T.fontBody,
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFCF8',
                color: T.textDark,
                transition: 'border-color 0.25s, box-shadow 0.25s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = T.sunOrange
                e.currentTarget.style.boxShadow = `0 0 0 3px ${T.sunOrange}22`
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#FFE8D6'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
            />
          </motion.div>
        )

      case 'age':
        return (
          <motion.div
            key="age"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            <motion.span
              style={{ fontSize: '64px' }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🎂
            </motion.span>
            <h2 style={{
              fontSize: '24px', color: T.textDark, margin: 0,
              fontFamily: T.fontDisplay, fontWeight: 'bold',
            }}>
              {name} 几岁了？
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setAge(Math.max(3, age - 1))}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  border: 'none', backgroundColor: '#FFE8D6',
                  fontSize: '26px', cursor: 'pointer', color: T.sunOrange,
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(255, 140, 66, 0.15)',
                }}
              >
                −
              </motion.button>
              <motion.span
                key={age}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: '56px', fontWeight: 'bold',
                  fontFamily: T.fontDisplay,
                  background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  minWidth: '70px', textAlign: 'center',
                }}
              >
                {age}
              </motion.span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setAge(Math.min(12, age + 1))}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  border: 'none', backgroundColor: '#FFE8D6',
                  fontSize: '26px', cursor: 'pointer', color: T.sunOrange,
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(255, 140, 66, 0.15)',
                }}
              >
                +
              </motion.button>
            </div>
            <p style={{ fontSize: '13px', color: T.textLight, fontFamily: T.fontBody }}>
              年龄范围：3-12 岁
            </p>
          </motion.div>
        )

      case 'grade':
        return (
          <motion.div
            key="grade"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <motion.span
              style={{ fontSize: '64px' }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📚
            </motion.span>
            <h2 style={{
              fontSize: '24px', color: T.textDark, margin: 0,
              fontFamily: T.fontDisplay, fontWeight: 'bold',
            }}>
              选择年级
            </h2>
            <p style={{
              fontSize: '13px', color: T.textLight, margin: 0,
              fontFamily: T.fontBody,
            }}>
              根据年龄推荐，你也可以自由选择
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px', width: '100%', maxWidth: '320px',
            }}>
              {GRADE_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setGradeLevel(opt.key)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: '16px',
                    border: gradeLevel === opt.key
                      ? `2.5px solid ${T.sunOrange}`
                      : '2.5px solid #FFE8D6',
                    backgroundColor: gradeLevel === opt.key ? '#FFF3E7' : T.cardBg,
                    color: gradeLevel === opt.key ? T.sunOrange : T.textDark,
                    fontSize: '15px',
                    fontWeight: gradeLevel === opt.key ? 'bold' : 'normal',
                    fontFamily: T.fontBody,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: gradeLevel === opt.key
                      ? '0 4px 12px rgba(255, 140, 66, 0.2)'
                      : 'none',
                  }}
                >
                  {opt.label}
                  <br />
                  <span style={{ fontSize: '11px', color: T.textLight }}>{opt.ageHint}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )

      case 'avatar':
        return (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <motion.span
              style={{ fontSize: '72px' }}
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {avatar}
            </motion.span>
            <h2 style={{
              fontSize: '24px', color: T.textDark, margin: 0,
              fontFamily: T.fontDisplay, fontWeight: 'bold',
            }}>
              选一个头像吧
            </h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px', width: '100%', maxWidth: '280px',
            }}>
              {AVATARS.map((a) => (
                <motion.button
                  key={a}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setAvatar(a)}
                  style={{
                    width: '58px', height: '58px',
                    borderRadius: '18px',
                    border: avatar === a
                      ? `3px solid ${T.sunOrange}`
                      : '2.5px solid #FFE8D6',
                    backgroundColor: avatar === a ? '#FFF3E7' : T.cardBg,
                    fontSize: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: avatar === a
                      ? '0 4px 12px rgba(255, 140, 66, 0.25)'
                      : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {a}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )

      case 'done':
        return (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <motion.span
              style={{ fontSize: '80px' }}
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🎉
            </motion.span>
            <h2 style={{
              fontSize: '26px', margin: 0,
              fontFamily: T.fontDisplay,
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              欢迎 {name}！
            </h2>
            <p style={{ fontSize: '16px', color: T.textMedium, fontFamily: T.fontBody }}>
              ✨ 正在为你准备学习之旅...
            </p>
          </motion.div>
        )
    }
  }

  return (
    <div
      data-testid="create-child-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bgGradient,
        padding: '24px',
        fontFamily: T.fontBody,
      }}
    >
      {/* 进度指示器 — 改为圆形步骤指示 */}
      {step !== 'done' && (
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '28px',
          alignItems: 'center',
        }}>
          {STEP_ICONS.map((icon, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <motion.div
                animate={currentStepIndex === i ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: '40px', height: '40px',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: currentStepIndex >= i ? '20px' : '16px',
                  backgroundColor: currentStepIndex >= i ? '#FFF3E7' : '#F5F5F5',
                  border: currentStepIndex === i
                    ? `2.5px solid ${T.sunOrange}`
                    : currentStepIndex > i
                      ? `2.5px solid ${T.grassGreen}`
                      : '2.5px solid #E0E0E0',
                  transition: 'all 0.3s ease',
                  filter: currentStepIndex >= i ? 'none' : 'grayscale(0.8)',
                }}
              >
                {currentStepIndex > i ? '✅' : icon}
              </motion.div>
              {i < 3 && (
                <div style={{
                  width: '20px', height: '3px',
                  borderRadius: '2px',
                  backgroundColor: currentStepIndex > i ? T.grassGreen : '#E0E0E0',
                  transition: 'background-color 0.3s ease',
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 卡片 */}
      <motion.div
        layout
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: T.cardBg,
          borderRadius: T.cardRadius,
          padding: '36px 28px',
          boxShadow: T.cardShadow,
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* 错误提示 */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: '14px', color: T.errorRed,
              marginTop: '12px', padding: '10px 14px',
              backgroundColor: T.errorBg,
              borderRadius: '12px', fontWeight: 600,
              fontFamily: T.fontBody,
            }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* 底部按钮 */}
      {step !== 'done' && (
        <div style={{
          display: 'flex', gap: '12px', marginTop: '24px',
          width: '100%', maxWidth: '420px',
        }}>
          {step !== 'name' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              style={{
                flex: 1, padding: '14px',
                borderRadius: T.btnRadius,
                border: '2.5px solid #FFE8D6',
                backgroundColor: T.cardBg,
                color: T.textMedium,
                fontSize: '16px', fontWeight: 'bold',
                fontFamily: T.fontDisplay,
                cursor: 'pointer',
              }}
            >
              ← 上一步
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleNext}
            disabled={isSaving}
            style={{
              flex: 1, padding: '14px',
              borderRadius: T.btnRadius,
              border: 'none',
              background: isSaving
                ? '#FFD1A9'
                : `linear-gradient(135deg, ${T.sunOrange} 0%, ${T.candyPink} 100%)`,
              color: T.textWhite,
              fontSize: '16px', fontWeight: 'bold',
              fontFamily: T.fontDisplay,
              cursor: isSaving ? 'default' : 'pointer',
              boxShadow: '0 6px 20px rgba(255, 140, 66, 0.3)',
            }}
          >
            {step === 'avatar'
              ? isSaving ? '⏳ 保存中...' : '🎉 完成'
              : '下一步 →'}
          </motion.button>
        </div>
      )}
    </div>
  )
}
