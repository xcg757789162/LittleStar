/**
 * 首页 — "星辰乐园"
 * 
 * 设计风格：Sunny Playground — 温暖阳光游乐场
 * 圆润 clay 质感 + 大胆配色 + 浮动装饰 + 弹性动画
 * 面向 2-8 岁幼儿，触控友好，视觉快乐
 *
 * 区域布局：
 *   1. 顶部 — 欢迎横幅（mascot + 问候 + 浮动装饰）
 *   2. 中部 — 科目星球入口（大圆形可点击区域）
 *   3. 底部 — 学习状态 + 开始学习按钮
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import { useMasteryRecords } from '@/hooks/queries/useMasteryRecords'
import { useKnowledgeNodes } from '@/hooks/queries/useKnowledgeNodes'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { usePreGeneration } from '@/hooks/usePreGeneration'
import type { Subject, PlacementTest, PlacementResult } from '@/types/models'

/* ═══════════════════════════════════════════
   设计 Token — Sunny Playground
   ═══════════════════════════════════════════ */

const T = {
  // 字体
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",

  // 背景
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  
  // 主色系 — 温暖阳光
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  
  // 科目色
  mathColor: '#FF8C42',
  mathBg: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
  mathShadow: 'rgba(255, 140, 66, 0.3)',
  
  chineseColor: '#2EC4B6',
  chineseBg: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
  chineseShadow: 'rgba(46, 196, 182, 0.3)',
  
  englishColor: '#5BC0EB',
  englishBg: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
  englishShadow: 'rgba(91, 192, 235, 0.3)',
  
  // 卡片
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  cardShadowHover: '0 16px 48px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.06)',
  
  // 按钮
  btnRadius: '22px',
  
  // 文字
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  
  // 状态
  successGreen: '#2EC4B6',
  successBg: '#E6FAF7',
  warningAmber: '#FFB347',
  warningBg: '#FFF8EB',
  errorRed: '#FF6B6B',
  errorBg: '#FFF0F0',
}

/* ═══════════════════════════════════════════
   装饰性 SVG 组件
   ═══════════════════════════════════════════ */

/** 闪亮星星 — 用于装饰 */
function Sparkle({ size = 24, color = T.starGold, style }: {
  size?: number; color?: string; style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  )
}

/** 小云朵 — 浮动装饰 */
function Cloud({ size = 60, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="white" opacity="0.6" style={style}>
      <ellipse cx="50" cy="40" rx="40" ry="18" />
      <ellipse cx="30" cy="32" rx="22" ry="16" />
      <ellipse cx="65" cy="30" rx="26" ry="18" />
      <ellipse cx="48" cy="22" rx="20" ry="16" />
    </svg>
  )
}

/** Mascot 星星角色 */
function StarMascot({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* 星星身体 */}
      <path
        d="M60 8L73.5 40.5L108 46L82.5 70.5L88.5 105L60 89.5L31.5 105L37.5 70.5L12 46L46.5 40.5L60 8Z"
        fill={T.starGold}
        stroke="#F5A623"
        strokeWidth="2"
      />
      {/* 眼睛 */}
      <ellipse cx="47" cy="55" rx="5" ry="6" fill="#2D3142" />
      <ellipse cx="73" cy="55" rx="5" ry="6" fill="#2D3142" />
      {/* 眼睛高光 */}
      <ellipse cx="49" cy="53" rx="2" ry="2.5" fill="white" />
      <ellipse cx="75" cy="53" rx="2" ry="2.5" fill="white" />
      {/* 微笑 */}
      <path d="M48 68C48 68 54 76 60 76C66 76 72 68 72 68" stroke="#2D3142" strokeWidth="3" strokeLinecap="round" />
      {/* 腮红 */}
      <ellipse cx="38" cy="65" rx="6" ry="4" fill="#FFB5B5" opacity="0.6" />
      <ellipse cx="82" cy="65" rx="6" ry="4" fill="#FFB5B5" opacity="0.6" />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   科目图标 — 更大更有表现力
   ═══════════════════════════════════════════ */

function MathPlanetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill={T.sunOrange} opacity="0.15" />
      <text x="24" y="32" textAnchor="middle" fontSize="28" fill={T.sunOrange} fontWeight="bold" fontFamily={T.fontDisplay}>
        +
      </text>
    </svg>
  )
}

function ChinesePlanetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill={T.grassGreen} opacity="0.15" />
      <text x="24" y="33" textAnchor="middle" fontSize="22" fill={T.grassGreen} fontWeight="bold" fontFamily={T.fontDisplay}>
        文
      </text>
    </svg>
  )
}

function EnglishPlanetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill={T.skyBlue} opacity="0.15" />
      <text x="24" y="33" textAnchor="middle" fontSize="24" fill={T.skyBlue} fontWeight="bold" fontFamily={T.fontDisplay}>
        A
      </text>
    </svg>
  )
}

function RocketIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function WifiOffIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.errorRed} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.successGreen} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.warningAmber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   评测分数 → 星级映射 + 星星展示组件
   ═══════════════════════════════════════════ */

function getScoreStars(score: number): number {
  if (score >= 90) return 5
  if (score >= 70) return 4
  if (score >= 50) return 3
  if (score >= 30) return 2
  return 1
}


/** 小星星评级展示 */
function MiniStarRating({ stars, size = 14, color = T.starGold }: {
  stars: number; size?: number; color?: string
}) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= stars ? color : '#E2E8F0'}>
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   科目配置
   ═══════════════════════════════════════════ */

interface SubjectConfig {
  key: Subject
  label: string
  emoji: string
  color: string
  bg: string
  shadow: string
  icon: () => React.JSX.Element
}

const ALL_SUBJECTS: SubjectConfig[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: T.mathColor, bg: T.mathBg, shadow: T.mathShadow, icon: MathPlanetIcon },
  { key: 'chinese', label: '语文', emoji: '📖', color: T.chineseColor, bg: T.chineseBg, shadow: T.chineseShadow, icon: ChinesePlanetIcon },
  { key: 'english', label: '英语', emoji: '🌍', color: T.englishColor, bg: T.englishBg, shadow: T.englishShadow, icon: EnglishPlanetIcon },
]

/* ═══════════════════════════════════════════
   动画变体
   ═══════════════════════════════════════════ */

const floatAnimation = {
  y: [0, -8, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
}

const floatSlow = {
  y: [0, -5, 0],
  transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' as const },
}

const wiggle = {
  rotate: [-3, 3, -3],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
}

/* ═══════════════════════════════════════════
   获取时段问候语
   ═══════════════════════════════════════════ */

function getGreeting(name?: string) {
  const hour = new Date().getHours()
  const displayName = name || '小朋友'
  if (hour < 11) return { text: `早上好，${displayName}！`, emoji: '🌅', sub: '新的一天，一起学习吧' }
  if (hour < 14) return { text: `中午好，${displayName}！`, emoji: '☀️', sub: '吃饱了来学一会儿' }
  if (hour < 18) return { text: `下午好，${displayName}！`, emoji: '🌤️', sub: '休息好了吗？继续加油' }
  return { text: `晚上好，${displayName}！`, emoji: '🌙', sub: '睡前学一点点' }
}

/* ═══════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════ */

export function Home() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'
  const [cachedCount, setCachedCount] = useState<number>(0)

  // 缓存初始化
  const cacheInstance = useMemo(() => {
    return childId
      ? new ClassroomCache(new PostgresCacheStore(Number(childId)))
      : new ClassroomCache()
  }, [childId])

  const cacheRef = useRef<ClassroomCache | null>(null)
  useEffect(() => { cacheRef.current = cacheInstance }, [cacheInstance])

  // 查询评测状态
  const { data: placementTests, isLoading: isLoadingTests, isError: isTestsError, refetch: refetchTests } = usePlacementTests(childId)

  // 查询学习记录 + 知识点列表（用于首页科目卡片展示真实学习情况）
  const { data: masteryRecords } = useMasteryRecords(childId)
  const { data: allKnowledgeNodes } = useKnowledgeNodes()

  // 按科目计算基于学习记录的已掌握数量：masteryLevel ≥ 80 为已掌握
  const subjectMasteryStats = useMemo(() => {
    const stats = new Map<string, { mastered: number; learning: number; total: number }>()
    if (!allKnowledgeNodes) return stats

    // 先统计每科目的知识点总数
    const subjectNodeIds = new Map<string, Set<string>>()
    for (const node of allKnowledgeNodes) {
      if (!subjectNodeIds.has(node.subject)) {
        subjectNodeIds.set(node.subject, new Set())
      }
      subjectNodeIds.get(node.subject)!.add(node.id ?? '')
    }

    // 初始化各科目统计
    for (const [subj, nodeIds] of subjectNodeIds) {
      stats.set(subj, { mastered: 0, learning: 0, total: nodeIds.size })
    }

    // 用学习记录填充
    if (masteryRecords) {
      for (const rec of masteryRecords) {
        // 找到这个知识点属于哪个科目
        const node = allKnowledgeNodes.find(n => n.id === rec.knowledgeNodeId)
        if (!node) continue
        const s = stats.get(node.subject)
        if (!s) continue
        if (rec.masteryLevel >= 80) {
          s.mastered++
        } else {
          s.learning++
        }
      }
    }

    return stats
  }, [allKnowledgeNodes, masteryRecords])

  // 保留评测结果数据的 Map：subject → PlacementTest（取最新一次）
  const completedSubjectsMap = useMemo(() => {
    if (!placementTests) return new Map<Subject, PlacementTest>()
    const map = new Map<Subject, PlacementTest>()
    for (const t of placementTests) {
      const subj = t.subject as Subject
      // 已按 startedAt desc 排序，第一个就是最新的
      if (!map.has(subj)) {
        map.set(subj, t)
      }
    }
    return map
  }, [placementTests])

  // 向后兼容：快捷判断某科是否已完成
  const completedSubjects = useMemo(() => {
    return new Set(completedSubjectsMap.keys())
  }, [completedSubjectsMap])

  const pendingSubjects = useMemo(() => {
    return ALL_SUBJECTS.filter((s) => !completedSubjects.has(s.key))
  }, [completedSubjects])

  const hasPlacementTest = childId
    ? (placementTests ? placementTests.length > 0 : null)
    : false

  // 缓存课程数量
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

  // 预生成
  const {
    status: preGenStatus,
    completedCount: preGenCompleted,
    totalCount: preGenTotal,
    stageText: preGenStageText,
    triggerGeneration,
  } = usePreGeneration(childId, hasPlacementTest, cachedCount, completedSubjects.size)

  // 预生成完成后刷新缓存
  const refreshCache = useCallback(async () => {
    try {
      const size = await cacheInstance.getCacheSize()
      setCachedCount(size)
    } catch { /* silent */ }
  }, [cacheInstance])

  useEffect(() => {
    if (preGenStatus === 'completed' && preGenCompleted > 0) {
      // 使用 setTimeout(0) 避免在 effect 中同步 setState（ESLint: react-hooks/set-state-in-effect）
      const timer = setTimeout(() => void refreshCache(), 0)
      return () => clearTimeout(timer)
    }
  }, [preGenStatus, preGenCompleted, refreshCache])

  useEffect(() => {
    if (preGenStatus !== 'generating') return
    const interval = setInterval(() => void refreshCache(), 10000)
    return () => clearInterval(interval)
  }, [preGenStatus, refreshCache])

  // 课堂完成事件：直接刷新缓存数量（补充 preGenStatus 变化的间接刷新）
  useEffect(() => {
    const handleClassroomCompleted = () => {
      // 延迟 2 秒刷新，等待缓存删除操作完成
      setTimeout(() => void refreshCache(), 2000)
    }

    window.addEventListener('classroom-completed', handleClassroomCompleted)
    return () => window.removeEventListener('classroom-completed', handleClassroomCompleted)
  }, [refreshCache])

  const greeting = getGreeting(currentChild?.name)

  // ═══════════════ 加载中 ═══════════════
  if (childId && isLoadingTests && !isTestsError && hasPlacementTest === null) {
    return (
      <div data-testid="home-page" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bgGradient,
        gap: '20px',
      }}>
        <motion.div animate={{ ...floatAnimation, rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <StarMascot size={100} />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            fontFamily: T.fontDisplay,
            fontSize: '18px',
            color: T.textMedium,
            fontWeight: 600,
          }}
        >
          正在加载你的乐园...
        </motion.p>
      </div>
    )
  }

  // ═══════════════ 错误状态 ═══════════════
  if (childId && isTestsError) {
    return (
      <div data-testid="home-page" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bgGradient,
        padding: '24px',
        gap: '28px',
      }}>
        {/* Mascot 难过 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <StarMascot size={90} />
        </motion.div>

        {/* 错误卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            padding: '32px',
            borderRadius: T.cardRadius,
            backgroundColor: T.cardBg,
            boxShadow: T.cardShadow,
            textAlign: 'center',
            maxWidth: '360px',
            width: '100%',
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: T.errorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <WifiOffIcon />
          </div>
          <p style={{
            fontFamily: T.fontDisplay,
            fontSize: '20px',
            color: T.textDark,
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            哎呀，连接不上
          </p>
          <p style={{
            fontFamily: T.fontBody,
            fontSize: '14px',
            color: T.textLight,
            lineHeight: 1.6,
          }}>
            请检查后端服务是否在运行
          </p>
        </motion.div>

        {/* 重试 */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => refetchTests()}
          style={{
            padding: '16px 44px',
            borderRadius: T.btnRadius,
            border: 'none',
            background: `linear-gradient(135deg, ${T.skyBlue} 0%, #4DA8DA 100%)`,
            color: T.textWhite,
            fontFamily: T.fontDisplay,
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 8px 24px rgba(91, 192, 235, 0.35)`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <RefreshIcon />
          再试一次
        </motion.button>
      </div>
    )
  }

  // ═══════════════ 主页面 ═══════════════
  return (
    <div
      data-testid="home-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: T.bgGradient,
        padding: '0 0 100px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ────── 浮动装饰 ────── */}
      <motion.div animate={floatSlow} style={{ position: 'absolute', top: '8%', left: '-20px', zIndex: 0 }}>
        <Cloud size={80} />
      </motion.div>
      <motion.div animate={floatAnimation} style={{ position: 'absolute', top: '5%', right: '10px', zIndex: 0 }}>
        <Cloud size={55} />
      </motion.div>
      <motion.div animate={floatSlow} style={{ position: 'absolute', top: '22%', right: '-10px', zIndex: 0 }}>
        <Sparkle size={20} color="#FFD166" style={{ opacity: 0.5 }} />
      </motion.div>
      <motion.div animate={floatAnimation} style={{ position: 'absolute', top: '35%', left: '5%', zIndex: 0 }}>
        <Sparkle size={14} color="#FF6B9D" style={{ opacity: 0.4 }} />
      </motion.div>

      {/* ═══════════════════════════════════
         区域 1：欢迎横幅
         ═══════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '48px 24px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Mascot */}
        <motion.div animate={wiggle}>
          <StarMascot size={72} />
        </motion.div>

        {/* 问候文字 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '22px' }}>{greeting.emoji}</span>
            <h1 style={{
              fontFamily: T.fontDisplay,
              fontSize: '24px',
              fontWeight: 800,
              color: T.textDark,
              margin: 0,
              lineHeight: 1.3,
            }}>
              {greeting.text}
            </h1>
          </div>
          <p style={{
            fontFamily: T.fontBody,
            fontSize: '14px',
            color: T.textMedium,
            margin: 0,
            fontWeight: 500,
          }}>
            {greeting.sub}
          </p>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════
         区域 2：科目星球
         ═══════════════════════════════════ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '8px 20px 0',
        }}
      >
        {/* 未评测 — 入学测评入口 */}
        {pendingSubjects.length === ALL_SUBJECTS.length && (
          <motion.div
            variants={staggerItem}
            style={{
              backgroundColor: T.cardBg,
              borderRadius: T.cardRadius,
              boxShadow: T.cardShadow,
              padding: '28px 24px',
              marginBottom: '16px',
            }}
          >
            {/* 头部 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${T.starGold} 0%, ${T.sunOrange} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: `0 4px 12px ${T.mathShadow}`,
              }}>
                ✨
              </div>
              <div>
                <p style={{
                  fontFamily: T.fontDisplay,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: T.textDark,
                  margin: 0,
                }}>
                  让小星老师认识你吧
                </p>
                <p style={{
                  fontFamily: T.fontBody,
                  fontSize: '13px',
                  color: T.textLight,
                  margin: 0,
                }}>
                  做个小测试，只需几分钟
                </p>
              </div>
            </div>

            {/* 大 CTA 按钮 */}
            <motion.button
              data-testid="placement-test-entry-btn"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02, boxShadow: `0 12px 32px rgba(255, 140, 66, 0.45)` }}
              onClick={() => navigate('/placement-test-select')}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: T.btnRadius,
                border: 'none',
                background: `linear-gradient(135deg, ${T.sunOrange} 0%, #FFA361 50%, ${T.sunYellow} 100%)`,
                color: T.textWhite,
                fontFamily: T.fontDisplay,
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 8px 28px rgba(255, 140, 66, 0.4)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                letterSpacing: '0.5px',
              }}
            >
              <RocketIcon />
              入学测评
            </motion.button>
          </motion.div>
        )}

        {/* 部分评测完成 — 显示未完成科目 */}
        {pendingSubjects.length > 0 && pendingSubjects.length < ALL_SUBJECTS.length && (
          <motion.div
            variants={staggerItem}
            style={{
              backgroundColor: T.cardBg,
              borderRadius: T.cardRadius,
              boxShadow: T.cardShadow,
              padding: '24px',
              marginBottom: '16px',
            }}
          >
            {/* 标题行 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <span style={{
                  fontFamily: T.fontDisplay,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: T.textDark,
                }}>
                  还有 {pendingSubjects.length} 科没测评
                </span>
              </div>
              {/* 进度点 */}
              <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 200, 69, 0.12)',
              }}>
                {ALL_SUBJECTS.map((s) => (
                  <div key={s.key} style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: completedSubjects.has(s.key) ? T.successGreen : '#E2E8F0',
                    transition: 'all 0.3s ease',
                    boxShadow: completedSubjects.has(s.key) ? `0 0 6px ${T.successGreen}40` : 'none',
                  }} />
                ))}
              </div>
            </div>

            {/* 未完成科目列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingSubjects.map((subject, index) => (
                <motion.button
                  key={subject.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/placement-test/${subject.key}/${gradeLevel}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                    borderRadius: '18px',
                    border: 'none',
                    background: subject.bg,
                    cursor: 'pointer',
                    boxShadow: `0 4px 16px ${subject.shadow}`,
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    backgroundColor: T.cardBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 8px ${subject.shadow}`,
                    flexShrink: 0,
                  }}>
                    <subject.icon />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: T.fontDisplay,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: subject.color,
                    }}>
                      {subject.label}评测
                    </div>
                    <div style={{
                      fontFamily: T.fontBody,
                      fontSize: '12px',
                      color: T.textLight,
                      marginTop: '2px',
                    }}>
                      点一下就开始啦 {subject.emoji}
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={subject.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════
           科目进度卡片（已评测的科目 — 展示分数和星级）
           ═══════════════════════════════════ */}
        {completedSubjects.size > 0 && (
          <motion.div
            variants={staggerItem}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '4px 0 16px',
            }}
          >
            {ALL_SUBJECTS.filter((s) => completedSubjects.has(s.key)).map((subject, index) => {
              const test = completedSubjectsMap.get(subject.key)
              const result: PlacementResult | undefined = test?.result
              const masteryStats = subjectMasteryStats.get(subject.key)
              const masteredCount = masteryStats?.mastered ?? 0
              const learningCount = masteryStats?.learning ?? 0
              const totalCount = masteryStats?.total ?? 0
              // 使用知识点掌握百分比（已掌握/总数），与 SubjectMasteryPage 一致
              const progressPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0
              const stars = result ? getScoreStars(result.overallScore) : 0
              const label = progressPercent >= 80 ? '太棒啦！' : progressPercent >= 50 ? '很不错！' : progressPercent > 0 ? '继续加油' : '开始学习'

              return (
                <motion.div
                  key={subject.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.12, type: 'spring', stiffness: 200, damping: 18 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/subject-mastery/${subject.key}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    borderRadius: '22px',
                    background: subject.bg,
                    boxShadow: `0 6px 20px ${subject.shadow}`,
                    cursor: 'pointer',
                  }}
                >
                  {/* 左侧：科目图标 + 完成勾 */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '18px',
                      backgroundColor: T.cardBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${subject.shadow}`,
                    }}>
                      <subject.icon />
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: T.cardBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}>
                      <CheckCircleIcon />
                    </div>
                  </div>

                  {/* 中间：科目名称 + 星级 + 已掌握知识点 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}>
                      <span style={{
                        fontFamily: T.fontDisplay,
                        fontSize: '17px',
                        fontWeight: 700,
                        color: subject.color,
                      }}>
                        {subject.label}
                      </span>
                      <MiniStarRating stars={stars} size={13} color={subject.color} />
                    </div>
                    {(masteredCount > 0 || learningCount > 0) && (
                      <span style={{
                        fontFamily: T.fontBody,
                        fontSize: '12px',
                        color: T.textLight,
                      }}>
                        {masteredCount > 0 && `⭐ 已掌握 ${masteredCount} 个`}
                        {masteredCount > 0 && learningCount > 0 && '　'}
                        {learningCount > 0 && `📖 学习中 ${learningCount} 个`}
                      </span>
                    )}
                  </div>

                  {/* 右侧：掌握百分比 + 评语 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: T.fontDisplay,
                      fontSize: '28px',
                      fontWeight: 800,
                      color: subject.color,
                      lineHeight: 1,
                    }}>
                      {progressPercent}%</span>
                    <span style={{
                      fontFamily: T.fontBody,
                      fontSize: '11px',
                      color: T.textLight,
                      marginTop: '2px',
                    }}>
                      {label}
                    </span>
                  </div>

                  {/* 右箭头 — 提示可点击查看详情 */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={subject.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════
         区域 3：学习状态 + 开始学习
         ═══════════════════════════════════ */}
      {hasPlacementTest && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 180 }}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 课程状态卡片 */}
          <div style={{
            backgroundColor: T.cardBg,
            borderRadius: T.cardRadius,
            boxShadow: T.cardShadow,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* 课程进度状态 — 优先显示生成进度，其次显示缓存就绪状态 */}
            <AnimatePresence mode="wait">
              {/* 生成中 — 无论 cachedCount 如何，只要在生成就显示进度 */}
              {preGenStatus === 'generating' && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.warningBg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      style={{ fontSize: '24px', lineHeight: 1 }}
                    >
                      🎨
                    </motion.div>
                    <span style={{
                      fontFamily: T.fontDisplay,
                      fontSize: '15px',
                      color: '#92400E',
                      fontWeight: 600,
                    }}>
                      {preGenStageText || 'AI 老师正在创作课堂内容...'}
                    </span>
                  </div>
                  {preGenTotal > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* 进度条 */}
                      <div style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 179, 71, 0.2)',
                        overflow: 'hidden',
                      }}>
                        <motion.div
                          initial={{ width: '3%' }}
                          animate={{
                            width: preGenCompleted > 0
                              ? `${Math.max(3, (preGenCompleted / preGenTotal) * 100)}%`
                              : undefined,
                          }}
                          transition={preGenCompleted > 0 ? { duration: 0.6, ease: 'easeOut' } : undefined}
                          style={{
                            height: '100%',
                            borderRadius: '4px',
                            background: `linear-gradient(90deg, ${T.warningAmber} 0%, ${T.sunOrange} 100%)`,
                            ...(preGenCompleted === 0 ? {
                              width: '30%',
                              animation: 'slideProgress 2s ease-in-out infinite',
                            } : {}),
                          }}
                        />
                      </div>
                      <span style={{
                        fontFamily: T.fontBody,
                        fontSize: '12px',
                        color: T.textLight,
                        textAlign: 'center',
                      }}>
                        {preGenCompleted > 0
                          ? `${preGenCompleted} / ${preGenTotal} 节课堂${cachedCount > 0 ? `（已有 ${cachedCount} 节就绪）` : ''}`
                          : `共 ${preGenTotal} 节课堂，正在生成中...`}
                      </span>
                    </div>
                  )}
                  <style>{`
                    @keyframes slideProgress {
                      0% { margin-left: 0; }
                      50% { margin-left: 70%; }
                      100% { margin-left: 0; }
                    }
                  `}</style>
                </motion.div>
              )}

              {/* 检查中 — 无论 cachedCount 如何，只要在检查就显示 */}
              {preGenStatus === 'checking' && (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.warningBg,
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: '24px', lineHeight: 1 }}
                  >
                    🔍
                  </motion.div>
                  <span style={{
                    fontFamily: T.fontDisplay,
                    fontSize: '15px',
                    color: '#92400E',
                    fontWeight: 600,
                  }}>
                    {preGenStageText || '正在看看你学到哪了...'}
                  </span>
                </motion.div>
              )}

              {/* 已就绪 — 只在非生成/非检查状态且有缓存时显示 */}
              {cachedCount > 0 && preGenStatus !== 'generating' && preGenStatus !== 'checking' && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.successBg,
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: '28px', lineHeight: 1 }}
                  >
                    📚
                  </motion.div>
                  <div>
                    <span style={{
                      fontFamily: T.fontDisplay,
                      fontSize: '16px',
                      color: T.successGreen,
                      fontWeight: 700,
                    }}>
                      {cachedCount} 节课已准备好啦！
                    </span>
                    <p style={{
                      fontFamily: T.fontBody,
                      fontSize: '12px',
                      color: T.textLight,
                      margin: '2px 0 0',
                    }}>
                      快来开始今天的学习吧
                    </p>
                  </div>
                </motion.div>
              )}

              {/* 失败 — 无论 cachedCount 如何 */}
              {preGenStatus === 'failed' && (
                <motion.button
                  key="failed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={triggerGeneration}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.errorBg,
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>😢</span>
                  <span style={{
                    fontFamily: T.fontDisplay,
                    fontSize: '15px',
                    color: T.errorRed,
                    fontWeight: 600,
                  }}>
                    备课失败了，点这里再试试
                  </span>
                </motion.button>
              )}

              {/* API Key 未配置 */}
              {preGenStatus === 'api-key-missing' && (
                <motion.div
                  key="api-key-missing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '20px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.warningBg,
                    border: `2px solid ${T.warningAmber}33`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      backgroundColor: '#FFF3E0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <KeyIcon />
                    </div>
                    <div>
                      <p style={{
                        fontFamily: T.fontDisplay,
                        fontSize: '16px',
                        color: '#92400E',
                        fontWeight: 700,
                        margin: '0 0 4px',
                      }}>
                        还需要配置 AI 服务
                      </p>
                      <p style={{
                        fontFamily: T.fontBody,
                        fontSize: '13px',
                        color: T.textLight,
                        margin: 0,
                        lineHeight: 1.5,
                      }}>
                        请家长在高级设置中配置 LLM 模型和 API Key，小星老师才能备课哦
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/parent')}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${T.warningAmber} 0%, ${T.sunOrange} 100%)`,
                      color: T.textWhite,
                      fontFamily: T.fontDisplay,
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: `0 6px 20px rgba(255, 179, 71, 0.35)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    ⚙️ 前往高级设置
                  </motion.button>
                </motion.div>
              )}

              {/* 空闲 + 无缓存 — 等待触发 */}
              {cachedCount === 0 && preGenStatus === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    backgroundColor: T.warningBg,
                  }}
                >
                  <motion.div
                    animate={floatAnimation}
                    style={{ fontSize: '24px', lineHeight: 1 }}
                  >
                    ✏️
                  </motion.div>
                  <span style={{
                    fontFamily: T.fontDisplay,
                    fontSize: '15px',
                    color: '#92400E',
                    fontWeight: 600,
                  }}>
                    小星老师准备中...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ════ 开始学习大按钮 ════ */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 14px 40px rgba(91, 192, 235, 0.45)`,
            }}
            onClick={() => navigate('/classroom')}
            style={{
              width: '100%',
              padding: '22px 32px',
              borderRadius: T.btnRadius,
              border: 'none',
              background: `linear-gradient(135deg, #5BC0EB 0%, #4DA8DA 40%, #3D95C7 100%)`,
              color: T.textWhite,
              fontFamily: T.fontDisplay,
              fontSize: '22px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 10px 32px rgba(91, 192, 235, 0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              letterSpacing: '1px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 按钮内闪光效果 */}
            <motion.div
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                pointerEvents: 'none',
              }}
            />
            <PlayIcon />
            开始学习
          </motion.button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════
         底部间距（给 BottomNav 留空间）
         ═══════════════════════════════════ */}
      <div style={{ height: '24px' }} />
    </div>
  )
}
