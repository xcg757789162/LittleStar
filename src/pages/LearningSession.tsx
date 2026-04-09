/**
 * 每日学习流程页面
 * 整合 OpenMAIC 课堂渲染器，连接自适应引擎和 store
 * 集成庆祝动画、鼓励覆盖层、音效系统
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLearningFlow } from '@/hooks/useLearningFlow'
import { useSoundEffects } from '@/hooks/useSoundEffects'
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

  // 从 location state 获取重学参数
  const reviewState = (location.state as ReviewLocationState) ?? {}
  const reviewInitRef = useRef(false)

  // 庆祝/鼓励动画状态
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [celebrationLevel, _setCelebrationLevel] = useState<CelebrationLevel>('normal')
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
    isGenerating,
    generationProgress,
    generationError,
    isReviewMode,
    startFlow,
    startReview,
    stopFlow,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
  } = useLearningFlow()

  const {
    playLevelUp,
  } = useSoundEffects()

  // 自动启动重学流程（从学习历史页面跳转过来时）
  useEffect(() => {
    if (
      reviewState.reviewMode &&
      reviewState.knowledgeNodeId &&
      reviewState.knowledgeNodeName &&
      reviewState.subject &&
      !reviewInitRef.current
    ) {
      reviewInitRef.current = true
      setSelectedSubject(reviewState.subject)
      void startReview({
        knowledgeNodeId: reviewState.knowledgeNodeId,
        knowledgeNodeName: reviewState.knowledgeNodeName,
        subject: reviewState.subject,
        mode: reviewState.reviewMode,
        historyId: reviewState.historyId,
      })
    }
  }, [reviewState, startReview])

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
            ? isReviewMode
              ? `正在复习 ${SUBJECTS.find((s) => s.key === selectedSubject)?.label ?? ''}`
              : `正在学习 ${SUBJECTS.find((s) => s.key === selectedSubject)?.label ?? ''}`
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
              />
            ) : (
              <ClassroomView
                classroom={currentClassroom}
                subject={selectedSubject ?? undefined}
                onComplete={handleClassroomComplete}
                onAnswer={handleClassroomAnswer}
              />
            )
          ) : isGenerating ? (
            /* 正在实时生成课堂 — 带进度条 */
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

              {/* 阶段描述 */}
              <p style={{ fontSize: '18px', color: '#333', textAlign: 'center', fontWeight: 600 }}>
                {generationProgress?.stage ?? 'AI 老师正在为你创建专属课堂...'}
              </p>

              {/* 进度条 */}
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: '#E0E0E0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${generationProgress?.percent ?? 5}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '6px',
                    background: 'linear-gradient(90deg, #7C4DFF, #B388FF)',
                  }}
                />
              </div>

              {/* 百分比 + 时间 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: '13px',
                  color: '#999',
                }}
              >
                <span>{generationProgress?.percent ?? 0}%</span>
                <span>
                  {generationProgress?.elapsedSeconds
                    ? generationProgress.elapsedSeconds < 60
                      ? `已用时 ${generationProgress.elapsedSeconds} 秒`
                      : `已用时 ${Math.floor(generationProgress.elapsedSeconds / 60)}分${generationProgress.elapsedSeconds % 60}秒`
                    : ''}
                </span>
              </div>

              {/* 提示信息 */}
              <p style={{ fontSize: '13px', color: '#BDBDBD', textAlign: 'center' }}>
                首次生成可能需要 30-60 秒，请耐心等待 ☺️
              </p>

              {/* 重试中网络提示 */}
              {generationProgress?.stageKey === 'polling' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: '13px', color: '#FF9800', textAlign: 'center' }}
                >
                  ⚠️ 网络波动，正在重试连接...
                </motion.p>
              )}
            </div>
          ) : generationError ? (
            /* 生成失败 — 带错误详情和重试 */
            <div
              data-testid="generation-error"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '48px 32px',
                maxWidth: '400px',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '48px' }}>😞</span>
              <p style={{ fontSize: '20px', color: '#333', textAlign: 'center', fontWeight: 600 }}>
                课堂生成遇到问题
              </p>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FFF3E0',
                  borderRadius: '12px',
                  width: '100%',
                }}
              >
                <p style={{ fontSize: '13px', color: '#E65100', margin: 0 }}>
                  💡 {generationError.includes('timed out')
                    ? '生成超时，OpenMAIC 服务可能正忙，请稍后重试'
                    : generationError.includes('fetch')
                      ? '无法连接到 OpenMAIC 服务，请检查 Docker 是否启动'
                      : generationError}
                </p>
              </div>
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
            </div>
          ) : (
            /* 无课堂数据且未在生成 — 空状态 */
            <p style={{ fontSize: '16px', color: '#999' }}>暂无课堂数据</p>
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
