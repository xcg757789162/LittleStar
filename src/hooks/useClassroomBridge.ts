/**
 * useClassroomBridge Hook
 *
 * 管理 LittleStar ↔ OpenMAIC iframe 之间的 postMessage 双向通信。
 * 监听来自 iframe 的事件（答题、课堂完成、导航等），
 * 并提供向 iframe 发送指令的能力。
 */

import { useEffect, useCallback, useRef, useState } from 'react'

// ============================================================
// 通信协议类型
// ============================================================

/** iframe → 宿主：消息类型 */
export type IframeMessageType =
  | 'classroom:ready'        // iframe 课堂加载就绪
  | 'classroom:quiz-answer'  // 用户答题
  | 'classroom:complete'     // 课堂全部完成
  | 'classroom:scene-change' // 场景切换
  | 'classroom:error'        // iframe 内部错误

/** 宿主 → iframe：指令类型 */
export type HostCommandType =
  | 'host:navigate-scene'    // 跳转到指定场景
  | 'host:pause'             // 暂停播放
  | 'host:resume'            // 恢复播放

/** iframe 发来的消息基础结构 */
export interface IframeMessage {
  type: IframeMessageType
  payload?: unknown
}

/** 答题事件 payload */
export interface QuizAnswerPayload {
  sceneId: string
  questionIndex: number
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
}

/** 场景切换事件 payload */
export interface SceneChangePayload {
  sceneId: string
  sceneIndex: number
  totalScenes: number
}

/** 错误事件 payload */
export interface ErrorPayload {
  message: string
  code?: string
}

/** Bridge 事件回调 */
export interface ClassroomBridgeCallbacks {
  /** iframe 课堂加载就绪 */
  onReady?: () => void
  /** 用户在 iframe 中答题 */
  onQuizAnswer?: (data: QuizAnswerPayload) => void
  /** 课堂全部完成 */
  onComplete?: () => void
  /** 场景切换 */
  onSceneChange?: (data: SceneChangePayload) => void
  /** iframe 内部错误 */
  onError?: (data: ErrorPayload) => void
}

/** Hook 返回值 */
export interface ClassroomBridgeReturn {
  /** 向 iframe 发送指令 */
  sendCommand: (type: HostCommandType, payload?: unknown) => void
  /** iframe 是否已就绪 */
  isReady: boolean
}

/**
 * useClassroomBridge
 *
 * @param iframeRef - iframe DOM 元素的 ref
 * @param callbacks - 事件回调（答题、完成、错误等）
 * @param enabled - 是否启用通信监听（默认 true）
 */
export function useClassroomBridge(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  callbacks: ClassroomBridgeCallbacks,
  enabled = true,
): ClassroomBridgeReturn {
  const [isReady, setIsReady] = useState(false)
  // 使用 ref 保存最新 callbacks，避免 useEffect 依赖频繁变化
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  })

  // 消息处理器
  useEffect(() => {
    if (!enabled) return

    const handleMessage = (event: MessageEvent) => {
      // 安全检查：只接受来自 Nginx 网关或同源的消息
      // iframe 直接指向 Nginx (localhost:8080)，宿主在 Vite (localhost:5173)
      const allowedOrigins = [
        window.location.origin,                 // 同源（生产环境）
        'http://localhost:8080',                // Nginx 网关（开发环境）
      ]
      if (!allowedOrigins.includes(event.origin)) return

      const data = event.data as IframeMessage | undefined
      if (!data || typeof data.type !== 'string') return

      // 检查消息是否来自我们的 iframe
      if (!data.type.startsWith('classroom:')) return

      switch (data.type) {
        case 'classroom:ready':
          setIsReady(true)
          callbacksRef.current.onReady?.()
          break

        case 'classroom:quiz-answer':
          callbacksRef.current.onQuizAnswer?.(data.payload as QuizAnswerPayload)
          break

        case 'classroom:complete':
          callbacksRef.current.onComplete?.()
          break

        case 'classroom:scene-change':
          callbacksRef.current.onSceneChange?.(data.payload as SceneChangePayload)
          break

        case 'classroom:error':
          callbacksRef.current.onError?.(data.payload as ErrorPayload)
          break
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      setIsReady(false)
    }
  }, [enabled])

  // 向 iframe 发送指令
  const sendCommand = useCallback(
    (type: HostCommandType, payload?: unknown) => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return

      // iframe 在开发环境指向 Nginx (localhost:8080)，生产环境同源
      const targetOrigin = import.meta.env.DEV
        ? 'http://localhost:8080'
        : window.location.origin

      iframe.contentWindow.postMessage(
        { type, payload },
        targetOrigin,
      )
    },
    [iframeRef],
  )

  return {
    sendCommand,
    isReady,
  }
}
