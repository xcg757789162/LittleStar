/**
 * QuizSlide — 互动测验幻灯片组件
 *
 * 渲染 quiz 类型的幻灯片：
 * - 配图选择题，选项圆润触摸友好按钮
 * - 选择后即时反馈（正确/错误高亮）+ FeedbackAnimation 动画覆盖层
 * - 答题数据回调（selectedIndex, isCorrect, responseTime）
 * - 选择后禁用所有选项（防止重复作答）
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Slide } from '@/services/openmaic/types'
import { FeedbackAnimation, type FeedbackType } from '@/components/feedback/FeedbackAnimation'

/** 答题回调数据 */
export interface QuizAnswerData {
  selectedIndex: number
  isCorrect: boolean
  responseTime: number
}

export interface QuizSlideProps {
  /** 幻灯片数据 */
  slide: Slide
  /** 答题回调 */
  onAnswer?: (data: QuizAnswerData) => void
  /** TTS 音频播放回调 */
  onAudioPlay?: (audioUrl: string) => void
}

export function QuizSlide({ slide, onAnswer, onAudioPlay }: QuizSlideProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('correct')
  const startTimeRef = useRef<number>(Date.now())

  // 重置计时器
  useEffect(() => {
    startTimeRef.current = Date.now()
    setSelectedIndex(null)
    setShowFeedback(false)
  }, [slide])

  // TTS 触发
  useEffect(() => {
    if (slide.audioUrl && onAudioPlay) {
      onAudioPlay(slide.audioUrl)
    }
  }, [slide.audioUrl, onAudioPlay])

  const handleOptionClick = useCallback(
    (index: number) => {
      if (selectedIndex !== null) return // 已选过，不处理
      if (!slide.quiz) return

      const responseTime = Date.now() - startTimeRef.current
      const isCorrect = index === slide.quiz.correctAnswer

      setSelectedIndex(index)
      setFeedbackType(isCorrect ? 'correct' : 'wrong')
      setShowFeedback(true)

      onAnswer?.({
        selectedIndex: index,
        isCorrect,
        responseTime,
      })
    },
    [selectedIndex, slide.quiz, onAnswer],
  )

  const handleFeedbackComplete = useCallback(() => {
    setShowFeedback(false)
  }, [])

  // 无 quiz 数据
  if (!slide.quiz) {
    return (
      <div data-testid="quiz-placeholder" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '20px', color: '#A0AEC0' }}>题目加载中...</p>
      </div>
    )
  }

  const { question, options, correctAnswer, imageUrl } = slide.quiz
  const answered = selectedIndex !== null

  const getOptionResult = (index: number): string | undefined => {
    if (!answered) return undefined
    if (index === correctAnswer) return 'correct'
    if (index === selectedIndex) return 'incorrect'
    return undefined
  }

  const getOptionStyle = (index: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '14px 20px',
      fontSize: '18px',
      fontWeight: 600,
      borderRadius: '12px',
      border: '2px solid #E2E8F0',
      backgroundColor: '#FFFFFF',
      cursor: answered ? 'default' : 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left' as const,
      minHeight: '48px',
    }

    if (!answered) return base

    if (index === correctAnswer) {
      return { ...base, borderColor: '#48BB78', backgroundColor: '#F0FFF4', color: '#276749' }
    }
    if (index === selectedIndex) {
      return { ...base, borderColor: '#FC8181', backgroundColor: '#FFF5F5', color: '#9B2C2C' }
    }
    return { ...base, opacity: 0.5 }
  }

  return (
    <div
      data-testid="quiz-slide"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        gap: '20px',
        minHeight: '100%',
      }}
    >
      {/* 题目配图 */}
      {imageUrl && (
        <div style={{ borderRadius: '16px', overflow: 'hidden', maxWidth: '60%' }}>
          <img
            src={imageUrl}
            alt={question}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      {/* 题目文本 */}
      <h3
        style={{
          fontSize: '24px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#2D3748',
          margin: 0,
        }}
      >
        {question}
      </h3>

      {/* 选项列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {options.map((option, index) => (
          <button
            key={index}
            data-testid={`option-${index}`}
            data-result={getOptionResult(index)}
            disabled={answered}
            style={getOptionStyle(index)}
            onClick={() => handleOptionClick(index)}
          >
            {option}
          </button>
        ))}
      </div>

      {/* FeedbackAnimation 覆盖层 (I5) */}
      {showFeedback && (
        <FeedbackAnimation
          type={feedbackType}
          onComplete={handleFeedbackComplete}
          duration={1500}
        />
      )}
    </div>
  )
}
