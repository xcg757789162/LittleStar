/**
 * 学习报告页面测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LearningReportPage } from '../LearningReportPage'
import { ReportDetailPage } from '../ReportDetailPage'
import { useReportStore } from '@/stores/reportStore'
import type { ReportData } from '@/types/models'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockWeeklyReport: ReportData = {
  id: 'report-1',
  childId: 'child-1',
  type: 'weekly',
  gradeLevel: 'grade-1',
  subject: 'math',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-07',
  metrics: {
    totalLearningMinutes: 120,
    dailyLearningMinutes: [10, 20, 30, 15, 25, 10, 10],
    knowledgeMastery: [
      { nodeId: 'n1', nodeName: '加法', startLevel: 40, endLevel: 80, trend: 'up' as const },
    ],
    achievements: [],
    weakPoints: [
      { nodeId: 'n2', nodeName: '减法', masteryLevel: 50, suggestion: '建议多做练习' },
    ],
    gradeProgress: { totalNodes: 10, masteredNodes: 6, percentage: 60 },
  },
  generatedAt: new Date('2026-03-08'),
}

const mockMonthlyReport: ReportData = {
  id: 'report-2',
  childId: 'child-1',
  type: 'monthly',
  gradeLevel: 'grade-1',
  subject: 'chinese',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  metrics: {
    totalLearningMinutes: 480,
    dailyLearningMinutes: new Array(31).fill(15),
    knowledgeMastery: [],
    achievements: [],
    weakPoints: [],
    gradeProgress: { totalNodes: 12, masteredNodes: 10, percentage: 83 },
  },
  generatedAt: new Date('2026-04-01'),
}

describe('LearningReportPage', () => {
  beforeEach(() => {
    useReportStore.getState().reset()
    mockNavigate.mockClear()
  })

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={<LearningReportPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  describe('渲染', () => {
    it('应渲染报告列表页', () => {
      renderPage()
      expect(screen.getByTestId('learning-report-page')).toBeInTheDocument()
    })

    it('应显示页面标题', () => {
      renderPage()
      expect(screen.getByText('学习报告')).toBeInTheDocument()
    })

    it('无报告时应显示空状态', () => {
      renderPage()
      expect(screen.getByText(/暂无报告/)).toBeInTheDocument()
    })
  })

  describe('报告类型切换', () => {
    it('应有周报和月报切换按钮', () => {
      renderPage()
      expect(screen.getByTestId('filter-weekly')).toBeInTheDocument()
      expect(screen.getByTestId('filter-monthly')).toBeInTheDocument()
    })

    it('切换到月报应过滤显示月报', () => {
      useReportStore.getState().addReport(mockWeeklyReport)
      useReportStore.getState().addReport(mockMonthlyReport)
      renderPage()

      fireEvent.click(screen.getByTestId('filter-monthly'))
      // 月报显示，周报不显示
      expect(screen.queryByText(/2026-03-01 ~ 2026-03-07/)).not.toBeInTheDocument()
      expect(screen.getByText(/2026-03-01 ~ 2026-03-31/)).toBeInTheDocument()
    })
  })

  describe('报告列表', () => {
    it('应显示报告卡片', () => {
      useReportStore.getState().addReport(mockWeeklyReport)
      renderPage()

      expect(screen.getByTestId('report-card-report-1')).toBeInTheDocument()
    })

    it('报告卡片应显示周期和学习时长', () => {
      useReportStore.getState().addReport(mockWeeklyReport)
      renderPage()

      expect(screen.getByText(/2026-03-01 ~ 2026-03-07/)).toBeInTheDocument()
      expect(screen.getByText(/120/)).toBeInTheDocument()
    })

    it('点击报告卡片应导航到详情页', () => {
      useReportStore.getState().addReport(mockWeeklyReport)
      renderPage()

      fireEvent.click(screen.getByTestId('report-card-report-1'))
      expect(mockNavigate).toHaveBeenCalledWith('/reports/report-1')
    })
  })

  describe('返回按钮', () => {
    it('应有返回按钮', () => {
      renderPage()
      expect(screen.getByTestId('back-btn')).toBeInTheDocument()
    })

    it('点击返回应导航回家长仪表盘', () => {
      renderPage()
      fireEvent.click(screen.getByTestId('back-btn'))
      expect(mockNavigate).toHaveBeenCalledWith('/parent')
    })
  })
})

describe('ReportDetailPage', () => {
  beforeEach(() => {
    useReportStore.getState().reset()
    mockNavigate.mockClear()
  })

  function renderDetail(reportId: string) {
    return render(
      <MemoryRouter initialEntries={[`/reports/${reportId}`]}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('应渲染详情页', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByTestId('report-detail-page')).toBeInTheDocument()
  })

  it('报告不存在应显示未找到', () => {
    renderDetail('non-existent')
    expect(screen.getByText(/未找到/)).toBeInTheDocument()
  })

  it('应显示学习时长卡片', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByTestId('learning-time-chart')).toBeInTheDocument()
  })

  it('应显示年级进度', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByTestId('grade-progress-chart')).toBeInTheDocument()
  })

  it('应显示薄弱知识点', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByText(/减法/)).toBeInTheDocument()
  })

  it('应显示掌握趋势', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByTestId('mastery-trend-chart')).toBeInTheDocument()
  })

  it('应有返回按钮', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    expect(screen.getByTestId('detail-back-btn')).toBeInTheDocument()
  })

  it('点击返回应导航到列表页', () => {
    useReportStore.getState().addReport(mockWeeklyReport)
    renderDetail('report-1')
    fireEvent.click(screen.getByTestId('detail-back-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/reports')
  })
})
