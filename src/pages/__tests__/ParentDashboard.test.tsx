import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ParentDashboard } from '../ParentDashboard'
import type { Child } from '@/types/models'

const {
  mockDailySessions,
  mockGetCacheSize,
  mockCheckHealth,
  useChildStoreMock,
  emptyCoursesQuery,
} = vi.hoisted(() => {
  const mockDailySessions: unknown[] = []
  const mockChild = {
    id: '1',
    name: '小星星',
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
  const useChildStoreMock = Object.assign(
    vi.fn((selector: (s: { children: Child[]; currentChild: Child | null }) => unknown) =>
      selector({ children: [mockChild], currentChild: mockChild })),
    {
      getState: vi.fn(() => ({ currentChild: mockChild })),
    },
  )
  const emptyCoursesQuery = { data: [] as unknown[], isLoading: false }
  return {
    mockDailySessions,
    mockGetCacheSize: vi.fn().mockResolvedValue(0),
    mockCheckHealth: vi.fn().mockResolvedValue(true),
    useChildStoreMock,
    emptyCoursesQuery,
  }
})

vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: vi.fn().mockImplementation(function () {
    this.getClassroom = vi.fn()
    this.listCachedClassrooms = vi.fn().mockResolvedValue([])
    this.saveClassroom = vi.fn()
    this.deleteClassroom = vi.fn()
    this.clearExpiredCache = vi.fn()
    this.clearAll = vi.fn()
    this.getCacheSize = mockGetCacheSize
  }),
}))

vi.mock('@/services/openmaic/client', () => ({
  OpenMAICClient: vi.fn().mockImplementation(function () {
    this.checkHealth = mockCheckHealth
    this.generateClassroom = vi.fn()
    this.getClassroom = vi.fn()
  }),
}))

vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/daily_sessions') return [...mockDailySessions]
      if (path === '/knowledge_nodes') return []
      if (path === '/mastery_records') return []
      return []
    }),
    getOne: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/hooks/queries/useCourses', () => ({
  useCourses: () => emptyCoursesQuery,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: { user: { id: number; parentPin: string | null }; logout: () => void }) => unknown) =>
      selector({
        user: { id: 1, parentPin: null },
        logout: vi.fn(),
      }),
    { setState: vi.fn() },
  ),
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: useChildStoreMock,
}))

function renderDashboard(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ParentDashboard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
    mockDailySessions.length = 0
    mockGetCacheSize.mockResolvedValue(0)
    mockCheckHealth.mockResolvedValue(true)
  })

  it('应渲染仪表盘容器', () => {
    renderDashboard(queryClient)
    expect(screen.getByTestId('parent-dashboard')).toBeInTheDocument()
  })

  it('应显示学习概览', () => {
    renderDashboard(queryClient)
    expect(screen.getByText(/学习概览/)).toBeInTheDocument()
  })

  it('应显示学习时长信息', () => {
    renderDashboard(queryClient)
    expect(screen.getByTestId('stat-duration')).toBeInTheDocument()
  })

  it('应显示完成题数信息', () => {
    renderDashboard(queryClient)
    expect(screen.getByTestId('stat-completed')).toBeInTheDocument()
  })

  it('应显示正确率信息', () => {
    renderDashboard(queryClient)
    expect(screen.getByTestId('stat-accuracy')).toBeInTheDocument()
  })

  it('应显示系统日志入口', () => {
    renderDashboard(queryClient)
    expect(screen.getByTestId('logs-btn')).toBeInTheDocument()
  })

  it('无数据时显示 0 分/0 题/0%', async () => {
    renderDashboard(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId('stat-duration').textContent).toContain('0分')
      expect(screen.getByTestId('stat-completed').textContent).toContain('0题')
      expect(screen.getByTestId('stat-accuracy').textContent).toContain('0%')
    })
  })

  it('有数据时显示真实学习统计', async () => {
    const now = new Date()
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
    mockDailySessions.push({
      id: 1,
      childId: 'child-1',
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      startTime: thirtyMinAgo,
      endTime: now,
      questionsCompleted: 15,
      correctCount: 12,
      subjects: ['math'],
      streak: 1,
    })

    renderDashboard(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId('stat-completed').textContent).toContain('15题')
      expect(screen.getByTestId('stat-accuracy').textContent).toContain('80%')
    })
  })
})
