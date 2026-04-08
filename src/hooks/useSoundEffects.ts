/**
 * useSoundEffects Hook
 * 封装音效服务，方便在组件中使用
 * 自动关联 uiStore.soundEffectsEnabled 开关
 */

import { useCallback, useEffect, useRef } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { getSoundEffectsService } from '@/services/audio/sound-effects'
import type { SoundEffectType } from '@/services/audio/sound-effects'

export interface UseSoundEffectsReturn {
  /** 播放答对音效 */
  playCorrect: () => void
  /** 播放答错音效 */
  playWrong: () => void
  /** 播放庆祝音效 */
  playCelebration: () => void
  /** 播放星星获得音效 */
  playStar: () => void
  /** 播放升级音效 */
  playLevelUp: () => void
  /** 播放任意音效 */
  play: (type: SoundEffectType) => void
  /** 是否启用 */
  isEnabled: boolean
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const soundEffectsEnabled = useUIStore((s) => s.soundEffectsEnabled)
  const serviceRef = useRef(getSoundEffectsService())

  // 同步 uiStore 开关到音效服务
  useEffect(() => {
    serviceRef.current.setEnabled(soundEffectsEnabled)
  }, [soundEffectsEnabled])

  const play = useCallback((type: SoundEffectType) => {
    serviceRef.current.play(type)
  }, [])

  const playCorrect = useCallback(() => {
    serviceRef.current.play('correct')
  }, [])

  const playWrong = useCallback(() => {
    serviceRef.current.play('wrong')
  }, [])

  const playCelebration = useCallback(() => {
    serviceRef.current.play('celebration')
  }, [])

  const playStar = useCallback(() => {
    serviceRef.current.play('star')
  }, [])

  const playLevelUp = useCallback(() => {
    serviceRef.current.play('levelUp')
  }, [])

  return {
    playCorrect,
    playWrong,
    playCelebration,
    playStar,
    playLevelUp,
    play,
    isEnabled: soundEffectsEnabled,
  }
}
