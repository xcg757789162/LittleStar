/**
 * useClassroomBridge Hook
 *
 * 管理 LittleStar ↔ OpenMAIC iframe 之间的 postMessage 双向通信。
 * 监听来自 iframe 的事件（答题、课堂完成、导航等），
 * 并提供向 iframe 发送指令的能力。
 *
 * 安全机制：
 * - origin 白名单校验（支持环境变量配置生产域名）
 * - event.source 校验（确保消息来自目标 iframe，而非其他窗口）
 * - payload 运行时结构化校验（防止恶意伪造消息）
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
  | 'classroom:tts-request'  // iframe 请求宿主代为 TTS 播放

/** 宿主 → iframe：指令类型 */
export type HostCommandType =
  | 'host:navigate-scene'    // 跳转到指定场景
  | 'host:pause'             // 暂停播放
  | 'host:resume'            // 恢复播放
  | 'host:tts-done'          // TTS 播放完成响应
  | 'host:mute-internal'     // 请求 iframe 静默内部 TTS

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

/** TTS 委托请求 payload（iframe → 宿主） */
export interface TTSRequestPayload {
  /** 要朗读的文本 */
  text: string
  /** 语言代码（可选） */
  lang?: string
}

// ============================================================
// Payload 运行时校验函数
// ============================================================

/** 校验 QuizAnswerPayload 结构 */
function isQuizAnswerPayload(value: unknown): value is QuizAnswerPayload {
  if (value === null || value === undefined || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.sceneId === 'string' &&
    typeof obj.questionIndex === 'number' &&
    typeof obj.selectedAnswer === 'number' &&
    typeof obj.correctAnswer === 'number' &&
    typeof obj.isCorrect === 'boolean'
  )
}

/** 校验 SceneChangePayload 结构 */
function isSceneChangePayload(value: unknown): value is SceneChangePayload {
  if (value === null || value === undefined || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.sceneId === 'string' &&
    typeof obj.sceneIndex === 'number' &&
    typeof obj.totalScenes === 'number'
  )
}

/** 校验 ErrorPayload 结构 */
function isErrorPayload(value: unknown): value is ErrorPayload {
  if (value === null || value === undefined || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.message === 'string' &&
    (obj.code === undefined || typeof obj.code === 'string')
  )
}

/** 校验 TTSRequestPayload 结构 */
function isTTSRequestPayload(value: unknown): value is TTSRequestPayload {
  if (value === null || value === undefined || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.text === 'string' &&
    (obj.lang === undefined || typeof obj.lang === 'string')
  )
}

// ============================================================
// 构建 origin 白名单
// ============================================================

/** 构建允许的 origin 列表（支持环境变量配置） */
function getAllowedOrigins(): string[] {
  const origins = [
    window.location.origin,  // 同源（生产环境）
  ]
  // 开发环境允许 Nginx 网关
  if (import.meta.env.DEV) {
    origins.push('http://localhost:8080')
  }
  // 支持通过环境变量配置额外的生产环境 origin
  const extraOrigin = import.meta.env.VITE_OPENMAIC_ORIGIN
  if (extraOrigin && typeof extraOrigin === 'string') {
    origins.push(extraOrigin)
  }
  return origins
}

// ============================================================
// Hook 类型
// ============================================================

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
  /** iframe 请求宿主代为 TTS 播放 */
  onTTSRequest?: (data: TTSRequestPayload) => void
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

    const allowedOrigins = getAllowedOrigins()

    const handleMessage = (event: MessageEvent) => {
      // 安全检查 1：origin 白名单
      if (!allowedOrigins.includes(event.origin)) return

      // 安全检查 2：event.source 必须来自目标 iframe
      // 如果 iframeRef.current 为 null（iframe 尚未挂载或已卸载），
      // 记录警告并拒绝消息，防止其他窗口伪造消息
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) {
        console.warn(
          '[useClassroomBridge] 收到消息但 iframe 未就绪，已忽略。origin:',
          event.origin,
        )
        return
      }
      if (event.source !== iframe.contentWindow) {
        console.warn(
          '[useClassroomBridge] 消息 source 不匹配目标 iframe，已拒绝。origin:',
          event.origin,
        )
        return
      }

      // 基础结构校验
      const data = event.data as IframeMessage | undefined
      if (!data || typeof data.type !== 'string') return

      // 检查消息是否来自我们的 iframe（namespace 前缀）
      if (!data.type.startsWith('classroom:')) return

      switch (data.type) {
        case 'classroom:ready':
          setIsReady(true)
          callbacksRef.current.onReady?.()
          break

        case 'classroom:quiz-answer':
          // 运行时校验 payload 结构
          if (isQuizAnswerPayload(data.payload)) {
            callbacksRef.current.onQuizAnswer?.(data.payload)
          } else {
            console.warn('[useClassroomBridge] quiz-answer payload 校验失败:', data.payload)
          }
          break

        case 'classroom:complete':
          callbacksRef.current.onComplete?.()
          break

        case 'classroom:scene-change':
          // 运行时校验 payload 结构
          if (isSceneChangePayload(data.payload)) {
            callbacksRef.current.onSceneChange?.(data.payload)
          } else {
            console.warn('[useClassroomBridge] scene-change payload 校验失败:', data.payload)
          }
          break

        case 'classroom:error':
          // 运行时校验 payload 结构
          if (isErrorPayload(data.payload)) {
            callbacksRef.current.onError?.(data.payload)
          } else {
            console.warn('[useClassroomBridge] error payload 校验失败:', data.payload)
          }
          break

        case 'classroom:tts-request':
          // iframe 请求宿主代为播放 TTS（绕过 iframe AudioContext 限制）
          if (isTTSRequestPayload(data.payload)) {
            callbacksRef.current.onTTSRequest?.(data.payload)
          } else {
            console.warn('[useClassroomBridge] tts-request payload 校验失败:', data.payload)
          }
          break
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      setIsReady(false)
    }
  }, [enabled, iframeRef])

  // 向 iframe 发送指令
  const sendCommand = useCallback(
    (type: HostCommandType, payload?: unknown) => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) {
        console.warn('[useClassroomBridge] 无法发送指令：iframe 未就绪')
        return
      }

      // iframe 在开发环境指向 Nginx (localhost:8080)，生产环境同源
      // 支持通过环境变量配置生产域名
      const targetOrigin = import.meta.env.DEV
        ? 'http://localhost:8080'
        : (import.meta.env.VITE_OPENMAIC_ORIGIN || window.location.origin)

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
