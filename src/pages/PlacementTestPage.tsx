/**
 * 入学测评页面（增强版）
 * 引导动画 + CAT 自适应答题 + 星星进度 + 庆祝动画 + 图形化结果
 *
 * 🎨 Sunny Playground 风格 — 暖色渐变、圆润卡片、漂浮装饰
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePlacementTest } from '@/hooks/usePlacementTest'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import { GRADE_LABELS } from '@/types/grades'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'

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

/* ====== 装饰 ====== */
function Cloud({ top, left, size = 60, delay = 0 }: { top: string; left: string; size?: number; delay?: number }) {
  return (
    <motion.svg
      width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none"
      style={{ position: 'absolute', top, left, opacity: 0.2, zIndex: 0 }}
      animate={{ x: [0, 12, 0] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <ellipse cx="50" cy="38" rx="40" ry="20" fill="#FFD166" />
      <ellipse cx="35" cy="28" rx="22" ry="18" fill="#FFD166" />
      <ellipse cx="65" cy="26" rx="24" ry="20" fill="#FFD166" />
    </motion.svg>
  )
}

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

interface PlacementTestPageProps {
  subject: Subject
  gradeLevel: GradeLevel
  onComplete: (result: PlacementResult) => void
  onExit: () => void
}

/** 星星进度指示器 */
function StarProgress({ progress, total }: { progress: number; total: number }) {
  const starCount = Math.max(total, 5)
  const filledCount = Math.round(progress * starCount)

  return (
    <div
      data-testid="star-progress"
      style={{
        display: 'flex', gap: '4px', justifyContent: 'center',
        flexWrap: 'wrap', padding: '8px 0',
      }}
    >
      {Array.from({ length: Math.min(starCount, 15) }, (_, i) => (
        <motion.span
          key={i}
          initial={i === filledCount - 1 ? { scale: 0 } : {}}
          animate={i === filledCount - 1 ? { scale: [0, 1.4, 1] } : {}}
          transition={{ duration: 0.4, type: 'spring' }}
          style={{
            fontSize: '24px',
            filter: i < filledCount ? 'none' : 'grayscale(1) opacity(0.3)',
            transition: 'filter 0.3s ease',
          }}
        >
          ⭐
        </motion.span>
      ))}
    </div>
  )
}

/** 图形化级别展示（星星填充） */
function LevelDisplay({ level }: { level: number }) {
  const labels = ['初学者', '小火苗', '小星星', '超级星', '星辰守护者']
  const emojis = ['🌱', '🔥', '⭐', '🌟', '💫']

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', padding: '24px',
        backgroundColor: T.cardBg, borderRadius: T.radius,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        border: `2px solid ${T.starGold}44`,
      }}
    >
      <div style={{ fontSize: '56px' }}>{emojis[level - 1] ?? '🌱'}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.15 }}
            style={{
              fontSize: '28px',
              filter: i < level ? 'none' : 'grayscale(1) opacity(0.2)',
            }}
          >
            ⭐
          </motion.span>
        ))}
      </div>
      <span style={{
        fontSize: '18px', fontWeight: 'bold', fontFamily: T.font,
        background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {labels[level - 1] ?? '初学者'}
      </span>
    </motion.div>
  )
}

export function PlacementTestPage({
  subject,
  gradeLevel,
  onComplete,
  onExit,
}: PlacementTestPageProps) {
  const {
    phase,
    currentQuestion,
    progress,
    totalQuestions,
    lastFeedback,
    result,
    recommendedLevel,
    isLoading,
    errorMessage,
    startTest,
    submitAnswer,
    dismissFeedback,
    finishAndNavigate,
  } = usePlacementTest(subject, gradeLevel, onComplete)

  const { playCorrect, playWrong, playCelebration, playStar } = useSoundEffects()

  // 庆祝/鼓励动画状态
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [celebrationLevel, setCelebrationLevel] = useState<CelebrationLevel>('normal')

  // 引导动画自动过渡
  const [introStep, setIntroStep] = useState(0)

  useEffect(() => {
    if (phase !== 'intro') return
    const timer1 = setTimeout(() => setIntroStep(1), 800)
    const timer2 = setTimeout(() => setIntroStep(2), 2000)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [phase])

  // 结果页自动跳转
  useEffect(() => {
    if (phase !== 'result' || !result) return
    playCelebration()
    const timer = setTimeout(finishAndNavigate, 5000)
    return () => clearTimeout(timer)
  }, [phase, result, finishAndNavigate, playCelebration])

  // 处理答题反馈显示
  useEffect(() => {
    if (!lastFeedback) return

    if (lastFeedback.isCorrect) {
      playCorrect()
      const timer = setTimeout(() => {
        if (lastFeedback.consecutiveCorrect >= 5) {
          setCelebrationLevel('streak5')
        } else if (lastFeedback.consecutiveCorrect >= 3) {
          setCelebrationLevel('streak3')
        } else {
          setCelebrationLevel('normal')
        }
        setShowCelebration(true)
      }, 0)
      playStar()
      return () => clearTimeout(timer)
    } else {
      playWrong()
      const timer = setTimeout(() => {
        setShowEncouragement(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [lastFeedback, playCorrect, playWrong, playStar])

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false)
    dismissFeedback()
  }, [dismissFeedback])

  const handleEncouragementComplete = useCallback(() => {
    setShowEncouragement(false)
    dismissFeedback()
  }, [dismissFeedback])

  const gradeName = GRADE_LABELS[gradeLevel]
  const subjectName = SUBJECT_LABELS[subject]

  return (
    <div
      data-testid="placement-test-page"
      style={{
        padding: '24px', maxWidth: '500px', margin: '0 auto',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        background: T.bg, fontFamily: T.font, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* 漂浮装饰 */}
      <Cloud top="3%" left="2%" size={65} delay={0} />
      <Cloud top="60%" left="80%" size={50} delay={3} />

      {/* 退出按钮 */}
      <motion.button
        data-testid="exit-test-btn"
        whileTap={{ scale: 0.95 }}
        onClick={onExit}
        style={{
          alignSelf: 'flex-end', padding: '8px 16px', fontSize: '14px',
          color: T.textMid, backgroundColor: T.cardBg, border: 'none',
          cursor: 'pointer', borderRadius: '14px', fontFamily: T.fontBody,
          position: 'relative', zIndex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        ✕ 退出
      </motion.button>

      {/* 引导动画阶段 */}
      {phase === 'intro' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <AnimatePresence mode="wait">
            {introStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ fontSize: '100px' }}
              >
                🌟
              </motion.div>
            )}
            {introStep >= 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '16px',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ fontSize: '80px' }}
                >
                  🌟
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    fontSize: '26px', fontWeight: 'bold', fontFamily: T.font,
                    background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}
                >
                  小星老师要了解一下你哦！
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    fontSize: '16px', color: T.textMid, marginBottom: '8px',
                    fontFamily: T.fontBody,
                  }}
                >
                  {subjectName} · {gradeName}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {introStep >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '12px', marginTop: '24px',
              }}
            >
              <p style={{ fontSize: '14px', color: T.textMid, fontFamily: T.fontBody }}>
                只需要几分钟，轻轻松松就好 ☺️
              </p>
              <motion.button
                data-testid="start-test-btn"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={startTest}
                disabled={isLoading}
                style={{
                  padding: '20px 56px', fontSize: '22px', fontWeight: 700,
                  color: '#fff',
                  background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                  border: 'none', borderRadius: '24px', cursor: 'pointer',
                  boxShadow: `0 6px 24px ${T.sunOrange}55`,
                  minWidth: '200px', minHeight: '64px', fontFamily: T.font,
                }}
              >
                {isLoading ? '准备中...' : '🚀 开始吧！'}
              </motion.button>
            </motion.div>
          )}
        </div>
      )}

      {/* 答题界面 */}
      {phase === 'testing' && (
        <div data-testid="test-question-area" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {/* 星星进度指示器 */}
          <div data-testid="test-progress" style={{ marginBottom: '24px' }}>
            <StarProgress progress={progress} total={totalQuestions} />
            {/* 进度条 */}
            <div style={{
              height: '8px', backgroundColor: `${T.sunOrange}15`,
              borderRadius: '4px', overflow: 'hidden', marginTop: '8px',
            }}>
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: '4px',
                  background: `linear-gradient(90deg, ${T.sunOrange}, ${T.starGold})`,
                }}
              />
            </div>
          </div>

          {/* 当前题目 */}
          {currentQuestion && !lastFeedback && (
            <motion.div
              key={currentQuestion.nodeId}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center', padding: '32px 16px' }}
            >
              <h2 style={{
                fontSize: '22px', color: T.textDark, marginBottom: '12px',
                fontWeight: 'bold', fontFamily: T.font,
              }}>
                {currentQuestion.nodeName}
              </h2>
              <p style={{
                fontSize: '14px', color: T.textMid, marginBottom: '40px',
                fontFamily: T.fontBody,
              }}>
                请选择你的答案
              </p>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '16px',
                maxWidth: '320px', margin: '0 auto',
              }}>
                <motion.button
                  data-testid="answer-correct"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => submitAnswer(true)}
                  style={{
                    padding: '20px 32px', fontSize: '20px', fontWeight: 600,
                    background: `linear-gradient(135deg, ${T.grassGreen}18, ${T.grassGreen}08)`,
                    border: `3px solid ${T.grassGreen}`,
                    borderRadius: T.radius, cursor: 'pointer',
                    minHeight: '88px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: T.font, color: T.textDark,
                    boxShadow: `0 4px 16px ${T.grassGreen}22`,
                  }}
                >
                  <span style={{ fontSize: '28px' }}>😊</span>
                  我会！
                </motion.button>
                <motion.button
                  data-testid="answer-wrong"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => submitAnswer(false)}
                  style={{
                    padding: '20px 32px', fontSize: '20px', fontWeight: 600,
                    background: `linear-gradient(135deg, ${T.sunOrange}18, ${T.sunOrange}08)`,
                    border: `3px solid ${T.sunOrange}`,
                    borderRadius: T.radius, cursor: 'pointer',
                    minHeight: '88px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: T.font, color: T.textDark,
                    boxShadow: `0 4px 16px ${T.sunOrange}22`,
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🤔</span>
                  不太会
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 计算中过渡 */}
      {phase === 'completing' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          position: 'relative', zIndex: 1,
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '60px' }}
          >
            🌟
          </motion.div>
          <p style={{
            fontSize: '18px', fontWeight: 'bold', fontFamily: T.font,
            background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            小星老师正在分析你的表现...
          </p>
        </div>
      )}

      {/* 错误状态 */}
      {phase === 'error' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          textAlign: 'center', padding: '24px', position: 'relative', zIndex: 1,
        }}>
          <div style={{ fontSize: '64px' }}>😥</div>
          <h2 style={{
            fontSize: '22px', color: '#D32F2F', fontWeight: 'bold', fontFamily: T.font,
          }}>
            哎呀，出了点问题
          </h2>
          <p style={{
            fontSize: '14px', color: T.textMid, maxWidth: '320px',
            lineHeight: 1.6, fontFamily: T.fontBody,
          }}>
            {errorMessage ?? '加载课程数据时遇到问题'}
          </p>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            width: '100%', maxWidth: '280px', marginTop: '12px',
          }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startTest}
              disabled={isLoading}
              style={{
                padding: '16px 32px', fontSize: '18px', fontWeight: 700,
                color: '#fff',
                background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                border: 'none', borderRadius: T.radius, cursor: 'pointer',
                boxShadow: `0 4px 16px ${T.sunOrange}44`,
                fontFamily: T.font,
              }}
            >
              {isLoading ? '重试中...' : '🔄 重试'}
            </motion.button>
            <button
              onClick={onExit}
              style={{
                padding: '12px 24px', fontSize: '14px', color: T.textMid,
                backgroundColor: 'transparent', border: `2px solid ${T.sunOrange}33`,
                borderRadius: '16px', cursor: 'pointer', fontFamily: T.fontBody,
              }}
            >
              返回选择科目
            </button>
          </div>
        </div>
      )}

      {/* 结果页 */}
      {phase === 'result' && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', gap: '20px', position: 'relative', zIndex: 1,
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            style={{ fontSize: '80px' }}
          >
            🎉
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: '26px', fontWeight: 'bold', fontFamily: T.font,
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            太棒了！小星老师已经认识你了！
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: '16px', color: T.grassGreen, fontWeight: 600,
              fontFamily: T.fontBody,
            }}
          >
            你已经掌握了 {result.masteredNodes.length} 个知识点！
          </motion.p>

          {/* 图形化推荐级别 */}
          {recommendedLevel > 0 && (
            <LevelDisplay level={recommendedLevel} />
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{
              fontSize: '14px', color: T.textMid, marginTop: '16px',
              fontFamily: T.fontBody,
            }}
          >
            即将开始你的学习之旅...
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            whileTap={{ scale: 0.95 }}
            onClick={finishAndNavigate}
            style={{
              padding: '16px 48px', fontSize: '20px', fontWeight: 700,
              color: '#fff',
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              border: 'none', borderRadius: '24px', cursor: 'pointer',
              boxShadow: `0 6px 24px ${T.sunOrange}55`,
              minHeight: '56px', fontFamily: T.font,
            }}
          >
            开始学习 🚀
          </motion.button>
        </motion.div>
      )}

      {/* 庆祝动画覆盖层 */}
      <CelebrationAnimation
        visible={showCelebration}
        level={celebrationLevel}
        onComplete={handleCelebrationComplete}
      />

      {/* 鼓励覆盖层 */}
      <EncouragementOverlay
        visible={showEncouragement}
        onComplete={handleEncouragementComplete}
      />
    </div>
  )
}
