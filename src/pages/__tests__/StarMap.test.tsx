import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StarMap } from '../StarMap'

describe('StarMap', () => {
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
})
