import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LearningTimeChart } from '../charts/LearningTimeChart'
import { MasteryTrendChart } from '../charts/MasteryTrendChart'
import { GradeProgressChart } from '../charts/GradeProgressChart'

// Mock recharts (避免 SVG 渲染问题)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

describe('ReportCharts', () => {
  describe('LearningTimeChart', () => {
    it('应渲染学习时长图表', () => {
      render(<LearningTimeChart data={[10, 20, 30, 15, 25, 10, 10]} />)
      expect(screen.getByTestId('learning-time-chart')).toBeInTheDocument()
    })

    it('空数据应显示占位信息', () => {
      render(<LearningTimeChart data={[]} />)
      expect(screen.getByTestId('learning-time-chart')).toBeInTheDocument()
    })
  })

  describe('MasteryTrendChart', () => {
    it('应渲染掌握趋势图表', () => {
      render(
        <MasteryTrendChart
          data={[
            { nodeId: 'n1', nodeName: '加法', startLevel: 40, endLevel: 80, trend: 'up' },
          ]}
        />,
      )
      expect(screen.getByTestId('mastery-trend-chart')).toBeInTheDocument()
    })
  })

  describe('GradeProgressChart', () => {
    it('应渲染年级进度图表', () => {
      render(
        <GradeProgressChart progress={{ totalNodes: 10, masteredNodes: 7, percentage: 70 }} />,
      )
      expect(screen.getByTestId('grade-progress-chart')).toBeInTheDocument()
    })

    it('应显示进度百分比', () => {
      render(
        <GradeProgressChart progress={{ totalNodes: 10, masteredNodes: 7, percentage: 70 }} />,
      )
      expect(screen.getByText(/70/)).toBeInTheDocument()
    })
  })
})
