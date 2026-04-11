/**
 * useAudioActivation Hook
 *
 * 在用户交互的同步调用栈中预激活 AudioContext，
 * 确保后续音频播放不会被浏览器自动播放策略阻止。
 *
 * 必须在用户手势（click/tap）的同步调用栈内创建 AudioContext，
 * 否则浏览器会拒绝自动播放。
 */

import { useRef, useCallback } from 'react'

/** 全局共享的 AudioContext（首次激活后复用） */
let _sharedAudioContext: AudioContext | null = null

/** 获取已激活的 AudioContext（未激活返回 null） */
export function getSharedAudioContext(): AudioContext | null {
  return _sharedAudioContext
}

/**
 * 预激活音频上下文
 *
 * 返回 `activateAudio` 回调，必须在用户点击事件处理函数中**同步调用**。
 *
 * @example
 * ```tsx
 * const { activateAudio } = useAudioActivation()
 *
 * const handleStartLearning = () => {
 *   activateAudio()  // ← 必须在 click handler 同步调用栈内
 *   startLesson(...)
 * }
 * ```
 */
export function useAudioActivation() {
  const activatedRef = useRef(false)

  /**
   * 在用户手势的同步调用栈中激活 AudioContext。
   * 多次调用安全——仅首次激活时创建 AudioContext。
   */
  const activateAudio = useCallback(() => {
    if (activatedRef.current) return

    try {
      if (!_sharedAudioContext || _sharedAudioContext.state === 'closed') {
        _sharedAudioContext = new AudioContext()
      } else if (_sharedAudioContext.state === 'suspended') {
        void _sharedAudioContext.resume()
      }
      activatedRef.current = true
      console.log('[useAudioActivation] AudioContext 预激活成功, state:', _sharedAudioContext.state)
    } catch (error) {
      console.warn('[useAudioActivation] AudioContext 预激活失败:', error)
    }
  }, [])

  return {
    /** 激活 AudioContext（在 click/tap handler 同步调用栈中调用） */
    activateAudio,
  }
}
