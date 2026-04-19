/**
 * 入学评测科目选择页面
 *
 * 完全基于用户当前的 ready 课程列表（`api.courses` where status='ready'）动态渲染：
 * - 系统预置的语/数/英 与用户热拔插创建的动态课程完全平等对待
 * - 已完成测评的课程显示已完成状态
 * - 尚在 initializing 的课程展示"准备中"提示（不可选）
 * - 所有 ready 课程都测过 → 自动回首页
 *
 * 🎨 Sunny Playground 风格 — 暖色渐变、圆润卡片、漂浮云朵装饰
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import { useCourses } from '@/hooks/queries/useCourses'
import type { Subject } from '@/types/models'
import type { Course } from '@/types/course'

/* ====== 设计 Token ====== */
const T = {
  bg: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  font: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', sans-serif",
  sunOrange: '#FF8C42',
  candyPink: '#FF6B8A',
  grassGreen: '#2EC4B6',
  skyBlue: '#5BC0EB',
  starGold: '#FFD166',
  textDark: '#4A3728',
  textMid: '#8B7355',
  textLight: '#B8A088',
  cardBg: 'rgba(255,255,255,0.85)',
  radius: '20px',
}

/** 预置课程的精调颜色 —— 保留原有的视觉记忆 */
const BUILTIN_SUBJECT_COLORS: Record<string, { main: string; bg: string; gradient: string }> = {
  math: { main: '#FF8C42', bg: '#FFF3E0', gradient: 'linear-gradient(135deg, #FF8C42, #FFB74D)' },
  chinese: { main: '#2EC4B6', bg: '#E0F7F5', gradient: 'linear-gradient(135deg, #2EC4B6, #4DD0C8)' },
  english: { main: '#5BC0EB', bg: '#E3F2FD', gradient: 'linear-gradient(135deg, #5BC0EB, #81D4FA)' },
}

/** 十六进制色 → 卡片主题（用于动态课程的配色自动派生） */
function deriveThemeFromHex(hex: string): { main: string; bg: string; gradient: string } {
  const match = /^#?([0-9a-fA-F]{6})$/.exec((hex || '').trim())
  const clean = match ? match[1] : 'f4b66b' // 兜底暖色
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const main = `#${clean}`
  return {
    main,
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    gradient: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 1), rgba(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)}, 1))`,
  }
}

/** 课程描述的兜底：如果是预置课程用老文案，动态课程则用 AI 给的 emoji + name */
const BUILTIN_DESCRIPTIONS: Record<string, string> = {
  math: '数字、计算、图形',
  chinese: '识字、拼音、阅读',
  english: '字母、单词、对话',
}

interface SubjectCard {
  slug: string
  label: string
  emoji: string
  description: string
  theme: { main: string; bg: string; gradient: string }
}

/** 把 Course 列表（ready）转成选择页要展示的卡片 */
function buildCards(courses: Course[]): SubjectCard[] {
  return courses
    .filter((c) => c.status === 'ready')
    .map((c) => {
      const theme = BUILTIN_SUBJECT_COLORS[c.slug] ?? deriveThemeFromHex(c.colorHex)
      const description = BUILTIN_DESCRIPTIONS[c.slug] ?? (c.isSystem ? '开始探索吧' : `由 AI 老师为你打造的专属课程`)
      return {
        slug: c.slug,
        label: c.name,
        emoji: c.emoji || '✨',
        description,
        theme,
      }
    })
}

/* ====== 装饰组件 ====== */
function Cloud({ top, left, size = 60, delay = 0 }: { top: string; left: string; size?: number; delay?: number }) {
  return (
    <motion.svg
      width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none"
      style={{ position: 'absolute', top, left, opacity: 0.25, zIndex: 0 }}
      animate={{ x: [0, 15, 0] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <ellipse cx="50" cy="38" rx="40" ry="20" fill="#FFD166" />
      <ellipse cx="35" cy="28" rx="22" ry="18" fill="#FFD166" />
      <ellipse cx="65" cy="26" rx="24" ry="20" fill="#FFD166" />
    </motion.svg>
  )
}

function Sparkle({ top, left, delay = 0 }: { top: string; left: string; delay?: number }) {
  return (
    <motion.div
      style={{ position: 'absolute', top, left, fontSize: '16px', zIndex: 0 }}
      animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 3, repeat: Infinity, delay }}
    >
      ✦
    </motion.div>
  )
}

export function PlacementTestSelectPage() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const { data: placementTests, isLoading: testsLoading, isError: testsError, refetch } = usePlacementTests(childId)
  const { data: allCourses, isLoading: coursesLoading, isError: coursesError } = useCourses()

  const isLoading = testsLoading || coursesLoading
  const isError = testsError || coursesError

  const cards = useMemo<SubjectCard[]>(
    () => buildCards(allCourses ?? []),
    [allCourses],
  )

  // 正在初始化中的课程数（仅做状态提示，不做卡片点击）
  const initializingCount = useMemo(
    () => (allCourses ?? []).filter((c) => c.status === 'initializing').length,
    [allCourses],
  )

  const [completedSubjects, setCompletedSubjects] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (placementTests) {
      setCompletedSubjects(new Set(placementTests.map((t) => t.subject)))
    }
  }, [placementTests])

  const total = cards.length
  const completedCount = cards.filter((c) => completedSubjects.has(c.slug)).length
  const allCompleted = total > 0 && completedCount === total

  // 所有 ready 课程都测完了 → 自动回首页
  useEffect(() => {
    if (allCompleted) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 2000)
      return () => clearTimeout(timer)
    }
  }, [allCompleted, navigate])

  const handleSelectSubject = (slug: string) => {
    if (completedSubjects.has(slug)) return
    navigate(`/placement-test/${slug}`)
  }

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.bg, fontFamily: T.font,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '56px' }}
        >
          🌟
        </motion.div>
      </div>
    )
  }

  /* ---------- Error ---------- */
  if (isError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: T.bg, padding: '24px', gap: '16px', fontFamily: T.font,
      }}>
        <div style={{ fontSize: '64px' }}>😥</div>
        <h2 style={{ fontSize: '20px', color: '#D32F2F', fontWeight: 'bold', fontFamily: T.font }}>
          后端服务连接失败
        </h2>
        <p style={{
          fontSize: '14px', color: T.textLight, textAlign: 'center',
          maxWidth: '320px', fontFamily: T.fontBody,
        }}>
          无法加载课程或评测记录，请检查后端服务是否正在运行
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => refetch()}
            style={{
              padding: '14px 36px', borderRadius: T.radius, border: 'none',
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              color: 'white', fontSize: '16px', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: T.font,
              boxShadow: `0 4px 16px ${T.sunOrange}44`,
            }}
          >
            🔄 重试
          </motion.button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 24px', borderRadius: T.radius,
              border: `2px solid ${T.sunOrange}33`, backgroundColor: 'transparent',
              color: T.textMid, fontSize: '14px', cursor: 'pointer', fontFamily: T.fontBody,
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  /* ---------- Empty state: 用户一门 ready 课程都没有 ---------- */
  if (total === 0) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: T.bg, padding: '24px', gap: '16px', fontFamily: T.font,
        position: 'relative', overflow: 'hidden',
      }}>
        <Cloud top="10%" left="5%" size={70} delay={0} />
        <Cloud top="15%" left="75%" size={50} delay={2} />
        <div style={{ fontSize: '64px' }}>🌱</div>
        <h2 style={{ fontSize: '22px', color: T.textDark, fontWeight: 'bold', fontFamily: T.font, textAlign: 'center' }}>
          还没有可以测评的课程
        </h2>
        <p style={{
          fontSize: '14px', color: T.textMid, textAlign: 'center',
          maxWidth: '340px', fontFamily: T.fontBody, lineHeight: 1.6,
        }}>
          {initializingCount > 0
            ? `有 ${initializingCount} 门课程正在由 AI 老师准备中，稍等片刻就可以开始评测啦 ✨`
            : '去"知识"页创建一门你想学的课程吧 ✨'}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/knowledge')}
            style={{
              padding: '14px 36px', borderRadius: T.radius, border: 'none',
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              color: 'white', fontSize: '16px', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: T.font,
              boxShadow: `0 4px 16px ${T.sunOrange}44`,
            }}
          >
            ✨ 去创建课程
          </motion.button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 24px', borderRadius: T.radius,
              border: `2px solid ${T.sunOrange}33`, backgroundColor: 'transparent',
              color: T.textMid, fontSize: '14px', cursor: 'pointer', fontFamily: T.fontBody,
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  /* ---------- Main ---------- */
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', background: T.bg, padding: '24px', paddingTop: '48px',
      fontFamily: T.font, position: 'relative', overflow: 'hidden',
    }}>
      {/* 漂浮装饰 */}
      <Cloud top="5%" left="3%" size={70} delay={0} />
      <Cloud top="12%" left="75%" size={50} delay={2} />
      <Sparkle top="8%" left="60%" delay={0.5} />
      <Sparkle top="18%" left="15%" delay={1.5} />
      <Sparkle top="30%" left="85%" delay={2.5} />

      {/* 返回按钮 */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
        style={{
          alignSelf: 'flex-start', padding: '8px 16px', fontSize: '14px',
          color: T.textMid, backgroundColor: T.cardBg, border: 'none',
          cursor: 'pointer', marginBottom: '16px', borderRadius: '14px',
          fontFamily: T.fontBody, position: 'relative', zIndex: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        ← 返回首页
      </motion.button>

      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '8px', marginBottom: '32px', position: 'relative', zIndex: 1,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: '60px' }}
        >
          🌟
        </motion.div>
        <h1 style={{
          fontSize: '26px', fontWeight: 'bold', textAlign: 'center',
          fontFamily: T.font, margin: 0,
          background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          选择你想先测评的课程
        </h1>
        <p style={{ fontSize: '14px', color: T.textMid, textAlign: 'center', fontFamily: T.fontBody }}>
          每门课只需几分钟 ☺️
        </p>

        {/* 进度指示器：动态数量 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '280px' }}>
          {cards.map((c) => {
            const done = completedSubjects.has(c.slug)
            return (
              <motion.div
                key={c.slug}
                animate={done ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: done ? c.theme.gradient : `${c.theme.main}22`,
                  border: `2px solid ${done ? c.theme.main : `${c.theme.main}44`}`,
                  transition: 'all 0.3s ease',
                }}
              />
            )
          })}
        </div>
        <p style={{ fontSize: '12px', color: T.textLight, fontFamily: T.fontBody }}>
          已完成 {completedCount} / {total} 门
          {initializingCount > 0 && (
            <span style={{ marginLeft: '8px', color: T.candyPink }}>
              · 还有 {initializingCount} 门在准备中
            </span>
          )}
        </p>
      </motion.div>

      {/* 全部完成提示 */}
      <AnimatePresence>
        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '12px', padding: '32px', position: 'relative', zIndex: 1,
              background: T.cardBg, borderRadius: T.radius,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '60px' }}>🎉</div>
            <h2 style={{
              fontSize: '22px', fontWeight: 'bold', fontFamily: T.font,
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              所有课程评测都完成啦！
            </h2>
            <p style={{ fontSize: '14px', color: T.textMid, fontFamily: T.fontBody }}>
              正在跳转到首页...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 科目卡片列表 */}
      {!allCompleted && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1,
        }}>
          {cards.map((card, index) => {
            const isCompleted = completedSubjects.has(card.slug)
            const sc = card.theme
            return (
              <motion.button
                key={card.slug}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
                whileTap={isCompleted ? {} : { scale: 0.97 }}
                whileHover={isCompleted ? {} : { scale: 1.02, y: -2 }}
                onClick={() => handleSelectSubject(card.slug)}
                disabled={isCompleted}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '20px 24px', borderRadius: T.radius,
                  border: isCompleted ? '2px solid #E8E0D8' : `2px solid ${sc.main}55`,
                  backgroundColor: isCompleted ? '#F5F0EB' : sc.bg,
                  cursor: isCompleted ? 'default' : 'pointer',
                  opacity: isCompleted ? 0.6 : 1,
                  boxShadow: isCompleted ? 'none' : `0 6px 20px ${sc.main}25`,
                  position: 'relative', overflow: 'hidden', textAlign: 'left',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {/* Emoji 图标容器 */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: isCompleted ? '#E8E0D8' : sc.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', flexShrink: 0,
                  boxShadow: isCompleted ? 'none' : `0 4px 12px ${sc.main}33`,
                }}>
                  {isCompleted ? '✅' : card.emoji}
                </div>

                {/* 文字内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '20px', fontWeight: 'bold', fontFamily: T.font,
                    color: isCompleted ? T.textLight : T.textDark, marginBottom: '4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {card.label}
                    {isCompleted && (
                      <span style={{
                        fontSize: '12px', fontWeight: 'normal', fontFamily: T.fontBody,
                        color: T.grassGreen, marginLeft: '8px',
                      }}>
                        已完成
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '13px', fontFamily: T.fontBody,
                    color: isCompleted ? T.textLight : T.textMid,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {card.description}
                  </div>
                </div>

                {/* 箭头 */}
                {!isCompleted && (
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: '20px', color: sc.main, opacity: 0.7, flexShrink: 0 }}
                  >
                    →
                  </motion.div>
                )}
              </motion.button>
            )
          })}

          {/* initializing 提示 */}
          {initializingCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '14px 16px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.7)',
                border: `2px dashed ${T.candyPink}55`,
                fontSize: '13px', color: T.textMid, fontFamily: T.fontBody,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block', fontSize: '18px' }}
              >
                🔥
              </motion.span>
              还有 {initializingCount} 门课正在由 AI 老师烧制中，完成后就会出现在这里
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// 兼容旧引用：某些测试/类型可能用到 Subject 别名，这里不做额外导出。
export type { Subject }
