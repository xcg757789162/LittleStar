/**
 * useAudioActivation Hook
 *
 * 在用户交互的同步调用栈中预激活 AudioContext，
 * 确保后续音频播放不会被浏览器自动播放策略阻止。
 *
 * 设计决策（参见 design.md D2）：
 * - 必须在用户手势（click/tap）的同步调用栈内创建 AudioContext
 * - 创建后立即注入 ClassroomAudioService
 * - 组件卸载时不关闭 AudioContext（由 ClassroomAudioService.dispose() 管理生命周期）
 */

import { useRef, useCallback } from 'react'
import { getClassroomAudioService } from '@/services/audio/classroom-audio'

/**
 * 预激活音频上下文
 *
 * 返回 `activateAudio` 回调，必须在用户点击事件处理函数中**同步调用**。
 * 调用后 ClassroomAudioService 将持有一个已处于 running 状态的 AudioContext。
 *
 * @example
 * ```tsx
 * const { activateAudio, isActivated } = useAudioActivation()
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
      const ctx = new AudioContext()
      const audioService = getClassroomAudioService()
      audioService.setAudioContext(ctx)
      activatedRef.current = true

      console.log('[useAudioActivation] AudioContext 预激活成功, state:', ctx.state)
    } catch (error) {
      console.warn('[useAudioActivation] AudioContext 预激活失败:', error)
      // 失败不阻塞流程——ClassroomAudioService 会在 speak() 时自建 AudioContext（可能 suspended）
    }
  }, [])

  return {
    /** 激活 AudioContext（在 click/tap handler 同步调用栈中调用） */
    activateAudio,
  }
}
