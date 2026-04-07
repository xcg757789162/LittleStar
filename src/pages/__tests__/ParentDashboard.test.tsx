import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ParentDashboard } from '../ParentDashboard'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ParentDashboard />
    </MemoryRouter>,
  )
}

describe('ParentDashboard', () => {
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
})
