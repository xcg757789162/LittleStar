import { describe, it, expect, beforeEach } from 'vitest'
import { ReviewScheduler } from '../scheduler'

describe('ReviewScheduler', () => {
  let scheduler: ReviewScheduler

  beforeEach(() => {
    scheduler = new ReviewScheduler()
  })

  describe('下次复习时间计算', () => {
    it('首次正确后应安排 1 天后复习', () => {
      const now = new Date()
      const nextReview = scheduler.calculateNextReview({
        masteryLevel: 50,
        consecutiveCorrect: 1,
        isCorrect: true,
        previousInterval: 0,
      })
      const diffDays = (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(0.9) // 约 1 天
      expect(diffDays).toBeLessThanOrEqual(1.5)
    })

    it('连续正确应拉长复习间隔', () => {
      const next1 = scheduler.calculateNextReview({
        masteryLevel: 60,
        consecutiveCorrect: 1,
        isCorrect: true,
        previousInterval: 1,
      })
      const next3 = scheduler.calculateNextReview({
        masteryLevel: 60,
        consecutiveCorrect: 3,
        isCorrect: true,
        previousInterval: 3,
      })
      // 连续正确 3 次后的间隔应该比 1 次后长
      const now = new Date()
      const interval1 = (next1.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      const interval3 = (next3.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(interval3).toBeGreaterThan(interval1)
    })

    it('答错后应缩短复习间隔', () => {
      const nextCorrect = scheduler.calculateNextReview({
        masteryLevel: 60,
        consecutiveCorrect: 3,
        isCorrect: true,
        previousInterval: 3,
      })
      const nextWrong = scheduler.calculateNextReview({
        masteryLevel: 60,
        consecutiveCorrect: 0,
        isCorrect: false,
        previousInterval: 3,
      })
      expect(nextWrong.getTime()).toBeLessThan(nextCorrect.getTime())
    })

    it('掌握率高应拉长复习间隔', () => {
      const lowMastery = scheduler.calculateNextReview({
        masteryLevel: 30,
        consecutiveCorrect: 2,
        isCorrect: true,
        previousInterval: 2,
      })
      const highMastery = scheduler.calculateNextReview({
        masteryLevel: 90,
        consecutiveCorrect: 2,
        isCorrect: true,
        previousInterval: 2,
      })
      expect(highMastery.getTime()).toBeGreaterThan(lowMastery.getTime())
    })

    it('答错后间隔不应超过 1 天', () => {
      const now = new Date()
      const next = scheduler.calculateNextReview({
        masteryLevel: 80,
        consecutiveCorrect: 0,
        isCorrect: false,
        previousInterval: 7,
      })
      const diffDays = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeLessThanOrEqual(1.1)
    })
  })

  describe('难度系数调整', () => {
    it('答对应提升难度系数', () => {
      const newEF = scheduler.adjustEaseFactor(2.5, true)
      expect(newEF).toBeGreaterThan(2.5)
    })

    it('答错应降低难度系数', () => {
      const newEF = scheduler.adjustEaseFactor(2.5, false)
      expect(newEF).toBeLessThan(2.5)
    })

    it('难度系数不应低于 1.3', () => {
      let ef = 1.5
      for (let i = 0; i < 20; i++) {
        ef = scheduler.adjustEaseFactor(ef, false)
      }
      expect(ef).toBeGreaterThanOrEqual(1.3)
    })

    it('难度系数不应超过 3.0', () => {
      let ef = 2.5
      for (let i = 0; i < 20; i++) {
        ef = scheduler.adjustEaseFactor(ef, true)
      }
      expect(ef).toBeLessThanOrEqual(3.0)
    })
  })

  describe('优先队列排序', () => {
    it('应按复习紧急度排序（过期越久优先级越高）', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const items = [
        { id: 'a', nextReviewDate: tomorrow, masteryLevel: 50 },
        { id: 'b', nextReviewDate: twoDaysAgo, masteryLevel: 50 },
        { id: 'c', nextReviewDate: yesterday, masteryLevel: 50 },
      ]

      const sorted = scheduler.prioritize(items)
      expect(sorted[0].id).toBe('b') // 过期最久
      expect(sorted[1].id).toBe('c')
      expect(sorted[2].id).toBe('a') // 还没到期
    })

    it('同样过期程度下掌握率低的优先', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const items = [
        { id: 'a', nextReviewDate: yesterday, masteryLevel: 80 },
        { id: 'b', nextReviewDate: yesterday, masteryLevel: 30 },
      ]

      const sorted = scheduler.prioritize(items)
      expect(sorted[0].id).toBe('b') // 掌握率低优先
    })
  })

  describe('最大间隔限制', () => {
    it('间隔不应超过 30 天', () => {
      const now = new Date()
      const next = scheduler.calculateNextReview({
        masteryLevel: 100,
        consecutiveCorrect: 50,
        isCorrect: true,
        previousInterval: 30,
      })
      const diffDays = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeLessThanOrEqual(31)
    })
  })
})
