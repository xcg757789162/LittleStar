/**
 * useClassroomNarration Hook
 *
 * 课堂旁白自动播放 — 监听 iframe 场景切换事件，
 * 自动从 Classroom.scenes[].slides[] 提取文本，
 * 通过 ClassroomAudioService 朗读。
 *
 * 设计决策（参见 design.md D3）：
 * - 文本提取优先级：content > title > onomatopoeia > quiz.question
 * - 与 uiStore.voiceEnabled 联动
 * - 场景切换时自动中断旧播放，开始新旁白
 */

import { useEffect, useRef, useCallback } from 'react'
import { getClassroomAudioService } from '@/services/audio/classroom-audio'
import { useUIStore } from '@/stores/uiStore'
import type { Classroom, Slide } from '@/services/openmaic/types'
import type { SceneChangePayload } from '@/hooks/useClassroomBridge'

// ── 文本提取 ────────────────────────────────────────────────

/**
 * 从 Slide 中提取最适合朗读的文本
 * 优先级：content > title > onomatopoeia > quiz.question
 */
function extractNarrationText(slide: Slide): string {
  if (slide.content?.trim()) return slide.content.trim()
  if (slide.title?.trim()) return slide.title.trim()
  if (slide.onomatopoeia?.trim()) return slide.onomatopoeia.trim()
  if (slide.quiz?.question?.trim()) return slide.quiz.question.trim()
  return ''
}

/**
 * 从场景的所有 slides 中提取旁白文本（拼接）
 * 每个 slide 的文本用句号分隔，形成自然停顿
 */
function extractSceneNarration(slides: Slide[]): string {
  return slides
    .map(extractNarrationText)
    .filter(Boolean)
    .join('。')
}

// ── Hook ─────────────────────────────────────────────────────

export interface UseClassroomNarrationOptions {
  /** 课堂数据（包含 scenes/slides） */
  classroom: Classroom | null
  /** 是否启用旁白（通常关联到课堂是否已加载） */
  enabled: boolean
}

/**
 * 课堂旁白自动播放 Hook
 *
 * @example
 * ```tsx
 * const { handleSceneChange } = useClassroomNarration({
 *   classroom: currentClassroom,
 *   enabled: isActive && !isLoading,
 * })
 *
 * // 在 useClassroomBridge 的 onSceneChange 回调中：
 * onSceneChange: handleSceneChange
 * ```
 */
export function useClassroomNarration({
  classroom,
  enabled,
}: UseClassroomNarrationOptions) {
  const audioService = getClassroomAudioService()
  const voiceEnabled = useUIStore((s) => s.voiceEnabled)
  const prevVoiceEnabledRef = useRef(voiceEnabled)
  const currentSceneIndexRef = useRef(-1)

  // ── voiceEnabled 联动 ──────────────────────────────────
  useEffect(() => {
    // 同步 ClassroomAudioService 的启用状态
    audioService.setEnabled(voiceEnabled)

    const prevEnabled = prevVoiceEnabledRef.current
    prevVoiceEnabledRef.current = voiceEnabled

    if (!enabled || !classroom) return

    if (!prevEnabled && voiceEnabled) {
      // false → true：从当前场景恢复播放
      const sceneIndex = currentSceneIndexRef.current
      if (sceneIndex >= 0 && sceneIndex < classroom.scenes.length) {
        const scene = classroom.scenes[sceneIndex]
        const text = extractSceneNarration(scene.slides)
        if (text) {
          void audioService.speak(text, { lang: classroom.language })
        }
      }
    }
    // true → false：ClassroomAudioService.setEnabled(false) 已自动 stop()
  }, [voiceEnabled, enabled, classroom, audioService])

  // ── 场景切换回调 ──────────────────────────────────────
  const handleSceneChange = useCallback(
    (data: SceneChangePayload) => {
      currentSceneIndexRef.current = data.sceneIndex

      if (!enabled || !voiceEnabled || !classroom) return

      // 查找对应场景
      const scene = classroom.scenes[data.sceneIndex]
      if (!scene) {
        console.warn(
          '[useClassroomNarration] sceneIndex 越界:',
          data.sceneIndex,
          '/', classroom.scenes.length,
        )
        return
      }

      const text = extractSceneNarration(scene.slides)
      if (text) {
        // speak() 内部会自动 stop() 旧播放
        void audioService.speak(text, { lang: classroom.language })
      }
    },
    [enabled, voiceEnabled, classroom, audioService],
  )

  // ── 组件卸载时停止播放 ────────────────────────────────
  useEffect(() => {
    return () => {
      audioService.stop()
    }
  }, [audioService])

  return {
    /** 传递给 useClassroomBridge.onSceneChange 的回调 */
    handleSceneChange,
  }
}
