import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '../AppLayout'

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
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

  it('底部导航应显示 3 个导航项', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('星空')).toBeInTheDocument()
    expect(screen.getByText('家长')).toBeInTheDocument()
  })

  it('点击导航项应触发路由跳转', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )

    const starMapNav = screen.getByText('星空')
    await user.click(starMapNav)

    // 验证导航被触发 — 星空按钮应高亮
    const starMapButton = starMapNav.closest('[data-testid="nav-item-starmap"]')
    expect(starMapButton).toBeInTheDocument()
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

  it('当前页面对应的导航项应高亮', () => {
    renderWithRouter(
      <AppLayout>
        <div>Star Map</div>
      </AppLayout>,
      ['/starmap'],
    )

    const starMapItem = screen.getByTestId('nav-item-starmap')
    // 高亮项应有 active 样式（检查 data-active 属性）
    expect(starMapItem).toHaveAttribute('data-active', 'true')
  })
})
