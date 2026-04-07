import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GradeUnlockCelebration } from '../GradeUnlockCelebration'
import type { PendingUnlock } from '@/stores/gradeUnlockStore'

describe('GradeUnlockCelebration', () => {
  const mockPending: PendingUnlock = {
    childId: 'child-1',
    subject: 'math',
    nextGrade: 'grade-2',
    averageMastery: 88,
  }

  const mockOnConfirm = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应渲染庆祝容器', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    expect(screen.getByTestId('grade-unlock-celebration')).toBeInTheDocument()
  })

  it('应显示解锁的年级名称', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    // 应包含"二年级"文字
    expect(screen.getByText(/二年级/)).toBeInTheDocument()
  })

  it('应显示科目信息', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    expect(screen.getByText(/数学/)).toBeInTheDocument()
  })

  it('应显示庆祝图标/表情', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
  })

  it('应有"开始测评"按钮', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    const btn = screen.getByTestId('start-placement-btn')
    expect(btn).toBeInTheDocument()
    expect(btn.textContent).toMatch(/测评|开始/)
  })

  it('点击"开始测评"应调用 onConfirm', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    fireEvent.click(screen.getByTestId('start-placement-btn'))
    expect(mockOnConfirm).toHaveBeenCalledOnce()
  })

  it('应有"稍后再说"按钮', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    const btn = screen.getByTestId('dismiss-btn')
    expect(btn).toBeInTheDocument()
  })

  it('点击"稍后再说"应调用 onDismiss', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    fireEvent.click(screen.getByTestId('dismiss-btn'))
    expect(mockOnDismiss).toHaveBeenCalledOnce()
  })

  it('应显示掌握度信息', () => {
    render(
      <GradeUnlockCelebration
        pending={mockPending}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    expect(screen.getByText(/88/)).toBeInTheDocument()
  })

  it('不同科目应显示正确的科目名', () => {
    render(
      <GradeUnlockCelebration
        pending={{ ...mockPending, subject: 'english', nextGrade: 'grade-3' }}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />,
    )
    expect(screen.getByText(/英语/)).toBeInTheDocument()
    expect(screen.getByText(/三年级/)).toBeInTheDocument()
  })
})
