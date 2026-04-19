/**
 * ParentDashboard 集成测试
 *
 * 基础展示层 + PIN 解锁后跳转「高级设置」页（不再在仪表盘内嵌配置表单）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const {
  mockGetCacheSize,
  mockCheckHealth,
  mockNavigate,
  mockApiPatch,
  authState,
  readyCoursesQuery,
} = vi.hoisted(() => {
  const authState = {
    user: {
      id: 1,
      nickname: '家长',
      parentPin: null as string | null,
    },
    logout: vi.fn(),
  }
  const readyCoursesData = [
    {
      id: 1, slug: 'math', name: '数学', emoji: '🔢', colorHex: '#FF8C42', status: 'ready', isSystem: true,
      userId: null, disciplineType: 'academic', parentCourseId: null, stageIndex: 0,
      requirementSpec: {}, dialogHistory: [], initTaskId: null, initError: null,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    },
    {
      id: 2, slug: 'chinese', name: '语文', emoji: '📖', colorHex: '#2EC4B6', status: 'ready', isSystem: true,
      userId: null, disciplineType: 'academic', parentCourseId: null, stageIndex: 0,
      requirementSpec: {}, dialogHistory: [], initTaskId: null, initError: null,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    },
    {
      id: 3, slug: 'english', name: '英语', emoji: '🌍', colorHex: '#5BC0EB', status: 'ready', isSystem: true,
      userId: null, disciplineType: 'academic', parentCourseId: null, stageIndex: 0,
      requirementSpec: {}, dialogHistory: [], initTaskId: null, initError: null,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    },
  ]
  const readyCoursesQuery = { data: readyCoursesData, isLoading: false }
  return {
    mockGetCacheSize: vi.fn(),
    mockCheckHealth: vi.fn(),
    mockNavigate: vi.fn(),
    mockApiPatch: vi.fn().mockResolvedValue({}),
    authState,
    readyCoursesQuery,
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: { user: typeof authState.user | null; logout: typeof authState.logout }) => unknown) =>
      selector({
        user: authState.user,
        logout: authState.logout,
      }),
    {
      setState: (updater: (s: { user: typeof authState.user | null }) => { user?: typeof authState.user | null }) => {
        const next = updater({ user: authState.user })
        if (next.user !== undefined) {
          authState.user = next.user
            ? { ...authState.user, ...next.user }
            : { id: 1, nickname: '家长', parentPin: null }
        }
      },
    },
  ),
}))

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

const mockApiGet = vi.hoisted(() =>
  vi.fn().mockImplementation((path: string) => {
    if (path === '/knowledge_nodes') {
      return Promise.resolve([
        { id: 'm1', subject: 'math' },
        { id: 'c1', subject: 'chinese' },
        { id: 'e1', subject: 'english' },
      ])
    }
    if (path === '/mastery_records') {
      return Promise.resolve([
        { knowledgeNodeId: 'm1', masteryLevel: 80 },
        { knowledgeNodeId: 'c1', masteryLevel: 70 },
        { knowledgeNodeId: 'e1', masteryLevel: 60 },
      ])
    }
    if (path === '/daily_sessions') {
      return Promise.resolve([])
    }
    return Promise.resolve([])
  }),
)

vi.mock('@/services/api', () => ({
  apiClient: {
    get: mockApiGet,
    getOne: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockResolvedValue({}),
    patch: mockApiPatch,
  },
}))

vi.mock('@/hooks/queries/useCourses', () => ({
  useCourses: () => readyCoursesQuery,
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: Object.assign(
    vi.fn().mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        currentChild: {
          id: 'child-1',
          name: '小明',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    ),
    {
      getState: vi.fn().mockReturnValue({
        currentChild: {
          id: 'child-1',
          name: '小明',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    },
  ),
}))

import { ParentDashboard } from '../ParentDashboard'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithRouter() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ParentDashboard 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockClear()
    mockApiPatch.mockClear()
    mockNavigate.mockClear()
    localStorageMock.clear()
    mockGetCacheSize.mockResolvedValue(0)
    mockCheckHealth.mockResolvedValue(true)
    authState.user = { id: 1, nickname: '家长', parentPin: null }
  })

  it('基础展示层应显示学习概览统计', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByTestId('parent-dashboard')).toBeTruthy()
      expect(screen.getByText(/学习概览/)).toBeTruthy()
    })
  })

  it('基础展示层应显示 OpenMAIC 服务状态（在线）', async () => {
    mockCheckHealth.mockResolvedValue(true)
    mockGetCacheSize.mockResolvedValue(5)
    renderWithRouter()
    await waitFor(() => {
      const serviceStatus = screen.getByTestId('service-status')
      expect(serviceStatus).toBeTruthy()
      expect(serviceStatus.textContent).toContain('已就绪')
    })
  })

  it('基础展示层应显示 OpenMAIC 服务离线状态', async () => {
    mockCheckHealth.mockResolvedValue(false)
    renderWithRouter()
    await waitFor(() => {
      const serviceStatus = screen.getByTestId('service-status')
      expect(serviceStatus.textContent).toContain('离线')
    })
  })

  it('基础展示层应显示已缓存课程数', async () => {
    mockGetCacheSize.mockResolvedValue(3)
    renderWithRouter()
    await waitFor(() => {
      const cacheInfo = screen.getByTestId('cache-info')
      expect(cacheInfo).toBeTruthy()
      expect(cacheInfo.textContent).toContain('3')
    })
  })

  it('应显示「高级设置」按钮', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByTestId('advanced-settings-btn')).toBeTruthy()
    })
  })

  it('点击高级设置应弹出 PIN 验证', async () => {
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    expect(screen.getByTestId('pin-container')).toBeTruthy()
  })

  it('无已保存 PIN 时应进入 setup 模式', async () => {
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    expect(screen.getByText(/请设置家长密码/)).toBeTruthy()
  })

  it('首次设置 PIN 成功后应同步到后端并跳转设置页', async () => {
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/users',
        { parentPin: '1234' },
        expect.objectContaining({
          filters: [{ column: 'id', operator: 'eq', value: 1 }],
        }),
      )
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/parent/settings')
    })
  })

  it('有已保存 PIN 时应进入 verify 模式', async () => {
    authState.user.parentPin = '5678'
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    expect(screen.getByText(/请输入家长密码/)).toBeTruthy()
  })

  it('PIN 验证通过后应跳转到高级设置页面', async () => {
    authState.user.parentPin = '1234'
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/parent/settings')
    })
  })

  it('PIN 验证失败应显示错误提示', async () => {
    authState.user.parentPin = '1234'
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    '0000'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    expect(screen.getByTestId('pin-error')).toBeTruthy()
    expect(screen.getByText(/密码错误/)).toBeTruthy()
  })

  it('已解锁后再次点击高级设置应直接跳转', async () => {
    authState.user.parentPin = '1234'
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/parent/settings'))
    mockNavigate.mockClear()

    await waitFor(() => {
      expect(screen.queryByTestId('pin-container')).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/parent/settings')
  })
})
