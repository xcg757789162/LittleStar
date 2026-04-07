import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'

describe('E2E Flow', () => {
  it('应渲染应用根组件', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('首页应能访问', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('学习页面应能访问', () => {
    render(
      <MemoryRouter initialEntries={['/learn']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('learning-session')).toBeInTheDocument()
  })
})
