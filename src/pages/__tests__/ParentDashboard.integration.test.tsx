/**
 * ParentDashboard 集成测试
 *
 * 测试分层配置：基础展示层（无需密码）+ 高级配置层（PIN 解锁）
 * 覆盖：服务健康检测、各学科掌握率、PIN 持久化、高级配置表单、PIN 错误提示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// vi.hoisted: 确保 mock 变量在 vi.mock hoisting 前可用
const {
  mockGetCacheSize,
  mockCheckHealth,
} = vi.hoisted(() => ({
  mockGetCacheSize: vi.fn(),
  mockCheckHealth: vi.fn(),
}))

// Mock ClassroomCache
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

// Mock OpenMAICClient
vi.mock('@/services/openmaic/client', () => ({
  OpenMAICClient: vi.fn().mockImplementation(function () {
    this.checkHealth = mockCheckHealth
    this.generateClassroom = vi.fn()
    this.getClassroom = vi.fn()
  }),
}))

// Mock API Client（ParentDashboard 现在通过 apiClient 加载数据）
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue(null),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  },
}))

// Mock childStore
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

// Mock localStorage
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

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ParentDashboard />
    </MemoryRouter>,
  )
}

describe('ParentDashboard 集成测试 - 分层配置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockGetCacheSize.mockResolvedValue(0)
    mockCheckHealth.mockResolvedValue(true)
  })

  // 基础展示层
  it('基础展示层应显示学习概览统计', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByTestId('parent-dashboard')).toBeTruthy()
      expect(screen.getByText('学习概览')).toBeTruthy()
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

  // 高级配置解锁
  it('应显示"高级设置"按钮', async () => {
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
    // 应显示 PIN 验证界面
    expect(screen.getByTestId('pin-container')).toBeTruthy()
  })

  it('无已保存 PIN 时应进入 setup 模式', async () => {
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    // setup 模式应显示"设置"文字
    expect(screen.getByText(/设置.*密码/)).toBeTruthy()
  })

  it('PIN 设置后应持久化到 localStorage', async () => {
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    // 第一次输入 PIN
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    // 确认 PIN
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应保存到 localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('littlestar_parent_pin', '1234')
    // 应显示高级配置
    await waitFor(() => {
      expect(screen.getByTestId('advanced-config')).toBeTruthy()
    })
  })

  it('有已保存 PIN 时应进入 verify 模式', async () => {
    // 预设 PIN
    localStorageMock.setItem('littlestar_parent_pin', '5678')
    renderWithRouter()
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    // verify 模式应显示"输入家长密码"
    expect(screen.getByText(/输入家长密码/)).toBeTruthy()
  })

  it('PIN 验证通过后应显示高级配置区域', async () => {
    localStorageMock.setItem('littlestar_parent_pin', '1234')
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    // 输入正确 PIN
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应显示高级配置区域
    await waitFor(() => {
      expect(screen.getByTestId('advanced-config')).toBeTruthy()
    })
  })

  it('PIN 验证失败应显示错误提示', async () => {
    localStorageMock.setItem('littlestar_parent_pin', '1234')
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })

    // 输入错误 PIN
    '0000'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应显示错误提示
    expect(screen.getByTestId('pin-error')).toBeTruthy()
    expect(screen.getByText(/密码错误/)).toBeTruthy()
  })

  // 高级配置表单
  it('高级配置应包含实际输入字段和保存按钮', async () => {
    localStorageMock.setItem('littlestar_parent_pin', '1234')
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    await waitFor(() => {
      expect(screen.getByTestId('config-openmaic-url')).toBeTruthy()
      expect(screen.getByTestId('config-api-key')).toBeTruthy()
      expect(screen.getByTestId('config-save-btn')).toBeTruthy()
    })
  })

  it('保存配置应写入 localStorage', async () => {
    localStorageMock.setItem('littlestar_parent_pin', '1234')
    renderWithRouter()

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('advanced-settings-btn'))
    })
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    await waitFor(() => {
      const urlInput = screen.getByTestId('config-openmaic-url')
      fireEvent.change(urlInput, { target: { value: 'http://my-server:3000' } })
      fireEvent.click(screen.getByTestId('config-save-btn'))
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('littlestar_openmaic_url', 'http://my-server:3000')
  })
})
