/**
 * 自适应路由引擎
 * 根据掌握状态推荐下一个最优知识点
 */

import type { KnowledgeNode, Subject } from '@/types/models'

/** 解锁阈值 */
const UNLOCK_THRESHOLD = 80

/** 推荐输入参数 */
export interface RecommendInput {
  /** 可用知识点列表 */
  nodes: KnowledgeNode[]
  /** 掌握率映射 */
  masteryMap: Map<string, number>
  /** 当前科目 */
  currentSubject: Subject
  /** 最大难度限制 */
  maxDifficulty?: number
}

/** 批量推荐输入参数 */
export interface BatchRecommendInput extends RecommendInput {
  /** 推荐数量 */
  count: number
}

/**
 * 自适应路由器
 */
export class AdaptiveRouter {
  /**
   * 推荐下一个知识点
   * 策略：新知识点 > 需复习的 > 掌握率最低的
   */
  recommendNext(input: RecommendInput): KnowledgeNode | null {
    const { nodes, masteryMap, currentSubject, maxDifficulty } = input

    // 过滤当前科目的知识点
    let subjectNodes = nodes.filter((n) => n.subject === currentSubject)

    // 难度限制
    if (maxDifficulty !== undefined) {
      subjectNodes = subjectNodes.filter((n) => n.difficulty <= maxDifficulty)
    }

    if (subjectNodes.length === 0) return null

    // 按 order 排序
    subjectNodes.sort((a, b) => a.order - b.order)

    // 1. 优先推荐未开始学习且已解锁的知识点（新知识）
    const newUnlocked = subjectNodes.find((node) => {
      const mastery = masteryMap.get(node.id!) ?? -1 // -1 表示从未学过
      if (mastery >= 0) return false // 已经学过

      // 检查前置是否满足
      return this.isUnlocked(node, masteryMap)
    })
    if (newUnlocked) return newUnlocked

    // 2. 推荐掌握率最低的未完全掌握节点（需复习）
    const needReview = subjectNodes
      .filter((node) => {
        const mastery = masteryMap.get(node.id!) ?? 0
        return mastery > 0 && mastery < UNLOCK_THRESHOLD
      })
      .sort((a, b) => {
        const mA = masteryMap.get(a.id!) ?? 0
        const mB = masteryMap.get(b.id!) ?? 0
        return mA - mB // 掌握率低的排前面
      })

    if (needReview.length > 0) return needReview[0]

    // 3. 所有已解锁知识点都掌握了 → 返回掌握率最低的进行巩固复习
    const allLearned = subjectNodes
      .filter((node) => (masteryMap.get(node.id!) ?? 0) > 0)
      .sort((a, b) => {
        const mA = masteryMap.get(a.id!) ?? 0
        const mB = masteryMap.get(b.id!) ?? 0
        return mA - mB
      })

    if (allLearned.length > 0) return allLearned[0]

    // 4. 兜底：返回第一个无前置依赖的
    return subjectNodes.find((n) => n.prerequisites.length === 0) ?? subjectNodes[0]
  }

  /**
   * 推荐科目（练习量最少的优先）
   */
  recommendSubject(practiceCount: Record<Subject, number>): Subject {
    const subjects: Subject[] = ['math', 'chinese', 'english']
    return subjects.reduce((min, s) =>
      practiceCount[s] < practiceCount[min] ? s : min,
    )
  }

  /**
   * 批量推荐（新知识 + 复习混合）
   */
  getRecommendations(input: BatchRecommendInput): KnowledgeNode[] {
    const { nodes, masteryMap, currentSubject, count, maxDifficulty } = input
    const recommendations: KnowledgeNode[] = []
    const usedIds = new Set<string>()

    // 过滤当前科目
    let subjectNodes = nodes.filter((n) => n.subject === currentSubject)
    if (maxDifficulty !== undefined) {
      subjectNodes = subjectNodes.filter((n) => n.difficulty <= maxDifficulty)
    }

    subjectNodes.sort((a, b) => a.order - b.order)

    // 新知识优先（约 60%）
    const newCount = Math.ceil(count * 0.6)
    const newNodes = subjectNodes.filter((node) => {
      const mastery = masteryMap.get(node.id!) ?? -1
      return mastery < 0 && this.isUnlocked(node, masteryMap)
    })

    for (const node of newNodes) {
      if (recommendations.length >= newCount) break
      recommendations.push(node)
      usedIds.add(node.id!)
    }

    // 复习节点补充（约 40%）
    const reviewNodes = subjectNodes
      .filter((node) => {
        const mastery = masteryMap.get(node.id!) ?? 0
        return mastery > 0 && mastery < UNLOCK_THRESHOLD && !usedIds.has(node.id!)
      })
      .sort((a, b) => (masteryMap.get(a.id!) ?? 0) - (masteryMap.get(b.id!) ?? 0))

    for (const node of reviewNodes) {
      if (recommendations.length >= count) break
      recommendations.push(node)
      usedIds.add(node.id!)
    }

    // 如果还不够，从已掌握的中选掌握率最低的巩固
    if (recommendations.length < count) {
      const consolidate = subjectNodes
        .filter((node) => !usedIds.has(node.id!) && (masteryMap.get(node.id!) ?? 0) > 0)
        .sort((a, b) => (masteryMap.get(a.id!) ?? 0) - (masteryMap.get(b.id!) ?? 0))

      for (const node of consolidate) {
        if (recommendations.length >= count) break
        recommendations.push(node)
      }
    }

    return recommendations
  }

  /**
   * 判断知识点是否已解锁
   */
  private isUnlocked(node: KnowledgeNode, masteryMap: Map<string, number>): boolean {
    if (node.prerequisites.length === 0) return true
    return node.prerequisites.every((preId) => {
      const mastery = masteryMap.get(preId) ?? 0
      return mastery >= UNLOCK_THRESHOLD
    })
  }
}
