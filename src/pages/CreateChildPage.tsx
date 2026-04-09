/**
 * 创建孩子信息引导页面
 * 登录后如果没有孩子，需要先创建一个孩子
 * 分步引导：名字 → 年龄 → 年级 → 头像 → 完成
 *
 * 适配新版 API：使用 apiClient 替代 Dexie.js
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import type { Child, GradeLevel } from '@/types/models'

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

/** 根据年龄推荐年级 */
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
      if (!user) {
        setError('未登录，请重新登录')
        return
      }

      const childData = {
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

      // 通过 API 创建孩子（apiClient 会自动附加 JWT token 和 snake_case 转换）
      const created = await apiClient.post<Child>('/children', childData)

      if (created) {
        addChild(created)
      }

      setStep('done')
      // 短暂展示后导航到首页
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
        if (!name.trim()) {
          setError('请输入孩子的名字')
          return
        }
        if (name.trim().length > 10) {
          setError('名字不超过 10 个字')
          return
        }
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
        // 保存到数据库
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
            <span style={{ fontSize: '56px' }}>👶</span>
            <h2 style={{ fontSize: '22px', color: '#333', margin: 0 }}>孩子叫什么名字？</h2>
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
                padding: '14px 20px',
                borderRadius: '16px',
                border: '2px solid #E0E0E0',
                fontSize: '20px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4DFF' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0' }}
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
            <span style={{ fontSize: '56px' }}>🎂</span>
            <h2 style={{ fontSize: '22px', color: '#333', margin: 0 }}>{name} 几岁了？</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => setAge(Math.max(3, age - 1))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#E0E0E0',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                -
              </button>
              <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#7C4DFF', minWidth: '60px', textAlign: 'center' }}>
                {age}
              </span>
              <button
                onClick={() => setAge(Math.min(12, age + 1))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#E0E0E0',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#999' }}>年龄范围：3-12 岁</p>
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
            <span style={{ fontSize: '56px' }}>📚</span>
            <h2 style={{ fontSize: '22px', color: '#333', margin: 0 }}>选择年级</h2>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
              根据年龄推荐，你也可以自由选择
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                width: '100%',
                maxWidth: '320px',
              }}
            >
              {GRADE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setGradeLevel(opt.key)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: gradeLevel === opt.key ? '2px solid #7C4DFF' : '2px solid #E0E0E0',
                    backgroundColor: gradeLevel === opt.key ? '#EDE7F6' : 'white',
                    color: gradeLevel === opt.key ? '#7C4DFF' : '#333',
                    fontSize: '15px',
                    fontWeight: gradeLevel === opt.key ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {opt.label}
                  <br />
                  <span style={{ fontSize: '11px', color: '#999' }}>{opt.ageHint}</span>
                </button>
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
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {avatar}
            </motion.span>
            <h2 style={{ fontSize: '22px', color: '#333', margin: 0 }}>选一个头像吧</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                width: '100%',
                maxWidth: '280px',
              }}
            >
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    border: avatar === a ? '3px solid #7C4DFF' : '2px solid #E0E0E0',
                    backgroundColor: avatar === a ? '#EDE7F6' : 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: avatar === a ? '0 2px 8px rgba(124, 77, 255, 0.3)' : 'none',
                  }}
                >
                  {a}
                </button>
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
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🎉
            </motion.span>
            <h2 style={{ fontSize: '24px', color: '#7C4DFF', margin: 0 }}>
              欢迎 {name}！
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>
              正在为你准备学习之旅...
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
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        padding: '24px',
      }}
    >
      {/* 进度指示器 */}
      {step !== 'done' && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          {['name', 'age', 'grade', 'avatar'].map((s, i) => (
            <div
              key={s}
              style={{
                width: '40px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: ['name', 'age', 'grade', 'avatar'].indexOf(step) >= i
                  ? '#7C4DFF'
                  : '#E0E0E0',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* 卡片 */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '36px 28px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
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
              fontSize: '14px',
              color: '#F44336',
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#FFEBEE',
              borderRadius: '8px',
            }}
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* 底部按钮 */}
      {step !== 'done' && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          {step !== 'name' && (
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                border: '2px solid #BDBDBD',
                backgroundColor: 'white',
                color: '#666',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              上一步
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: isSaving ? '#B39DDB' : '#7C4DFF',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSaving ? 'default' : 'pointer',
              boxShadow: '0 4px 16px rgba(124, 77, 255, 0.3)',
            }}
          >
            {step === 'avatar'
              ? isSaving
                ? '保存中...'
                : '🎉 完成'
              : '下一步 →'}
          </motion.button>
        </div>
      )}
    </div>
  )
}
