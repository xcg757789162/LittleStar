/**
 * 用户认证 Store
 * 管理登录状态、当前用户信息
 * 使用 Dexie.js (IndexedDB) 存储用户数据
 * 登录状态通过 localStorage 持久化
 */

import { create } from 'zustand'
import { db } from '@/db/database'
import type { User } from '@/types/models'

/** localStorage key */
const AUTH_USER_ID_KEY = 'littlestar_auth_user_id'

/** 简易密码编码（非安全哈希，生产环境应使用 bcrypt） */
function hashPassword(password: string): string {
  return btoa(encodeURIComponent(password))
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

/** authStore 状态接口 */
export interface AuthState {
  /** 当前登录用户 */
  currentUser: User | null
  /** 是否已加载完成（从 localStorage 恢复） */
  isAuthLoaded: boolean
  /** 是否登录中 */
  isLoggingIn: boolean
  /** 错误信息 */
  authError: string | null
}

/** authStore 操作接口 */
export interface AuthActions {
  /** 从 localStorage 恢复登录状态 */
  restoreAuth: () => Promise<void>
  /** 注册新用户 */
  register: (username: string, password: string, nickname: string) => Promise<boolean>
  /** 登录 */
  login: (username: string, password: string) => Promise<boolean>
  /** 登出 */
  logout: () => void
  /** 清除错误 */
  clearAuthError: () => void
  /** 重置 */
  reset: () => void
}

const initialState: AuthState = {
  currentUser: null,
  isAuthLoaded: false,
  isLoggingIn: false,
  authError: null,
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  ...initialState,

  restoreAuth: async () => {
    try {
      const savedUserId = localStorage.getItem(AUTH_USER_ID_KEY)
      if (savedUserId) {
        // Dexie ++id 自增主键实际为 number，从 localStorage 恢复时需转换
        const user = await db.users.get(Number(savedUserId) as unknown as string)
        if (user) {
          set({ currentUser: user, isAuthLoaded: true })
          return
        }
      }
    } catch {
      // 恢复失败，视为未登录
    }
    set({ isAuthLoaded: true })
  },

  register: async (username, password, nickname) => {
    set({ isLoggingIn: true, authError: null })
    try {
      // 检查用户名是否已存在
      const existing = await db.users.where('username').equals(username).first()
      if (existing) {
        set({ authError: '用户名已被注册', isLoggingIn: false })
        return false
      }

      // 创建新用户
      const now = new Date()
      const id = await db.users.add({
        username,
        passwordHash: hashPassword(password),
        nickname,
        createdAt: now,
        lastLoginAt: now,
      })

      const newUser: User = {
        id: String(id),
        username,
        passwordHash: hashPassword(password),
        nickname,
        createdAt: now,
        lastLoginAt: now,
      }

      // 持久化登录状态
      localStorage.setItem(AUTH_USER_ID_KEY, String(id))
      set({ currentUser: newUser, isLoggingIn: false })
      return true
    } catch {
      set({ authError: '注册失败，请重试', isLoggingIn: false })
      return false
    }
  },

  login: async (username, password) => {
    set({ isLoggingIn: true, authError: null })
    try {
      const user = await db.users.where('username').equals(username).first()
      if (!user) {
        set({ authError: '用户名不存在', isLoggingIn: false })
        return false
      }

      if (!verifyPassword(password, user.passwordHash)) {
        set({ authError: '密码错误', isLoggingIn: false })
        return false
      }

      // 更新最后登录时间
      const now = new Date()
      await db.users.update(user.id!, { lastLoginAt: now })
      const updatedUser = { ...user, lastLoginAt: now }

      // 持久化登录状态
      localStorage.setItem(AUTH_USER_ID_KEY, String(user.id))
      set({ currentUser: updatedUser, isLoggingIn: false })
      return true
    } catch {
      set({ authError: '登录失败，请重试', isLoggingIn: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(AUTH_USER_ID_KEY)
    set({ currentUser: null, authError: null })
  },

  clearAuthError: () => set({ authError: null }),

  reset: () => {
    localStorage.removeItem(AUTH_USER_ID_KEY)
    set(initialState)
  },
}))
