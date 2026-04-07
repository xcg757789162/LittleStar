import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useReportStore } from '../reportStore'
import type { ReportData } from '@/types/models'

describe('reportStore', () => {
  beforeEach(() => {
    useReportStore.getState().reset()
  })

  const mockReport: ReportData = {
    id: 'report-1',
    childId: 'child-1',
    type: 'weekly',
    gradeLevel: 'grade-1',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-07',
    metrics: {
      totalLearningMinutes: 120,
      dailyLearningMinutes: [10, 20, 30, 15, 25, 10, 10],
      knowledgeMastery: [],
      achievements: [],
      weakPoints: [],
      gradeProgress: { totalNodes: 10, masteredNodes: 6, percentage: 60 },
    },
    generatedAt: new Date('2026-03-08'),
  }

  describe('初始状态', () => {
    it('初始应无报告', () => {
      const state = useReportStore.getState()
      expect(state.reports).toEqual([])
      expect(state.currentReport).toBeNull()
    })

    it('初始过滤条件应为默认', () => {
      const state = useReportStore.getState()
      expect(state.filter.type).toBe('weekly')
    })

    it('初始加载状态应为 false', () => {
      const state = useReportStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('报告管理', () => {
    it('应能添加报告', () => {
      act(() => {
        useReportStore.getState().addReport(mockReport)
      })
      expect(useReportStore.getState().reports).toHaveLength(1)
    })

    it('应能设置当前报告', () => {
      act(() => {
        useReportStore.getState().addReport(mockReport)
        useReportStore.getState().setCurrentReport(mockReport)
      })
      expect(useReportStore.getState().currentReport).toEqual(mockReport)
    })

    it('应能按类型过滤', () => {
      const monthlyReport: ReportData = { ...mockReport, id: 'r-2', type: 'monthly' }
      act(() => {
        useReportStore.getState().addReport(mockReport)
        useReportStore.getState().addReport(monthlyReport)
        useReportStore.getState().setFilter({ type: 'monthly' })
      })
      const state = useReportStore.getState()
      const filtered = state.getFilteredReports()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('monthly')
    })
  })

  describe('reset', () => {
    it('应恢复初始状态', () => {
      act(() => {
        useReportStore.getState().addReport(mockReport)
        useReportStore.getState().setCurrentReport(mockReport)
        useReportStore.getState().setFilter({ type: 'monthly' })
        useReportStore.getState().reset()
      })
      const state = useReportStore.getState()
      expect(state.reports).toEqual([])
      expect(state.currentReport).toBeNull()
      expect(state.filter.type).toBe('weekly')
    })
  })
})
