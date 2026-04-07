/**
 * 规则引擎
 * 根据年龄、难度、学习状态综合决策
 */

import type { GradeLevel, Subject } from '@/types/models'

// ===== 常量配置 =====

/** 最低难度 */
const MIN_DIFFICULTY = 1
/** 最高难度 */
const MAX_DIFFICULTY = 10

/** 连续答对 N 次触发升难度 */
const CORRECT_STREAK_THRESHOLD = 4
/** 连续答错 N 次触发降难度 */
const WRONG_STREAK_THRESHOLD = 2

/** 准确率舒适区（不调整难度） */
const COMFORT_ACCURACY_LOW = 0.6
const COMFORT_ACCURACY_HIGH = 0.85

/** 疲劳检测阈值 */
const FATIGUE_DURATION_MINUTES = 20
const FATIGUE_ACCURACY_THRESHOLD = 0.4
const FATIGUE_RESPONSE_TIME_THRESHOLD = 7000 // ms

/** 时限警告阈值（剩余分钟数） */
const SESSION_WARNING_MINUTES = 10

// ===== 接口定义 =====

/** 难度调整输入 */
export interface DifficultyInput {
  currentDifficulty: number
  consecutiveCorrect: number
  consecutiveWrong: number
  recentAccuracy: number
}

/** 难度调整结果 */
export interface DifficultyResult {
  newDifficulty: number
  reason: string
}

/** 疲劳检测输入 */
export interface FatigueInput {
  sessionDurationMinutes: number
  questionsCompleted: number
  recentAccuracy: number
  averageResponseTimeMs: number
}

/** 疲劳检测结果 */
export interface FatigueResult {
  isFatigued: boolean
  suggestion?: string
}

/** 会话限制输入 */
export interface SessionLimitInput {
  sessionDurationMinutes: number
  dailyLimitMinutes: number
  totalDailyMinutes: number
}

/** 会话限制结果 */
export interface SessionLimitResult {
  shouldStop: boolean
  remainingMinutes: number
  warning?: string
}

/** 综合评估输入 */
export interface EvaluateInput {
  age: number
  gradeLevel: GradeLevel
  currentSubject: Subject
  currentDifficulty: number
  consecutiveCorrect: number
  consecutiveWrong: number
  recentAccuracy: number
  sessionDurationMinutes: number
  questionsCompleted: number
  averageResponseTimeMs: number
  dailyLimitMinutes: number
  totalDailyMinutes: number
}

/** 综合评估结果 */
export interface EvaluateResult {
  adjustedDifficulty: number
  shouldContinue: boolean
  isFatigued: boolean
  difficultyReason: string
  fatigueSuggestion?: string
  sessionWarning?: string
}

// ===== 实现 =====

/**
 * 规则引擎
 * 负责难度调整、疲劳检测、时长限制、综合学习决策
 */
export class RuleEngine {
  /**
   * 调整难度
   * - 连续答对 >= 4 且准确率 > 85% → 升一级
   * - 连续答错 >= 2 或准确率 < 60% → 降一级
   * - 舒适区内不调整
   */
  adjustDifficulty(input: DifficultyInput): DifficultyResult {
    const { currentDifficulty, consecutiveCorrect, consecutiveWrong, recentAccuracy } = input

    // 升难度条件
    if (consecutiveCorrect >= CORRECT_STREAK_THRESHOLD && recentAccuracy > COMFORT_ACCURACY_HIGH) {
      const newDiff = Math.min(currentDifficulty + 1, MAX_DIFFICULTY)
      return {
        newDifficulty: newDiff,
        reason: `连续答对${consecutiveCorrect}题且准确率${(recentAccuracy * 100).toFixed(0)}%，提升难度`,
      }
    }

    // 降难度条件
    if (consecutiveWrong >= WRONG_STREAK_THRESHOLD || recentAccuracy < COMFORT_ACCURACY_LOW) {
      const newDiff = Math.max(currentDifficulty - 1, MIN_DIFFICULTY)
      return {
        newDifficulty: newDiff,
        reason: consecutiveWrong >= WRONG_STREAK_THRESHOLD
          ? `连续答错${consecutiveWrong}题，降低难度`
          : `准确率仅${(recentAccuracy * 100).toFixed(0)}%，降低难度`,
      }
    }

    // 舒适区不调整
    return {
      newDifficulty: currentDifficulty,
      reason: '表现稳定，保持当前难度',
    }
  }

  /**
   * 疲劳检测
   * 满足以下任一条件判定为疲劳：
   * - 学习时长 > 20 分钟
   * - 准确率 < 40%
   * - 平均反应时间 > 7 秒
   */
  detectFatigue(input: FatigueInput): FatigueResult {
    const { sessionDurationMinutes, recentAccuracy, averageResponseTimeMs } = input

    const fatigueReasons: string[] = []

    if (sessionDurationMinutes >= FATIGUE_DURATION_MINUTES) {
      fatigueReasons.push('学习时间较长')
    }

    if (recentAccuracy <= FATIGUE_ACCURACY_THRESHOLD) {
      fatigueReasons.push('准确率下降明显')
    }

    if (averageResponseTimeMs >= FATIGUE_RESPONSE_TIME_THRESHOLD) {
      fatigueReasons.push('反应速度变慢')
    }

    if (fatigueReasons.length > 0) {
      return {
        isFatigued: true,
        suggestion: `检测到${fatigueReasons.join('、')}，建议休息一下再继续哦！`,
      }
    }

    return { isFatigued: false }
  }

  /**
   * 检查会话时长限制
   * totalDailyMinutes 包含之前会话的累计时间
   * sessionDurationMinutes 是当前会话的时间
   * 两者之和与每日限制比较
   */
  checkSessionLimit(input: SessionLimitInput): SessionLimitResult {
    const { sessionDurationMinutes, dailyLimitMinutes, totalDailyMinutes } = input

    const totalUsed = totalDailyMinutes + sessionDurationMinutes
    const remaining = Math.max(0, dailyLimitMinutes - totalUsed)

    // 已达或超过限制
    if (remaining <= 0) {
      return {
        shouldStop: true,
        remainingMinutes: 0,
        warning: '今天的学习时间已经用完啦，明天再来吧！',
      }
    }

    // 接近限制
    if (remaining <= SESSION_WARNING_MINUTES) {
      return {
        shouldStop: false,
        remainingMinutes: remaining,
        warning: `还剩${remaining}分钟就到今天的学习时间啦，加油！`,
      }
    }

    // 正常范围
    return {
      shouldStop: false,
      remainingMinutes: remaining,
    }
  }

  /**
   * 根据年龄获取最大难度限制
   * 4岁 → 最大4, 5岁 → 最大6, 6岁 → 最大8
   */
  getMaxDifficultyForAge(age: number): number {
    if (age <= 4) return 4
    if (age <= 5) return 6
    if (age <= 6) return 8
    return MAX_DIFFICULTY
  }

  /**
   * 根据年级推荐每次会话的题目数量
   */
  getRecommendedQuestionsPerSession(gradeLevel: GradeLevel): number {
    switch (gradeLevel) {
      case 'middle-kindergarten':
        return 10
      case 'senior-kindergarten':
        return 15
      default:
        return 10
    }
  }

  /**
   * 根据科目推荐单次学习时长（分钟）
   */
  getRecommendedSessionMinutes(subject: Subject): number {
    switch (subject) {
      case 'math':
        return 15
      case 'chinese':
        return 15
      case 'english':
        return 10
      default:
        return 15
    }
  }

  /**
   * 综合评估，返回完整的学习建议
   */
  evaluate(input: EvaluateInput): EvaluateResult {
    // 1. 难度调整
    const diffResult = this.adjustDifficulty({
      currentDifficulty: input.currentDifficulty,
      consecutiveCorrect: input.consecutiveCorrect,
      consecutiveWrong: input.consecutiveWrong,
      recentAccuracy: input.recentAccuracy,
    })

    // 年龄难度上限
    const maxDiff = this.getMaxDifficultyForAge(input.age)
    const adjustedDifficulty = Math.min(diffResult.newDifficulty, maxDiff)

    // 2. 疲劳检测
    const fatigueResult = this.detectFatigue({
      sessionDurationMinutes: input.sessionDurationMinutes,
      questionsCompleted: input.questionsCompleted,
      recentAccuracy: input.recentAccuracy,
      averageResponseTimeMs: input.averageResponseTimeMs,
    })

    // 3. 时长限制
    const sessionResult = this.checkSessionLimit({
      sessionDurationMinutes: input.sessionDurationMinutes,
      dailyLimitMinutes: input.dailyLimitMinutes,
      totalDailyMinutes: input.totalDailyMinutes,
    })

    // 4. 综合决策
    const shouldContinue = !fatigueResult.isFatigued && !sessionResult.shouldStop

    return {
      adjustedDifficulty,
      shouldContinue,
      isFatigued: fatigueResult.isFatigued,
      difficultyReason: diffResult.reason,
      fatigueSuggestion: fatigueResult.suggestion,
      sessionWarning: sessionResult.warning,
    }
  }
}
