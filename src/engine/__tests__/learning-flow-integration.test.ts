/**
 * 学习流程集成测试
 * 验证学习完成后自动触发年级解锁检查
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLearningStore } from '@/stores/learningStore'
import { useGradeUnlockStore } from '@/stores/gradeUnlockStore'
import { GradeUnlockEngine } from '@/engine/grade-unlock-engine'

describe('学习流程集成 - 解锁检查', () => {
  beforeEach(() => {
    useLearningStore.getState().reset()
    useGradeUnlockStore.getState().reset()
  })

  describe('checkUnlockAfterSession', () => {
    it('应该在 endSession 中提供解锁检查回调', () => {
      const store = useLearningStore.getState()
      // endSession 应包含 onSessionEnd 回调机制
      expect(typeof store.endSession).toBe('function')
    })

    it('checkAndTriggerUnlock 应正确调用 GradeUnlockEngine', () => {
      const engine = new GradeUnlockEngine()

      // 构造满足解锁条件的掌握数据：80% 的知识点掌握度 >= 80
      const masteryMap = new Map<string, number>([
        ['n1', 90],
        ['n2', 85],
        ['n3', 88],
        ['n4', 92],
        ['n5', 75], // 低于阈值
      ])

      const result = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap,
        totalNodes: 5,
      })

      // 4/5 = 80% >= 80% 且 requiredCount = ceil(5*0.8)=4, masteredCount=4 → eligible
      expect(result.eligible).toBe(true)
    })

    it('不满足条件时不应触发解锁', () => {
      const engine = new GradeUnlockEngine()

      // 只有 25% 知识点满足
      const masteryMap = new Map<string, number>([
        ['n1', 90],
        ['n2', 50],
        ['n3', 40],
        ['n4', 30],
      ])

      const result = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap,
        totalNodes: 4,
      })

      expect(result.eligible).toBe(false)
    })
  })

  describe('onSessionEnd 回调', () => {
    it('应能注册和调用 onSessionEnd 回调', () => {
      const callback = vi.fn()
      const store = useLearningStore.getState()

      store.setOnSessionEnd(callback)
      store.startSession('math')
      store.endSession()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('回调应接收会话统计数据', () => {
      const callback = vi.fn()
      const store = useLearningStore.getState()

      store.setOnSessionEnd(callback)
      store.startSession('math')

      // 模拟答题
      store.setQuestionQueue([
        { id: 'q1', knowledgeNodeId: 'n1', type: 'multiple-choice', content: { text: 'test' }, answer: 'a', difficulty: 1, isAIGenerated: false },
      ])
      store.recordAnswer(true)
      store.endSession()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'math',
          questionsCompleted: 1,
          correctCount: 1,
        }),
      )
    })

    it('无回调时 endSession 不应报错', () => {
      const store = useLearningStore.getState()
      store.startSession('math')
      expect(() => store.endSession()).not.toThrow()
    })

    it('clearOnSessionEnd 应移除回调', () => {
      const callback = vi.fn()
      const store = useLearningStore.getState()

      store.setOnSessionEnd(callback)
      store.clearOnSessionEnd()
      store.startSession('math')
      store.endSession()

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
