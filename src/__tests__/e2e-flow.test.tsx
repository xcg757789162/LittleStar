import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'

// Mock useInitializeApp 使其直接返回已初始化状态
vi.mock('@/hooks/useInitializeApp', () => ({
  useInitializeApp: () => ({ isInitialized: true }),
}))

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
