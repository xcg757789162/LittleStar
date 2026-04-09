/**
 * ClassroomIframe 组件
 *
 * 通过 iframe 嵌入 OpenMAIC 原生前端的课堂页面，
 * 获得完整的课堂体验：角色系统、画布渲染、TTS 语音、动作编排。
 *
 * 特性：
 * - 加载状态动画（骨架屏）
 * - 超时降级到 ClassroomView
 * - 悬浮"完成课堂"按钮
 * - postMessage 通信桥监听答题和完成事件
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClassroomBridge } from '@/hooks/useClassroomBridge'
import type { QuizAnswerPayload } from '@/hooks/useClassroomBridge'
import type { Classroom } from '@/services/openmaic/types'

/** ClassroomIframe 的 Props */
export interface ClassroomIframeProps {
  /** 课堂数据（含 classroomUrl） */
  classroom: Classroom
  /** 当前学科（用于主题配色） */
  subject?: string
  /** 课堂完成回调 */
  onComplete: () => void
  /** 答题回调（从 iframe 接收答题数据） */
  onAnswer?: (data: { isCorrect: boolean; selectedAnswer: number; correctAnswer: number }) => void
  /** 降级到 ClassroomView 的回调（iframe 加载失败时） */
  onFallback?: () => void
  /** iframe 加载超时（毫秒），默认 15000 */
  loadTimeoutMs?: number
}

/** iframe 加载状态 */
type LoadState = 'loading' | 'loaded' | 'error' | 'timeout'

/** 学科配色 */
const SUBJECT_COLORS: Record<string, { primary: string; bg: string }> = {
  math: { primary: '#7C4DFF', bg: '#F3E5F5' },
  chinese: { primary: '#FF6D00', bg: '#FFF3E0' },
  english: { primary: '#00C853', bg: '#E8F5E9' },
}

/**
 * 将后端返回的 classroomUrl 转换为通过 Vite proxy 的嵌入 URL
 * 例如：/classroom/abc123 → /openmaic/classroom/abc123
 */
function toProxyUrl(classroomUrl: string): string {
  // 如果已经是 proxy 路径，直接返回
  if (classroomUrl.startsWith('/openmaic')) return classroomUrl
  // 如果是绝对 URL（http://...），提取路径部分
  if (classroomUrl.startsWith('http')) {
    try {
      const url = new URL(classroomUrl)
      return `/openmaic${url.pathname}${url.search}`
    } catch {
      return `/openmaic${classroomUrl}`
    }
  }
  // 相对路径，加上 proxy 前缀
  const path = classroomUrl.startsWith('/') ? classroomUrl : `/${classroomUrl}`
  return `/openmaic${path}`
}

export function ClassroomIframe({
  classroom,
  subject,
  onComplete,
  onAnswer,
  onFallback,
  loadTimeoutMs = 15000,
}: ClassroomIframeProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [showCompleteBtn, setShowCompleteBtn] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colors = SUBJECT_COLORS[subject ?? ''] ?? SUBJECT_COLORS.math

  // 构建 iframe src URL
  const iframeSrc = classroom.classroomUrl
    ? toProxyUrl(classroom.classroomUrl)
    : null

  // postMessage 通信桥
  useClassroomBridge(iframeRef, {
    onReady: () => {
      setLoadState('loaded')
      // 清除超时计时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    },
    onQuizAnswer: (data: QuizAnswerPayload) => {
      onAnswer?.({
        isCorrect: data.isCorrect,
        selectedAnswer: data.selectedAnswer,
        correctAnswer: data.correctAnswer,
      })
    },
    onComplete: () => {
      onComplete()
    },
    onError: () => {
      setLoadState('error')
    },
  }, !!iframeSrc)

  // 超时检测
  useEffect(() => {
    if (!iframeSrc) return

    timeoutRef.current = setTimeout(() => {
      if (loadState === 'loading') {
        setLoadState('timeout')
      }
    }, loadTimeoutMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [iframeSrc, loadTimeoutMs, loadState])

  // iframe onLoad 事件（备用 — postMessage ready 信号更可靠）
  const handleIframeLoad = useCallback(() => {
    // 给 OpenMAIC 前端一点时间初始化
    // 如果 3 秒后还没收到 ready 消息，也标记为 loaded
    iframeLoadTimerRef.current = setTimeout(() => {
      setLoadState((prev) => (prev === 'loading' ? 'loaded' : prev))
    }, 3000)
  }, [])

  // 5 秒后显示"完成课堂"按钮（给用户时间浏览内容）
  useEffect(() => {
    if (loadState === 'loaded') {
      const timer = setTimeout(() => setShowCompleteBtn(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [loadState])

  // 组件卸载时清理所有计时器
  useEffect(() => {
    return () => {
      if (iframeLoadTimerRef.current) clearTimeout(iframeLoadTimerRef.current)
    }
  }, [])

  // 无 classroomUrl → 直接降级
  if (!iframeSrc) {
    onFallback?.()
    return null
  }

  // 超时或错误 → 提供降级选项
  if (loadState === 'timeout' || loadState === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '48px' }}>
          {loadState === 'timeout' ? '⏱️' : '⚠️'}
        </span>
        <p style={{ fontSize: '18px', color: '#666' }}>
          {loadState === 'timeout'
            ? '课堂加载超时，可能是网络较慢'
            : '课堂加载出错'}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setLoadState('loading')
              // 强制刷新 iframe
              if (iframeRef.current) {
                iframeRef.current.src = iframeSrc
              }
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: colors.primary,
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
          <button
            onClick={() => onFallback?.()}
            style={{
              padding: '12px 24px',
              borderRadius: '16px',
              border: `2px solid ${colors.primary}`,
              backgroundColor: 'white',
              color: colors.primary,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            使用简化版
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      {/* Loading 骨架屏 */}
      <AnimatePresence>
        {loadState === 'loading' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              backgroundColor: colors.bg,
              borderRadius: '20px',
              zIndex: 10,
              minHeight: '500px',
            }}
          >
            {/* 旋转动画 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '48px' }}
            >
              🌟
            </motion.div>
            <p style={{ fontSize: '18px', color: '#666', fontWeight: 'bold' }}>
              正在加载精彩课堂...
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              AI 老师正在准备教学内容
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iframe 容器 */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        title={`OpenMAIC 课堂: ${classroom.title}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        style={{
          width: '100%',
          height: '680px',
          border: 'none',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          opacity: loadState === 'loaded' ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* 悬浮"完成课堂"按钮 */}
      <AnimatePresence>
        {showCompleteBtn && loadState === 'loaded' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={onComplete}
            style={{
              position: 'fixed',
              bottom: '32px',
              right: '32px',
              padding: '16px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: colors.primary,
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✅</span>
            <span>完成课堂</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
