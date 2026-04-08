/**
 * DynamicAdjuster 单元测试
 *
 * 测试根据答题结果动态调整课程：
 * - 掌握率低 → 加固课
 * - 掌握率高 → 跳过
 * - 更新缓存队列
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DynamicAdjuster,
  type AdjustmentInput,
  type AdjustmentResult,
} from '../adjuster'

describe('DynamicAdjuster', () => {
  let adjuster: DynamicAdjuster

  beforeEach(() => {
    adjuster = new DynamicAdjuster()
  })

  describe('evaluate', () => {
    it('should recommend reinforcement when mastery < 0.5 (50%)', () => {
      const input: AdjustmentInput = {
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Numbers 1-5',
        currentMastery: 30,
        sessionCorrectRate: 0.3,
        totalAttempts: 10,
      }

      const result = adjuster.evaluate(input)

      expect(result.action).toBe('reinforce')
      expect(result.knowledgeNodeId).toBe('kn-1')
    })

    it('should recommend skip when mastery >= 80%', () => {
      const input: AdjustmentInput = {
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Numbers 1-5',
        currentMastery: 85,
        sessionCorrectRate: 0.9,
        totalAttempts: 20,
      }

      const result = adjuster.evaluate(input)

      expect(result.action).toBe('skip')
    })

    it('should recommend continue for mid-range mastery', () => {
      const input: AdjustmentInput = {
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Numbers 1-5',
        currentMastery: 60,
        sessionCorrectRate: 0.6,
        totalAttempts: 15,
      }

      const result = adjuster.evaluate(input)

      expect(result.action).toBe('continue')
    })

    it('should set reinforcement mode for reinforce action', () => {
      const result = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 25,
        sessionCorrectRate: 0.2,
        totalAttempts: 5,
      })

      expect(result.requirementMode).toBe('reinforcement')
    })

    it('should not set requirement mode for skip action', () => {
      const result = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 90,
        sessionCorrectRate: 0.95,
        totalAttempts: 30,
      })

      expect(result.requirementMode).toBeUndefined()
    })

    it('should include reason in result', () => {
      const result = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Numbers 1-5',
        currentMastery: 20,
        sessionCorrectRate: 0.1,
        totalAttempts: 10,
      })

      expect(result.reason).toBeDefined()
      expect(typeof result.reason).toBe('string')
      expect(result.reason.length).toBeGreaterThan(0)
    })
  })

  describe('evaluateBatch', () => {
    it('should evaluate multiple inputs and return results', () => {
      const inputs: AdjustmentInput[] = [
        {
          knowledgeNodeId: 'kn-1',
          knowledgeNodeName: 'Node 1',
          currentMastery: 20,
          sessionCorrectRate: 0.2,
          totalAttempts: 10,
        },
        {
          knowledgeNodeId: 'kn-2',
          knowledgeNodeName: 'Node 2',
          currentMastery: 90,
          sessionCorrectRate: 0.95,
          totalAttempts: 25,
        },
        {
          knowledgeNodeId: 'kn-3',
          knowledgeNodeName: 'Node 3',
          currentMastery: 65,
          sessionCorrectRate: 0.7,
          totalAttempts: 15,
        },
      ]

      const results = adjuster.evaluateBatch(inputs)

      expect(results).toHaveLength(3)
      expect(results[0].action).toBe('reinforce')
      expect(results[1].action).toBe('skip')
      expect(results[2].action).toBe('continue')
    })

    it('should return empty array for empty input', () => {
      expect(adjuster.evaluateBatch([])).toEqual([])
    })
  })

  describe('custom thresholds', () => {
    it('should respect custom reinforce threshold', () => {
      const customAdjuster = new DynamicAdjuster({
        reinforceThreshold: 40,
        skipThreshold: 85,
      })

      const result = customAdjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 35,
        sessionCorrectRate: 0.4,
        totalAttempts: 10,
      })

      expect(result.action).toBe('reinforce')
    })

    it('should respect custom skip threshold', () => {
      const customAdjuster = new DynamicAdjuster({
        reinforceThreshold: 50,
        skipThreshold: 90,
      })

      // 85 is below custom skip threshold of 90, stays in mid-range
      // sessionCorrectRate=0.5 and totalAttempts=3 prevent early skip promotion
      const result = customAdjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 85,
        sessionCorrectRate: 0.5,
        totalAttempts: 3,
      })

      expect(result.action).toBe('continue')
    })
  })

  describe('edge cases', () => {
    it('should handle mastery of 0', () => {
      const result = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 0,
        sessionCorrectRate: 0,
        totalAttempts: 0,
      })

      expect(result.action).toBe('reinforce')
    })

    it('should handle mastery of 100', () => {
      const result = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 100,
        sessionCorrectRate: 1.0,
        totalAttempts: 50,
      })

      expect(result.action).toBe('skip')
    })

    it('should handle mastery at exact threshold boundaries', () => {
      // Exactly at reinforce threshold (50)
      const atReinforce = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 50,
        sessionCorrectRate: 0.5,
        totalAttempts: 10,
      })
      expect(atReinforce.action).toBe('continue') // 50 is NOT < 50

      // Exactly at skip threshold (80)
      const atSkip = adjuster.evaluate({
        knowledgeNodeId: 'kn-1',
        knowledgeNodeName: 'Test',
        currentMastery: 80,
        sessionCorrectRate: 0.8,
        totalAttempts: 20,
      })
      expect(atSkip.action).toBe('skip') // 80 >= 80
    })
  })
})
