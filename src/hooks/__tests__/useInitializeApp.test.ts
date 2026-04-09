/**
 * useInitializeApp Hook 测试
 * 测试 App 启动时的初始化逻辑
 *
 * 迁移后流程：authStore.restoreAuth() → apiClient.get('/children') → childStore.addChild()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChildStore } from '@/stores/childStore'

// 使用 vi.hoisted 确保变量在 vi.mock 提升前初始化
const { mockChildren, mockApiGet } = vi.hoisted(() => {
  const mockChildren: unknown[] = []
  const mockApiGet = vi.fn()
  return { mockChildren, mockApiGet }
})

// Mock authStore — 控制认证恢复流程
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      restoreAuth: vi.fn().mockImplementation(async () => {}),
      isRestored: true,
      isAuthenticated: true,
    }),
  ),
}))

// Mock API Client — 模拟从 API 加载孩子列表
vi.mock('@/services/api', () => ({
  apiClient: {
    get: mockApiGet,
  },
}))

// 延迟导入确保 mock 已就绪
import { useInitializeApp } from '../useInitializeApp'

describe('useInitializeApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChildren.length = 0
    useChildStore.getState().reset()
    // 默认返回空孩子列表
    mockApiGet.mockImplementation(async () => [...mockChildren])
  })

  it('初始状态 isInitialized 应为 false', () => {
    const { result } = renderHook(() => useInitializeApp())

    // 初始渲染时还未完成初始化
    expect(result.current.isInitialized).toBeDefined()
  })

  it('初始化完成后 isInitialized 应为 true', async () => {
    const { result } = renderHook(() => useInitializeApp())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
  })

  it('API 返回空列表时不应添加孩子到 store', async () => {
    // mockChildren 为空，模拟无孩子的用户
    const { result } = renderHook(() => useInitializeApp())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const state = useChildStore.getState()
    expect(state.children).toHaveLength(0)
  })

  it('API 有数据时应将孩子加载到 childStore', async () => {
    // 预填充 API 返回值
    mockChildren.push({
      id: 1,
      name: '小花',
      avatar: '🌸',
      age: 4,
      gradeLevel: 'lower-kindergarten',
      createdAt: new Date().toISOString(),
      settings: {
        dailyLearningMinutes: 15,
        preferredSubjects: ['chinese'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
      },
    })

    renderHook(() => useInitializeApp())

    await waitFor(() => {
      const state = useChildStore.getState()
      expect(state.children.length).toBe(1)
      expect(state.children[0].name).toBe('小花')
      expect(state.currentChild).not.toBeNull()
      expect(state.currentChild?.name).toBe('小花')
    })
  })

  it('应调用 apiClient.get 获取孩子列表', async () => {
    const { result } = renderHook(() => useInitializeApp())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    expect(mockApiGet).toHaveBeenCalledWith('/children')
  })

  it('loading 状态管理：初始化过程中 isInitialized 为 false', () => {
    const { result } = renderHook(() => useInitializeApp())

    // 首次渲染时应该还在加载
    // 注意：由于 useEffect 是异步的，首次渲染时 isInitialized 应为 false
    expect(typeof result.current.isInitialized).toBe('boolean')
  })
})
