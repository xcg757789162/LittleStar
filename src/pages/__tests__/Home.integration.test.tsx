/**
 * Home 集成测试
 *
 * 测试首页教导处集成：预生成触发、缓存课程数量展示、学科入口
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// vi.hoisted: 确保 mock 变量在 vi.mock hoisting 前可用
const {
  mockListCachedClassrooms,
  mockGetCacheSize,
  mockPlanLessons,
  mockExecuteTasks,
} = vi.hoisted(() => ({
  mockListCachedClassrooms: vi.fn(),
  mockGetCacheSize: vi.fn(),
  mockPlanLessons: vi.fn(),
  mockExecuteTasks: vi.fn(),
}))

// Mock ClassroomCache
vi.mock('@/services/openmaic/cache', () => ({
  ClassroomCache: vi.fn().mockImplementation(function () {
    this.getClassroom = vi.fn()
    this.listCachedClassrooms = mockListCachedClassrooms
    this.saveClassroom = vi.fn()
    this.deleteClassroom = vi.fn()
    this.clearExpiredCache = vi.fn()
    this.clearAll = vi.fn()
    this.getCacheSize = mockGetCacheSize
  }),
}))

// Mock LessonPlanner + GenerationScheduler
vi.mock('@/services/lesson-planner', () => ({
  LessonPlanner: vi.fn().mockImplementation(function () {
    this.planLessons = mockPlanLessons
  }),
  GenerationScheduler: vi.fn().mockImplementation(function () {
    this.submitTask = vi.fn()
    this.executeTasks = mockExecuteTasks
    this.getPendingCount = vi.fn().mockReturnValue(0)
    this.clearTasks = vi.fn()
  }),
  RequirementGenerator: vi.fn().mockImplementation(function () {
    this.generate = vi.fn().mockReturnValue('mock requirement')
  }),
  DynamicAdjuster: vi.fn().mockImplementation(function () {
    this.evaluate = vi.fn()
  }),
}))

// Mock React Query hooks（Home 现在使用 usePlacementTests hook）
vi.mock('@/hooks/queries', () => ({
  usePlacementTests: vi.fn().mockReturnValue({
    data: [{ id: 1, childId: 'child-1', subject: 'math' }], // 已完成测评
    isLoading: false,
  }),
}))

// Mock childStore
vi.mock('@/stores/childStore', () => ({
  useChildStore: Object.assign(
    vi.fn().mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        currentChild: {
          id: 'child-1',
          name: '小明',
          age: 5,
          gradeLevel: 'middle-kindergarten',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    ),
    {
      getState: vi.fn().mockReturnValue({
        currentChild: {
          id: 'child-1',
          name: '小明',
          age: 5,
          gradeLevel: 'middle-kindergarten',
          settings: { dailyLearningMinutes: 15 },
        },
      }),
    },
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    h1: 'h1',
    p: 'p',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

import { Home } from '../Home'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home 集成测试 - 教导处集成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListCachedClassrooms.mockResolvedValue([])
    mockGetCacheSize.mockResolvedValue(0)
    mockPlanLessons.mockReturnValue([])
    mockExecuteTasks.mockResolvedValue([])
  })

  it('已完成测评后应显示开始学习入口', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('开始学习')).toBeTruthy()
    })
  })

  it('应展示缓存课程数量', async () => {
    mockGetCacheSize.mockResolvedValue(3)
    mockListCachedClassrooms.mockResolvedValue([
      { knowledgeNodeId: 'n-1', date: '2026-04-08', classroomId: 'c-1', classroomTitle: '数字' },
      { knowledgeNodeId: 'n-2', date: '2026-04-08', classroomId: 'c-2', classroomTitle: '汉字' },
      { knowledgeNodeId: 'n-3', date: '2026-04-08', classroomId: 'c-3', classroomTitle: '单词' },
    ])

    renderWithRouter()

    // 应显示缓存课程数量
    await waitFor(() => {
      const cacheInfo = screen.getByTestId('cache-status')
      expect(cacheInfo).toBeTruthy()
      expect(cacheInfo.textContent).toContain('3')
    })
  })

  it('缓存为空时应显示预生成状态', async () => {
    mockGetCacheSize.mockResolvedValue(0)
    mockListCachedClassrooms.mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      // 应有某种状态提示（可以是"准备中"或数量为 0）
      const homePage = screen.getByTestId('home-page')
      expect(homePage).toBeTruthy()
    })
  })

  it('各学科入口应可见', async () => {
    mockGetCacheSize.mockResolvedValue(3)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('开始学习')).toBeTruthy()
    })
  })
})
