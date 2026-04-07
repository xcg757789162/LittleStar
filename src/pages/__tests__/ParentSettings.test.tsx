import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParentSettings } from '../ParentSettings'

describe('ParentSettings', () => {
  it('应渲染设置容器', () => {
    render(<ParentSettings />)
    expect(screen.getByTestId('parent-settings')).toBeInTheDocument()
  })

  it('应显示每日学习时长设置', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/学习时长/)).toBeInTheDocument()
  })

  it('应显示科目偏好设置', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/科目/)).toBeInTheDocument()
  })

  it('应显示孩子信息', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/孩子信息|基本信息/)).toBeInTheDocument()
  })
})
