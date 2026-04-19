/**
 * 知识点详情页 — 科目学习情况
 *
 * 纯学习记录驱动的掌握判定（不依赖评测结果）：
 *   ✅ 已掌握：masteryRecord 存在且 masteryLevel ≥ 80
 *   📖 学习中：masteryRecord 存在但 masteryLevel < 80
 *   ⬜ 未学习：没有 masteryRecord
 *
 * 数据来源统一：masteryRecords.knowledgeNodeId === knowledge_nodes.id
 * 设计风格：Sunny Playground — 与 Home.tsx 统一
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { useKnowledgeNodesBySubject } from '@/hooks/queries/useKnowledgeNodes'
import { useMasteryRecords } from '@/hooks/queries/useMasteryRecords'
import { useCourses } from '@/hooks/queries/useCourses'
import { apiClient } from '@/services/api'
import { useQuery } from '@tanstack/react-query'
import type { Subject, KnowledgeNode } from '@/types/models'

/* ═══════════════════════════════════════════
   设计 Token — 与 Home.tsx 保持一致
   ═══════════════════════════════════════════ */

const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',

  sunOrange: '#FF8C42',
  grassGreen: '#2EC4B6',
  skyBlue: '#5BC0EB',
  starGold: '#FFC845',

  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',

  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',

  successGreen: '#2EC4B6',
  successBg: '#E6FAF7',
  warningAmber: '#FFB347',
  warningBg: '#FFF8EB',
}

/* ═══════════════════════════════════════════
   科目配置（与 Home.tsx 的 ALL_SUBJECTS 对应）
   ═══════════════════════════════════════════ */

interface SubjectTheme {
  label: string
  emoji: string
  color: string
  bg: string
  shadow: string
  lightBg: string
  iconBg: string
}

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  math: {
    label: '数学',
    emoji: '🔢',
    color: '#FF8C42',
    bg: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
    shadow: 'rgba(255, 140, 66, 0.3)',
    lightBg: '#FFF5EC',
    iconBg: 'rgba(255, 140, 66, 0.12)',
  },
  chinese: {
    label: '语文',
    emoji: '📖',
    color: '#2EC4B6',
    bg: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
    shadow: 'rgba(46, 196, 182, 0.3)',
    lightBg: '#EEFCFA',
    iconBg: 'rgba(46, 196, 182, 0.12)',
  },
  english: {
    label: '英语',
    emoji: '🌍',
    color: '#5BC0EB',
    bg: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
    shadow: 'rgba(91, 192, 235, 0.3)',
    lightBg: '#EEF7FD',
    iconBg: 'rgba(91, 192, 235, 0.12)',
  },
}

/** 动态课程：从 colorHex 派生完整主题 */
function deriveSubjectTheme(name: string, emoji: string, colorHex: string): SubjectTheme {
  const match = /^#?([0-9a-fA-F]{6})$/.exec((colorHex || '').trim())
  const clean = match ? match[1] : 'f4b66b'
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`
  const hex = `#${clean}`
  return {
    label: name,
    emoji: emoji || '✨',
    color: hex,
    bg: `linear-gradient(135deg, ${rgba(0.25)} 0%, ${rgba(0.12)} 100%)`,
    shadow: rgba(0.3),
    lightBg: rgba(0.08),
    iconBg: rgba(0.12),
  }
}

/* ═══════════════════════════════════════════
   知识点状态类型
   ═══════════════════════════════════════════ */

type NodeStatus = 'mastered' | 'learning' | 'not_started'

type LessonCacheStatus = 'completed' | 'cached' | 'generating' | 'pending_gen' | 'not_generated'

interface LessonDetail {
  lessonIndex: number
  title: string
  description: string
  completed: boolean
  cacheStatus: LessonCacheStatus
}

interface NodeWithStatus {
  node: KnowledgeNode
  status: NodeStatus
  masteryLevel?: number
  completedLessons?: number
  totalLessons?: number
  lessons?: LessonDetail[]
}

function getLessonStatusConfig(status: LessonCacheStatus) {
  switch (status) {
    case 'completed':
      return { label: '已完成', bgColor: T.successBg, textColor: T.successGreen, dot: T.successGreen }
    case 'cached':
      return { label: '已生成', bgColor: '#EEF4FF', textColor: '#5B8DEF', dot: '#5B8DEF' }
    case 'generating':
      return { label: '生成中', bgColor: T.warningBg, textColor: T.warningAmber, dot: T.warningAmber }
    case 'pending_gen':
      return { label: '排队中', bgColor: '#FFF5EB', textColor: '#E0952D', dot: '#E0952D' }
    case 'not_generated':
      return { label: '未生成', bgColor: '#F8F9FC', textColor: T.textLight, dot: '#D0D5DD' }
  }
}

function getStatusConfig(status: NodeStatus, _color: string) {
  switch (status) {
    case 'mastered':
      return {
        label: '已掌握',
        emoji: '⭐',
        bgColor: T.successBg,
        borderColor: T.successGreen,
        textColor: T.successGreen,
        icon: '✅',
      }
    case 'learning':
      return {
        label: '学习中',
        emoji: '📖',
        bgColor: T.warningBg,
        borderColor: T.warningAmber,
        textColor: T.warningAmber,
        icon: '📖',
      }
    case 'not_started':
      return {
        label: '未学习',
        emoji: '💤',
        bgColor: '#F8F9FC',
        borderColor: '#E2E8F0',
        textColor: T.textLight,
        icon: '⬜',
      }
  }
}

/* ═══════════════════════════════════════════
   SVG 图标
   ═══════════════════════════════════════════ */

function BackArrowIcon({ color = T.textDark }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function TrophyIcon({ size = 20, color = T.starGold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 15c3.31 0 6-2.69 6-6V3H6v6c0 3.31 2.69 6 6 6zm-1 2.93c-3.94-.49-7-3.85-7-7.93V2h2v7c0 2.76 2.24 5 5 5s5-2.24 5-5V2h2v7c0 4.08-3.06 7.44-7 7.93V20h3v2H8v-2h3v-2.07z" />
    </svg>
  )
}

function BookIcon({ size = 18, color = T.textLight }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   动画变体
   ═══════════════════════════════════════════ */

// (移除未使用的 staggerContainer/staggerItem variants —
// 子组件改为直接使用 initial/animate，避免 Framer Motion variants
// 在某些场景下未正确传递导致列表停留在 hidden 状态的问题)

/* ═══════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════ */

export function SubjectMasteryPage() {
  const navigate = useNavigate()
  const { subject } = useParams<{ subject: string }>()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id

  // 优先用内置主题；若是动态课程，从 courses 表读取名字/颜色派生主题
  const { data: courses } = useCourses()
  const theme = useMemo(() => {
    const builtin = SUBJECT_THEMES[subject ?? '']
    if (builtin) return builtin
    const course = courses?.find((c) => c.slug === subject)
    if (course) return deriveSubjectTheme(course.name, course.emoji, course.colorHex)
    return SUBJECT_THEMES.math
  }, [subject, courses])

  // 查询数据：知识点列表 + 学习记录（不依赖评测结果）
  const { data: knowledgeNodes, isLoading: isLoadingNodes } = useKnowledgeNodesBySubject(subject as Subject | undefined)
  const { data: masteryRecords } = useMasteryRecords(childId)

  // 查询课时完成情况
  const { data: classroomHistory } = useQuery({
    queryKey: ['classroom-history-lessons', childId, subject],
    queryFn: async () => {
      if (!childId) return []
      return apiClient.get<{ knowledgeNodeId: string; lessonIndex: number }>('/classroom_history', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          ...(subject ? [{ column: 'subject', operator: 'eq' as const, value: subject }] : []),
        ],
        select: 'knowledge_node_id,lesson_index',
      })
    },
    enabled: !!childId,
  })

  // 查询课堂缓存元数据（哪些课时已生成）
  const { data: cacheEntries } = useQuery({
    queryKey: ['classroom-cache-meta', childId, subject],
    queryFn: async () => {
      if (!childId) return []
      return apiClient.get<{ knowledgeNodeId: string; lessonIndex: number }>('/classroom_cache', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
        ],
        select: 'knowledge_node_id,lesson_index',
      })
    },
    enabled: !!childId,
  })

  // 查询活跃的生成任务（pending/running）
  const { data: activeTasks } = useQuery({
    queryKey: ['generation-tasks-active', childId],
    queryFn: async () => {
      if (!childId) return []
      return apiClient.get<{ knowledgeNodeId: string; lessonIndex: number; status: string }>('/generation_tasks', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'status', operator: 'in', value: ['pending', 'running'] },
        ],
        select: 'knowledge_node_id,lesson_index,status',
      })
    },
    enabled: !!childId,
    refetchInterval: 5000,
  })

  // 查询每个知识点的课时计划（课程名称）
  const { data: lessonPlans } = useQuery({
    queryKey: ['knowledge-node-lessons', subject],
    queryFn: async () => {
      if (!knowledgeNodes?.length) return []
      const nodeIds = knowledgeNodes.map(n => n.id).filter(Boolean) as string[]
      if (nodeIds.length === 0) return []
      return apiClient.get<{ knowledgeNodeId: string; lessonIndex: number; title: string; description: string }>('/knowledge_node_lessons', {
        filters: [
          { column: 'knowledgeNodeId', operator: 'in', value: nodeIds },
        ],
        select: 'knowledge_node_id,lesson_index,title,description',
        order: [{ column: 'lessonIndex', ascending: true }],
      })
    },
    enabled: !!knowledgeNodes?.length,
  })

  // 课时计划映射：knowledgeNodeId → LessonInfo[]
  const lessonPlanMap = useMemo(() => {
    const m = new Map<string, Array<{ lessonIndex: number; title: string; description: string }>>()
    if (!lessonPlans) return m
    for (const lp of lessonPlans) {
      if (!m.has(lp.knowledgeNodeId)) m.set(lp.knowledgeNodeId, [])
      m.get(lp.knowledgeNodeId)!.push({
        lessonIndex: lp.lessonIndex,
        title: lp.title,
        description: lp.description,
      })
    }
    return m
  }, [lessonPlans])

  // 学习记录映射：knowledgeNodeId → masteryLevel
  const masteryMap = useMemo(() => {
    if (!masteryRecords) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const rec of masteryRecords) {
      m.set(rec.knowledgeNodeId, rec.masteryLevel)
    }
    return m
  }, [masteryRecords])

  // 课时完成映射：knowledgeNodeId → Set<completedLessonIndex>
  const lessonCompletionMap = useMemo(() => {
    const m = new Map<string, Set<number>>()
    if (!classroomHistory) return m
    for (const h of classroomHistory) {
      if (!m.has(h.knowledgeNodeId)) m.set(h.knowledgeNodeId, new Set())
      m.get(h.knowledgeNodeId)!.add(h.lessonIndex)
    }
    return m
  }, [classroomHistory])

  // 缓存映射：`${knowledgeNodeId}:${lessonIndex}` → true
  const cacheSet = useMemo(() => {
    const s = new Set<string>()
    if (!cacheEntries) return s
    for (const e of cacheEntries) s.add(`${e.knowledgeNodeId}:${e.lessonIndex}`)
    return s
  }, [cacheEntries])

  // 活跃任务映射：`${knowledgeNodeId}:${lessonIndex}` → status
  const activeTaskMap = useMemo(() => {
    const m = new Map<string, string>()
    if (!activeTasks) return m
    for (const t of activeTasks) m.set(`${t.knowledgeNodeId}:${t.lessonIndex}`, t.status)
    return m
  }, [activeTasks])

  // 基于课时完成度判定状态：全部完成→已掌握 | 部分完成→学习中 | 0→未学习
  const { nodesWithStatus, masteredCount, learningCount, notStartedCount } = useMemo(() => {
    if (!knowledgeNodes) return { nodesWithStatus: [], masteredCount: 0, learningCount: 0, notStartedCount: 0 }

    let mastered = 0
    let learning = 0
    let notStarted = 0

    const nodes: NodeWithStatus[] = knowledgeNodes.map((node) => {
      const nodeId = node.id ?? ''
      const level = masteryMap.get(nodeId)
      const totalLessons = node.totalLessons ?? 0
      const completedSet = lessonCompletionMap.get(nodeId)
      const completedLessons = completedSet?.size ?? 0

      const planLessons = lessonPlanMap.get(nodeId)
      const lessons: LessonDetail[] | undefined = planLessons?.map(lp => {
        const isCompleted = completedSet?.has(lp.lessonIndex) ?? false
        const key = `${nodeId}:${lp.lessonIndex}`
        let cacheStatus: LessonCacheStatus = 'not_generated'
        if (isCompleted) cacheStatus = 'completed'
        else if (cacheSet.has(key)) cacheStatus = 'cached'
        else if (activeTaskMap.has(key)) cacheStatus = activeTaskMap.get(key) === 'running' ? 'generating' : 'pending_gen'
        return {
          lessonIndex: lp.lessonIndex,
          title: lp.title,
          description: lp.description,
          completed: isCompleted,
          cacheStatus,
        }
      })

      if (totalLessons > 0) {
        if (completedLessons >= totalLessons) {
          mastered++
          return { node, status: 'mastered' as NodeStatus, masteryLevel: level ?? 100, completedLessons, totalLessons, lessons }
        }
        if (completedLessons > 0) {
          learning++
          return { node, status: 'learning' as NodeStatus, masteryLevel: level ?? Math.round((completedLessons / totalLessons) * 100), completedLessons, totalLessons, lessons }
        }
        notStarted++
        return { node, status: 'not_started' as NodeStatus, completedLessons: 0, totalLessons, lessons }
      }

      if (level != null && level >= 80) {
        mastered++
        return { node, status: 'mastered' as NodeStatus, masteryLevel: level }
      }
      if (level != null) {
        learning++
        return { node, status: 'learning' as NodeStatus, masteryLevel: level }
      }
      notStarted++
      return { node, status: 'not_started' as NodeStatus }
    })

    return { nodesWithStatus: nodes, masteredCount: mastered, learningCount: learning, notStartedCount: notStarted }
  }, [knowledgeNodes, masteryMap, lessonCompletionMap, lessonPlanMap, cacheSet, activeTaskMap])

  const totalCount = nodesWithStatus.length
  const progressPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bgGradient,
      paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
      {/* ═══════════════════════════════════
         顶部导航栏
         ═══════════════════════════════════ */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              backgroundColor: theme.iconBg,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <BackArrowIcon color={theme.color} />
          </motion.button>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: T.fontDisplay,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.color,
            }}>
              {theme.emoji} {theme.label}学习情况
            </div>
          </div>

          {/* 学习进度圆形指示器 */}
          <div style={{
            position: 'relative',
            width: '44px',
            height: '44px',
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="#E8ECF2" strokeWidth="4" />
              <motion.circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke={theme.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - progressPercent / 100) }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <span style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.fontDisplay,
              fontSize: '12px',
              fontWeight: 700,
              color: theme.color,
            }}>
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        {/* ═══════════════════════════════════
           统计概览卡片
           ═══════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            marginTop: '16px',
            background: theme.bg,
            borderRadius: T.cardRadius,
            padding: '24px',
            boxShadow: `0 8px 28px ${theme.shadow}`,
          }}
        >
          {/* 大字展示 */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            marginBottom: '16px',
          }}>
            <span style={{
              fontFamily: T.fontDisplay,
              fontSize: '42px',
              fontWeight: 800,
              color: theme.color,
              lineHeight: 1,
            }}>
              {masteredCount}
            </span>
            <span style={{
              fontFamily: T.fontBody,
              fontSize: '16px',
              color: T.textMedium,
            }}>
              / {totalCount} 个知识点已掌握
            </span>
          </div>

          {/* 进度条 */}
          <div style={{
            height: '10px',
            borderRadius: '5px',
            backgroundColor: 'rgba(255,255,255,0.6)',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              style={{
                height: '100%',
                borderRadius: '5px',
                background: `linear-gradient(90deg, ${theme.color}, ${theme.color}CC)`,
              }}
            />
          </div>

          {/* 三个指标 */}
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <StatBadge
              icon="⭐"
              label="已掌握"
              count={masteredCount}
              bgColor={T.successBg}
              textColor={T.successGreen}
            />
            <StatBadge
              icon="📖"
              label="学习中"
              count={learningCount}
              bgColor={T.warningBg}
              textColor={T.warningAmber}
            />
            <StatBadge
              icon="💤"
              label="未学习"
              count={notStartedCount}
              bgColor="#F8F9FC"
              textColor={T.textLight}
            />
          </div>
        </motion.div>

        {/* ═══════════════════════════════════
           知识点列表
           ═══════════════════════════════════ */}
        <AnimatePresence>
          {isLoadingNodes ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '48px 0',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{
                  width: '36px',
                  height: '36px',
                  border: `3px solid ${theme.color}30`,
                  borderTopColor: theme.color,
                  borderRadius: '50%',
                }}
              />
              <span style={{
                fontFamily: T.fontBody,
                fontSize: '14px',
                color: T.textLight,
              }}>
                加载知识点中...
              </span>
            </motion.div>
          ) : nodesWithStatus.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '48px 0',
              }}
            >
              <span style={{ fontSize: '48px' }}>📚</span>
              <span style={{
                fontFamily: T.fontBody,
                fontSize: '15px',
                color: T.textLight,
              }}>
                暂无知识点数据
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="nodes-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '16px 0',
              }}
            >
              {/* 分组标题：已掌握 */}
              {masteredCount > 0 && (
                <>
                  <SectionHeader
                    icon="⭐"
                    title={`已掌握 · ${masteredCount}`}
                    color={T.successGreen}
                  />
                  {nodesWithStatus
                    .filter((n) => n.status === 'mastered')
                    .map((item) => (
                      <KnowledgeNodeCard
                        key={item.node.id}
                        item={item}
                        themeColor={theme.color}
                      />
                    ))}
                </>
              )}

              {/* 分组标题：学习中 */}
              {learningCount > 0 && (
                <>
                  <SectionHeader
                    icon="📖"
                    title={`学习中 · ${learningCount}`}
                    color={T.warningAmber}
                    marginTop={masteredCount > 0}
                  />
                  {nodesWithStatus
                    .filter((n) => n.status === 'learning')
                    .map((item) => (
                      <KnowledgeNodeCard
                        key={item.node.id}
                        item={item}
                        themeColor={theme.color}
                      />
                    ))}
                </>
              )}

              {/* 分组标题：未学习 */}
              {notStartedCount > 0 && (
                <>
                  <SectionHeader
                    icon="💤"
                    title={`未学习 · ${notStartedCount}`}
                    color={T.textLight}
                    marginTop={masteredCount > 0 || learningCount > 0}
                  />
                  {nodesWithStatus
                    .filter((n) => n.status === 'not_started')
                    .map((item) => (
                      <KnowledgeNodeCard
                        key={item.node.id}
                        item={item}
                        themeColor={theme.color}
                      />
                    ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   子组件
   ═══════════════════════════════════════════ */

/** 统计徽章 */
function StatBadge({
  icon,
  label,
  count,
  bgColor,
  textColor,
}: {
  icon: string
  label: string
  count: number
  bgColor: string
  textColor: string
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 12px',
      borderRadius: '16px',
      backgroundColor: bgColor,
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontFamily: T.fontDisplay,
          fontSize: '18px',
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.2,
        }}>
          {count}
        </span>
        <span style={{
          fontFamily: T.fontBody,
          fontSize: '11px',
          color: T.textLight,
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/** 分组标题 */
function SectionHeader({
  icon,
  title,
  color,
  marginTop = false,
}: {
  icon: string
  title: string
  color: string
  marginTop?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        marginTop: marginTop ? '8px' : 0,
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{
        fontFamily: T.fontDisplay,
        fontSize: '15px',
        fontWeight: 700,
        color,
      }}>
        {title}
      </span>
      <div style={{
        flex: 1,
        height: '1px',
        background: `linear-gradient(90deg, ${color}40, transparent)`,
      }} />
    </motion.div>
  )
}

/** 知识点卡片（可展开查看课程列表） */
function KnowledgeNodeCard({
  item,
  themeColor,
}: {
  item: NodeWithStatus
  themeColor: string
}) {
  const { node, status, masteryLevel, completedLessons, totalLessons, lessons } = item
  const cfg = getStatusConfig(status, themeColor)
  const hasLessonPlan = totalLessons != null && totalLessons > 0
  const hasLessons = lessons && lessons.length > 0
  const [expanded, setExpanded] = useState(false)

  const difficultyStars = Math.max(1, Math.min(5, Math.ceil(node.difficulty / 2)))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        borderRadius: '20px',
        backgroundColor: T.cardBg,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
        borderLeft: `4px solid ${cfg.borderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* 主行（可点击展开） */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        onClick={hasLessons ? () => setExpanded(e => !e) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '14px 16px',
          cursor: hasLessons ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* 状态图标 */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '14px',
          backgroundColor: cfg.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '20px',
        }}>
          {cfg.icon}
        </div>

        {/* 知识点信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.fontDisplay,
            fontSize: '15px',
            fontWeight: 600,
            color: T.textDark,
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.name}
          </div>

          {node.description && (
            <div style={{
              fontFamily: T.fontBody,
              fontSize: '12px',
              color: T.textLight,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {node.description}
            </div>
          )}

          {/* 课时进度条 */}
          {hasLessonPlan && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '3px',
              }}>
                <div style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: '#F0F2F5',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${totalLessons! > 0 ? ((completedLessons ?? 0) / totalLessons!) * 100 : 0}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: `linear-gradient(90deg, ${cfg.borderColor}, ${cfg.borderColor}CC)`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{
                  fontFamily: T.fontBody,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: cfg.textColor,
                  flexShrink: 0,
                }}>
                  {completedLessons ?? 0}/{totalLessons} 堂课
                </span>
              </div>
            </div>
          )}

          {/* 底部信息行 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{
              fontFamily: T.fontBody,
              fontSize: '11px',
              color: T.textLight,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              难度
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ fontSize: '9px', opacity: i < difficultyStars ? 1 : 0.25 }}>★</span>
              ))}
            </span>

            {!hasLessonPlan && (status === 'mastered' || status === 'learning') && masteryLevel != null && (
              <span style={{ fontFamily: T.fontBody, fontSize: '11px', color: cfg.textColor, fontWeight: 600 }}>
                掌握 {Math.round(masteryLevel)}%
              </span>
            )}
          </div>
        </div>

        {/* 右侧：状态标签 + 展开箭头 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            padding: '4px 10px',
            borderRadius: '10px',
            backgroundColor: cfg.bgColor,
          }}>
            <span style={{ fontFamily: T.fontBody, fontSize: '11px', fontWeight: 600, color: cfg.textColor }}>
              {cfg.label}
            </span>
          </div>
          {hasLessons && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: '14px', color: T.textLight, lineHeight: 1 }}
            >
              ▾
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* 展开的课程列表 */}
      {expanded && hasLessons && (
        <div style={{
          padding: '0 16px 12px 72px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{
            height: '1px',
            backgroundColor: '#F0F2F5',
            marginBottom: '4px',
          }} />
          {lessons!.map((lesson) => {
            const lsCfg = getLessonStatusConfig(lesson.cacheStatus)
            return (
              <div
                key={lesson.lessonIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: lesson.completed ? `${cfg.bgColor}` : '#FAFBFC',
                  transition: 'background-color 0.2s',
                }}
              >
                <span style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  flexShrink: 0,
                  backgroundColor: lesson.completed ? cfg.borderColor : '#E8ECF2',
                  color: lesson.completed ? '#fff' : T.textLight,
                  fontWeight: 700,
                  fontFamily: T.fontBody,
                }}>
                  {lesson.completed ? '✓' : lesson.lessonIndex}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.fontBody,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: lesson.completed ? T.textDark : T.textMedium,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {lesson.title}
                  </div>
                  {lesson.description && (
                    <div style={{
                      fontFamily: T.fontBody,
                      fontSize: '11px',
                      color: T.textLight,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '1px',
                    }}>
                      {lesson.description}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  backgroundColor: lsCfg.bgColor,
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: lsCfg.dot,
                    ...(lesson.cacheStatus === 'generating' ? { animation: 'pulse-dot 1.4s ease-in-out infinite' } : {}),
                  }} />
                  <span style={{
                    fontFamily: T.fontBody,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: lsCfg.textColor,
                    whiteSpace: 'nowrap',
                  }}>
                    {lsCfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
