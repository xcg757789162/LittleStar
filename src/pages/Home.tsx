/**
 * 首页
 * 首次使用（没有学习记录）时显示"入学测评"入口
 * 否则显示"开始学习"，同时展示缓存课程状态
 * 触发教导处预生成（后台异步）
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'

export function Home() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const [cachedCount, setCachedCount] = useState<number>(0)

  // 按 childId 初始化持久化缓存（登录后有值），否则用内存缓存兜底
  const cacheRef = useRef<ClassroomCache | null>(null)

  // 使用 useMemo 根据 childId 变化创建缓存实例（避免在 render 中直接写 ref）
  const cacheInstance = useMemo(() => {
    return childId
      ? new ClassroomCache(new PostgresCacheStore(Number(childId)))
      : new ClassroomCache()
  }, [childId])

  // 在 effect 中更新 ref
  useEffect(() => {
    cacheRef.current = cacheInstance
  }, [cacheInstance])

  // 通过 React Query 查询入学测评记录（仅在有 childId 时查询）
  const { data: placementTests, isLoading: isLoadingTests } = usePlacementTests(childId)

  // 当 childId 为 undefined（无孩子/未登录）时，query 不会执行（enabled: false）
  // 此时 placementTests 为 undefined → hasPlacementTest = false（直接当未测评处理）
  const hasPlacementTest = childId
    ? (placementTests ? placementTests.length > 0 : null)
    : false

  // 加载缓存课程数量（独立于测评状态，childId 变化时重新加载）
  useEffect(() => {
    const loadCacheStatus = async () => {
      try {
        const size = await cacheInstance.getCacheSize()
        setCachedCount(size)
      } catch {
        setCachedCount(0)
      }
    }
    loadCacheStatus()
  }, [cacheInstance])

  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'

  const handlePlacementTest = () => {
    // 默认从数学科目开始入学测评
    navigate(`/placement-test/math/${gradeLevel}`)
  }

  // 加载中状态（仅当有 childId 且 React Query 正在查询时才显示）
  if (childId && (isLoadingTests || hasPlacementTest === null)) {
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

      {!hasPlacementTest ? (
        /* 首次使用：显示入学测评入口 */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: '16px',
              color: '#7C4DFF',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            🌟 让小星老师先了解一下你吧！
          </motion.p>

          <motion.button
            data-testid="placement-test-entry-btn"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={handlePlacementTest}
            style={{
              padding: '24px 56px',
              borderRadius: '28px',
              border: 'none',
              backgroundColor: '#FF6B35',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(255, 107, 53, 0.4)',
              minWidth: '220px',
              minHeight: '88px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '32px' }}>🚀</span>
            入学测评
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              fontSize: '13px',
              color: '#999',
              textAlign: 'center',
            }}
          >
            只需几分钟，轻轻松松 ☺️
          </motion.p>
        </motion.div>
      ) : (
        /* 已完成测评：显示开始学习 + 缓存状态 */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* 缓存课程状态 */}
          <div
            data-testid="cache-status"
            style={{
              padding: '8px 20px',
              borderRadius: '16px',
              backgroundColor: cachedCount > 0 ? '#E8F5E9' : '#FFF3E0',
              fontSize: '14px',
              color: cachedCount > 0 ? '#4CAF50' : '#FF9800',
            }}
          >
            {cachedCount > 0
              ? `📚 ${cachedCount} 节课已就绪`
              : '📝 课程准备中...'}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/learn')}
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
      )}
    </div>
  )
}
