import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from '../router'
import type { Child } from '@/types/models'

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}))

const mockChild = {
  id: '1',
  name: '测测',
  avatar: '⭐',
  age: 7,
  userId: '1',
  createdAt: new Date(),
  settings: {
    dailyLearningMinutes: 20,
    preferredSubjects: ['math'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
  },
} as Child

vi.mock('@/stores/childStore', () => ({
  useChildStore: (selector: (s: { children: typeof mockChild[]; currentChild: typeof mockChild }) => unknown) =>
    selector({ children: [mockChild], currentChild: mockChild }),
}))

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
})

function renderWithQuery(ui: ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Router', () => {
  it('首页应渲染', () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('课堂页面应渲染', () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/classroom']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('native-classroom')).toBeInTheDocument()
  })

  it('404 应渲染', () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
  })
})
