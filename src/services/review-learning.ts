/**
 * 重新学习服务
 *
 * 提供以下能力：
 * 1. 保存已完成课堂到学习历史
 * 2. 查询学习历史（按孩子、科目、知识点）
 * 3. 加载历史课堂（快速复习模式 — 原样回放）
 * 4. 获取重学统计信息
 */

import { db } from '@/db/database'
import type { Subject } from '@/types/models'
import type { Classroom } from '@/services/openmaic/types'

/** 重学模式 */
export type ReLearnMode = 'quick-review' | 'deep-relearn'

/** 学习历史查询参数 */
export interface HistoryQueryParams {
  childId: string
  subject?: Subject
  knowledgeNodeId?: string
  /** 最多返回多少条 */
  limit?: number
}

/** 学习历史列表项（不含完整课堂数据） */
export interface HistoryListItem {
  id: string
  childId: string
  knowledgeNodeId: string
  knowledgeNodeName: string
  subject: Subject
  classroomId: string
  classroomTitle: string
  date: string
  completedAt: Date
  round: number
  isReview: boolean
  questionsCompleted: number
  correctCount: number
  accuracy: number
}

/** 保存课堂历史输入参数 */
export interface SaveHistoryInput {
  childId: string
  knowledgeNodeId: string
  knowledgeNodeName: string
  subject: Subject
  classroom: Classroom
  questionsCompleted: number
  correctCount: number
  isReview?: boolean
}

/** 重学统计 */
export interface ReLearnStats {
  /** 总重学次数 */
  totalRelearns: number
  /** 各科目重学次数 */
  subjectRelearns: Record<Subject, number>
  /** 最近重学的知识点 */
  recentRelearns: HistoryListItem[]
}

/**
 * ReviewLearningService — 重新学习/复习服务
 */
export class ReviewLearningService {
  /**
   * 保存已完成的课堂到学习历史
   */
  async saveClassroomHistory(input: SaveHistoryInput): Promise<string> {
    const {
      childId,
      knowledgeNodeId,
      knowledgeNodeName,
      subject,
      classroom,
      questionsCompleted,
      correctCount,
      isReview = false,
    } = input

    // 计算学习轮次：查询该孩子在该知识点上已有多少条记录
    const existingRecords = await db.classroomHistory
      .where('[childId+knowledgeNodeId]')
      .equals([childId, knowledgeNodeId])
      .toArray()

    const round = existingRecords.length + 1

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const accuracy = questionsCompleted > 0
      ? Math.round((correctCount / questionsCompleted) * 100)
      : 0

    const id = await db.classroomHistory.add({
      childId,
      knowledgeNodeId,
      knowledgeNodeName,
      subject,
      classroomId: classroom.id,
      classroomTitle: classroom.title,
      classroomData: JSON.stringify(classroom),
      date: dateStr,
      completedAt: today,
      round,
      isReview,
      questionsCompleted,
      correctCount,
      accuracy,
    })

    // 同步更新 MasteryRecord 的 reviewCount
    if (isReview) {
      const masteryRecords = await db.masteryRecords
        .where('[childId+knowledgeNodeId]')
        .equals([childId, knowledgeNodeId])
        .toArray()

      if (masteryRecords.length > 0) {
        const record = masteryRecords[0]
        await db.masteryRecords.update(record.id!, {
          reviewCount: (record.reviewCount ?? 0) + 1,
        })
      }
    }

    return String(id)
  }

  /**
   * 查询学习历史（不含课堂 JSON 数据）
   */
  async getHistory(params: HistoryQueryParams): Promise<HistoryListItem[]> {
    const { childId, subject, knowledgeNodeId, limit = 50 } = params

    let collection

    if (knowledgeNodeId) {
      collection = db.classroomHistory
        .where('[childId+knowledgeNodeId]')
        .equals([childId, knowledgeNodeId])
    } else if (subject) {
      collection = db.classroomHistory
        .where('[childId+subject]')
        .equals([childId, subject])
    } else {
      collection = db.classroomHistory
        .where('childId')
        .equals(childId)
    }

    const records = await collection
      .reverse()
      .limit(limit)
      .toArray()

    return records.map((r) => ({
      id: String(r.id),
      childId: r.childId,
      knowledgeNodeId: r.knowledgeNodeId,
      knowledgeNodeName: r.knowledgeNodeName,
      subject: r.subject,
      classroomId: r.classroomId,
      classroomTitle: r.classroomTitle,
      date: r.date,
      completedAt: r.completedAt,
      round: r.round,
      isReview: r.isReview,
      questionsCompleted: r.questionsCompleted,
      correctCount: r.correctCount,
      accuracy: r.accuracy,
    }))
  }

  /**
   * 加载历史课堂完整数据（快速复习模式）
   * @param historyId 历史记录 ID
   * @returns 完整的 Classroom 数据，不存在时返回 null
   */
  async loadClassroomFromHistory(historyId: string): Promise<Classroom | null> {
    const record = await db.classroomHistory.get(historyId)
    if (!record) return null

    try {
      return JSON.parse(record.classroomData) as Classroom
    } catch {
      return null
    }
  }

  /**
   * 获取某个知识点最新一次学习的课堂（用于"再学一遍"按钮）
   */
  async getLatestClassroom(
    childId: string,
    knowledgeNodeId: string,
  ): Promise<Classroom | null> {
    const records = await db.classroomHistory
      .where('[childId+knowledgeNodeId]')
      .equals([childId, knowledgeNodeId])
      .reverse()
      .limit(1)
      .toArray()

    if (records.length === 0) return null

    try {
      return JSON.parse(records[0].classroomData) as Classroom
    } catch {
      return null
    }
  }

  /**
   * 获取重学统计信息
   */
  async getReLearnStats(childId: string): Promise<ReLearnStats> {
    const allRecords = await db.classroomHistory
      .where('childId')
      .equals(childId)
      .toArray()

    const reviewRecords = allRecords.filter((r) => r.isReview)

    const subjectRelearns: Record<Subject, number> = {
      math: 0,
      chinese: 0,
      english: 0,
    }

    for (const record of reviewRecords) {
      subjectRelearns[record.subject]++
    }

    // 最近 5 条重学记录
    const recentRelearns = reviewRecords
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: String(r.id),
        childId: r.childId,
        knowledgeNodeId: r.knowledgeNodeId,
        knowledgeNodeName: r.knowledgeNodeName,
        subject: r.subject,
        classroomId: r.classroomId,
        classroomTitle: r.classroomTitle,
        date: r.date,
        completedAt: r.completedAt,
        round: r.round,
        isReview: r.isReview,
        questionsCompleted: r.questionsCompleted,
        correctCount: r.correctCount,
        accuracy: r.accuracy,
      }))

    return {
      totalRelearns: reviewRecords.length,
      subjectRelearns,
      recentRelearns,
    }
  }
}

/** 单例 */
let _instance: ReviewLearningService | null = null

export function getReviewLearningService(): ReviewLearningService {
  if (!_instance) {
    _instance = new ReviewLearningService()
  }
  return _instance
}
