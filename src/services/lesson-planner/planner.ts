/**
 * 课程规划引擎
 *
 * 规划粒度为具体课时（lesson），而非知识点。
 * 每个知识点由 AI 拆分为 N 堂课，LessonPlanner 基于课时完成度
 * 安排下一堂待学课程。
 *
 * 状态判定：
 *   - 未开始：该知识点 0 堂课已完成
 *   - 学习中：已完成部分课时
 *   - 已掌握：全部课时已完成（mastery >= 80）
 */

import type { KnowledgeNode, Subject } from '@/types/models'
import type { RequirementMode } from './requirement-generator'

// ============================================================
// 类型定义
// ============================================================

/** 复习队列项 */
export interface ReviewQueueItem {
  nodeId: string
  dueDate: Date
}

/** 知识点课时进度信息 */
export interface NodeLessonProgress {
  totalLessons: number
  completedLessonIndices: number[]
}

/** 课程规划输入 */
export interface LessonPlanInput {
  /** 该科目的知识点列表 */
  nodes: KnowledgeNode[]
  /** 掌握率映射 Map<nodeId, masteryLevel> */
  masteryMap: Map<string, number>
  /** 科目 */
  subject: Subject
  /** 复习队列（已到期待复习的知识点） */
  reviewQueue: ReviewQueueItem[]
  /** 规划天数，默认 3 */
  days?: number
  /** 每个知识点的课时进度 Map<nodeId, progress> */
  lessonProgressMap?: Map<string, NodeLessonProgress>
}

/** 每日课程计划项 */
export interface LessonPlanItem {
  /** 知识点 ID */
  nodeId: string
  /** 知识点名称 */
  nodeName: string
  /** 学习模式 */
  mode: RequirementMode
  /** 当前掌握率 */
  masteryLevel: number
  /** 课时序号（1-based） */
  lessonIndex: number
  /** 知识点总课时数 */
  totalLessons: number
}

/** 每日课程计划 */
export interface DailyLessonPlan {
  /** 天数编号（1-based） */
  day: number
  /** 日期 YYYY-MM-DD */
  date: string
  /** 当天的学习项列表 */
  items: LessonPlanItem[]
}

/** 规划器配置 */
export interface LessonPlannerConfig {
  /** 每天最少知识点数 */
  minNodesPerDay?: number
  /** 每天最多知识点数 */
  maxNodesPerDay?: number
  /** 新知识占比 */
  newKnowledgeRatio?: number
  /** 解锁阈值 */
  unlockThreshold?: number
}

// ============================================================
// 常量
// ============================================================

const UNLOCK_THRESHOLD = 80

// ============================================================
// LessonPlanner
// ============================================================

export class LessonPlanner {
  private readonly minNodesPerDay: number
  private readonly maxNodesPerDay: number
  private readonly newKnowledgeRatio: number
  private readonly unlockThreshold: number

  constructor(config?: LessonPlannerConfig) {
    this.minNodesPerDay = config?.minNodesPerDay ?? 3
    this.maxNodesPerDay = config?.maxNodesPerDay ?? 5
    this.newKnowledgeRatio = config?.newKnowledgeRatio ?? 0.6
    this.unlockThreshold = config?.unlockThreshold ?? UNLOCK_THRESHOLD
  }

  /**
   * 规划未来 N 天的课程
   *
   * 规划粒度为具体课时：对于有课时计划的知识点，安排下一堂未完成的课。
   */
  planLessons(input: LessonPlanInput): DailyLessonPlan[] {
    const { nodes, masteryMap, subject, reviewQueue, days = 3, lessonProgressMap } = input

    const subjectNodes = nodes
      .filter((n) => n.subject === subject && n.id != null)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    const { newNodes, reviewNodes, consolidationNodes } = this.categorizeNodes(
      subjectNodes,
      masteryMap,
      reviewQueue,
    )

    const dates = this.generateDates(days)

    const plans: DailyLessonPlan[] = []
    const usedNodeIds = new Set<string>()

    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      const items = this.allocateDay(
        newNodes,
        reviewNodes,
        consolidationNodes,
        masteryMap,
        usedNodeIds,
        lessonProgressMap,
      )

      plans.push({
        day: dayIdx + 1,
        date: dates[dayIdx],
        items,
      })
    }

    return plans
  }

  // ---- 私有方法 ----

  /**
   * 将知识点分为三类
   */
  private categorizeNodes(
    nodes: KnowledgeNode[],
    masteryMap: Map<string, number>,
    reviewQueue: ReviewQueueItem[],
  ): {
    newNodes: KnowledgeNode[]
    reviewNodes: KnowledgeNode[]
    consolidationNodes: KnowledgeNode[]
  } {
    const reviewNodeIds = new Set(reviewQueue.map((r) => r.nodeId))

    const newNodes: KnowledgeNode[] = []
    const reviewNodes: KnowledgeNode[] = []
    const consolidationNodes: KnowledgeNode[] = []

    for (const node of nodes) {
      const mastery = masteryMap.get(node.id!) ?? -1

      if (reviewNodeIds.has(node.id!)) {
        // 在复习队列中
        reviewNodes.push(node)
      } else if (mastery < 0) {
        // 从未学过，检查是否已解锁
        if (this.isUnlocked(node, masteryMap)) {
          newNodes.push(node)
        }
      } else if (mastery < this.unlockThreshold) {
        // 学过但掌握率不够
        reviewNodes.push(node)
      } else {
        // 已掌握，可以用于巩固
        consolidationNodes.push(node)
      }
    }

    return { newNodes, reviewNodes, consolidationNodes }
  }

  /**
   * 获取知识点的下一个待学课时序号
   */
  private getNextLessonIndex(
    nodeId: string,
    lessonProgressMap?: Map<string, NodeLessonProgress>,
  ): { lessonIndex: number; totalLessons: number } {
    const progress = lessonProgressMap?.get(nodeId)
    if (!progress || progress.totalLessons <= 0) {
      return { lessonIndex: 1, totalLessons: 1 }
    }

    const completed = new Set(progress.completedLessonIndices)
    for (let i = 1; i <= progress.totalLessons; i++) {
      if (!completed.has(i)) {
        return { lessonIndex: i, totalLessons: progress.totalLessons }
      }
    }
    return { lessonIndex: 1, totalLessons: progress.totalLessons }
  }

  /**
   * 分配单日课程内容（课时粒度）
   */
  private allocateDay(
    newNodes: KnowledgeNode[],
    reviewNodes: KnowledgeNode[],
    consolidationNodes: KnowledgeNode[],
    masteryMap: Map<string, number>,
    usedNodeIds: Set<string>,
    lessonProgressMap?: Map<string, NodeLessonProgress>,
  ): LessonPlanItem[] {
    const items: LessonPlanItem[] = []
    const targetCount = this.maxNodesPerDay
    const newCount = Math.ceil(targetCount * this.newKnowledgeRatio)

    const buildItem = (node: KnowledgeNode, mode: RequirementMode): LessonPlanItem => {
      const { lessonIndex, totalLessons } = this.getNextLessonIndex(node.id!, lessonProgressMap)
      return {
        nodeId: node.id!,
        nodeName: node.name,
        mode,
        masteryLevel: masteryMap.get(node.id!) ?? 0,
        lessonIndex,
        totalLessons,
      }
    }

    let addedNew = 0
    for (const node of newNodes) {
      if (addedNew >= newCount) break
      if (usedNodeIds.has(node.id!)) continue

      items.push(buildItem(node, 'new-teaching'))
      usedNodeIds.add(node.id!)
      addedNew++
    }

    const reviewSorted = [...reviewNodes].sort((a, b) => {
      const mA = masteryMap.get(a.id!) ?? 0
      const mB = masteryMap.get(b.id!) ?? 0
      return mA - mB
    })

    for (const node of reviewSorted) {
      if (items.length >= targetCount) break
      if (usedNodeIds.has(node.id!)) continue

      items.push(buildItem(node, 'reinforcement'))
      usedNodeIds.add(node.id!)
    }

    if (items.length < this.minNodesPerDay) {
      const consolidationSorted = [...consolidationNodes].sort((a, b) => {
        const mA = masteryMap.get(a.id!) ?? 0
        const mB = masteryMap.get(b.id!) ?? 0
        return mA - mB
      })

      for (const node of consolidationSorted) {
        if (items.length >= this.minNodesPerDay) break
        if (usedNodeIds.has(node.id!)) continue

        items.push(buildItem(node, 'reinforcement'))
        usedNodeIds.add(node.id!)
      }
    }

    if (items.length < this.minNodesPerDay) {
      const allAvailable = [...consolidationNodes, ...reviewNodes, ...newNodes]
      for (const node of allAvailable) {
        if (items.length >= this.minNodesPerDay) break
        if (items.some((i) => i.nodeId === node.id!)) continue

        items.push(buildItem(node, 'reinforcement'))
        usedNodeIds.add(node.id!)
      }
    }

    return items
  }

  /**
   * 检查知识点是否已解锁
   */
  private isUnlocked(node: KnowledgeNode, masteryMap: Map<string, number>): boolean {
    if (node.prerequisites.length === 0) return true
    return node.prerequisites.every((preId) => {
      const mastery = masteryMap.get(preId) ?? 0
      return mastery >= this.unlockThreshold
    })
  }

  /**
   * 生成未来 N 天的日期字符串
   */
  private generateDates(days: number): string[] {
    const dates: string[] = []
    const today = new Date()

    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
    }

    return dates
  }
}
