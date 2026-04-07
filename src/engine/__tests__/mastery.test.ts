import { describe, it, expect, beforeEach } from 'vitest'
import { MasteryCalculator } from '../mastery'

describe('MasteryCalculator', () => {
  let calculator: MasteryCalculator

  beforeEach(() => {
    calculator = new MasteryCalculator()
  })

  describe('掌握率计算', () => {
    it('全部正确应该得到高掌握率', () => {
      const mastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 10,
        consecutiveCorrect: 10,
        lastPracticed: new Date(),
      })
      expect(mastery).toBeGreaterThanOrEqual(90)
      expect(mastery).toBeLessThanOrEqual(100)
    })

    it('全部错误应该得到 0 掌握率', () => {
      const mastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 0,
        consecutiveCorrect: 0,
        lastPracticed: new Date(),
      })
      expect(mastery).toBe(0)
    })

    it('50% 正确率应该得到中等掌握率', () => {
      const mastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 5,
        consecutiveCorrect: 0,
        lastPracticed: new Date(),
      })
      expect(mastery).toBeGreaterThanOrEqual(20)
      expect(mastery).toBeLessThanOrEqual(60)
    })

    it('无尝试应该返回 0', () => {
      const mastery = calculator.calculate({
        totalAttempts: 0,
        totalCorrect: 0,
        consecutiveCorrect: 0,
        lastPracticed: new Date(),
      })
      expect(mastery).toBe(0)
    })
  })

  describe('连续正确加权', () => {
    it('连续正确越多，掌握率越高', () => {
      const now = new Date()
      const masteryLow = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 7,
        consecutiveCorrect: 1,
        lastPracticed: now,
      })
      const masteryHigh = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 7,
        consecutiveCorrect: 5,
        lastPracticed: now,
      })
      expect(masteryHigh).toBeGreaterThan(masteryLow)
    })

    it('连续正确有上限加权（防止过度膨胀）', () => {
      const now = new Date()
      const mastery10 = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 7,
        consecutiveCorrect: 10,
        lastPracticed: now,
      })
      const mastery20 = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 7,
        consecutiveCorrect: 20,
        lastPracticed: now,
      })
      // 差异应该很小（上限封顶）
      expect(Math.abs(mastery20 - mastery10)).toBeLessThan(10)
    })
  })

  describe('艾宾浩斯遗忘曲线衰减', () => {
    it('最近练习的掌握率高于很久没练的', () => {
      const recentMastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 8,
        consecutiveCorrect: 3,
        lastPracticed: new Date(), // 刚练习
      })
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30) // 30天前
      const oldMastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 8,
        consecutiveCorrect: 3,
        lastPracticed: pastDate,
      })
      expect(recentMastery).toBeGreaterThan(oldMastery)
    })

    it('今天练习的不应该有衰减', () => {
      const mastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 10,
        consecutiveCorrect: 10,
        lastPracticed: new Date(),
      })
      // 今天练过，衰减因子应该接近 1
      expect(mastery).toBeGreaterThanOrEqual(90)
    })

    it('极长时间没练习掌握率应该很低', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 365) // 一年前
      const mastery = calculator.calculate({
        totalAttempts: 10,
        totalCorrect: 10,
        consecutiveCorrect: 0,
        lastPracticed: pastDate,
      })
      expect(mastery).toBeLessThan(30)
    })
  })

  describe('边界条件', () => {
    it('单次正确尝试', () => {
      const mastery = calculator.calculate({
        totalAttempts: 1,
        totalCorrect: 1,
        consecutiveCorrect: 1,
        lastPracticed: new Date(),
      })
      expect(mastery).toBeGreaterThan(0)
      // 单次正确不应该给过高分（样本太小）
      expect(mastery).toBeLessThan(80)
    })

    it('掌握率范围应该在 0-100 之间', () => {
      // 极端高分
      const high = calculator.calculate({
        totalAttempts: 100,
        totalCorrect: 100,
        consecutiveCorrect: 100,
        lastPracticed: new Date(),
      })
      expect(high).toBeLessThanOrEqual(100)
      expect(high).toBeGreaterThanOrEqual(0)

      // 极端低分
      const low = calculator.calculate({
        totalAttempts: 100,
        totalCorrect: 0,
        consecutiveCorrect: 0,
        lastPracticed: new Date(),
      })
      expect(low).toBeLessThanOrEqual(100)
      expect(low).toBeGreaterThanOrEqual(0)
    })
  })

  describe('更新掌握率', () => {
    it('答对后掌握率应该提升', () => {
      const before = calculator.calculate({
        totalAttempts: 5,
        totalCorrect: 3,
        consecutiveCorrect: 1,
        lastPracticed: new Date(),
      })
      const after = calculator.calculate({
        totalAttempts: 6,
        totalCorrect: 4,
        consecutiveCorrect: 2,
        lastPracticed: new Date(),
      })
      expect(after).toBeGreaterThan(before)
    })

    it('答错后掌握率应该下降或持平', () => {
      const before = calculator.calculate({
        totalAttempts: 5,
        totalCorrect: 3,
        consecutiveCorrect: 3,
        lastPracticed: new Date(),
      })
      const after = calculator.calculate({
        totalAttempts: 6,
        totalCorrect: 3,
        consecutiveCorrect: 0,
        lastPracticed: new Date(),
      })
      expect(after).toBeLessThanOrEqual(before)
    })
  })
})
