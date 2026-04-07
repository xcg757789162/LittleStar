/**
 * 复习调度器
 * 基于 SM-2 变体的间隔重复算法
 */

/** 计算下次复习的输入参数 */
export interface ReviewInput {
  /** 当前掌握率 (0-100) */
  masteryLevel: number
  /** 连续正确次数 */
  consecutiveCorrect: number
  /** 本次是否回答正确 */
  isCorrect: boolean
  /** 上次复习间隔（天数） */
  previousInterval: number
}

/** 优先队列项 */
export interface PrioritizableItem {
  id: string
  nextReviewDate: Date
  masteryLevel: number
}

/** 调度器配置 */
export interface SchedulerConfig {
  /** 最小间隔（天） */
  minInterval: number
  /** 最大间隔（天） */
  maxInterval: number
  /** 答错后的间隔（天） */
  wrongAnswerInterval: number
  /** 初始难度系数 */
  initialEaseFactor: number
  /** 最小难度系数 */
  minEaseFactor: number
  /** 最大难度系数 */
  maxEaseFactor: number
}

const DEFAULT_CONFIG: SchedulerConfig = {
  minInterval: 1,
  maxInterval: 30,
  wrongAnswerInterval: 0.5, // 半天后复习
  initialEaseFactor: 2.5,
  minEaseFactor: 1.3,
  maxEaseFactor: 3.0,
}

/**
 * SM-2 变体复习调度器
 */
export class ReviewScheduler {
  private config: SchedulerConfig

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 计算下次复习日期
   */
  calculateNextReview(input: ReviewInput): Date {
    const { masteryLevel, consecutiveCorrect, isCorrect, previousInterval } = input
    const now = new Date()

    if (!isCorrect) {
      // 答错：短间隔复习
      const interval = Math.min(this.config.wrongAnswerInterval, 1)
      return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)
    }

    // 答对：基于 SM-2 算法计算间隔
    let interval: number

    if (consecutiveCorrect <= 1) {
      // 首次正确或刚从错误恢复
      interval = this.config.minInterval
    } else if (consecutiveCorrect === 2) {
      // 连续 2 次正确
      interval = Math.max(previousInterval * 1.5, 2)
    } else {
      // 连续 3+ 次正确，间隔逐步加大
      const easeFactor = this.getEaseFactorFromMastery(masteryLevel)
      interval = previousInterval * easeFactor
    }

    // 掌握率加成：掌握率越高，间隔越长
    const masteryBonus = 1 + (masteryLevel / 100) * 0.5
    interval = interval * masteryBonus

    // 限制在最小/最大间隔内
    interval = Math.max(this.config.minInterval, Math.min(this.config.maxInterval, interval))

    return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)
  }

  /**
   * 调整难度系数（Ease Factor）
   * 答对 +0.1，答错 -0.2（SM-2 标准调整）
   */
  adjustEaseFactor(currentEF: number, isCorrect: boolean): number {
    let newEF: number

    if (isCorrect) {
      newEF = currentEF + 0.1
    } else {
      newEF = currentEF - 0.2
    }

    return Math.max(this.config.minEaseFactor, Math.min(this.config.maxEaseFactor, newEF))
  }

  /**
   * 按复习紧急度排序
   * 过期越久优先级越高，同等过期程度下掌握率低的优先
   */
  prioritize<T extends PrioritizableItem>(items: T[]): T[] {
    const now = Date.now()

    return [...items].sort((a, b) => {
      // 计算过期程度（正数=已过期，负数=未到期）
      const overdueA = now - a.nextReviewDate.getTime()
      const overdueB = now - b.nextReviewDate.getTime()

      // 过期越久排越前（降序）
      if (Math.abs(overdueA - overdueB) > 60 * 1000) {
        return overdueB - overdueA
      }

      // 同样过期程度，掌握率低的优先
      return a.masteryLevel - b.masteryLevel
    })
  }

  /**
   * 从掌握率推导简化的难度系数
   */
  private getEaseFactorFromMastery(masteryLevel: number): number {
    // 掌握率越高 → 难度系数越高 → 间隔越长
    const base = this.config.minEaseFactor
    const range = this.config.maxEaseFactor - base
    return base + (masteryLevel / 100) * range
  }
}
