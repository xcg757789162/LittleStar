/**
 * useInitializeApp Hook
 * App 启动时执行一次性初始化：
 * 1. 通过 authStore 恢复认证状态（验证 localStorage 中的 JWT token）
 * 2. 认证成功后通过 API 加载孩子列表到 childStore
 * 3. 管理 loading 状态 (isInitialized)
 *
 * 迁移说明：原 Dexie.js 版本直接从 IndexedDB 加载数据，
 * 现改为通过 Auth API 验证 token → React Query hooks 按需加载数据。
 */

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChildStore } from '@/stores/childStore'
import { apiClient } from '@/services/api'
import type { Child } from '@/types/models'

/** Hook 返回值 */
export interface InitializeAppState {
  /** 初始化是否完成 */
  isInitialized: boolean
}

export function useInitializeApp(): InitializeAppState {
  const [isInitialized, setIsInitialized] = useState(false)
  const restoreAuth = useAuthStore((s) => s.restoreAuth)
  const isRestored = useAuthStore((s) => s.isRestored)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addChild = useChildStore((s) => s.addChild)

  // 第一步：恢复认证状态
  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  // 第二步：认证恢复后，如果已登录则加载孩子列表
  useEffect(() => {
    if (!isRestored) return

    let cancelled = false

    async function loadChildren() {
      if (!isAuthenticated) {
        // 未认证，初始化完成（将跳转到登录页）
        if (!cancelled) setIsInitialized(true)
        return
      }

      try {
        // 从 API 加载当前用户的孩子列表
        const children = await apiClient.get<Child>('/children')
        if (cancelled) return

        // 加载到 childStore
        for (const child of children) {
          addChild(child)
        }
      } catch {
        // API 调用失败（后端离线或网络问题），静默处理
        // 页面组件会通过 React Query 按需重试
        // 首页/评测页等会显示各自的错误提示
      } finally {
        if (!cancelled) {
          setIsInitialized(true)
        }
      }
    }

    loadChildren()

    return () => {
      cancelled = true
    }
  }, [isRestored, isAuthenticated, addChild])

  return { isInitialized }
}
