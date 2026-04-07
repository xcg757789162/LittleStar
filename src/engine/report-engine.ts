/**
 * 学习报告引擎
 * 生成周报/月报，计算掌握趋势、薄弱知识点、年级进度
 */

import type {
  GradeLevel,
  Subject,
  MasterySnapshot,
  ReportData,
  ReportMetrics,
  KnowledgeMasteryTrend,
  WeakPoint,
  GradeProgress,
} from '@/types/models'

/** 报告生成输入 */
export interface GenerateReportInput {
  childId: string
  type: 'weekly' | 'monthly'
  gradeLevel: GradeLevel
  subject?: Subject
  periodStart: string
  periodEnd: string
  snapshots: MasterySnapshot[]
  dailyMinutes: number[]
}

/** 薄弱知识点阈值 */
const WEAK_POINT_THRESHOLD = 70

/** 掌握完成阈值 */
const MASTERY_THRESHOLD = 80

/**
 * 学习报告引擎
 */
export class ReportEngine {
  /**
   * 生成学习报告
   */
  generateReport(input: GenerateReportInput): ReportData {
    const {
      childId,
      type,
      gradeLevel,
      subject,
      periodStart,
      periodEnd,
      snapshots,
      dailyMinutes,
    } = input

    const metrics = this.calculateMetrics(snapshots, dailyMinutes)

    return {
      childId,
      type,
      gradeLevel,
      subject,
      periodStart,
      periodEnd,
      metrics,
      generatedAt: new Date(),
    }
  }

  /**
   * 计算报告指标
   */
  private calculateMetrics(
    snapshots: MasterySnapshot[],
    dailyMinutes: number[],
  ): ReportMetrics {
    const totalLearningMinutes = dailyMinutes.reduce((sum, m) => sum + m, 0)
    const knowledgeMastery = this.calculateMasteryTrends(snapshots)
    const weakPoints = this.identifyWeakPoints(snapshots)
    const gradeProgress = this.calculateGradeProgress(snapshots)

    return {
      totalLearningMinutes,
      dailyLearningMinutes: dailyMinutes,
      knowledgeMastery,
      achievements: [], // 成就由外部注入
      weakPoints,
      gradeProgress,
    }
  }

  /**
   * 计算知识点掌握趋势
   */
  private calculateMasteryTrends(snapshots: MasterySnapshot[]): KnowledgeMasteryTrend[] {
    if (snapshots.length < 2) return []

    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]

    const trends: KnowledgeMasteryTrend[] = []

    for (const nodeId of Object.keys(last.nodesMastery)) {
      const startLevel = first.nodesMastery[nodeId] ?? 0
      const endLevel = last.nodesMastery[nodeId] ?? 0

      let trend: 'up' | 'down' | 'stable'
      if (endLevel > startLevel + 5) {
        trend = 'up'
      } else if (endLevel < startLevel - 5) {
        trend = 'down'
      } else {
        trend = 'stable'
      }

      trends.push({
        nodeId,
        nodeName: nodeId, // 名称需要从外部大纲获取，此处先用 ID
        startLevel,
        endLevel,
        trend,
      })
    }

    return trends
  }

  /**
   * 识别薄弱知识点
   */
  private identifyWeakPoints(snapshots: MasterySnapshot[]): WeakPoint[] {
    if (snapshots.length === 0) return []

    const latest = snapshots[snapshots.length - 1]
    const weakPoints: WeakPoint[] = []

    for (const [nodeId, mastery] of Object.entries(latest.nodesMastery)) {
      if (mastery < WEAK_POINT_THRESHOLD) {
        weakPoints.push({
          nodeId,
          nodeName: nodeId,
          masteryLevel: mastery,
          suggestion: mastery < 40 ? '建议重新学习' : '建议多做练习',
        })
      }
    }

    return weakPoints.sort((a, b) => a.masteryLevel - b.masteryLevel)
  }

  /**
   * 计算年级进度
   */
  private calculateGradeProgress(snapshots: MasterySnapshot[]): GradeProgress {
    if (snapshots.length === 0) {
      return { totalNodes: 0, masteredNodes: 0, percentage: 0 }
    }

    const latest = snapshots[snapshots.length - 1]
    const entries = Object.entries(latest.nodesMastery)
    const totalNodes = entries.length
    const masteredNodes = entries.filter(([, m]) => m >= MASTERY_THRESHOLD).length
    const percentage = totalNodes > 0 ? Math.round((masteredNodes / totalNodes) * 100) : 0

    return { totalNodes, masteredNodes, percentage }
  }
}
