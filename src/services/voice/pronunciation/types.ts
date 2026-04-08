/**
 * 发音评分与纠音反馈 — 核心类型定义
 */

/** 发音评分结果 */
export interface PronunciationScore {
  /** 总分 0-100 */
  overallScore: number
  /** 星级评定 1-5 */
  stars: 1 | 2 | 3 | 4 | 5
  /** 音素级评分详情 */
  phonemeScores: PhonemeScore[]
  /** 流利度 0-100 */
  fluencyScore: number
  /** 完整度 0-100 */
  completenessScore: number
  /** AI 老师反馈 */
  feedback: TeacherFeedback
}

/** 音素级评分 */
export interface PhonemeScore {
  /** 音素符号，如 "/æ/" */
  phoneme: string
  /** 评分 0-100 */
  score: number
  /** 期望发音 */
  expected: string
  /** 实际发音（如可检测） */
  actual?: string
  /** 所属音节索引 */
  syllableIndex: number
}

/** AI 老师反馈 */
export interface TeacherFeedback {
  /** 口头反馈（TTS 播报） */
  teacherSay: string
  /** 鼓励语 */
  encouragement: string
  /** 薄弱环节提示 */
  focusArea?: string
  /** 下一步操作 */
  nextAction: 'pass' | 'retry_slow' | 'drill_syllable' | 'final_encourage'
}

/** 音节拆分结果 */
export interface SyllableBreakdown {
  /** 完整单词 */
  word: string
  /** 音节数组，如 ["el", "e", "phant"] */
  syllables: string[]
  /** 重音音节索引 */
  stressIndex: number
}

/** 纠音会话状态 */
export interface PronunciationSession {
  /** 当前练习的单词 */
  word: string
  /** 期望的发音文本 */
  expectedText: string
  /** 当前纠音阶段 */
  currentPhase:
    | 'initial'
    | 'c2_retry_1'
    | 'c2_retry_2'
    | 'c1_drill'
    | 'c1_final'
    | 'completed'
  /** 历次评分记录 */
  attempts: PronunciationScore[]
  /** 最佳得分 */
  bestScore: number
  /** 最终星级 */
  finalStars: number
}

/** 评估选项 */
export interface AssessmentOptions {
  /** 年龄组 */
  ageGroup?: 'child' | 'teen' | 'adult'
  /** 评分严格度 */
  strictness?: 'lenient' | 'normal' | 'strict'
  /** 是否返回音素级详情 */
  enablePhonemeDetail?: boolean
}

/** Provider 配置 */
export interface ProviderConfig {
  /** 讯飞 API Key */
  iflytekApiKey?: string
  /** 讯飞 App ID */
  iflytekAppId?: string
  /** 讯飞 API Secret */
  iflytekApiSecret?: string
}
