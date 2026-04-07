import { describe, it, expect, beforeEach } from 'vitest'
import { ReportEngine } from '../report-engine'
import type { MasterySnapshot } from '@/types/models'

describe('ReportEngine', () => {
  let engine: ReportEngine

  const mockSnapshots: MasterySnapshot[] = [
    {
      childId: 'child-1',
      date: '2026-03-01',
      subject: 'math',
      gradeLevel: 'grade-1',
      nodesMastery: { 'node-1': 60, 'node-2': 40, 'node-3': 80 },
      averageMastery: 60,
    },
    {
      childId: 'child-1',
      date: '2026-03-07',
      subject: 'math',
      gradeLevel: 'grade-1',
      nodesMastery: { 'node-1': 80, 'node-2': 60, 'node-3': 90 },
      averageMastery: 76.7,
    },
  ]

  beforeEach(() => {
    engine = new ReportEngine()
  })

  describe('generateReport', () => {
    it('应生成包含基本指标的报告', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'weekly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        snapshots: mockSnapshots,
        dailyMinutes: [10, 15, 20, 0, 25, 30, 10],
      })

      expect(report.childId).toBe('child-1')
      expect(report.type).toBe('weekly')
      expect(report.metrics.totalLearningMinutes).toBe(110) // sum
      expect(report.metrics.dailyLearningMinutes).toHaveLength(7)
    })

    it('应计算知识点掌握趋势', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'weekly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        snapshots: mockSnapshots,
        dailyMinutes: [10, 15, 20, 0, 25, 30, 10],
      })

      expect(report.metrics.knowledgeMastery.length).toBeGreaterThan(0)
      // node-1 从 60 → 80，趋势应为 up
      const node1Trend = report.metrics.knowledgeMastery.find((m) => m.nodeId === 'node-1')
      expect(node1Trend?.trend).toBe('up')
    })

    it('应识别薄弱知识点', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'weekly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        snapshots: mockSnapshots,
        dailyMinutes: [10, 15, 20, 0, 25, 30, 10],
      })

      // node-2 掌握度最低 (60)，应在薄弱点列表
      expect(report.metrics.weakPoints.length).toBeGreaterThan(0)
    })

    it('应计算年级进度', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'weekly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        snapshots: mockSnapshots,
        dailyMinutes: [10, 15, 20, 0, 25, 30, 10],
      })

      expect(report.metrics.gradeProgress.totalNodes).toBe(3)
      expect(report.metrics.gradeProgress.percentage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('edge cases', () => {
    it('空快照应返回零指标报告', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'weekly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        snapshots: [],
        dailyMinutes: [],
      })

      expect(report.metrics.totalLearningMinutes).toBe(0)
      expect(report.metrics.knowledgeMastery).toEqual([])
    })

    it('月报应正确标记类型', () => {
      const report = engine.generateReport({
        childId: 'child-1',
        type: 'monthly',
        gradeLevel: 'grade-1',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        snapshots: mockSnapshots,
        dailyMinutes: new Array(31).fill(15),
      })

      expect(report.type).toBe('monthly')
    })
  })
})
