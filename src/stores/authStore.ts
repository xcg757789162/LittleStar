/**
 * authStore — 认证状态管理
 *
 * 通过 Auth Service API 实现：
 * - register: 注册 → 自动登录
 * - login: 登录 → 存 JWT token
 * - logout: 清除 token + 重置状态
 * - restoreAuth: 应用启动时从 localStorage 恢复认证状态
 *
 * JWT token 存储在 localStorage，由 apiClient 自动注入到请求 header
 */

import { create } from 'zustand'
import { authApi } from '@/services/api/auth'
import { TOKEN_STORAGE_KEY } from '@/services/api/types'
import { queryClient } from '@/lib/queryClient'
import type { AuthUser, LoginRequest, RegisterRequest } from '@/services/api/types'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('AuthStore')

/** authStore 状态接口 */
export interface AuthState {
  /** 当前用户信息 */
  user: AuthUser | null
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 是否正在加载（登录/注册/恢复中） */
  isLoading: boolean
  /** 错误消息 */
  error: string | null
  /** 是否已尝试恢复认证（应用启动时） */
  isRestored: boolean
}

/** authStore 操作接口 */
export interface AuthActions {
  /** 用户注册（注册后自动登录） */
  register: (data: RegisterRequest) => Promise<void>
  /** 用户登录 */
  login: (data: LoginRequest) => Promise<void>
  /** 用户登出 */
  logout: () => void
  /** 恢复认证状态（应用启动时调用） */
  restoreAuth: () => Promise<void>
  /** 清除错误 */
  clearError: () => void
}

/** 初始状态 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isRestored: false,
}

/**
 * 认证状态 Store
 *
 * 使用方式：
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuthStore()
 * ```
 */
export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  ...initialState,

  register: async (data: RegisterRequest) => {
    log.info('开始注册, email:', data.email)
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.register(data)
      // 存储 JWT token
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
      log.info('注册成功, userId:', response.user?.id)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败'
      log.error('注册失败:', message)
      set({ isLoading: false, error: message })
      throw error
    }
  },

  login: async (data: LoginRequest) => {
    log.info('开始登录, email:', data.email)
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login(data)
      // 存储 JWT token
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
      log.info('登录成功, userId:', response.user?.id)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      log.error('登录失败:', message)
      set({ isLoading: false, error: message })
      throw error
    }
  },

  logout: () => {
    log.info('用户登出')
    // 清除 JWT token
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    // 清除所有 React Query 缓存（防止用户切换后看到旧数据）
    queryClient.clear()
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  restoreAuth: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      log.debug('无存储的 token，跳过恢复')
      set({ isRestored: true })
      return
    }

    log.info('开始恢复认证状态...')
    set({ isLoading: true })
    try {
      // 验证 token 有效性
      const user = await authApi.me()
      log.info('认证恢复成功, userId:', user?.id)
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isRestored: true,
      })
    } catch (err) {
      // Token 无效，清除
      log.warn('Token 验证失败，清除 token:', err instanceof Error ? err.message : String(err))
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isRestored: true,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
