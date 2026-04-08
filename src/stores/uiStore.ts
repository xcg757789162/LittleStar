import { create } from 'zustand'

/** 主题类型 */
export type Theme = 'light' | 'dark'

/** 字体大小 */
export type FontSize = 'normal' | 'large' | 'extra-large'

/** 发音练习阶段 */
export type PronunciationPhase = 'idle' | 'listening' | 'recording' | 'assessing' | 'feedback' | 'drilling'

/** uiStore 状态接口 */
export interface UIState {
  /** 主题 */
  theme: Theme
  /** 语音开关 */
  voiceEnabled: boolean
  /** 音效开关 */
  soundEffectsEnabled: boolean
  /** 是否家长模式 */
  isParentMode: boolean
  /** 字体大小 */
  fontSize: FontSize
  /** 是否加载中 */
  isLoading: boolean
  /** 错误消息 */
  error: string | null
  /** 发音练习当前阶段 */
  pronunciationPhase: PronunciationPhase
  /** 是否正在录制发音 */
  isRecordingPronunciation: boolean
}

/** uiStore 操作接口 */
export interface UIActions {
  /** 设置主题 */
  setTheme: (theme: Theme) => void
  /** 设置语音开关 */
  setVoiceEnabled: (enabled: boolean) => void
  /** 设置音效开关 */
  setSoundEffectsEnabled: (enabled: boolean) => void
  /** 进入家长模式 */
  enterParentMode: () => void
  /** 退出家长模式 */
  exitParentMode: () => void
  /** 设置字体大小 */
  setFontSize: (size: FontSize) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置错误消息 */
  setError: (error: string) => void
  /** 清除错误消息 */
  clearError: () => void
  /** 设置发音练习阶段 */
  setPronunciationPhase: (phase: PronunciationPhase) => void
  /** 设置是否正在录制发音 */
  setIsRecordingPronunciation: (recording: boolean) => void
  /** 重置到初始状态 */
  reset: () => void
}

/** uiStore 初始状态 */
const initialState: UIState = {
  theme: 'light',
  voiceEnabled: true,
  soundEffectsEnabled: true,
  isParentMode: false,
  fontSize: 'large',
  isLoading: false,
  error: null,
  pronunciationPhase: 'idle',
  isRecordingPronunciation: false,
}

/**
 * UI 状态 Store
 * 管理主题、语音开关、家长模式、全局 UI 状态
 */
export const useUIStore = create<UIState & UIActions>()((set) => ({
  ...initialState,

  setTheme: (theme) => set({ theme }),

  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),

  setSoundEffectsEnabled: (enabled) => set({ soundEffectsEnabled: enabled }),

  enterParentMode: () => set({ isParentMode: true }),

  exitParentMode: () => set({ isParentMode: false }),

  setFontSize: (size) => set({ fontSize: size }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setPronunciationPhase: (phase) => set({ pronunciationPhase: phase }),

  setIsRecordingPronunciation: (recording) => set({ isRecordingPronunciation: recording }),

  reset: () => set(initialState),
}))
