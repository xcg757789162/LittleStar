import { create } from 'zustand'
import type { GradeLevel, Subject, GradeUnlock, UnlockConfig } from '@/types/models'
import { GradeUnlockEngine } from '@/engine/grade-unlock-engine'

/** 待处理解锁信息（展示用） */
export interface PendingUnlock {
  childId: string
  subject: Subject
  nextGrade: GradeLevel
  averageMastery: number
}

/** gradeUnlockStore 状态接口 */
export interface GradeUnlockState {
  /** 已解锁记录列表 */
  unlocks: GradeUnlock[]
  /** 解锁配置 */
  unlockConfig: UnlockConfig
  /** 待处理的解锁（用于显示庆祝动画） */
  pendingUnlock: PendingUnlock | null
  /** 是否正在检查解锁条件 */
  isChecking: boolean
}

/** gradeUnlockStore 操作接口 */
export interface GradeUnlockActions {
  /** 添加解锁记录 */
  addUnlock: (unlock: GradeUnlock) => void
  /** 按科目获取解锁记录 */
  getUnlocksBySubject: (subject: Subject) => GradeUnlock[]
  /** 获取某孩子某科目的最高已解锁年级 */
  getHighestUnlockedGrade: (childId: string, subject: Subject) => GradeLevel | null
  /** 更新解锁配置（部分更新） */
  updateUnlockConfig: (config: Partial<UnlockConfig>) => void
  /** 设置待处理解锁 */
  setPendingUnlock: (pending: PendingUnlock) => void
  /** 清除待处理解锁 */
  clearPendingUnlock: () => void
  /** 设置检查中状态 */
  setIsChecking: (checking: boolean) => void
  /** 重置到初始状态 */
  reset: () => void
}

/** 默认解锁配置 */
const defaultUnlockConfig: UnlockConfig = {
  masteryThreshold: 80,
  minMasteredRatio: 0.8,
}

/** gradeUnlockStore 初始状态 */
const initialState: GradeUnlockState = {
  unlocks: [],
  unlockConfig: { ...defaultUnlockConfig },
  pendingUnlock: null,
  isChecking: false,
}

/** 引擎实例（无状态，可共享） */
const engine = new GradeUnlockEngine()

/**
 * 年级解锁 Store
 * 管理解锁记录、解锁配置、待处理解锁状态
 */
export const useGradeUnlockStore = create<GradeUnlockState & GradeUnlockActions>()(
  (set, get) => ({
    ...initialState,

    addUnlock: (unlock) =>
      set((state) => ({
        unlocks: [...state.unlocks, unlock],
      })),

    getUnlocksBySubject: (subject) => {
      return get().unlocks.filter((u) => u.subject === subject)
    },

    getHighestUnlockedGrade: (childId, subject) => {
      const unlocks = get().unlocks.filter(
        (u) => u.childId === childId && u.subject === subject,
      )
      return engine.getCurrentGrade(
        unlocks.map((u) => ({
          subject: u.subject,
          gradeLevel: u.gradeLevel,
          unlockedAt: u.unlockedAt,
        })),
      )
    },

    updateUnlockConfig: (config) =>
      set((state) => ({
        unlockConfig: { ...state.unlockConfig, ...config },
      })),

    setPendingUnlock: (pending) => set({ pendingUnlock: pending }),

    clearPendingUnlock: () => set({ pendingUnlock: null }),

    setIsChecking: (checking) => set({ isChecking: checking }),

    reset: () => set({ ...initialState, unlockConfig: { ...defaultUnlockConfig } }),
  }),
)
