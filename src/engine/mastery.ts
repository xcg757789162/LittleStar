/**
 * 掌握率计算引擎
 * 综合正确率、连续正确加权、艾宾浩斯遗忘曲线衰减
 */

/** 掌握率计算输入参数 */
export interface MasteryInput {
  /** 总尝试次数 */
  totalAttempts: number
  /** 总正确次数 */
  totalCorrect: number
  /** 当前连续正确次数 */
  consecutiveCorrect: number
  /** 最近一次练习时间 */
  lastPracticed: Date
}

/** 掌握率计算器配置 */
export interface MasteryConfig {
  /** 正确率权重（默认 0.6） */
  correctRateWeight: number
  /** 连续正确加权权重（默认 0.2） */
  streakWeight: number
  /** 遗忘曲线权重（默认 0.2） */
  retentionWeight: number
  /** 连续正确封顶值（默认 10） */
  maxStreakBonus: number
  /** 遗忘曲线半衰期（天，默认 7） */
  halfLifeDays: number
}

/** 默认配置 */
const DEFAULT_CONFIG: MasteryConfig = {
  correctRateWeight: 0.6,
  streakWeight: 0.2,
  retentionWeight: 0.2,
  maxStreakBonus: 10,
  halfLifeDays: 7,
}

/**
 * 掌握率计算器
 * 
 * 公式：mastery = (correctRate * w1 + streakBonus * w2) * retentionFactor
 * 
 * - correctRate: totalCorrect / totalAttempts (0~1)
 * - streakBonus: min(consecutiveCorrect, maxCap) / maxCap (0~1)
 * - retentionFactor: exp(-daysSincePractice * ln(2) / halfLife) (0~1)
 */
export class MasteryCalculator {
  private config: MasteryConfig

  constructor(config?: Partial<MasteryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 计算掌握率（0-100）
   */
  calculate(input: MasteryInput): number {
    const { totalAttempts, totalCorrect, consecutiveCorrect, lastPracticed } = input

    // 无尝试返回 0
    if (totalAttempts === 0) return 0

    // 1. 基础正确率（0~1）
    const correctRate = totalCorrect / totalAttempts

    // 2. 连续正确加权（0~1），封顶在 maxStreakBonus
    const cappedStreak = Math.min(consecutiveCorrect, this.config.maxStreakBonus)
    const streakBonus = cappedStreak / this.config.maxStreakBonus

    // 3. 综合基础分（加权平均），映射到 0~100
    const { correctRateWeight, streakWeight } = this.config
    const baseWeight = correctRateWeight + streakWeight
    const baseScore =
      ((correctRate * correctRateWeight + streakBonus * streakWeight) / baseWeight) * 100

    // 4. 遗忘曲线衰减因子（0~1）
    const retentionFactor = this.calculateRetention(lastPracticed)

    // 5. 最终掌握率 = 基础分 * (基础权重 + 保持率 * 保持权重)  / (基础权重 + 保持权重)
    //    简化为：mastery = baseScore * retentionFactor
    //    当 retentionFactor = 1（刚练过），掌握率 = baseScore
    //    当 retentionFactor → 0（很久没练），掌握率 → 0
    const mastery = baseScore * retentionFactor

    // 限制在 0-100 范围
    return Math.max(0, Math.min(100, Math.round(mastery)))
  }

  /**
   * 计算艾宾浩斯遗忘保持率
   * retention = exp(-t * ln(2) / halfLife)
   * 其中 t = 距离上次练习的天数
   */
  private calculateRetention(lastPracticed: Date): number {
    const now = new Date()
    const daysSince =
      (now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince <= 0) return 1 // 今天练过

    return Math.exp((-daysSince * Math.LN2) / this.config.halfLifeDays)
  }
}
