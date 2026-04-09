/**
 * 艾宾浩斯复习管理器
 * 整合 ReviewScheduler 调度算法 + PostgREST API 数据读写
 * 提供「今日需要复习的知识点」查询和复习完成记录
 */

import { ReviewScheduler } from './scheduler'
import type { PrioritizableItem } from './scheduler'
import { apiClient } from '@/services/api'
import type { MasteryRecord, KnowledgeNode } from '@/types/models'

/** 复习项（带额外显示信息） */
export interface ReviewItem extends PrioritizableItem {
  /** 知识点名称 */
  name: string
  /** 科目 */
  subject: string
  /** 连续正确次数 */
  consecutiveCorrect: number
  /** 距离到期天数（负 = 已过期） */
  daysUntilDue: number
  /** 上次练习时间 */
  lastPracticed: Date
}

/** 复习统计 */
export interface ReviewStats {
  /** 今日待复习总数 */
  dueCount: number
  /** 已复习数 */
  reviewedCount: number
  /** 已过期未复习数 */
  overdueCount: number
  /** 下一个复习时间 */
  nextReviewTime: Date | null
}

/**
 * ReviewManager — 连接 ReviewScheduler 与 DB
 */
export class ReviewManager {
  private scheduler: ReviewScheduler

  constructor() {
    this.scheduler = new ReviewScheduler({
      minInterval: 0.5,     // 半天
      maxInterval: 30,      // 最长 30 天
      wrongAnswerInterval: 0.25, // 答错后 6 小时
    })
  }

  /**
   * 获取学习流复习项（供 useLearningFlow 调用）
   * @param childId 孩子 ID
   * @param subject 科目
   * @param maxCount 最大数量
   */
  async getReviewItems(
    childId: string,
    subject: string,
    maxCount: number,
  ): Promise<Array<{ nodeId: string; reviewFormat: 'flashcard' | 'quiz' | 'oral' }>> {
    const dueItems = await this.getDueReviewItems(childId)
    const filtered = dueItems
      .filter((item) => item.subject === subject)
      .slice(0, maxCount)

    return filtered.map((item) => ({
      nodeId: item.id,
      reviewFormat: item.masteryLevel > 70 ? 'flashcard' : 'quiz',
    }))
  }

  /**
   * 获取当前孩子今日待复习的知识点列表（按紧急度排序）
   */
  async getDueReviewItems(childId: string): Promise<ReviewItem[]> {
    const now = new Date()

    // 从 API 获取所有掌握率记录
    const masteryRecords = await apiClient.get<MasteryRecord>('/mastery_records', {
      filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
    })

    // 筛选已到期或已过期的
    const dueRecords = masteryRecords.filter(
      (record) => record.nextReviewDate && new Date(record.nextReviewDate) <= now,
    )

    if (dueRecords.length === 0) return []

    // 查找知识点名称
    const nodeIds = dueRecords.map((r) => r.knowledgeNodeId)
    const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
      filters: [{ column: 'id', operator: 'in', value: nodeIds }],
    })

    const nodeMap = new Map(nodes.map((n) => [n.id!, n]))

    // 构建复习项
    const reviewItems: ReviewItem[] = dueRecords.map((record) => {
      const node = nodeMap.get(record.knowledgeNodeId)
      const reviewDate = new Date(record.nextReviewDate)
      const diffMs = reviewDate.getTime() - now.getTime()
      const daysUntilDue = diffMs / (24 * 60 * 60 * 1000)

      return {
        id: record.knowledgeNodeId,
        nextReviewDate: reviewDate,
        masteryLevel: record.masteryLevel,
        name: node?.name ?? record.knowledgeNodeId,
        subject: node?.subject ?? 'unknown',
        consecutiveCorrect: record.consecutiveCorrect,
        daysUntilDue: Math.round(daysUntilDue * 10) / 10,
        lastPracticed: new Date(record.lastPracticed),
      }
    })

    // 按紧急度排序
    return this.scheduler.prioritize(reviewItems)
  }

  /**
   * 获取复习统计
   */
  async getReviewStats(childId: string): Promise<ReviewStats> {
    const now = new Date()

    const masteryRecords = await apiClient.get<MasteryRecord>('/mastery_records', {
      filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
    })

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    let dueCount = 0
    let overdueCount = 0
    let reviewedCount = 0
    let nextReviewTime: Date | null = null

    for (const record of masteryRecords) {
      if (!record.nextReviewDate) continue

      const reviewDate = new Date(record.nextReviewDate)

      if (reviewDate <= now) {
        // 已过期
        dueCount++
        if (reviewDate < today) {
          overdueCount++
        }
      } else if (reviewDate < todayEnd) {
        // 今天稍后到期
        dueCount++
      }

      // 今天已练习过的
      const lastPracticed = new Date(record.lastPracticed)
      if (lastPracticed >= today) {
        reviewedCount++
      }

      // 找最近的下次复习时间
      if (reviewDate > now) {
        if (!nextReviewTime || reviewDate < nextReviewTime) {
          nextReviewTime = reviewDate
        }
      }
    }

    return {
      dueCount,
      reviewedCount,
      overdueCount,
      nextReviewTime,
    }
  }

  /**
   * 复习完成后更新掌握率和下次复习日期
   */
  async recordReview(
    childId: string,
    knowledgeNodeId: string,
    isCorrect: boolean,
  ): Promise<void> {
    // 获取当前掌握率记录
    const record = await apiClient.getOne<MasteryRecord>('/mastery_records', {
      filters: [
        { column: 'childId', operator: 'eq', value: Number(childId) },
        { column: 'knowledgeNodeId', operator: 'eq', value: knowledgeNodeId },
      ],
    })

    if (!record) return

    // 计算上次间隔
    const lastInterval = record.nextReviewDate && record.lastPracticed
      ? (new Date(record.nextReviewDate).getTime() - new Date(record.lastPracticed).getTime()) / (24 * 60 * 60 * 1000)
      : 1

    // 计算下次复习日期
    const nextReviewDate = this.scheduler.calculateNextReview({
      masteryLevel: record.masteryLevel,
      consecutiveCorrect: isCorrect ? record.consecutiveCorrect + 1 : 0,
      isCorrect,
      previousInterval: lastInterval,
    })

    // 更新掌握率
    const newConsecutiveCorrect = isCorrect ? record.consecutiveCorrect + 1 : 0
    const newTotalAttempts = record.totalAttempts + 1
    const newTotalCorrect = record.totalCorrect + (isCorrect ? 1 : 0)

    // 简化的掌握率更新（正确 +5，错误 -10，限制 0-100）
    let newMastery = record.masteryLevel
    if (isCorrect) {
      newMastery = Math.min(100, newMastery + 5)
    } else {
      newMastery = Math.max(0, newMastery - 10)
    }

    await apiClient.patch('/mastery_records', {
      masteryLevel: newMastery,
      lastPracticed: new Date().toISOString(),
      nextReviewDate: nextReviewDate.toISOString(),
      consecutiveCorrect: newConsecutiveCorrect,
      totalAttempts: newTotalAttempts,
      totalCorrect: newTotalCorrect,
    }, {
      filters: [{ column: 'id', operator: 'eq', value: record.id! }],
    })
  }

  /**
   * 检查是否有待复习的知识点（用于显示复习角标）
   */
  async hasDueReviews(childId: string): Promise<boolean> {
    const now = new Date()

    // 查询有 nextReviewDate 且已到期的记录
    const records = await apiClient.get<MasteryRecord>('/mastery_records', {
      filters: [
        { column: 'childId', operator: 'eq', value: Number(childId) },
        { column: 'nextReviewDate', operator: 'lte', value: now.toISOString() },
      ],
      limit: 1,
    })

    return records.length > 0
  }
}

/** 单例 */
let _instance: ReviewManager | null = null

export function getReviewManager(): ReviewManager {
  if (!_instance) {
    _instance = new ReviewManager()
  }
  return _instance
}
