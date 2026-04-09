/**
 * useInitializeApp Hook
 * App 启动时执行一次性初始化：
 * 1. 从 localStorage 恢复用户登录状态 (authStore.restoreAuth)
 * 2. 若已登录，根据 userId 从 Dexie.js 加载该用户的孩子列表到 childStore
 * 3. 管理 loading 状态 (isInitialized)
 *
 * 不再自动创建默认孩子，改为引导用户登录 → 创建孩子
 */

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'

/** Hook 返回值 */
export interface InitializeAppState {
  /** 初始化是否完成 */
  isInitialized: boolean
}

export function useInitializeApp(): InitializeAppState {
  const [isInitialized, setIsInitialized] = useState(false)
  const restoreAuth = useAuthStore((s) => s.restoreAuth)
  const isAuthLoaded = useAuthStore((s) => s.isAuthLoaded)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addChild = useChildStore((s) => s.addChild)
  const resetChildren = useChildStore((s) => s.reset)

  // Step 1: 恢复认证状态
  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  // Step 2: 认证加载完成后，根据用户加载孩子
  useEffect(() => {
    if (!isAuthLoaded) return

    let cancelled = false

    async function loadChildren() {
      try {
        // 先重置 childStore，确保切换用户时清空
        resetChildren()

        if (currentUser?.id) {
          // 已登录 → 按 userId 加载该用户的孩子
          const children = await db.children
            .where('userId')
            .equals(currentUser.id)
            .toArray()

          if (cancelled) return

          for (const child of children) {
            addChild(child)
          }
        }
        // 未登录 → 不加载任何孩子（路由守卫会引导到 /auth）
      } catch {
        // 加载失败静默处理
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
  }, [isAuthLoaded, currentUser?.id, addChild, resetChildren])

  return { isInitialized }
}
