/**
 * 每日学习流程页面
 * 整合 OpenMAIC 课堂渲染器，连接自适应引擎和 store
 * 集成庆祝动画、鼓励覆盖层、音效系统
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLearningFlow } from '@/hooks/useLearningFlow'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { usePlacementTests } from '@/hooks/queries'
import { useChildStore } from '@/stores/childStore'
import { ClassroomIframe } from '@/components/classroom/ClassroomIframe'
import { ClassroomView } from '@/components/classroom/ClassroomView'
import { FeedbackAnimation } from '@/components/feedback/FeedbackAnimation'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'
import type { Subject } from '@/types/models'
import type { ReLearnMode } from '@/services/review-learning'

/** Location state for review mode entry */
interface ReviewLocationState {
  reviewMode?: ReLearnMode
  historyId?: string
  knowledgeNodeId?: string
  knowledgeNodeName?: string
  subject?: Subject
}

const SUBJECTS: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function LearningSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'

  // 查询评测记录，计算已完成评测的科目集合
  const { data: placementTests } = usePlacementTests(childId)
  const completedSubjects = useMemo(() => {
    if (!placementTests) return new Set<Subject>()
    return new Set(placementTests.map((t) => t.subject as Subject))
  }, [placementTests])

  // 从 location state 获取重学参数（用 useMemo 避免每次渲染创建新对象）
  const reviewState = useMemo(() => (location.state as ReviewLocationState) ?? {}, [location.state])
  const reviewInitRef = useRef(false)

  // 庆祝/鼓励动画状态
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [celebrationLevel] = useState<CelebrationLevel>('normal')
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false)
  const consecutiveCorrectRef = useRef(0)

  // iframe 降级标记：当 iframe 加载失败时切换到 ClassroomView
  const [useIframeFallback, setUseIframeFallback] = useState(false)

  const {
    isActive,
    isLoading,
    showFeedback,
    feedbackType,
    isComplete,
    sessionSummary,
    encouragement,
    currentClassroom,
    classroomAnswerCount,
    startFlow,
    stopFlow,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
  } = useLearningFlow()

  const {
    playLevelUp,
  } = useSoundEffects()

  // TODO: 复习流程需要在新的 API 架构下重新实现
  // 旧版 startReview 已移除，复习功能暂时禁用
  useEffect(() => {
    if (
      reviewState.reviewMode &&
      reviewState.knowledgeNodeId &&
      reviewState.subject &&
      !reviewInitRef.current
    ) {
      reviewInitRef.current = true
      // 使用 startFlow 替代旧版 startReview（subject 通过 ref 传递避免 effect 中 setState）
      void startFlow(reviewState.subject)
    }
  }, [reviewState, startFlow])

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

  // 会话完成时显示完整庆祝动画
  useEffect(() => {
    if (isComplete && sessionSummary) {
      playLevelUp()
      // 使用 requestAnimationFrame 避免在 effect 中同步调用 setState
      requestAnimationFrame(() => setShowCompleteCelebration(true))
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
            {SUBJECTS.map((subject) => {
              const isCompleted = completedSubjects.has(subject.key)
              return (
                <motion.button
                  key={subject.key}
                  onClick={() => {
                    if (isCompleted) {
                      setSelectedSubject(subject.key)
                    }
                  }}
                  whileTap={isCompleted ? { scale: 0.95 } : undefined}
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
                    backgroundColor: isCompleted ? subject.color : '#F0F0F0',
                    cursor: isCompleted ? 'pointer' : 'not-allowed',
                    boxShadow:
                      selectedSubject === subject.key
                        ? '0 4px 12px rgba(124, 77, 255, 0.3)'
                        : 'none',
                    opacity: isCompleted ? 1 : 0.5,
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '40px', marginBottom: '8px', filter: isCompleted ? 'none' : 'grayscale(100%)' }}>
                    {subject.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: isCompleted ? '#333' : '#999',
                    }}
                  >
                    {subject.label}
                  </span>
                  {/* 未评测标签 */}
                  {!isCompleted && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#FF6B35',
                        marginTop: '4px',
                        fontWeight: 600,
                      }}
                    >
                      🔒 未评测
                    </span>
                  )}
                </motion.button>
              )
            })}
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
            /* 三级降级课堂渲染：
             * Level 1: ClassroomIframe — 有 classroomUrl 且未降级时，用 iframe 嵌入原生前端
             * Level 2: ClassroomView — 无 classroomUrl 或 iframe 加载失败后降级
             */
            currentClassroom.classroomUrl && !useIframeFallback ? (
              <ClassroomIframe
                classroom={currentClassroom}
                subject={selectedSubject ?? undefined}
                onComplete={handleClassroomComplete}
                onAnswer={(data) => handleClassroomAnswer({
                  selectedIndex: data.selectedAnswer,
                  isCorrect: data.isCorrect,
                  responseTime: 0,
                })}
                onFallback={() => setUseIframeFallback(true)}
                loadTimeoutMs={15000}
                answerCount={classroomAnswerCount}
              />
            ) : (
              <ClassroomView
                classroom={currentClassroom}
                subject={selectedSubject ?? undefined}
                onComplete={handleClassroomComplete}
                onAnswer={handleClassroomAnswer}
              />
            )
          ) : isLoading ? (
            /* 正在加载课堂 */
            <div
              data-testid="generating-hint"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '48px 32px',
                maxWidth: '400px',
                width: '100%',
              }}
            >
              <motion.span
                style={{ fontSize: '48px' }}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🎨
              </motion.span>
              <p style={{ fontSize: '18px', color: '#333', textAlign: 'center', fontWeight: 600 }}>
                AI 老师正在为你准备课堂...
              </p>
              <p style={{ fontSize: '13px', color: '#BDBDBD', textAlign: 'center' }}>
                请耐心等待 ☺️
              </p>
            </div>
          ) : (
            /* 无课堂数据 — 根据评测状态显示不同提示 */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '48px 32px',
              }}
            >
              {selectedSubject && !completedSubjects.has(selectedSubject) ? (
                /* 未完成评测 → 引导去评测 */
                <>
                  <span style={{ fontSize: '48px' }}>🔒</span>
                  <p style={{ fontSize: '18px', color: '#FF6B35', fontWeight: 600 }}>
                    请先完成能力评测
                  </p>
                  <p style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
                    完成{SUBJECTS.find(s => s.key === selectedSubject)?.label}评测后，AI 老师才能为你定制课堂
                  </p>
                  <button
                    onClick={() => navigate(`/placement-test/${selectedSubject}/${gradeLevel}`)}
                    style={{
                      padding: '14px 36px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: '#FF6B35',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)',
                    }}
                  >
                    🚀 去评测
                  </button>
                  <button
                    onClick={handleExit}
                    style={{
                      marginTop: '4px',
                      padding: '10px 28px',
                      borderRadius: '14px',
                      border: '2px solid #BDBDBD',
                      backgroundColor: '#F5F5F5',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    返回首页
                  </button>
                </>
              ) : (
                /* 已评测但无课堂数据 → 原有重试逻辑 */
                <>
                  <span style={{ fontSize: '48px' }}>📚</span>
                  <p style={{ fontSize: '16px', color: '#999' }}>暂无课堂数据</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => selectedSubject && startFlow(selectedSubject)}
                      style={{
                        padding: '12px 32px',
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: '#7C4DFF',
                        color: 'white',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      🔄 重试
                    </button>
                    <button
                      onClick={handleExit}
                      style={{
                        padding: '12px 32px',
                        borderRadius: '16px',
                        border: '2px solid #BDBDBD',
                        backgroundColor: '#F5F5F5',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      返回首页
                    </button>
                  </div>
                </>
              )}
            </div>
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

          <button
            onClick={() => navigate('/history')}
            style={{
              marginTop: '8px',
              padding: '12px 32px',
              borderRadius: '16px',
              border: '2px solid #7C4DFF',
              backgroundColor: 'white',
              color: '#7C4DFF',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            📖 查看学习记录
          </button>
        </div>
      )}
    </div>
  )
}
