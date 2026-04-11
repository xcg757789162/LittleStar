/**
 * 入学评测科目选择页面
 * 展示三个科目卡片，用户可以自由选择先测哪个
 * 已完成的科目显示已完成状态
 *
 * 🎨 Sunny Playground 风格 — 暖色渐变、圆润卡片、漂浮云朵装饰
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import type { Subject } from '@/types/models'

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
  subjectColors: {
    math: { main: '#FF8C42', bg: '#FFF3E0', gradient: 'linear-gradient(135deg, #FF8C42, #FFB74D)' },
    chinese: { main: '#2EC4B6', bg: '#E0F7F5', gradient: 'linear-gradient(135deg, #2EC4B6, #4DD0C8)' },
    english: { main: '#5BC0EB', bg: '#E3F2FD', gradient: 'linear-gradient(135deg, #5BC0EB, #81D4FA)' },
  } as Record<Subject, { main: string; bg: string; gradient: string }>,
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

const SUBJECTS: {
  key: Subject
  label: string
  emoji: string
  description: string
}[] = [
  { key: 'math', label: '数学', emoji: '🔢', description: '数字、计算、图形' },
  { key: 'chinese', label: '语文', emoji: '📖', description: '识字、拼音、阅读' },
  { key: 'english', label: '英语', emoji: '🌍', description: '字母、单词、对话' },
]

export function PlacementTestSelectPage() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'

  const { data: placementTests, isLoading, isError, refetch } = usePlacementTests(childId)
  const [completedSubjects, setCompletedSubjects] = useState<Set<Subject>>(new Set())

  useEffect(() => {
    if (placementTests) {
      const timer = setTimeout(() => {
        setCompletedSubjects(new Set(placementTests.map((t) => t.subject as Subject)))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [placementTests])

  const allCompleted = completedSubjects.size >= 3

  // 如果三科都完成了，自动跳转回首页
  useEffect(() => {
    if (allCompleted) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 2000)
      return () => clearTimeout(timer)
    }
  }, [allCompleted, navigate])

  const handleSelectSubject = (subject: Subject) => {
    if (completedSubjects.has(subject)) return
    navigate(`/placement-test/${subject}/${gradeLevel}`)
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
          无法加载评测记录，请检查 Docker 后端服务是否正在运行
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
          选择你想先测试的科目
        </h1>
        <p style={{ fontSize: '14px', color: T.textMid, textAlign: 'center', fontFamily: T.fontBody }}>
          每个科目只需几分钟 ☺️
        </p>

        {/* 进度指示器 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          {SUBJECTS.map((s) => {
            const done = completedSubjects.has(s.key)
            const sc = T.subjectColors[s.key]
            return (
              <motion.div
                key={s.key}
                animate={done ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: done ? sc.gradient : `${sc.main}22`,
                  border: `2px solid ${done ? sc.main : `${sc.main}44`}`,
                  transition: 'all 0.3s ease',
                }}
              />
            )
          })}
        </div>
        <p style={{ fontSize: '12px', color: T.textLight, fontFamily: T.fontBody }}>
          已完成 {completedSubjects.size} / 3 科
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
              三科评测都完成啦！
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
          {SUBJECTS.map((subject, index) => {
            const isCompleted = completedSubjects.has(subject.key)
            const sc = T.subjectColors[subject.key]
            return (
              <motion.button
                key={subject.key}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, type: 'spring', stiffness: 300 }}
                whileTap={isCompleted ? {} : { scale: 0.97 }}
                whileHover={isCompleted ? {} : { scale: 1.02, y: -2 }}
                onClick={() => handleSelectSubject(subject.key)}
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
                  {isCompleted ? '✅' : subject.emoji}
                </div>

                {/* 文字内容 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '20px', fontWeight: 'bold', fontFamily: T.font,
                    color: isCompleted ? T.textLight : T.textDark, marginBottom: '4px',
                  }}>
                    {subject.label}
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
                  }}>
                    {subject.description}
                  </div>
                </div>

                {/* 箭头 */}
                {!isCompleted && (
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: '20px', color: sc.main, opacity: 0.7 }}
                  >
                    →
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
