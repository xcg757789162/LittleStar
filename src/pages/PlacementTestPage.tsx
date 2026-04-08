/**
 * 入学测评页面（增强版）
 * 引导动画 + CAT 自适应答题 + 星星进度 + 庆祝动画 + 图形化结果
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlacementTest } from '@/hooks/usePlacementTest'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import { GRADE_LABELS } from '@/types/grades'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'

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
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '8px 0',
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
      <span
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#7C4DFF',
        }}
      >
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
    // consecutiveCorrect 暂未使用，后续可用于UI展示连续答对数
    isLoading,
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
      // 根据连续答对次数决定庆祝等级
      if (lastFeedback.consecutiveCorrect >= 5) {
        setCelebrationLevel('streak5')
      } else if (lastFeedback.consecutiveCorrect >= 3) {
        setCelebrationLevel('streak3')
      } else {
        setCelebrationLevel('normal')
      }
      setShowCelebration(true)
      playStar()
    } else {
      playWrong()
      setShowEncouragement(true)
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
        padding: '24px',
        maxWidth: '500px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
      }}
    >
      {/* 退出按钮 */}
      <button
        data-testid="exit-test-btn"
        onClick={onExit}
        style={{
          alignSelf: 'flex-end',
          padding: '8px 16px',
          fontSize: '14px',
          color: '#999',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ✕ 退出
      </button>

      {/* 引导动画阶段 */}
      {phase === 'intro' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
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
                    fontSize: '26px',
                    color: '#7C4DFF',
                    fontWeight: 'bold',
                  }}
                >
                  小星老师要了解一下你哦！
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    fontSize: '16px',
                    color: '#888',
                    marginBottom: '8px',
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                marginTop: '24px',
              }}
            >
              <p style={{ fontSize: '14px', color: '#999' }}>
                只需要几分钟，轻轻松松就好 ☺️
              </p>
              <motion.button
                data-testid="start-test-btn"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={startTest}
                disabled={isLoading}
                style={{
                  padding: '20px 56px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: '#7C4DFF',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(124, 77, 255, 0.4)',
                  minWidth: '200px',
                  minHeight: '64px',
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
        <div data-testid="test-question-area" style={{ flex: 1 }}>
          {/* 星星进度指示器 */}
          <div data-testid="test-progress" style={{ marginBottom: '24px' }}>
            <StarProgress progress={progress} total={totalQuestions} />
            {/* 隐藏的进度条（辅助） */}
            <div
              style={{
                height: '6px',
                backgroundColor: 'rgba(124, 77, 255, 0.15)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '8px',
              }}
            >
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  backgroundColor: '#7C4DFF',
                  borderRadius: '3px',
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
              <h2
                style={{
                  fontSize: '22px',
                  color: '#333',
                  marginBottom: '12px',
                  fontWeight: 'bold',
                }}
              >
                {currentQuestion.nodeName}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#999',
                  marginBottom: '40px',
                }}
              >
                请选择你的答案
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  maxWidth: '320px',
                  margin: '0 auto',
                }}
              >
                <motion.button
                  data-testid="answer-correct"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => submitAnswer(true)}
                  style={{
                    padding: '20px 32px',
                    fontSize: '20px',
                    fontWeight: 600,
                    backgroundColor: '#E8F5E9',
                    border: '3px solid #4CAF50',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    minHeight: '88px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>😊</span>
                  我会！
                </motion.button>
                <motion.button
                  data-testid="answer-wrong"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => submitAnswer(false)}
                  style={{
                    padding: '20px 32px',
                    fontSize: '20px',
                    fontWeight: 600,
                    backgroundColor: '#FFF3E0',
                    border: '3px solid #FF9800',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    minHeight: '88px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
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
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '60px' }}
          >
            🌟
          </motion.div>
          <p style={{ fontSize: '18px', color: '#7C4DFF', fontWeight: 'bold' }}>
            小星老师正在分析你的表现...
          </p>
        </div>
      )}

      {/* 结果页 */}
      {phase === 'result' && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '20px',
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
              fontSize: '26px',
              color: '#7C4DFF',
              fontWeight: 'bold',
            }}
          >
            太棒了！小星老师已经认识你了！
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: '16px',
              color: '#4CAF50',
              fontWeight: 600,
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
              fontSize: '14px',
              color: '#999',
              marginTop: '16px',
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
              padding: '16px 48px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#fff',
              backgroundColor: '#7C4DFF',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(124, 77, 255, 0.4)',
              minHeight: '56px',
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
