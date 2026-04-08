/**
 * 幼儿宽容评分策略测试
 * TDD: 测试 applyChildAdjustments / scoreToStars 函数
 */
import { describe, it, expect } from 'vitest'
import {
  applyChildAdjustments,
  scoreToStars,
  CHILD_SCORING_ADJUSTMENTS,
} from '../child-scoring'

describe('CHILD_SCORING_ADJUSTMENTS', () => {
  it('should have correct minimum acceptable score', () => {
    expect(CHILD_SCORING_ADJUSTMENTS.minAcceptableScore).toBe(40)
  })

  it('should have correct star thresholds [40, 55, 70, 85, 95]', () => {
    expect(CHILD_SCORING_ADJUSTMENTS.starThresholds).toEqual([40, 55, 70, 85, 95])
  })

  it('should have passThreshold of 70', () => {
    expect(CHILD_SCORING_ADJUSTMENTS.passThreshold).toBe(70)
  })

  it('should have neverZeroStars = true', () => {
    expect(CHILD_SCORING_ADJUSTMENTS.neverZeroStars).toBe(true)
  })
})

describe('applyChildAdjustments', () => {
  it('should boost low scores to minimum 40 (floor protection)', () => {
    const result = applyChildAdjustments(30)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(40)
  })

  it('should boost medium scores above pass threshold', () => {
    const result = applyChildAdjustments(60)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(70)
  })

  it('should not over-inflate high scores', () => {
    const result = applyChildAdjustments(95)
    expect(result.adjustedScore).toBeLessThanOrEqual(100)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(95)
  })

  it('should never return a score below 40 for any valid speech', () => {
    // 即使原始分数很低，只要有语音就保底 40
    for (const raw of [10, 20, 30, 35, 39]) {
      const result = applyChildAdjustments(raw)
      expect(result.adjustedScore).toBeGreaterThanOrEqual(40)
    }
  })

  it('should return 0 for zero score (no speech detected)', () => {
    const result = applyChildAdjustments(0)
    expect(result.adjustedScore).toBe(0)
    expect(result.noSpeech).toBe(true)
  })

  it('should return adjustedScore and original score', () => {
    const result = applyChildAdjustments(55)
    expect(result.originalScore).toBe(55)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(55)
    expect(typeof result.adjustedScore).toBe('number')
  })

  it('should indicate pass status', () => {
    const passResult = applyChildAdjustments(70)
    expect(passResult.passed).toBe(true)

    const failResult = applyChildAdjustments(30)
    expect(failResult.passed).toBe(false)
  })
})

describe('scoreToStars', () => {
  it('should return 1 star for scores < 55', () => {
    expect(scoreToStars(40)).toBe(1)
    expect(scoreToStars(54)).toBe(1)
  })

  it('should return 2 stars for scores 55-69', () => {
    expect(scoreToStars(55)).toBe(2)
    expect(scoreToStars(69)).toBe(2)
  })

  it('should return 3 stars for scores 70-84', () => {
    expect(scoreToStars(70)).toBe(3)
    expect(scoreToStars(84)).toBe(3)
  })

  it('should return 4 stars for scores 85-94', () => {
    expect(scoreToStars(85)).toBe(4)
    expect(scoreToStars(94)).toBe(4)
  })

  it('should return 5 stars for scores >= 95', () => {
    expect(scoreToStars(95)).toBe(5)
    expect(scoreToStars(100)).toBe(5)
  })

  it('should return 1 star for score 0 (never 0 stars)', () => {
    expect(scoreToStars(0)).toBe(1)
  })

  it('should always return values 1-5', () => {
    for (let i = 0; i <= 100; i++) {
      const stars = scoreToStars(i)
      expect(stars).toBeGreaterThanOrEqual(1)
      expect(stars).toBeLessThanOrEqual(5)
    }
  })
})
