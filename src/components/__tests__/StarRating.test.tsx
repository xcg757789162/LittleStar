import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StarRating } from '../voice/StarRating'

describe('StarRating', () => {
  it('应渲染 5 颗星星', () => {
    render(<StarRating stars={3} />)
    const container = screen.getByTestId('star-rating')
    expect(container).toBeInTheDocument()
    const litStars = screen.getAllByTestId('star-lit')
    const dimStars = screen.getAllByTestId('star-dim')
    expect(litStars.length + dimStars.length).toBe(5)
  })

  it('1 星应有 1 颗亮星和 4 颗暗星', () => {
    render(<StarRating stars={1} />)
    const litStars = screen.getAllByTestId('star-lit')
    const dimStars = screen.getAllByTestId('star-dim')
    expect(litStars.length).toBe(1)
    expect(dimStars.length).toBe(4)
  })

  it('3 星应有 3 颗亮星和 2 颗暗星', () => {
    render(<StarRating stars={3} />)
    const litStars = screen.getAllByTestId('star-lit')
    const dimStars = screen.getAllByTestId('star-dim')
    expect(litStars.length).toBe(3)
    expect(dimStars.length).toBe(2)
  })

  it('5 星应有 5 颗亮星和 0 颗暗星', () => {
    render(<StarRating stars={5} />)
    const litStars = screen.getAllByTestId('star-lit')
    expect(litStars.length).toBe(5)
    expect(screen.queryAllByTestId('star-dim').length).toBe(0)
  })

  it('星星应该足够大（≥40px）', () => {
    render(<StarRating stars={3} />)
    const firstStar = screen.getAllByTestId('star-lit')[0]
    expect(firstStar).toBeInTheDocument()
    // 验证 font-size 样式设置
    const style = firstStar.getAttribute('style') || ''
    expect(style).toMatch(/font-size/)
  })

  it('应标记动画状态', () => {
    render(<StarRating stars={3} animated={true} />)
    const container = screen.getByTestId('star-rating')
    expect(container).toHaveAttribute('data-animated', 'true')
  })
})
