import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGradeUnlockStore } from '../gradeUnlockStore'
import type { GradeUnlock } from '@/types/models'

describe('gradeUnlockStore', () => {
  beforeEach(() => {
    useGradeUnlockStore.getState().reset()
  })

  // ─────────────────────────────────────────
  // 初始状态
  // ─────────────────────────────────────────
  describe('初始状态', () => {
    it('初始应无解锁记录', () => {
      const state = useGradeUnlockStore.getState()
      expect(state.unlocks).toEqual([])
    })

    it('初始解锁配置应为默认值', () => {
      const state = useGradeUnlockStore.getState()
      expect(state.unlockConfig.masteryThreshold).toBe(80)
      expect(state.unlockConfig.minMasteredRatio).toBe(0.8)
    })

    it('初始应无待处理的解锁', () => {
      const state = useGradeUnlockStore.getState()
      expect(state.pendingUnlock).toBeNull()
    })

    it('初始加载状态应为 false', () => {
      const state = useGradeUnlockStore.getState()
      expect(state.isChecking).toBe(false)
    })
  })

  // ─────────────────────────────────────────
  // 解锁记录管理
  // ─────────────────────────────────────────
  describe('解锁记录管理', () => {
    const mockUnlock: GradeUnlock = {
      id: 'unlock-1',
      childId: 'child-1',
      subject: 'math',
      gradeLevel: 'grade-2',
      unlockedAt: new Date('2026-03-01'),
      masteryAtUnlock: 85,
    }

    it('应能添加解锁记录', () => {
      act(() => {
        useGradeUnlockStore.getState().addUnlock(mockUnlock)
      })
      const state = useGradeUnlockStore.getState()
      expect(state.unlocks).toHaveLength(1)
      expect(state.unlocks[0]).toEqual(mockUnlock)
    })

    it('应能按科目获取解锁记录', () => {
      const mathUnlock: GradeUnlock = { ...mockUnlock, subject: 'math' }
      const cnUnlock: GradeUnlock = {
        ...mockUnlock,
        id: 'unlock-2',
        subject: 'chinese',
        gradeLevel: 'grade-1',
      }

      act(() => {
        useGradeUnlockStore.getState().addUnlock(mathUnlock)
        useGradeUnlockStore.getState().addUnlock(cnUnlock)
      })

      const state = useGradeUnlockStore.getState()
      const mathUnlocks = state.getUnlocksBySubject('math')
      expect(mathUnlocks).toHaveLength(1)
      expect(mathUnlocks[0].subject).toBe('math')
    })

    it('应能获取某科目的最高已解锁年级', () => {
      act(() => {
        useGradeUnlockStore.getState().addUnlock({
          ...mockUnlock,
          id: 'u-1',
          gradeLevel: 'grade-1',
        })
        useGradeUnlockStore.getState().addUnlock({
          ...mockUnlock,
          id: 'u-2',
          gradeLevel: 'grade-2',
        })
      })

      const state = useGradeUnlockStore.getState()
      const highest = state.getHighestUnlockedGrade('child-1', 'math')
      expect(highest).toBe('grade-2')
    })

    it('无解锁记录时最高年级应返回 null', () => {
      const state = useGradeUnlockStore.getState()
      const highest = state.getHighestUnlockedGrade('child-1', 'english')
      expect(highest).toBeNull()
    })
  })

  // ─────────────────────────────────────────
  // 解锁配置管理
  // ─────────────────────────────────────────
  describe('解锁配置管理', () => {
    it('应能更新解锁配置', () => {
      act(() => {
        useGradeUnlockStore.getState().updateUnlockConfig({
          masteryThreshold: 90,
        })
      })
      const state = useGradeUnlockStore.getState()
      expect(state.unlockConfig.masteryThreshold).toBe(90)
      // 未修改的字段应保持默认值
      expect(state.unlockConfig.minMasteredRatio).toBe(0.8)
    })

    it('应能完整替换配置', () => {
      act(() => {
        useGradeUnlockStore.getState().updateUnlockConfig({
          masteryThreshold: 70,
          minMasteredRatio: 0.6,
        })
      })
      const state = useGradeUnlockStore.getState()
      expect(state.unlockConfig.masteryThreshold).toBe(70)
      expect(state.unlockConfig.minMasteredRatio).toBe(0.6)
    })
  })

  // ─────────────────────────────────────────
  // 待处理解锁
  // ─────────────────────────────────────────
  describe('待处理解锁', () => {
    it('应能设置待处理解锁', () => {
      act(() => {
        useGradeUnlockStore.getState().setPendingUnlock({
          childId: 'child-1',
          subject: 'math',
          nextGrade: 'grade-3',
          averageMastery: 88,
        })
      })
      const state = useGradeUnlockStore.getState()
      expect(state.pendingUnlock).not.toBeNull()
      expect(state.pendingUnlock!.nextGrade).toBe('grade-3')
    })

    it('应能清除待处理解锁', () => {
      act(() => {
        useGradeUnlockStore.getState().setPendingUnlock({
          childId: 'child-1',
          subject: 'math',
          nextGrade: 'grade-3',
          averageMastery: 88,
        })
        useGradeUnlockStore.getState().clearPendingUnlock()
      })
      const state = useGradeUnlockStore.getState()
      expect(state.pendingUnlock).toBeNull()
    })
  })

  // ─────────────────────────────────────────
  // 检查状态管理
  // ─────────────────────────────────────────
  describe('检查状态管理', () => {
    it('应能设置检查中状态', () => {
      act(() => {
        useGradeUnlockStore.getState().setIsChecking(true)
      })
      expect(useGradeUnlockStore.getState().isChecking).toBe(true)

      act(() => {
        useGradeUnlockStore.getState().setIsChecking(false)
      })
      expect(useGradeUnlockStore.getState().isChecking).toBe(false)
    })
  })

  // ─────────────────────────────────────────
  // reset
  // ─────────────────────────────────────────
  describe('reset', () => {
    it('reset 应恢复所有状态到初始值', () => {
      act(() => {
        useGradeUnlockStore.getState().addUnlock({
          id: 'u-1',
          childId: 'child-1',
          subject: 'math',
          gradeLevel: 'grade-2',
          unlockedAt: new Date(),
          masteryAtUnlock: 85,
        })
        useGradeUnlockStore.getState().updateUnlockConfig({ masteryThreshold: 90 })
        useGradeUnlockStore.getState().setPendingUnlock({
          childId: 'child-1',
          subject: 'math',
          nextGrade: 'grade-3',
          averageMastery: 88,
        })
        useGradeUnlockStore.getState().setIsChecking(true)
        useGradeUnlockStore.getState().reset()
      })
      const state = useGradeUnlockStore.getState()
      expect(state.unlocks).toEqual([])
      expect(state.unlockConfig.masteryThreshold).toBe(80)
      expect(state.pendingUnlock).toBeNull()
      expect(state.isChecking).toBe(false)
    })
  })
})
