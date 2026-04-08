export { TTSService } from './tts'
export type { TTSConfig } from './tts'
export { STTService } from './stt'
export type { STTConfig } from './stt'
export { WebSpeechFallback } from './web-speech-fallback'

// ===== 发音评估模块 =====

// Provider 接口与工厂
export { createAssessmentProvider } from './pronunciation'
export type { PronunciationAssessmentProvider } from './pronunciation/assessment-provider'

// 具体 Provider 实现
export { IflytekISEProvider } from './pronunciation'
export type { IflytekISEConfig } from './pronunciation/iflytek-ise-provider'
export { TextMatchFallbackProvider } from './pronunciation'

// 类型
export type {
  PronunciationScore,
  PhonemeScore,
  TeacherFeedback,
  SyllableBreakdown,
  PronunciationSession,
  AssessmentOptions,
  ProviderConfig,
} from './pronunciation'

// 幼儿评分策略
export {
  applyChildAdjustments,
  scoreToStars,
  CHILD_SCORING_ADJUSTMENTS,
} from './pronunciation'
export type { ChildAdjustmentResult } from './pronunciation/child-scoring'

// 音节拆分
export { splitSyllables } from './pronunciation'

// 反馈模板
export { selectFeedback, getTemplateCount, FEEDBACK_PHASES } from './pronunciation'
export type { FeedbackPhase, FeedbackVariables } from './pronunciation'

// 纠音编排器
export { PronunciationCoordinator } from './pronunciation'
export type {
  CoordinatorConfig,
  CoordinatorState,
  CoordinatorPhase,
  CoordinatorProvider,
  CoordinatorTTS,
  AssessResult,
  ProviderScore,
} from './pronunciation'

// ===== 集成函数 =====

import type { LearningRecord } from '../../types/models'

/** 创建发音学习记录参数 */
export interface CreatePronunciationRecordParams {
  childId: string
  knowledgeNodeId: string
  questionId: string
  word: string
  pronunciationScore: number
  pronunciationStars: number
  timeSpent: number
  attemptCount: number
}

/**
 * 创建包含发音评分的学习记录
 * ≥3 星视为正确
 */
export function createPronunciationRecord(params: CreatePronunciationRecordParams): LearningRecord {
  return {
    childId: params.childId,
    knowledgeNodeId: params.knowledgeNodeId,
    questionId: params.questionId,
    answer: params.word,
    isCorrect: params.pronunciationStars >= 3,
    timeSpent: params.timeSpent,
    attemptCount: params.attemptCount,
    timestamp: new Date(),
    pronunciationScore: params.pronunciationScore,
    pronunciationStars: params.pronunciationStars,
  }
}
