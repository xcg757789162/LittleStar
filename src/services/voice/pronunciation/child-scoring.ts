/**
 * 幼儿宽容评分策略
 * 保护幼儿自信心：40 分保底 + 永不 0 星 + 适度加分
 */

/** 幼儿评分调整配置 */
export const CHILD_SCORING_ADJUSTMENTS = {
  /** 最低可接受分数（低于此视为"没说"） */
  minAcceptableScore: 40,
  /** 星级阈值 [1★, 2★, 3★, 4★, 5★] */
  starThresholds: [40, 55, 70, 85, 95] as const,
  /** 通过阈值（≥ 3 星） */
  passThreshold: 70,
  /** 忽略的评分维度（幼儿不考核这些） */
  ignorePatterns: ['tone', 'stress', 'rhythm'] as const,
  /** 重点评估维度 */
  focusPatterns: ['initial_consonant', 'vowel'] as const,
  /** 永不给 0 星 */
  neverZeroStars: true,
  /** C2 最大重试次数 */
  maxRetryCount: 2,
  /** C2 语速因子 [第1次, 第2次] */
  c2SpeedFactors: [0.7, 0.5] as const,
} as const

/** 评分调整结果 */
export interface ChildAdjustmentResult {
  /** 原始分数 */
  originalScore: number
  /** 调整后分数 */
  adjustedScore: number
  /** 是否通过（≥ 3 星） */
  passed: boolean
  /** 是否无语音检测 */
  noSpeech: boolean
}

/**
 * 应用幼儿宽容评分调整
 * - 原始分 0 → 返回 0 + noSpeech
 * - 原始分 1-39 → 保底 40
 * - 原始分 40-60 → 加 15 分曲线
 * - 原始分 61-80 → 加 10 分曲线
 * - 原始分 81+ → 加 5 分曲线，上限 100
 */
export function applyChildAdjustments(rawScore: number): ChildAdjustmentResult {
  // 无语音特殊处理
  if (rawScore === 0) {
    return {
      originalScore: 0,
      adjustedScore: 0,
      passed: false,
      noSpeech: true,
    }
  }

  let adjustedScore: number

  if (rawScore < 40) {
    // 保底 40 分
    adjustedScore = CHILD_SCORING_ADJUSTMENTS.minAcceptableScore
  } else if (rawScore <= 60) {
    // 中低分段：加 15 分
    adjustedScore = rawScore + 15
  } else if (rawScore <= 80) {
    // 中高分段：加 10 分
    adjustedScore = rawScore + 10
  } else {
    // 高分段：加 5 分，上限 100
    adjustedScore = Math.min(100, rawScore + 5)
  }

  return {
    originalScore: rawScore,
    adjustedScore,
    passed: adjustedScore >= CHILD_SCORING_ADJUSTMENTS.passThreshold,
    noSpeech: false,
  }
}

/**
 * 分数转星级
 * 基于 starThresholds: [40, 55, 70, 85, 95]
 * 永不给 0 星（neverZeroStars）
 */
export function scoreToStars(score: number): 1 | 2 | 3 | 4 | 5 {
  const thresholds = CHILD_SCORING_ADJUSTMENTS.starThresholds
  if (score >= thresholds[4]) return 5
  if (score >= thresholds[3]) return 4
  if (score >= thresholds[2]) return 3
  if (score >= thresholds[1]) return 2
  // 永不给 0 星
  return 1
}
