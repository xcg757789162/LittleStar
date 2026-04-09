/**
 * 首页
 * 显示当前孩子信息、评测状态、学习入口
 * 改造：任选单科评测即可开始学习，展示各科评测状态
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db/database'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import { OpenMAICClient } from '@/services/openmaic/client'
import { ChildSwitcher } from '@/components/ChildSwitcher'
import type { Subject } from '@/types/models'

/** 服务状态类型 */
type ServiceStatus = 'checking' | 'online' | 'offline'

/** 科目配置 */
const SUBJECT_CONFIG: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function Home() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const currentUser = useAuthStore((s) => s.currentUser)
  const authLogout = useAuthStore((s) => s.logout)
  const resetChildren = useChildStore((s) => s.reset)

  /** 已评测的科目集合 */
  const [testedSubjects, setTestedSubjects] = useState<Set<Subject>>(new Set())
  /** 是否已完成数据加载 */
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking')
  const [learningCount, setLearningCount] = useState<number>(0)
  const [showChildSwitcher, setShowChildSwitcher] = useState(false)
  const clientRef = useRef(new OpenMAICClient())

  // 检查各科评测状态
  useEffect(() => {
    const checkPlacement = async () => {
      try {
        const childId = currentChild?.id
        if (!childId) return
        const tests = await db.placementTests
          .where('childId')
          .equals(childId)
          .toArray()
        const subjects = new Set(tests.map((t) => t.subject))
        setTestedSubjects(subjects)
      } catch {
        setTestedSubjects(new Set())
      }
      setIsDataLoaded(true)
    }
    setIsDataLoaded(false)
    checkPlacement()
  }, [currentChild])

  // 检查 OpenMAIC 服务状态 + 加载学习历史条数
  useEffect(() => {
    let cancelled = false

    const checkService = async () => {
      try {
        const healthy = await clientRef.current.checkHealth()
        if (!cancelled) {
          setServiceStatus(healthy ? 'online' : 'offline')
        }
      } catch {
        if (!cancelled) {
          setServiceStatus('offline')
        }
      }
    }

    const loadHistoryCount = async () => {
      try {
        const childId = currentChild?.id
        if (!childId) return
        const count = await db.classroomHistory
          .where('childId')
          .equals(childId)
          .count()
        if (!cancelled) {
          setLearningCount(count)
        }
      } catch {
        // 静默处理
      }
    }

    checkService()
    loadHistoryCount()

    const interval = setInterval(checkService, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentChild])

  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'
  const hasAnyTest = testedSubjects.size > 0
  const hasAllTests = testedSubjects.size >= 3

  const handleLogout = useCallback(() => {
    resetChildren()
    authLogout()
    navigate('/auth', { replace: true })
  }, [resetChildren, authLogout, navigate])
  const handleStartTest = useCallback((subject: Subject) => {
    navigate(`/placement-test/${subject}/${gradeLevel}`)
  }, [navigate, gradeLevel])

  /** 渲染服务状态指示器 */
  const renderServiceStatus = () => {
    const statusConfig = {
      checking: { bg: '#FFF3E0', color: '#FF9800', text: '🔍 正在检测课堂服务...' },
      online: {
        bg: '#E8F5E9',
        color: '#4CAF50',
        text: learningCount > 0
          ? `✅ 课堂服务就绪 · 已学 ${learningCount} 节课`
          : '✅ 课堂服务就绪，可以开始学习',
      },
      offline: { bg: '#FFEBEE', color: '#F44336', text: '⚠️ 课堂服务离线，请检查 Docker' },
    }

    const config = statusConfig[serviceStatus]
    return (
      <motion.div
        data-testid="service-status"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '8px 20px',
          borderRadius: '16px',
          backgroundColor: config.bg,
          fontSize: '14px',
          color: config.color,
          cursor: serviceStatus === 'offline' ? 'pointer' : 'default',
        }}
        onClick={serviceStatus === 'offline' ? () => {
          setServiceStatus('checking')
          clientRef.current.checkHealth().then((ok) => {
            setServiceStatus(ok ? 'online' : 'offline')
          }).catch(() => setServiceStatus('offline'))
        } : undefined}
      >
        {config.text}
        {serviceStatus === 'offline' && (
          <span style={{ fontSize: '12px', marginLeft: '8px' }}>(点击重试)</span>
        )}
      </motion.div>
    )
  }

  // 加载中状态
  if (!isDataLoaded) {
    return (
      <div
        data-testid="home-page"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '48px' }}
        >
          🌟
        </motion.div>
      </div>
    )
  }

  return (
    <div
      data-testid="home-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        padding: '24px',
        paddingTop: '40px',
      }}
    >
      {/* 顶部用户栏 */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#999' }}>
          👤 {currentUser?.nickname ?? '用户'}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '4px 12px',
            borderRadius: '8px',
            border: '1px solid #E0E0E0',
            backgroundColor: 'white',
            fontSize: '12px',
            color: '#999',
            cursor: 'pointer',
          }}
        >
          退出登录
        </button>
      </div>

      {/* 当前孩子卡片（可点击切换） */}
      <motion.button
        data-testid="child-card"
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowChildSwitcher(true)}
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '16px 20px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontSize: '40px' }}>{currentChild?.avatar ?? '⭐'}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            {currentChild?.name ?? '小朋友'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', margin: '2px 0 0' }}>
            {currentChild?.age ?? 5}岁 · 点击切换/添加孩子
          </p>
        </div>
        <span style={{ fontSize: '20px', color: '#BDBDBD' }}>›</span>
      </motion.button>

      {/* Logo */}
      <motion.h1
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{ fontSize: '40px', color: '#7C4DFF', margin: '0 0 8px' }}
      >
        ⭐ 小星辰
      </motion.h1>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
        和小星老师一起快乐学习！
      </p>

      {/* 评测状态区域 */}
      {!hasAllTests && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 4px' }}>
            🌟 入学测评
          </p>
          <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>
            {hasAnyTest
              ? '完成任意一科即可开始学习，也可以继续评测其他科目'
              : '选一个科目，让小星老师先了解一下你吧！'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {SUBJECT_CONFIG.map((s) => {
              const tested = testedSubjects.has(s.key)
              return (
                <motion.button
                  key={s.key}
                  whileTap={tested ? undefined : { scale: 0.95 }}
                  onClick={() => !tested && handleStartTest(s.key)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: '14px',
                    border: tested ? '2px solid #4CAF50' : '2px solid #E0E0E0',
                    backgroundColor: tested ? '#E8F5E9' : s.color,
                    cursor: tested ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: tested ? 0.8 : 1,
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{tested ? '✅' : s.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: tested ? '#4CAF50' : '#333' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: '11px', color: tested ? '#4CAF50' : '#999' }}>
                    {tested ? '已完成' : '去测评'}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* 已有评测 → 显示开始学习 + 服务状态 */}
      {hasAnyTest && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '480px' }}>
          {renderServiceStatus()}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/learn')}
            style={{
              padding: '16px 48px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: serviceStatus === 'offline' ? '#BDBDBD' : '#7C4DFF',
              color: 'white',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: serviceStatus === 'offline' ? 'not-allowed' : 'pointer',
              boxShadow: serviceStatus === 'offline' ? 'none' : '0 4px 16px rgba(124, 77, 255, 0.4)',
              opacity: serviceStatus === 'offline' ? 0.6 : 1,
            }}
            disabled={serviceStatus === 'offline'}
          >
            开始学习
          </motion.button>

          {/* 如果还有未评测的科目，显示继续评测入口 */}
          {hasAllTests && (
            <p style={{ fontSize: '13px', color: '#4CAF50', margin: 0 }}>
              ✅ 三科评测已全部完成
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/history')}
            style={{
              padding: '12px 36px',
              borderRadius: '20px',
              border: '2px solid #7C4DFF',
              backgroundColor: 'white',
              color: '#7C4DFF',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            📖 学习记录
          </motion.button>
        </div>
      )}

      {/* 孩子切换器 */}
      <ChildSwitcher
        visible={showChildSwitcher}
        onClose={() => setShowChildSwitcher(false)}
      />
    </div>
  )
}
