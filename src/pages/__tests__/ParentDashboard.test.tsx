import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParentDashboard } from '../ParentDashboard'

describe('ParentDashboard', () => {
  it('应渲染仪表盘容器', () => {
    render(<ParentDashboard />)
    expect(screen.getByTestId('parent-dashboard')).toBeInTheDocument()
  })

  it('应显示学习概览', () => {
    render(<ParentDashboard />)
    expect(screen.getByText('学习概览')).toBeInTheDocument()
  })

  it('应显示学习时长信息', () => {
    render(<ParentDashboard />)
    expect(screen.getByTestId('stat-duration')).toBeInTheDocument()
  })

  it('应显示完成题数信息', () => {
    render(<ParentDashboard />)
    expect(screen.getByTestId('stat-completed')).toBeInTheDocument()
  })

  it('应显示正确率信息', () => {
    render(<ParentDashboard />)
    expect(screen.getByTestId('stat-accuracy')).toBeInTheDocument()
  })
})
