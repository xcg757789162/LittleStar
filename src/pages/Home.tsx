/**
 * 首页
 * 根据评测完成状态分为两个区域：
 *   区域 1 - 评测入口：未完成评测的科目卡片（全新用户显示大按钮）
 *   区域 2 - 学习入口：备课进度 + 开始学习（至少 1 科评测完成时显示）
 * 两个区域可以同时存在（部分评测完成的过渡状态）
 *
 * 设计风格：Clay（圆润 3D、柔和阴影、适合儿童）
 * 配色：教育类（蓝 #2563EB 信任 / 绿 #059669 成长 / 橙 #F97316 CTA）
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { usePreGeneration } from '@/hooks/usePreGeneration'
import type { Subject } from '@/types/models'

/* ====== SVG 图标组件 ====== */

function StarIcon({ size = 40, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function MathIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  )
}

function BookIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  )
}

function GlobeIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function RocketIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function SparklesIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
    </svg>
  )
}

function ChevronRightIcon({ size = 20, color = '#94a3b8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function BookOpenIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function PaletteIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function AlertTriangleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function FileTextIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function RefreshIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function WifiOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

/* ====== 科目图标映射 ====== */

const SUBJECT_ICON_MAP: Record<Subject, (size: number) => JSX.Element> = {
  math: (size) => <MathIcon size={size} />,
  chinese: (size) => <BookIcon size={size} />,
  english: (size) => <GlobeIcon size={size} />,
}

/** 全部科目定义 */
const ALL_SUBJECTS: {
  key: Subject
  label: string
  color: string
  bgColor: string
  shadowColor: string
}[] = [
  { key: 'math', label: '数学', color: '#F97316', bgColor: '#FFF7ED', shadowColor: 'rgba(249, 115, 22, 0.15)' },
  { key: 'chinese', label: '语文', color: '#059669', bgColor: '#ECFDF5', shadowColor: 'rgba(5, 150, 105, 0.15)' },
  { key: 'english', label: '英语', color: '#2563EB', bgColor: '#EFF6FF', shadowColor: 'rgba(37, 99, 235, 0.15)' },
]

/* ====== Clay 风格设计 Token ====== */
const CLAY = {
  bg: 'linear-gradient(160deg, #F0F4FF 0%, #FDF2F8 40%, #FFF7ED 100%)',
  card: '#FFFFFF',
  cardShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
  cardShadowHover: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
  radius: '24px',
  radiusSm: '16px',
  radiusLg: '32px',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryBg: 'rgba(108, 92, 231, 0.08)',
  accent: '#F97316',
  accentBg: 'rgba(249, 115, 22, 0.08)',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
}

export function Home() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'
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
  const { data: placementTests, isLoading: isLoadingTests, isError: isTestsError, refetch: refetchTests } = usePlacementTests(childId)

  // 解析评测状态：已完成科目集合 + 未完成科目列表
  const completedSubjects = useMemo(() => {
    if (!placementTests) return new Set<Subject>()
    return new Set(placementTests.map((t) => t.subject as Subject))
  }, [placementTests])

  const pendingSubjects = useMemo(() => {
    return ALL_SUBJECTS.filter((s) => !completedSubjects.has(s.key))
  }, [completedSubjects])

  // hasPlacementTest: 至少有 1 科完成评测 → true；全无 → false；加载中 → null
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

  // 课堂预生成 Hook（评测完成 + 缓存为空时自动触发）
  const {
    status: preGenStatus,
    completedCount: preGenCompleted,
    totalCount: preGenTotal,
    stageText: preGenStageText,
    triggerGeneration,
  } = usePreGeneration(
    childId,
    hasPlacementTest,
    cachedCount,
  )

  // 预生成完成后刷新缓存数量
  const refreshCache = useCallback(async () => {
    try {
      const size = await cacheInstance.getCacheSize()
      setCachedCount(size)
    } catch {
      // 静默处理
    }
  }, [cacheInstance])

  useEffect(() => {
    if (preGenStatus === 'completed' && preGenCompleted > 0) {
      void refreshCache()
    }
  }, [preGenStatus, preGenCompleted, refreshCache])

  // 生成中时定时刷新缓存状态（每 10 秒检查一次）
  useEffect(() => {
    if (preGenStatus !== 'generating') return
    const interval = setInterval(() => {
      void refreshCache()
    }, 10000)
    return () => clearInterval(interval)
  }, [preGenStatus, refreshCache])

  const handlePlacementTest = () => {
    navigate('/placement-test-select')
  }

  // ====== 加载中状态 ======
  if (childId && isLoadingTests && !isTestsError && hasPlacementTest === null) {
    return (
      <div
        data-testid="home-page"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: CLAY.bg,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <StarIcon size={56} color="#F59E0B" />
        </motion.div>
      </div>
    )
  }

  // ====== 错误状态 ======
  if (childId && isTestsError) {
    return (
      <div
        data-testid="home-page"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: CLAY.bg,
          padding: '24px',
          gap: '24px',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <StarIcon size={48} />
          <span style={{ fontSize: '36px', fontWeight: 800, color: CLAY.primary, letterSpacing: '-0.5px' }}>
            小星辰
          </span>
        </motion.div>

        {/* 错误卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '28px 32px',
            borderRadius: CLAY.radius,
            backgroundColor: CLAY.card,
            boxShadow: CLAY.cardShadow,
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%',
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: CLAY.errorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: CLAY.error,
          }}>
            <WifiOffIcon size={28} />
          </div>
          <p style={{ fontSize: '17px', color: CLAY.text, fontWeight: 700, marginBottom: '8px' }}>
            后端服务连接失败
          </p>
          <p style={{ fontSize: '14px', color: CLAY.textMuted, lineHeight: 1.6 }}>
            请检查 Docker 后端服务是否正在运行
          </p>
        </motion.div>

        {/* 重试按钮 */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => refetchTests()}
          style={{
            padding: '14px 40px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: CLAY.primary,
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 16px rgba(108, 92, 231, 0.35)`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          <RefreshIcon size={18} />
          重试连接
        </motion.button>
      </div>
    )
  }

  // ====== 主页面 ======
  return (
    <div
      data-testid="home-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: CLAY.bg,
        padding: '48px 20px 32px',
        gap: '28px',
      }}
    >
      {/* ====== Hero 区域：Logo + 欢迎语 ====== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        >
          <StarIcon size={56} />
        </motion.div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: CLAY.primary,
          letterSpacing: '-0.5px',
          margin: 0,
        }}>
          小星辰
        </h1>
        <p style={{
          fontSize: '15px',
          color: CLAY.textSecondary,
          margin: 0,
          fontWeight: 500,
        }}>
          和小星老师一起快乐学习！
        </p>
      </motion.div>

      {/* ====== 区域 1：学习评测入口 ====== */}
      {pendingSubjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 评测区卡片容器 */}
          <div style={{
            backgroundColor: CLAY.card,
            borderRadius: CLAY.radius,
            boxShadow: CLAY.cardShadow,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* 评测区标题 + 进度 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  backgroundColor: CLAY.primaryBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CLAY.primary,
                }}>
                  <SparklesIcon size={18} />
                </div>
                <div>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: CLAY.text,
                    margin: 0,
                  }}>
                    {completedSubjects.size === 0
                      ? '让小星老师了解你吧'
                      : `还有 ${pendingSubjects.length} 科评测未完成`}
                  </p>
                </div>
              </div>
              {/* 进度指示器 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: CLAY.primaryBg,
              }}>
                {ALL_SUBJECTS.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: completedSubjects.has(s.key) ? CLAY.success : CLAY.border,
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                ))}
                <span style={{ fontSize: '11px', color: CLAY.textMuted, marginLeft: '4px', fontWeight: 600 }}>
                  {completedSubjects.size}/{ALL_SUBJECTS.length}
                </span>
              </div>
            </div>

            {/* 未完成科目卡片 */}
            {completedSubjects.size === 0 ? (
              /* 全新用户：大 CTA 按钮 */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <motion.button
                  data-testid="placement-test-entry-btn"
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handlePlacementTest}
                  style={{
                    width: '100%',
                    padding: '20px 32px',
                    borderRadius: '20px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${CLAY.accent} 0%, #FB923C 100%)`,
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: `0 8px 24px rgba(249, 115, 22, 0.35)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  <RocketIcon size={28} />
                  入学测评
                </motion.button>
                <p style={{ fontSize: '13px', color: CLAY.textMuted, textAlign: 'center', margin: 0 }}>
                  只需几分钟，轻轻松松
                </p>
              </div>
            ) : (
              /* 部分完成：显示未完成科目卡片列表 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingSubjects.map((subject, index) => (
                  <motion.button
                    key={subject.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/placement-test/${subject.key}/${gradeLevel}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      borderRadius: CLAY.radiusSm,
                      border: 'none',
                      backgroundColor: subject.bgColor,
                      cursor: 'pointer',
                      boxShadow: `0 4px 16px ${subject.shadowColor}`,
                      textAlign: 'left',
                      transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      backgroundColor: CLAY.card,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 2px 8px ${subject.shadowColor}`,
                      flexShrink: 0,
                    }}>
                      {SUBJECT_ICON_MAP[subject.key](28)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: subject.color }}>
                        {subject.label}评测
                      </div>
                      <div style={{ fontSize: '12px', color: CLAY.textMuted, marginTop: '2px' }}>
                        点击开始评测
                      </div>
                    </div>
                    <ChevronRightIcon size={20} color={subject.color} />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====== 区域 2：学习入口 ====== */}
      {hasPlacementTest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 课程状态卡片 */}
          <div style={{
            backgroundColor: CLAY.card,
            borderRadius: CLAY.radius,
            boxShadow: CLAY.cardShadow,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* 已就绪状态 */}
            {cachedCount > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: CLAY.radiusSm,
                backgroundColor: CLAY.successBg,
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  backgroundColor: CLAY.card,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CLAY.success,
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                }}>
                  <BookOpenIcon size={18} />
                </div>
                <span style={{ fontSize: '15px', color: CLAY.success, fontWeight: 700 }}>
                  {cachedCount} 节课已就绪
                </span>
              </div>
            )}

            {/* 生成中状态 */}
            {cachedCount === 0 && preGenStatus === 'generating' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: CLAY.radiusSm,
                backgroundColor: CLAY.warningBg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ color: CLAY.warning, display: 'flex' }}
                  >
                    <PaletteIcon size={20} />
                  </motion.div>
                  <span style={{ fontSize: '14px', color: '#92400E', fontWeight: 600 }}>
                    {preGenStageText || 'AI 老师正在创作课堂内容…'}
                  </span>
                </div>
                {preGenTotal > 0 && (
                  <>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: '5%' }}
                        animate={{ width: `${Math.max(5, (preGenCompleted / preGenTotal) * 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          borderRadius: '3px',
                          background: 'linear-gradient(90deg, #F59E0B 0%, #F97316 100%)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: CLAY.textMuted, textAlign: 'center' }}>
                      {preGenCompleted}/{preGenTotal} 节课堂
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 检查中状态 */}
            {cachedCount === 0 && preGenStatus === 'checking' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: CLAY.radiusSm,
                backgroundColor: CLAY.warningBg,
              }}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ color: CLAY.warning, display: 'flex' }}
                >
                  <SearchIcon size={20} />
                </motion.div>
                <span style={{ fontSize: '14px', color: '#92400E', fontWeight: 500 }}>
                  {preGenStageText || '正在分析学习情况…'}
                </span>
              </div>
            )}

            {/* 失败状态 */}
            {cachedCount === 0 && preGenStatus === 'failed' && (
              <motion.div
                whileTap={{ scale: 0.97 }}
                onClick={triggerGeneration}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: CLAY.radiusSm,
                  backgroundColor: CLAY.errorBg,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <div style={{ color: CLAY.error, display: 'flex' }}>
                  <AlertTriangleIcon size={20} />
                </div>
                <span style={{ fontSize: '14px', color: CLAY.error, fontWeight: 600 }}>
                  课程生成失败，点击重试
                </span>
              </motion.div>
            )}

            {/* 空闲 / 准备中 */}
            {cachedCount === 0 && preGenStatus === 'idle' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: CLAY.radiusSm,
                backgroundColor: CLAY.warningBg,
              }}>
                <div style={{ color: CLAY.warning, display: 'flex' }}>
                  <FileTextIcon size={20} />
                </div>
                <span style={{ fontSize: '14px', color: '#92400E', fontWeight: 500 }}>
                  课程准备中…
                </span>
              </div>
            )}
          </div>

          {/* 开始学习按钮 */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/learn')}
            style={{
              width: '100%',
              padding: '18px 32px',
              borderRadius: '20px',
              border: 'none',
              background: `linear-gradient(135deg, ${CLAY.primary} 0%, ${CLAY.primaryLight} 100%)`,
              color: 'white',
              fontSize: '20px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 8px 24px rgba(108, 92, 231, 0.35)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'box-shadow 0.2s ease',
              letterSpacing: '0.5px',
            }}
          >
            开始学习
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
