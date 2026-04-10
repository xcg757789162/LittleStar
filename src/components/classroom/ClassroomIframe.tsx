/**
 * ClassroomIframe 组件
 *
 * 通过 iframe 嵌入 OpenMAIC 原生前端的课堂页面，
 * 获得完整的课堂体验：角色系统、画布渲染、TTS 语音、动作编排。
 *
 * 特性：
 * - 加载状态动画（骨架屏）
 * - 超时后提供重试选项
 * - 悬浮"完成课堂"按钮
 * - postMessage 通信桥监听答题和完成事件
 *
 * 架构：iframe 直接指向 Nginx 网关（开发环境 localhost:8080），
 * 确保 OpenMAIC Next.js 前端内部的所有 API 请求能正确到达后端。
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
  /** 课堂中已答题数量（用于判断是否可以完成课堂） */
  answerCount?: number
}

/** iframe 加载状态 */
type LoadState = 'loading' | 'loaded' | 'error' | 'timeout'

/** 分层超时配置 */
const SLOW_HINT_MS = 30_000   // 30s: 显示"加载较慢"提示 + 重试按钮（iframe 继续加载）
const HARD_TIMEOUT_MS = 60_000 // 60s: 标记为超时，停止加载

/** 学科配色 — Sunny Playground 风格 */
const SUBJECT_COLORS: Record<string, { primary: string; bg: string }> = {
  math: { primary: '#FF8C42', bg: '#FFF3E7' },
  chinese: { primary: '#2EC4B6', bg: '#E8FFF9' },
  english: { primary: '#5BC0EB', bg: '#E8F6FF' },
}

/**
 * 将后端返回的 classroomUrl 转换为可嵌入 iframe 的完整 URL
 *
 * **关键设计**：iframe 必须直接指向 Nginx 网关（localhost:8080），而不是通过 Vite proxy。
 * 原因：OpenMAIC 是 Next.js 应用，iframe 加载后其内部 JS 会发起 /api/... 等请求。
 * 如果 iframe src 走 Vite proxy（localhost:5173），这些内部请求也会打到 Vite，
 * 但 Vite 没有代理 OpenMAIC 的 /api/classroom 等路由 → 请求失败 → 页面卡在"加载中"。
 * 直接指向 Nginx 可以保证 iframe 内所有请求都走 Nginx → OpenMAIC 服务。
 */
function toEmbedUrl(classroomUrl: string): string {
  // Nginx 网关地址（开发环境 8080，生产环境由 window.location 决定）
  const nginxOrigin = import.meta.env.DEV
    ? 'http://localhost:8080'
    : window.location.origin

  // 如果已经是完整 URL，提取路径部分
  if (classroomUrl.startsWith('http')) {
    try {
      const url = new URL(classroomUrl)
      return `${nginxOrigin}/openmaic${url.pathname}${url.search}`
    } catch {
      return `${nginxOrigin}/openmaic${classroomUrl}`
    }
  }

  // 去掉已有的 /openmaic 前缀（避免双重拼接）
  let path = classroomUrl
  if (path.startsWith('/openmaic')) {
    path = path.slice('/openmaic'.length)
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  return `${nginxOrigin}/openmaic${path}`
}

export function ClassroomIframe({
  classroom,
  subject,
  onComplete,
  onAnswer,
  answerCount = 0,
}: ClassroomIframeProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [showSlowHint, setShowSlowHint] = useState(false) // 30s 后显示"加载较慢"横幅
  const [showCompleteBtn, setShowCompleteBtn] = useState(false)
  const [minTimeReached, setMinTimeReached] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const slowHintRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colors = SUBJECT_COLORS[subject ?? ''] ?? SUBJECT_COLORS.math

  // 构建 iframe src URL（直接指向 Nginx，不走 Vite proxy）
  const iframeSrc = classroom.classroomUrl
    ? toEmbedUrl(classroom.classroomUrl)
    : null

  // 清除所有超时计时器（抽取为函数，onReady 和 cleanup 共用）
  const clearAllTimers = useCallback(() => {
    if (slowHintRef.current) {
      clearTimeout(slowHintRef.current)
      slowHintRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // postMessage 通信桥
  useClassroomBridge(iframeRef, {
    onReady: () => {
      setLoadState('loaded')
      setShowSlowHint(false)
      clearAllTimers()
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
      clearAllTimers()
    },
  }, !!iframeSrc)

  // 分层超时检测：
  // - 30s (SLOW_HINT_MS): 显示"加载较慢"提示 + 重试按钮（iframe 继续加载）
  // - 60s (HARD_TIMEOUT_MS): 标记为 timeout，停止等待
  useEffect(() => {
    if (!iframeSrc || loadState !== 'loading') return

    // 第一层：30s 显示慢加载提示
    slowHintRef.current = setTimeout(() => {
      setShowSlowHint(true)
    }, SLOW_HINT_MS)

    // 第二层：60s 硬超时
    timeoutRef.current = setTimeout(() => {
      setLoadState((prev) => (prev === 'loading' ? 'timeout' : prev))
    }, HARD_TIMEOUT_MS)

    return clearAllTimers
  }, [iframeSrc, loadState, clearAllTimers])

  // iframe onLoad 事件（备用 — postMessage ready 信号更可靠）
  const handleIframeLoad = useCallback(() => {
    // 给 OpenMAIC 前端更多时间初始化
    // 如果 8 秒后还没收到 ready 消息，也标记为 loaded
    iframeLoadTimerRef.current = setTimeout(() => {
      setLoadState((prev) => (prev === 'loading' ? 'loaded' : prev))
    }, 8000)
  }, [])

  // 60 秒后设置"最小浏览时间已到"标志（给用户足够时间浏览课堂内容）
  useEffect(() => {
    if (loadState === 'loaded') {
      const timer = setTimeout(() => setMinTimeReached(true), 60000)
      return () => clearTimeout(timer)
    }
  }, [loadState])

  // "完成课堂"按钮显示条件：
  // 1. iframe 已加载 (loaded)
  // 2. 并且满足以下任一条件：
  //    a) 用户已答过至少 1 题（说明已与课堂交互）
  //    b) 最小浏览时间已到（60 秒，用于没有答题的纯浏览课堂）
  useEffect(() => {
    if (loadState === 'loaded' && (answerCount > 0 || minTimeReached)) {
      const timer = setTimeout(() => setShowCompleteBtn(true), 0)
      return () => clearTimeout(timer)
    }
  }, [loadState, answerCount, minTimeReached])

  // 组件卸载时清理所有计时器
  useEffect(() => {
    return () => {
      clearAllTimers()
      if (iframeLoadTimerRef.current) clearTimeout(iframeLoadTimerRef.current)
    }
  }, [clearAllTimers])

  // 无 classroomUrl → 显示错误提示
  if (!iframeSrc) {
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
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <p style={{ fontSize: '18px', color: '#666' }}>
          课堂 URL 不可用，请重新生成课堂
        </p>
      </div>
    )
  }

  // 超时或错误 → 提供重试选项
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
        <button
          onClick={() => {
            setLoadState('loading')
            setShowSlowHint(false)
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
          🔄 重试
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
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
              minHeight: 'calc(100vh - 56px)',
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

            {/* 30s 慢加载提示：显示提醒 + 重试按钮，但 iframe 仍在后台继续加载 */}
            <AnimatePresence>
              {showSlowHint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: '12px',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    backgroundColor: '#FFF3E7',
                    border: '2px solid #FFD6A5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#E67E22', fontWeight: 600, margin: 0 }}>
                    ⏳ 加载时间较长，可能是网络较慢
                  </p>
                  <button
                    onClick={() => {
                      setShowSlowHint(false)
                      setLoadState('loading')
                      clearAllTimers()
                      // 强制刷新 iframe
                      if (iframeRef.current && iframeSrc) {
                        iframeRef.current.src = iframeSrc
                      }
                    }}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: colors.primary,
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 重试加载
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iframe 容器 */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        title={`OpenMAIC 课堂: ${classroom.title}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals"
        allow="autoplay *; microphone; fullscreen; web-share"
        style={{
          width: '100%',
          height: 'calc(100vh - 56px)',
          border: 'none',
          borderRadius: '0',
          boxShadow: 'none',
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
