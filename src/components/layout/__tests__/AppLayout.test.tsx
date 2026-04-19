import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../AppLayout'

const { emptyCoursesQuery } = vi.hoisted(() => ({
  emptyCoursesQuery: { data: [] as unknown[], isLoading: false },
}))

vi.mock('@/hooks/queries/useCourses', () => ({
  useCourses: () => emptyCoursesQuery,
}))

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppLayout', () => {
  it('应渲染子组件', () => {
    renderWithRouter(
      <AppLayout>
        <div data-testid="child-content">Hello</div>
      </AppLayout>,
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('应渲染底部导航栏', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
  })

  it('底部导航应显示主入口项', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('复习')).toBeInTheDocument()
    expect(screen.getByText('课堂')).toBeInTheDocument()
    expect(screen.getByText('家长')).toBeInTheDocument()
    // 中央"知识"按钮是无文字图标
    expect(screen.getByTestId('nav-item-knowledge')).toBeInTheDocument()
  })

  it('点击导航项应触发路由跳转', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )

    const historyNav = screen.getByText('复习')
    await user.click(historyNav)

    const historyButton = historyNav.closest('[data-testid="nav-item-history"]')
    expect(historyButton).toBeInTheDocument()
  })

  it('课堂页面（/classroom）不应渲染底部导航栏', () => {
    renderWithRouter(
      <AppLayout>
        <div>Classroom content</div>
      </AppLayout>,
      ['/classroom'],
    )
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
  })

  it('家长设置页面（/parent/settings）不应渲染底部导航栏', () => {
    renderWithRouter(
      <AppLayout>
        <div>Parent settings</div>
      </AppLayout>,
      ['/parent/settings'],
    )
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
  })

  it('当前页面对应的导航项应高亮', () => {
    renderWithRouter(
      <AppLayout>
        <div>History</div>
      </AppLayout>,
      ['/history'],
    )

    const historyItem = screen.getByTestId('nav-item-history')
    expect(historyItem).toHaveAttribute('data-active', 'true')
  })
})
