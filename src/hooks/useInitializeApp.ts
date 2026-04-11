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
import { useUserProfileStore } from '@/stores/openmaic/user-profile'
import { apiClient } from '@/services/api'
import type { Child } from '@/types/models'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('InitApp')

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
    log.info('开始恢复认证状态...')
    restoreAuth()
  }, [restoreAuth])

  // 第二步：认证恢复后，如果已登录则加载孩子列表
  useEffect(() => {
    if (!isRestored) return

    let cancelled = false

    async function loadChildren() {
      if (!isAuthenticated) {
        // 未认证，初始化完成（将跳转到登录页）
        log.info('未认证，初始化完成')
        if (!cancelled) setIsInitialized(true)
        return
      }

      try {
        // 从 API 加载当前用户的孩子列表
        log.info('加载孩子列表...')
        const children = await apiClient.get<Child>('/children')
        if (cancelled) return

        log.info('孩子列表加载成功, 数量:', children.length)
        // 加载到 childStore
        for (const child of children) {
          addChild(child)
        }

        // 从数据库同步第一个孩子的头像到 user-profile store
        // 支持自定义头像（data: URL）和预设头像（/avatars/ 路径）
        const firstChild = children[0]
        if (firstChild?.avatar) {
          const isCustomAvatar = firstChild.avatar.startsWith('data:') || firstChild.avatar.startsWith('/avatars/')
          if (isCustomAvatar) {
            log.info('从数据库恢复头像:', firstChild.avatar.substring(0, 50) + '...')
            useUserProfileStore.getState().setAvatar(firstChild.avatar)
          } else {
            log.info('孩子头像为 emoji 或默认值，不覆盖本地头像:', firstChild.avatar)
          }
        }
      } catch (err) {
        // API 调用失败（后端离线或网络问题）
        // 页面组件会通过 React Query 按需重试
        log.error('加载孩子列表失败:', err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) {
          log.info('App 初始化完成')
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
