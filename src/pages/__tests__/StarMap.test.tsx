import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StarMap } from '../StarMap'

// 使用 vi.hoisted 确保变量在 mock 提升前初始化
const { mockMasteryRecords } = vi.hoisted(() => {
  const mockMasteryRecords: unknown[] = []
  return { mockMasteryRecords }
})

vi.mock('@/db/database', () => ({
  db: {
    masteryRecords: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => [...mockMasteryRecords]),
        }),
      }),
      toArray: vi.fn().mockImplementation(async () => [...mockMasteryRecords]),
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

describe('StarMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMasteryRecords.length = 0
  })

  it('应渲染星空地图容器', () => {
    render(<StarMap />)
    expect(screen.getByTestId('star-map')).toBeInTheDocument()
  })

  it('应显示三颗星球', () => {
    render(<StarMap />)
    expect(screen.getByText(/数学/)).toBeInTheDocument()
    expect(screen.getByText(/语文/)).toBeInTheDocument()
    expect(screen.getByText(/英语/)).toBeInTheDocument()
  })

  it('应显示成就进度', () => {
    render(<StarMap />)
    const progress = screen.getByTestId('achievement-progress')
    expect(progress).toBeInTheDocument()
  })

  it('无数据时显示"已点亮 0/3 颗星球"', async () => {
    render(<StarMap />)

    await waitFor(() => {
      const progress = screen.getByTestId('achievement-progress')
      expect(progress.textContent).toContain('0/3')
    })
  })

  it('掌握率 ≥ 80% 的科目星球应被点亮', async () => {
    // 数学科目掌握率 85%（≥ 80%）
    mockMasteryRecords.push(
      { childId: 'child-1', knowledgeNodeId: 'math-1', masteryLevel: 85 },
      { childId: 'child-1', knowledgeNodeId: 'math-2', masteryLevel: 85 },
    )

    render(<StarMap />)

    await waitFor(() => {
      const progress = screen.getByTestId('achievement-progress')
      expect(progress.textContent).toContain('1/3')
    })
  })

  it('多科目掌握率 ≥ 80% 时应显示正确的点亮数量', async () => {
    // 数学 90%, 语文 85%, 英语 50%
    mockMasteryRecords.push(
      { childId: 'child-1', knowledgeNodeId: 'math-1', masteryLevel: 90 },
      { childId: 'child-1', knowledgeNodeId: 'chinese-1', masteryLevel: 85 },
      { childId: 'child-1', knowledgeNodeId: 'english-1', masteryLevel: 50 },
    )

    render(<StarMap />)

    await waitFor(() => {
      const progress = screen.getByTestId('achievement-progress')
      expect(progress.textContent).toContain('2/3')
    })
  })
})
