/**
 * 发音评分与纠音反馈 — 统一导出
 */

// 类型导出
export type {
  PronunciationScore,
  PhonemeScore,
  TeacherFeedback,
  SyllableBreakdown,
  PronunciationSession,
  AssessmentOptions,
  ProviderConfig,
} from './types'

// Provider 接口与工厂
export type { PronunciationAssessmentProvider } from './assessment-provider'
export { createAssessmentProvider } from './assessment-provider'

// 具体 Provider 实现
export { IflytekISEProvider } from './iflytek-ise-provider'
export type { IflytekISEConfig } from './iflytek-ise-provider'
export { TextMatchFallbackProvider } from './text-match-fallback'

// 幼儿评分策略
export {
  applyChildAdjustments,
  scoreToStars,
  CHILD_SCORING_ADJUSTMENTS,
} from './child-scoring'
export type { ChildAdjustmentResult } from './child-scoring'

// 音节拆分
export { splitSyllables } from './syllable-splitter'

// 反馈模板
export { selectFeedback, getTemplateCount, FEEDBACK_PHASES } from './feedback-templates'
export type { FeedbackPhase, FeedbackVariables } from './feedback-templates'

// 纠音编排器
export { PronunciationCoordinator } from './pronunciation-coordinator'
export type {
  CoordinatorConfig,
  CoordinatorState,
  CoordinatorPhase,
  CoordinatorProvider,
  CoordinatorTTS,
  AssessResult,
  ProviderScore,
} from './pronunciation-coordinator'
