/**
 * useInitializeApp Hook
 * App 启动时执行一次性初始化：
 * 1. 从 Dexie.js 加载孩子列表到 childStore
 * 2. DB 为空时自动创建默认孩子
 * 3. 管理 loading 状态 (isInitialized)
 */

import { useState, useEffect } from 'react'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'
import type { Child } from '@/types/models'

/** Hook 返回值 */
export interface InitializeAppState {
  /** 初始化是否完成 */
  isInitialized: boolean
}

/** 默认孩子配置 */
const DEFAULT_CHILD: Omit<Child, 'id'> = {
  name: '小星星',
  avatar: '⭐',
  age: 5,
  gradeLevel: 'middle-kindergarten',
  createdAt: new Date(),
  settings: {
    dailyLearningMinutes: 20,
    preferredSubjects: ['math', 'chinese', 'english'],
    difficultyAdjustment: 0,
    voiceEnabled: true,
    soundEffectsEnabled: true,
  },
}

export function useInitializeApp(): InitializeAppState {
  const [isInitialized, setIsInitialized] = useState(false)
  const addChild = useChildStore((s) => s.addChild)

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        // 1. 从 DB 加载孩子列表
        const children = await db.children.toArray()

        if (cancelled) return

        if (children.length === 0) {
          // 2. DB 为空 → 创建默认孩子
          const id = await db.children.add({ ...DEFAULT_CHILD })
          if (cancelled) return

          const defaultChild: Child = {
            ...DEFAULT_CHILD,
            id: String(id),
            createdAt: new Date(),
          }
          addChild(defaultChild)
        } else {
          // 3. DB 有数据 → 加载到 store
          for (const child of children) {
            if (cancelled) return
            addChild(child)
          }
        }
      } catch {
        // 初始化失败时使用内存中的默认孩子
        if (!cancelled) {
          addChild({
            ...DEFAULT_CHILD,
            id: 'fallback-1',
            createdAt: new Date(),
          })
        }
      } finally {
        if (!cancelled) {
          setIsInitialized(true)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [addChild])

  return { isInitialized }
}
