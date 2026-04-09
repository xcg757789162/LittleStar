import { create } from 'zustand'
import type { Child, ChildSettings } from '@/types/models'

/** childStore 状态接口 */
export interface ChildState {
  /** 当前选中的孩子 */
  currentChild: Child | null
  /** 所有孩子列表 */
  children: Child[]
}

/** childStore 操作接口 */
export interface ChildActions {
  /** 设置当前孩子 */
  setCurrentChild: (child: Child | null) => void
  /** 添加孩子（第一个孩子自动设为当前） */
  addChild: (child: Child) => void
  /** 更新孩子信息 */
  updateChild: (id: string, updates: Partial<Child>) => void
  /** 移除孩子 */
  removeChild: (id: string) => void
  /** 更新孩子设置（部分更新） */
  updateChildSettings: (id: string, settings: Partial<ChildSettings>) => void
  /** 重置到初始状态 */
  reset: () => void
}

/** childStore 初始状态 */
const initialState: ChildState = {
  currentChild: null,
  children: [],
}

/**
 * 孩子管理 Store
 * 管理孩子列表、当前选中孩子、孩子设置
 */
export const useChildStore = create<ChildState & ChildActions>()((set) => ({
  ...initialState,

  setCurrentChild: (child) => set({ currentChild: child }),

  addChild: (child) =>
    set((state) => {
      // 去重：如果已存在相同 id 的孩子，跳过添加
      if (child.id && state.children.some((c) => c.id === child.id)) {
        return state
      }
      const newChildren = [...state.children, child]
      return {
        children: newChildren,
        // 第一个孩子自动设为当前孩子
        currentChild: state.currentChild ?? child,
      }
    }),

  updateChild: (id, updates) =>
    set((state) => {
      const children = state.children.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      )
      const currentChild =
        state.currentChild?.id === id
          ? { ...state.currentChild, ...updates }
          : state.currentChild
      return { children, currentChild }
    }),

  removeChild: (id) =>
    set((state) => {
      const children = state.children.filter((c) => c.id !== id)
      const currentChild =
        state.currentChild?.id === id
          ? (children[0] ?? null)
          : state.currentChild
      return { children, currentChild }
    }),

  updateChildSettings: (id, settingsUpdate) =>
    set((state) => {
      const children = state.children.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          settings: { ...c.settings, ...settingsUpdate },
        }
      })
      const currentChild =
        state.currentChild?.id === id
          ? {
              ...state.currentChild,
              settings: { ...state.currentChild.settings, ...settingsUpdate },
            }
          : state.currentChild
      return { children, currentChild }
    }),

  reset: () => set(initialState),
}))
