/**
 * 入学测评页面（两阶段选择题版）
 *
 * 阶段一摸底 → 分析过渡 → 阶段二验证 → 结果页
 * 🎨 Sunny Playground 风格 — 暖色渐变、圆润卡片、漂浮装饰
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePlacementTest } from '@/hooks/usePlacementTest'
import type { PlacementUIPhase, ChoiceAnswerFeedback } from '@/hooks/usePlacementTest'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import { GRADE_LABELS } from '@/types/grades'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'
import type { ChoiceQuestion } from '@/engine/placement-test-engine'

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
  correctGreen: '#4CAF50',
  wrongRed: '#FF5252',
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

// ===== 子组件 =====

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

/** 圆形倒计时进度条 */
function CountdownCircle({ seconds, total = 30 }: { seconds: number; total?: number }) {
  const ratio = seconds / total
  const circumference = 2 * Math.PI * 45 // r=45
  const strokeOffset = circumference * (1 - ratio)

  // 颜色渐变：绿 → 黄 → 橙 → 红
  const getColor = () => {
    if (ratio > 0.5) return T.grassGreen
    if (ratio > 0.33) return T.starGold
    if (ratio > 0.17) return T.sunOrange
    return T.wrongRed
  }

  const isPulsing = seconds <= 5 && seconds > 0

  return (
    <motion.div
      animate={isPulsing ? { scale: [1, 1.08, 1] } : {}}
      transition={isPulsing ? { duration: 0.5, repeat: Infinity } : {}}
      style={{ position: 'relative', width: 60, height: 60 }}
    >
      <svg width={60} height={60} viewBox="0 0 100 100">
        {/* 背景圆环 */}
        <circle
          cx="50" cy="50" r="45"
          fill="none" stroke={`${T.textLight}22`} strokeWidth="6"
        />
        {/* 进度圆环 */}
        <circle
          cx="50" cy="50" r="45"
          fill="none" stroke={getColor()} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '18px', fontWeight: 'bold',
        fontFamily: T.font, color: getColor(),
      }}>
        {seconds}
      </span>
    </motion.div>
  )
}

/** 选择题 2×2 网格 */
function ChoiceGrid({
  question,
  feedback,
  onSelect,
}: {
  question: ChoiceQuestion
  feedback: ChoiceAnswerFeedback | null
  onSelect: (index: number) => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // 重置选中状态
  useEffect(() => {
    setSelectedIndex(null)
  }, [question.nodeId])

  const handleSelect = (index: number) => {
    if (feedback || selectedIndex !== null) return // 已选或已有反馈
    setSelectedIndex(index)
    // 延迟 0.3s 提交（显示选中效果）
    setTimeout(() => onSelect(index), 300)
  }

  const getOptionStyle = (index: number): React.CSSProperties => {
    const isSelected = selectedIndex === index || feedback?.selectedIndex === index
    const isCorrectOption = feedback?.correctIndex === index
    const showResult = feedback !== null

    let borderColor = `${T.skyBlue}66`
    let backgroundColor = T.cardBg
    let transform = ''

    if (showResult) {
      if (isCorrectOption) {
        borderColor = T.correctGreen
        backgroundColor = `${T.correctGreen}15`
      } else if (isSelected && !feedback.isCorrect) {
        borderColor = T.wrongRed
        backgroundColor = `${T.wrongRed}10`
      } else {
        borderColor = `${T.textLight}33`
        backgroundColor = `${T.textLight}08`
      }
    } else if (isSelected) {
      borderColor = T.skyBlue
      backgroundColor = `${T.skyBlue}15`
      transform = 'scale(0.97)'
    }

    return {
      padding: '16px 12px',
      fontSize: '17px',
      fontWeight: 600,
      backgroundColor,
      border: `3px solid ${borderColor}`,
      borderRadius: '16px',
      cursor: showResult || isSelected ? 'default' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: T.fontBody,
      color: T.textDark,
      transition: 'all 0.2s ease',
      transform,
      minHeight: '72px',
      position: 'relative' as const,
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      maxWidth: '360px',
      margin: '0 auto',
    }}>
      {question.options.map((option, index) => (
        <motion.button
          key={index}
          data-testid={`choice-option-${index}`}
          whileTap={!feedback && selectedIndex === null ? { scale: 0.95 } : {}}
          whileHover={!feedback && selectedIndex === null ? { y: -2 } : {}}
          onClick={() => handleSelect(index)}
          style={getOptionStyle(index)}
        >
          {option.emoji && <span style={{ fontSize: '24px' }}>{option.emoji}</span>}
          <span>{option.text}</span>
          {/* 对错标记 */}
          {feedback && feedback.correctIndex === index && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.4, type: 'spring' }}
              style={{ position: 'absolute', top: -8, right: -8, fontSize: '22px' }}
            >
              ✅
            </motion.span>
          )}
          {feedback && feedback.selectedIndex === index && !feedback.isCorrect && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.4, type: 'spring' }}
              style={{ position: 'absolute', top: -8, right: -8, fontSize: '22px' }}
            >
              ❌
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  )
}

/** 阶段过渡 UI */
function PhaseTransition({ type }: { type: 'analyzing' | 'loading_phase2' }) {
  const isAnalyzing = type === 'analyzing'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
      position: 'relative', zIndex: 1,
    }}>
      {/* 小星老师角色 */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '80px' }}
      >
        🌟
      </motion.div>

      {/* 气泡对话 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          backgroundColor: T.cardBg,
          borderRadius: '20px',
          padding: '20px 28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: `2px solid ${T.starGold}33`,
          maxWidth: '280px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* 气泡尖角 */}
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: `10px solid ${T.cardBg}`,
        }} />
        <p style={{
          fontSize: '18px', fontWeight: 'bold', fontFamily: T.font,
          color: T.textDark, margin: 0,
        }}>
          {isAnalyzing
            ? '让我想想更好的题目...'
            : '验证环节！再答几道就好了 💪'
          }
        </p>
      </motion.div>

      {/* 脉冲加载指示器 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
            style={{
              width: 12, height: 12, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
            }}
          />
        ))}
      </div>
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

/** 结果页模块掌握度展示 */
function ModuleMasteryDisplay({ result, phase1Analysis }: {
  result: PlacementResult
  phase1Analysis: { moduleScores?: Record<string, number> } | null
}) {
  const scores = phase1Analysis?.moduleScores
  if (!scores || Object.keys(scores).length === 0) return null

  const getMasteryEmoji = (score: number) => {
    if (score >= 80) return '🌟'
    if (score >= 60) return '⭐'
    if (score >= 40) return '🔥'
    return '🌱'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      style={{
        width: '100%', maxWidth: '320px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}
    >
      <p style={{
        fontSize: '14px', color: T.textMid, fontFamily: T.fontBody,
        textAlign: 'center', marginBottom: '4px',
      }}>
        各模块掌握度
      </p>
      {Object.entries(scores).map(([moduleId, score]) => (
        <div key={moduleId} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          backgroundColor: T.cardBg,
          borderRadius: '12px',
          border: `1px solid ${T.textLight}22`,
        }}>
          <span style={{ fontSize: '20px' }}>{getMasteryEmoji(score)}</span>
          <span style={{
            flex: 1, fontSize: '13px', color: T.textDark,
            fontFamily: T.fontBody, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {moduleId}
          </span>
          <span style={{
            fontSize: '14px', fontWeight: 'bold',
            color: score >= 60 ? T.grassGreen : T.sunOrange,
            fontFamily: T.font,
          }}>
            {score}%
          </span>
        </div>
      ))}
    </motion.div>
  )
}

// ===== 主组件 =====

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
    answeredCount,
    lastFeedback,
    result,
    phase1Analysis,
    recommendedLevel,
    isLoading,
    errorMessage,
    countdown,
    currentPhaseLabel,
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

  // 引导动画
  const [introStep, setIntroStep] = useState(0)

  useEffect(() => {
    if (phase !== 'intro') return
    const timer1 = setTimeout(() => setIntroStep(1), 800)
    const timer2 = setTimeout(() => setIntroStep(2), 2000)
    return () => { clearTimeout(timer1); clearTimeout(timer2) }
  }, [phase])

  // 结果页自动跳转
  useEffect(() => {
    if (phase !== 'result' || !result) return
    playCelebration()
    const timer = setTimeout(finishAndNavigate, 8000) // 给更多时间看结果
    return () => clearTimeout(timer)
  }, [phase, result, finishAndNavigate, playCelebration])

  // 答题反馈音效 + 动画
  useEffect(() => {
    if (!lastFeedback) return

    if (lastFeedback.isCorrect) {
      playCorrect()
      playStar()
      const timer = setTimeout(() => {
        if (lastFeedback.consecutiveCorrect >= 5) {
          setCelebrationLevel('streak5')
        } else if (lastFeedback.consecutiveCorrect >= 3) {
          setCelebrationLevel('streak3')
        } else {
          setCelebrationLevel('normal')
        }
        setShowCelebration(true)
      }, 800) // 延迟显示，让选项反馈先展示
      return () => clearTimeout(timer)
    } else {
      playWrong()
      const timer = setTimeout(() => {
        setShowEncouragement(true)
      }, 1200) // 延迟更多，显示正确答案
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

  /** 判断是否在答题阶段 */
  const isTestingPhase = (p: PlacementUIPhase) =>
    p === 'phase1_testing' || p === 'phase2_testing'

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

      {/* ========== 引导阶段 ========== */}
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
                回答几道选择题，轻轻松松就好 ☺️
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

      {/* ========== 答题界面（阶段一 / 阶段二） ========== */}
      {isTestingPhase(phase) && (
        <div data-testid="test-question-area" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {/* 阶段标识 + 进度 */}
          <div style={{ marginBottom: '16px' }}>
            {/* 阶段标签 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 'bold',
                color: currentPhaseLabel === 'phase2' ? T.candyPink : T.skyBlue,
                fontFamily: T.fontBody,
                padding: '4px 12px',
                backgroundColor: currentPhaseLabel === 'phase2' ? `${T.candyPink}15` : `${T.skyBlue}15`,
                borderRadius: '12px',
              }}>
                {currentPhaseLabel === 'phase2' ? '✨ 验证环节' : '📝 摸底环节'}
              </span>
              <span style={{
                fontSize: '13px', color: T.textMid, fontFamily: T.fontBody,
              }}>
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            {/* 星星进度 */}
            <StarProgress progress={progress} total={totalQuestions} />

            {/* 进度条 */}
            <div style={{
              height: '6px', backgroundColor: `${T.sunOrange}15`,
              borderRadius: '3px', overflow: 'hidden', marginTop: '4px',
            }}>
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: '3px',
                  background: `linear-gradient(90deg, ${T.sunOrange}, ${T.starGold})`,
                }}
              />
            </div>
          </div>

          {/* 当前题目 */}
          {currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.nodeId + '-' + answeredCount}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                style={{ textAlign: 'center', padding: '8px 0' }}
              >
                {/* 倒计时 + 题干 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '16px', marginBottom: '24px',
                }}>
                  <CountdownCircle seconds={countdown} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <h2 style={{
                      fontSize: '20px', color: T.textDark,
                      fontWeight: 'bold', fontFamily: T.font,
                      margin: 0, lineHeight: 1.4,
                    }}>
                      {(currentQuestion as ChoiceQuestion).stem}
                    </h2>
                  </div>
                </div>

                {/* 2×2 选项网格 */}
                <ChoiceGrid
                  question={currentQuestion as ChoiceQuestion}
                  feedback={lastFeedback}
                  onSelect={submitAnswer}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ========== 阶段过渡 ========== */}
      {phase === 'phase1_analyzing' && (
        <PhaseTransition type="analyzing" />
      )}

      {phase === 'phase2_loading' && (
        <PhaseTransition type="loading_phase2" />
      )}

      {/* ========== 完成处理中 ========== */}
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

      {/* ========== 错误状态 ========== */}
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
                boxShadow: `0 4px 16px ${T.sunOrange}44`, fontFamily: T.font,
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

      {/* ========== 结果页 ========== */}
      {phase === 'result' && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', gap: '16px', position: 'relative', zIndex: 1,
            padding: '16px 0',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            style={{ fontSize: '72px' }}
          >
            🎉
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: '24px', fontWeight: 'bold', fontFamily: T.font,
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            太棒了！测评完成！
          </motion.h1>

          {/* 正确率 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '16px', color: T.grassGreen, fontWeight: 600,
              fontFamily: T.fontBody,
            }}
          >
            <span>正确率 {result.overallScore}%</span>
            <span>·</span>
            <span>掌握 {result.masteredNodes.length} 个知识点</span>
          </motion.div>

          {/* 图形化推荐级别 */}
          {recommendedLevel > 0 && (
            <LevelDisplay level={recommendedLevel} />
          )}

          {/* 模块掌握度 */}
          <ModuleMasteryDisplay result={result} phase1Analysis={phase1Analysis} />

          {/* 鼓励语 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            style={{
              fontSize: '14px', color: T.textMid, marginTop: '8px',
              fontFamily: T.fontBody,
            }}
          >
            {result.overallScore >= 80
              ? '你太厉害了！小星老师要给你更有挑战的内容！🌟'
              : result.overallScore >= 50
                ? '不错不错！小星老师会帮你一起进步的！💪'
                : '没关系哦！小星老师会从最基础的开始教你！😊'}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={finishAndNavigate}
            style={{
              padding: '16px 48px', fontSize: '20px', fontWeight: 700,
              color: '#fff',
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              border: 'none', borderRadius: '24px', cursor: 'pointer',
              boxShadow: `0 6px 24px ${T.sunOrange}55`,
              minHeight: '56px', fontFamily: T.font, marginTop: '8px',
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
