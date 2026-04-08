/**
 * ClassroomView — 课堂主容器组件
 *
 * 管理课堂播放：
 * - 工厂模式分发渲染：根据 Slide 类型路由到对应组件
 * - 进度条（场景级：当前场景 / 总场景数）
 * - 上一张 / 下一张导航 + 自动播放
 * - 课堂完成回调
 * - 学科配色：数学蓝、语文红、英语绿
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { Classroom, Slide, Scene } from '@/services/openmaic/types'
import { TeachingSlide } from './TeachingSlide'
import { ImageSlide } from './ImageSlide'
import { QuizSlide, type QuizAnswerData } from './QuizSlide'
import { TPRSlide } from './TPRSlide'
import { AudioSlide } from './AudioSlide'

/** 学科类型 */
export type SubjectType = 'math' | 'chinese' | 'english' | string

/** 学科配色映射 */
const SUBJECT_THEMES: Record<string, { gradient: string; accent: string }> = {
  math: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: '#667eea',
  },
  chinese: {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    accent: '#f5576c',
  },
  english: {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    accent: '#43e97b',
  },
}

const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  accent: '#667eea',
}

/** 自动播放间隔（毫秒） */
const AUTO_PLAY_INTERVAL = 5000

export interface ClassroomViewProps {
  /** 课堂数据 */
  classroom: Classroom
  /** 学科类型（用于学科配色） */
  subject?: SubjectType
  /** 课堂完成回调 */
  onComplete?: () => void
  /** 答题回调 */
  onAnswer?: (data: QuizAnswerData) => void
  /** TTS 音频播放回调 */
  onAudioPlay?: (audioUrl: string) => void
}

/** 扁平化的幻灯片项 */
interface FlatSlideItem {
  slide: Slide
  scene: Scene
  sceneIndex: number
  globalIndex: number
}

export function ClassroomView({
  classroom,
  subject,
  onComplete,
  onAnswer,
  onAudioPlay,
}: ClassroomViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 学科配色
  const theme = subject ? (SUBJECT_THEMES[subject] ?? DEFAULT_THEME) : DEFAULT_THEME

  // 将所有场景的幻灯片扁平化为单一列表
  const flatSlides = useMemo<FlatSlideItem[]>(() => {
    const items: FlatSlideItem[] = []
    let globalIndex = 0
    for (let sceneIndex = 0; sceneIndex < classroom.scenes.length; sceneIndex++) {
      const scene = classroom.scenes[sceneIndex]
      for (const slide of scene.slides) {
        items.push({ slide, scene, sceneIndex, globalIndex })
        globalIndex++
      }
    }
    return items
  }, [classroom.scenes])

  const totalSlides = flatSlides.length
  const totalScenes = classroom.scenes.length

  // 空课堂边界处理 (C2)
  if (totalSlides === 0) {
    return (
      <div
        data-testid="classroom-view"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: theme.gradient,
          borderRadius: '16px',
          padding: '40px',
        }}
      >
        <h1 style={{ fontSize: '24px', color: '#FFFFFF', textAlign: 'center' }}>
          {classroom.title}
        </h1>
        <p
          data-testid="empty-classroom"
          style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginTop: '16px' }}
        >
          暂无课堂内容
        </p>
      </div>
    )
  }

  const currentItem = flatSlides[currentIndex]
  const currentSceneIndex = currentItem.sceneIndex
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= totalSlides - 1

  const handleNext = useCallback(() => {
    if (isLast) {
      setAutoPlay(false)
      onComplete?.()
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [isLast, onComplete])

  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [isFirst])

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => !prev)
  }, [])

  // 自动播放逻辑 (I2)
  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }

    if (autoPlay && !isLast) {
      // quiz 和 tpr 类型不自动跳过，等待用户交互
      const currentSlideType = flatSlides[currentIndex]?.slide.type
      if (currentSlideType !== 'quiz' && currentSlideType !== 'tpr') {
        autoPlayTimerRef.current = setTimeout(() => {
          handleNext()
        }, AUTO_PLAY_INTERVAL)
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
    }
  }, [autoPlay, currentIndex, isLast, flatSlides, handleNext])

  // 工厂模式渲染幻灯片 (C1: 添加 key prop)
  const renderSlide = (item: FlatSlideItem) => {
    const { slide, globalIndex } = item

    switch (slide.type) {
      case 'title':
      case 'content':
        return <TeachingSlide key={globalIndex} slide={slide} onAudioPlay={onAudioPlay} />
      case 'image':
        return <ImageSlide key={globalIndex} slide={slide} onAudioPlay={onAudioPlay} />
      case 'quiz':
        return <QuizSlide key={globalIndex} slide={slide} onAnswer={onAnswer} onAudioPlay={onAudioPlay} />
      case 'tpr':
        return <TPRSlide key={globalIndex} slide={slide} onAudioPlay={onAudioPlay} />
      case 'audio':
        return <AudioSlide key={globalIndex} slide={slide} onAudioPlay={onAudioPlay} />
      default:
        return <TeachingSlide key={globalIndex} slide={slide} onAudioPlay={onAudioPlay} />
    }
  }

  return (
    <div
      data-testid="classroom-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: theme.gradient,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* 顶部：标题 + 进度条 */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}
        >
          {classroom.title}
        </h1>

        {/* 进度条 — 场景级 (I4) */}
        <div data-testid="classroom-progress" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${((currentSceneIndex + 1) / totalScenes) * 100}%`,
                height: '100%',
                borderRadius: '3px',
                backgroundColor: '#FFD700',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span
            data-testid="progress-text"
            style={{ fontSize: '14px', color: '#FFFFFF', whiteSpace: 'nowrap' }}
          >
            {currentSceneIndex + 1} / {totalScenes}
          </span>
        </div>
      </div>

      {/* 中间：幻灯片内容 */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px 16px 0 0',
          margin: '0 8px',
          overflow: 'auto',
        }}
      >
        {currentItem && renderSlide(currentItem)}
      </div>

      {/* 底部：导航按钮 + 自动播放 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        <button
          data-testid="nav-prev"
          disabled={isFirst}
          onClick={handlePrev}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isFirst ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)',
            color: isFirst ? 'rgba(255, 255, 255, 0.5)' : '#4A5568',
            cursor: isFirst ? 'default' : 'pointer',
            minHeight: '48px',
            minWidth: '48px',
          }}
        >
          ← 上一张
        </button>

        <button
          data-testid="nav-autoplay"
          onClick={toggleAutoPlay}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            backgroundColor: autoPlay ? '#FFD700' : 'rgba(255, 255, 255, 0.6)',
            color: autoPlay ? '#2D3748' : '#4A5568',
            cursor: 'pointer',
            minHeight: '48px',
            minWidth: '48px',
          }}
        >
          {autoPlay ? '⏸ 暂停' : '▶ 自动'}
        </button>

        <button
          data-testid="nav-next"
          onClick={handleNext}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#4A5568',
            cursor: 'pointer',
            minHeight: '48px',
            minWidth: '48px',
          }}
        >
          {isLast ? '完成 🎉' : '下一张 →'}
        </button>
      </div>
    </div>
  )
}
