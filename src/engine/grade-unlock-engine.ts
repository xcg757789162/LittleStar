/**
 * 年级解锁引擎
 * 检查解锁条件、计算解锁进度、创建解锁记录
 */

import type { GradeLevel, Subject, GradeUnlock, UnlockConfig } from '@/types/models'
import { getNextGrade, getGradeIndex } from '@/types/grades'

/** 默认解锁配置 */
const DEFAULT_UNLOCK_CONFIG: UnlockConfig = {
  masteryThreshold: 80,
  minMasteredRatio: 0.8,
}

/** 解锁检查输入 */
export interface UnlockEligibilityInput {
  currentGrade: GradeLevel
  subject: Subject
  /** 知识点ID -> 掌握率 的映射 */
  masteryMap: Map<string, number>
  /** 当前年级的知识点总数 */
  totalNodes: number
  /** 解锁配置（可选，使用默认值） */
  config?: UnlockConfig
}

/** 解锁检查结果 */
export interface UnlockEligibilityResult {
  eligible: boolean
  nextGrade: GradeLevel | null
  masteredCount: number
  requiredCount: number
  totalNodes: number
  averageMastery: number
}

/** 解锁进度 */
export interface UnlockProgress {
  masteredCount: number
  requiredCount: number
  totalNodes: number
  percentage: number
}

/** 解锁记录参数（已抽取出的记录） */
interface UnlockRecordSimple {
  subject: Subject
  gradeLevel: GradeLevel
  unlockedAt: Date
}

/** 创建解锁记录输入 */
export interface CreateUnlockInput {
  childId: string
  subject: Subject
  gradeLevel: GradeLevel
  averageMastery: number
  placementTestId?: string
}

/**
 * 年级解锁引擎
 */
export class GradeUnlockEngine {
  /**
   * 统计已掌握的知识点数量和总掌握度
   */
  private countMastered(masteryMap: Map<string, number>, threshold: number) {
    let masteredCount = 0
    let totalMastery = 0
    for (const mastery of masteryMap.values()) {
      totalMastery += mastery
      if (mastery >= threshold) {
        masteredCount++
      }
    }
    return { masteredCount, totalMastery }
  }

  /**
   * 检查某科目是否满足解锁条件
   */
  checkUnlockEligibility(input: UnlockEligibilityInput): UnlockEligibilityResult {
    const { currentGrade, masteryMap, totalNodes } = input
    const config = input.config ?? DEFAULT_UNLOCK_CONFIG

    const nextGrade = getNextGrade(currentGrade)

    // 已是最高年级 或 无知识点
    if (nextGrade === null || totalNodes === 0) {
      return {
        eligible: false,
        nextGrade,
        masteredCount: 0,
        requiredCount: 0,
        totalNodes,
        averageMastery: 0,
      }
    }

    const { masteredCount, totalMastery } = this.countMastered(masteryMap, config.masteryThreshold)
    const averageMastery = masteryMap.size > 0 ? totalMastery / masteryMap.size : 0
    const requiredCount = Math.ceil(totalNodes * config.minMasteredRatio)
    const eligible = masteredCount >= requiredCount

    return {
      eligible,
      nextGrade,
      masteredCount,
      requiredCount,
      totalNodes,
      averageMastery,
    }
  }

  /**
   * 获取解锁进度
   */
  getUnlockProgress(input: UnlockEligibilityInput): UnlockProgress {
    const config = input.config ?? DEFAULT_UNLOCK_CONFIG
    const { masteryMap, totalNodes } = input

    if (totalNodes === 0) {
      return { masteredCount: 0, requiredCount: 0, totalNodes: 0, percentage: 0 }
    }

    const { masteredCount } = this.countMastered(masteryMap, config.masteryThreshold)
    const requiredCount = Math.ceil(totalNodes * config.minMasteredRatio)
    const percentage = Math.min(100, Math.round((masteredCount / requiredCount) * 100))

    return {
      masteredCount,
      requiredCount,
      totalNodes,
      percentage,
    }
  }

  /**
   * 根据已解锁记录获取当前最高年级
   */
  getCurrentGrade(unlocks: UnlockRecordSimple[]): GradeLevel | null {
    if (unlocks.length === 0) return null

    return unlocks.reduce((highest, unlock) => {
      if (getGradeIndex(unlock.gradeLevel) > getGradeIndex(highest.gradeLevel)) {
        return unlock
      }
      return highest
    }).gradeLevel
  }

  /**
   * 创建解锁记录
   */
  createUnlockRecord(input: CreateUnlockInput): GradeUnlock {
    return {
      childId: input.childId,
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      masteryAtUnlock: input.averageMastery,
      unlockedAt: new Date(),
      placementTestId: input.placementTestId,
    }
  }
}
