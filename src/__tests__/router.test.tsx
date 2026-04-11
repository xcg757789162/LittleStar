import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../router'

describe('Router', () => {
  it('首页应渲染', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('课堂页面应渲染', () => {
    render(
      <MemoryRouter initialEntries={['/classroom']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('native-classroom')).toBeInTheDocument()
  })

  it('星空地图应渲染', () => {
    render(
      <MemoryRouter initialEntries={['/starmap']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('star-map')).toBeInTheDocument()
  })

  it('404 应渲染', () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
  })
})
