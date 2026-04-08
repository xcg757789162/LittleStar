/**
 * 每日学习流程页面
 * 整合课堂渲染器(新流程)/手写板组件，连接自适应引擎和 store
 * 集成庆祝动画、鼓励覆盖层、音效系统
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLearningFlow } from '@/hooks/useLearningFlow'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { ClassroomView } from '@/components/classroom/ClassroomView'
import { WritingPad } from '@/components/learning/WritingPad'
import { FeedbackAnimation } from '@/components/feedback/FeedbackAnimation'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'
import type { Subject } from '@/types/models'

const SUBJECTS: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function LearningSession() {
  const navigate = useNavigate()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  // 庆祝/鼓励动画状态
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [celebrationLevel, setCelebrationLevel] = useState<CelebrationLevel>('normal')
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false)
  const consecutiveCorrectRef = useRef(0)

  const {
    isActive,
    isLoading,
    currentQuestion,
    showFeedback,
    feedbackType,
    isComplete,
    sessionSummary,
    encouragement,
    currentClassroom,
    isCacheEmpty,
    startFlow,
    stopFlow,
    handleAnswer,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
  } = useLearningFlow()

  const {
    playCorrect,
    playWrong,
    playCelebration,
    playStar,
    playLevelUp,
  } = useSoundEffects()

  const handleStart = useCallback(async () => {
    if (selectedSubject) {
      consecutiveCorrectRef.current = 0
      await startFlow(selectedSubject)
    }
  }, [selectedSubject, startFlow])

  const handleExit = useCallback(() => {
    if (isActive) {
      stopFlow()
    }
    navigate('/')
  }, [isActive, stopFlow, navigate])

  /** 包装答题处理，增加音效和庆祝逻辑 */
  const handleAnswerWithEffects = useCallback(
    (isCorrect: boolean) => {
      handleAnswer(isCorrect)

      if (isCorrect) {
        consecutiveCorrectRef.current++
        playCorrect()
        playStar()

        // 根据连续答对次数决定庆祝等级
        const streak = consecutiveCorrectRef.current
        if (streak >= 5 && streak % 5 === 0) {
          setCelebrationLevel('streak5')
          setShowCelebration(true)
          playCelebration()
        } else if (streak >= 3 && streak % 3 === 0) {
          setCelebrationLevel('streak3')
          setShowCelebration(true)
          playCelebration()
        }
        // 普通答对由 FeedbackAnimation 处理
      } else {
        consecutiveCorrectRef.current = 0
        playWrong()
        setShowEncouragement(true)
      }
    },
    [handleAnswer, playCorrect, playWrong, playCelebration, playStar],
  )

  const handleWritingSubmit = useCallback(() => {
    handleAnswerWithEffects(true) // 手写提交默认为完成
  }, [handleAnswerWithEffects])

  // 会话完成时显示完整庆祝动画
  useEffect(() => {
    if (isComplete && sessionSummary) {
      playLevelUp()
      setShowCompleteCelebration(true)
    }
  }, [isComplete, sessionSummary, playLevelUp])

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false)
  }, [])

  const handleEncouragementComplete = useCallback(() => {
    setShowEncouragement(false)
  }, [])

  const handleCompleteCelebrationDone = useCallback(() => {
    setShowCompleteCelebration(false)
  }, [])

  // 渲染题目组件
  const renderQuestion = () => {
    if (!currentQuestion) return null

    switch (currentQuestion.type) {
      case 'handwriting':
        return (
          <WritingPad
            prompt={currentQuestion.content.text}
            onSubmit={handleWritingSubmit}
            onClear={() => {}}
            onUndo={() => {}}
          />
        )

      default:
        return null
    }
  }

  return (
    <div
      data-testid="learning-session"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div data-testid="session-progress" style={{ fontSize: '16px', color: '#666' }}>
          {isActive
            ? `正在学习 ${SUBJECTS.find((s) => s.key === selectedSubject)?.label ?? ''}`
            : isComplete
              ? '学习完成！'
              : '选择要学习的科目'}
        </div>
        <button
          data-testid="exit-button"
          onClick={handleExit}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: '2px solid #BDBDBD',
            backgroundColor: '#F5F5F5',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          退出
        </button>
      </div>

      {/* 科目选择（未开始且未完成时） */}
      {!isActive && !isComplete && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '16px',
            }}
          >
            今天想学什么？
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            {SUBJECTS.map((subject) => (
              <motion.button
                key={subject.key}
                onClick={() => setSelectedSubject(subject.key)}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '20px 12px',
                  borderRadius: '20px',
                  border:
                    selectedSubject === subject.key
                      ? '3px solid #7C4DFF'
                      : '3px solid transparent',
                  backgroundColor: subject.color,
                  cursor: 'pointer',
                  boxShadow:
                    selectedSubject === subject.key
                      ? '0 4px 12px rgba(124, 77, 255, 0.3)'
                      : 'none',
                }}
              >
                <span style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {subject.emoji}
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333',
                  }}
                >
                  {subject.label}
                </span>
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={handleStart}
            disabled={!selectedSubject || isLoading}
            whileTap={selectedSubject ? { scale: 0.95 } : undefined}
            style={{
              marginTop: '24px',
              padding: '16px 48px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: selectedSubject ? '#7C4DFF' : '#BDBDBD',
              color: 'white',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: selectedSubject ? 'pointer' : 'default',
              opacity: selectedSubject ? 1 : 0.6,
            }}
          >
            {isLoading ? '加载中...' : '开始学习'}
          </motion.button>
        </div>
      )}

      {/* 学习中（课堂渲染/题目渲染区域） */}
      {isActive && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {isLoading ? (
            <p style={{ fontSize: '20px', color: '#666' }}>正在准备题目...</p>
          ) : currentClassroom ? (
            /* 新流程：渲染 ClassroomView */
            <ClassroomView
              classroom={currentClassroom}
              subject={selectedSubject ?? undefined}
              onComplete={handleClassroomComplete}
              onAnswer={handleClassroomAnswer}
            />
          ) : isCacheEmpty ? (
            /* 缓存为空：课程准备中提示 */
            <div
              data-testid="cache-empty-hint"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '48px 32px',
              }}
            >
              <span style={{ fontSize: '48px' }}>📚</span>
              <p style={{ fontSize: '20px', color: '#666', textAlign: 'center' }}>
                课程准备中，请稍后再试
              </p>
              <p style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
                教导处正在为你生成个性化课堂内容
              </p>
            </div>
          ) : (
            /* 手写板组件渲染 */
            renderQuestion()
          )}
        </div>
      )}

      {/* 反馈动画 + 鼓励语 */}
      {showFeedback && (
        <div style={{ position: 'relative' }}>
          <FeedbackAnimation
            type={feedbackType}
            onComplete={dismissFeedback}
          />
          {encouragement && (
            <div
              data-testid="encouragement-text"
              style={{
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: feedbackType === 'correct' ? '#4CAF50' : '#FF9800',
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: feedbackType === 'correct' ? '#E8F5E9' : '#FFF3E0',
                borderRadius: '16px',
                position: 'fixed',
                bottom: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                maxWidth: '80%',
              }}
            >
              {encouragement}
            </div>
          )}
        </div>
      )}

      {/* 连续答对庆祝动画 */}
      <CelebrationAnimation
        visible={showCelebration}
        level={celebrationLevel}
        onComplete={handleCelebrationComplete}
      />

      {/* 答错鼓励覆盖层 */}
      <EncouragementOverlay
        visible={showEncouragement}
        onComplete={handleEncouragementComplete}
      />

      {/* 会话完成庆祝动画（大量星星+纸屑） */}
      <CelebrationAnimation
        visible={showCompleteCelebration}
        level="complete"
        message="学习完成！你太棒了！🎉"
        onComplete={handleCompleteCelebrationDone}
        duration={3500}
      />

      {/* 会话总结 */}
      {isComplete && sessionSummary && !showCompleteCelebration && (
        <div
          data-testid="session-summary"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '32px',
            maxWidth: '400px',
            margin: '0 auto',
            backgroundColor: '#fff',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: '60px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            学习完成！
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7C4DFF' }}>
                {sessionSummary.questionsCompleted}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>完成题数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                {/* 图形化展示：用星星代替百分比 */}
                {Array.from(
                  { length: Math.round((sessionSummary.accuracy / 100) * 5) },
                  (_, i) => (
                    <span key={i}>⭐</span>
                  ),
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>表现</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '16px',
              padding: '14px 40px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#7C4DFF',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            回到首页
          </button>
        </div>
      )}
    </div>
  )
}
