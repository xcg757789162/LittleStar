import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ParentDashboard } from '../ParentDashboard'

const { mockDailySessions } = vi.hoisted(() => {
  const mockDailySessions: unknown[] = []
  return { mockDailySessions }
})

vi.mock('@/db/database', () => ({
  db: {
    dailySessions: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => [...mockDailySessions]),
        }),
      }),
    },
  },
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: {
    getState: vi.fn().mockReturnValue({
      currentChild: {
        id: 'child-1',
        name: '小星星',
      },
    }),
  },
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ParentDashboard />
    </MemoryRouter>,
  )
}

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDailySessions.length = 0
  })

  it('应渲染仪表盘容器', () => {
    renderDashboard()
    expect(screen.getByTestId('parent-dashboard')).toBeInTheDocument()
  })

  it('应显示学习概览', () => {
    renderDashboard()
    expect(screen.getByText('学习概览')).toBeInTheDocument()
  })

  it('应显示学习时长信息', () => {
    renderDashboard()
    expect(screen.getByTestId('stat-duration')).toBeInTheDocument()
  })

  it('应显示完成题数信息', () => {
    renderDashboard()
    expect(screen.getByTestId('stat-completed')).toBeInTheDocument()
  })

  it('应显示正确率信息', () => {
    renderDashboard()
    expect(screen.getByTestId('stat-accuracy')).toBeInTheDocument()
  })

  it('应显示学习报告入口', () => {
    renderDashboard()
    expect(screen.getByTestId('reports-btn')).toBeInTheDocument()
  })

  it('无数据时显示 0 分/0 题/0%', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId('stat-duration').textContent).toContain('0分')
      expect(screen.getByTestId('stat-completed').textContent).toContain('0题')
      expect(screen.getByTestId('stat-accuracy').textContent).toContain('0%')
    })
  })

  it('有数据时显示真实学习统计', async () => {
    const now = new Date()
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
    mockDailySessions.push({
      id: 1,
      childId: 'child-1',
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      startTime: thirtyMinAgo,
      endTime: now,
      questionsCompleted: 15,
      correctCount: 12,
      subjects: ['math'],
      streak: 1,
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId('stat-completed').textContent).toContain('15题')
      expect(screen.getByTestId('stat-accuracy').textContent).toContain('80%')
    })
  })
})
