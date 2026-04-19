import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '../App'
import type { Child } from '@/types/models'

vi.mock('@/hooks/useInitializeApp', () => ({
  useInitializeApp: () => ({ isInitialized: true }),
}))

const { emptyCoursesQuery } = vi.hoisted(() => ({
  emptyCoursesQuery: { data: [] as unknown[], isLoading: false },
}))

vi.mock('@/hooks/queries/useCourses', () => ({
  useCourses: () => emptyCoursesQuery,
}))

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
  useChildStore: (selector: (s: { children: Child[]; currentChild: Child | null }) => unknown) =>
    selector({ children: [mockChild], currentChild: mockChild }),
}))

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

function renderApp(initialEntries?: string[]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('E2E Flow', () => {
  it('应渲染应用根组件', () => {
    renderApp()
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('首页应能访问', () => {
    renderApp(['/'])
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('课堂页面应能访问', () => {
    renderApp(['/classroom'])
    expect(screen.getByTestId('native-classroom')).toBeInTheDocument()
  })
})
