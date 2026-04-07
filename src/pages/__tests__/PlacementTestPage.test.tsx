import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlacementTestPage } from '../PlacementTestPage'

// Mock loadCurriculum
vi.mock('@/curriculum', () => ({
  loadCurriculum: vi.fn(() =>
    Promise.resolve({
      gradeLevel: 'grade-2',
      subject: 'math',
      version: '2022-v1',
      reference: 'test',
      modules: [
        {
          id: 'mod-1',
          name: '模块1',
          description: '基础',
          order: 1,
          knowledgeNodes: [
            {
              id: 'node-1a',
              name: '测试知识点',
              description: '',
              difficulty: 2,
              contentTypes: ['quiz'],
              prerequisites: [],
              templatePrompts: [],
            },
          ],
        },
      ],
    }),
  ),
}))

describe('PlacementTestPage', () => {
  const mockOnComplete = vi.fn()
  const mockOnExit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('开始页面', () => {
    it('应渲染测评页面容器', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByTestId('placement-test-page')).toBeInTheDocument()
    })

    it('应显示欢迎文案', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByText('让我们看看你已经学会了什么！')).toBeInTheDocument()
    })

    it('应显示开始测评按钮', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByTestId('start-test-btn')).toBeInTheDocument()
    })

    it('应显示科目和年级信息', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByText(/数学/)).toBeInTheDocument()
      expect(screen.getByText(/二年级/)).toBeInTheDocument()
    })
  })

  describe('答题界面', () => {
    it('点击开始后应进入答题界面', async () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      fireEvent.click(screen.getByTestId('start-test-btn'))
      await waitFor(() => {
        expect(screen.getByTestId('test-question-area')).toBeInTheDocument()
      })
    })

    it('应显示进度条', async () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      fireEvent.click(screen.getByTestId('start-test-btn'))
      await waitFor(() => {
        expect(screen.getByTestId('test-progress')).toBeInTheDocument()
      })
    })
  })

  describe('退出功能', () => {
    it('应有退出按钮', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByTestId('exit-test-btn')).toBeInTheDocument()
    })

    it('点击退出应调用 onExit', () => {
      render(
        <PlacementTestPage
          subject="math"
          gradeLevel="grade-2"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      fireEvent.click(screen.getByTestId('exit-test-btn'))
      expect(mockOnExit).toHaveBeenCalledOnce()
    })
  })
})
