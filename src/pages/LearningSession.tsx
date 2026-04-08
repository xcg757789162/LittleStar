/**
 * 每日学习流程页面
 * 整合闪卡/选择题/手写板组件，连接自适应引擎和 store
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLearningFlow } from '@/hooks/useLearningFlow'
import { MultipleChoice } from '@/components/learning/MultipleChoice'
import { FlashCard } from '@/components/learning/FlashCard'
import { WritingPad } from '@/components/learning/WritingPad'
import { FeedbackAnimation } from '@/components/feedback/FeedbackAnimation'
import type { Subject } from '@/types/models'

const SUBJECTS: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function LearningSession() {
  const navigate = useNavigate()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  const {
    isActive,
    isLoading,
    currentQuestion,
    showFeedback,
    feedbackType,
    isComplete,
    sessionSummary,
    encouragement,
    startFlow,
    stopFlow,
    handleAnswer,
    dismissFeedback,
  } = useLearningFlow()

  const handleStart = useCallback(async () => {
    if (selectedSubject) {
      await startFlow(selectedSubject)
    }
  }, [selectedSubject, startFlow])

  const handleExit = useCallback(() => {
    if (isActive) {
      stopFlow()
    }
    navigate('/')
  }, [isActive, stopFlow, navigate])

  const handleMultipleChoiceAnswer = useCallback(
    (_optionId: string, isCorrect: boolean) => {
      handleAnswer(isCorrect)
    },
    [handleAnswer],
  )

  const handleFlashCardNext = useCallback(() => {
    setIsFlipped(false)
    handleAnswer(true) // 闪卡默认为"已学习"
  }, [handleAnswer])

  const handleWritingSubmit = useCallback(() => {
    handleAnswer(true) // 手写提交默认为完成
  }, [handleAnswer])

  // 渲染题目组件
  const renderQuestion = () => {
    if (!currentQuestion) return null

    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <MultipleChoice
            question={currentQuestion.content.text}
            options={
              currentQuestion.content.options?.map((opt) => ({
                id: opt.id,
                text: opt.text,
                isCorrect: opt.isCorrect,
              })) ?? []
            }
            onAnswer={handleMultipleChoiceAnswer}
          />
        )

      case 'flashcard':
        return (
          <FlashCard
            frontText={currentQuestion.content.text}
            backText={String(currentQuestion.answer)}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            onNext={handleFlashCardNext}
            onPlayVoice={() => {}}
          />
        )

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

      {/* 学习中（题目渲染区域） */}
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
          ) : (
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

      {/* 会话总结 */}
      {isComplete && sessionSummary && (
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
                {sessionSummary.accuracy}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>正确率</div>
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
