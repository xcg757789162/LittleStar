import { describe, it, expect, beforeEach } from 'vitest'
import { RuleEngine } from '../rule-engine'

describe('RuleEngine', () => {
  let engine: RuleEngine

  beforeEach(() => {
    engine = new RuleEngine()
  })

  describe('难度调整策略', () => {
    it('连续答对应提升难度', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 3,
        consecutiveCorrect: 5,
        consecutiveWrong: 0,
        recentAccuracy: 0.9,
      })

      expect(result.newDifficulty).toBeGreaterThan(3)
    })

    it('连续答错应降低难度', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 5,
        consecutiveCorrect: 0,
        consecutiveWrong: 3,
        recentAccuracy: 0.2,
      })

      expect(result.newDifficulty).toBeLessThan(5)
    })

    it('准确率在合理区间不调整难度', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 3,
        consecutiveCorrect: 2,
        consecutiveWrong: 0,
        recentAccuracy: 0.7,
      })

      expect(result.newDifficulty).toBe(3)
    })

    it('难度不应低于最低值1', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 1,
        consecutiveCorrect: 0,
        consecutiveWrong: 10,
        recentAccuracy: 0.0,
      })

      expect(result.newDifficulty).toBe(1)
    })

    it('难度不应高于最高值10', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 10,
        consecutiveCorrect: 20,
        consecutiveWrong: 0,
        recentAccuracy: 1.0,
      })

      expect(result.newDifficulty).toBe(10)
    })

    it('应返回调整原因', () => {
      const result = engine.adjustDifficulty({
        currentDifficulty: 3,
        consecutiveCorrect: 5,
        consecutiveWrong: 0,
        recentAccuracy: 0.9,
      })

      expect(result.reason).toBeDefined()
      expect(typeof result.reason).toBe('string')
    })
  })

  describe('疲劳检测', () => {
    it('短时间学习不应检测为疲劳', () => {
      const result = engine.detectFatigue({
        sessionDurationMinutes: 5,
        questionsCompleted: 8,
        recentAccuracy: 0.85,
        averageResponseTimeMs: 3000,
      })

      expect(result.isFatigued).toBe(false)
    })

    it('学习超过20分钟应提示休息', () => {
      const result = engine.detectFatigue({
        sessionDurationMinutes: 25,
        questionsCompleted: 40,
        recentAccuracy: 0.6,
        averageResponseTimeMs: 5000,
      })

      expect(result.isFatigued).toBe(true)
      expect(result.suggestion).toBeDefined()
    })

    it('准确率大幅下降应提示疲劳', () => {
      const result = engine.detectFatigue({
        sessionDurationMinutes: 12,
        questionsCompleted: 20,
        recentAccuracy: 0.3, // 准确率骤降
        averageResponseTimeMs: 6000, // 反应变慢
      })

      expect(result.isFatigued).toBe(true)
    })

    it('反应时间显著变慢应提示疲劳', () => {
      const result = engine.detectFatigue({
        sessionDurationMinutes: 15,
        questionsCompleted: 25,
        recentAccuracy: 0.6,
        averageResponseTimeMs: 10000, // 反应很慢
      })

      expect(result.isFatigued).toBe(true)
    })

    it('非疲劳状态不给建议', () => {
      const result = engine.detectFatigue({
        sessionDurationMinutes: 3,
        questionsCompleted: 5,
        recentAccuracy: 0.9,
        averageResponseTimeMs: 2000,
      })

      expect(result.isFatigued).toBe(false)
      expect(result.suggestion).toBeUndefined()
    })
  })

  describe('学习时长限制', () => {
    it('未超时应允许继续', () => {
      const result = engine.checkSessionLimit({
        sessionDurationMinutes: 5,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 10, // 10 + 5 = 15 < 30
      })

      expect(result.shouldStop).toBe(false)
      expect(result.remainingMinutes).toBeGreaterThan(0)
    })

    it('当前会话超过每日限制应提示停止', () => {
      const result = engine.checkSessionLimit({
        sessionDurationMinutes: 20,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 15, // 15 + 20 = 35 > 30
      })

      expect(result.shouldStop).toBe(true)
      expect(result.remainingMinutes).toBe(0)
    })

    it('接近时限应发出警告', () => {
      const result = engine.checkSessionLimit({
        sessionDurationMinutes: 5,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 18, // 18 + 5 = 23, 剩余 7 分钟
      })

      expect(result.shouldStop).toBe(false)
      expect(result.warning).toBeDefined()
    })

    it('每日总学习时间为0时应允许全量', () => {
      const result = engine.checkSessionLimit({
        sessionDurationMinutes: 0,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 0,
      })

      expect(result.shouldStop).toBe(false)
      expect(result.remainingMinutes).toBe(30)
    })
  })

  describe('规则匹配与综合决策', () => {
    it('应根据年龄限制最大难度', () => {
      const maxDiff = engine.getMaxDifficultyForAge(4)
      expect(maxDiff).toBeLessThanOrEqual(5) // 4岁孩子最大难度不超过5

      const maxDiff6 = engine.getMaxDifficultyForAge(6)
      expect(maxDiff6).toBeGreaterThan(maxDiff) // 6岁比4岁难度上限更高
    })

    it('应根据年级推荐题目数量', () => {
      const middleCount = engine.getRecommendedQuestionsPerSession('middle-kindergarten')
      const seniorCount = engine.getRecommendedQuestionsPerSession('senior-kindergarten')

      expect(middleCount).toBeGreaterThan(0)
      expect(seniorCount).toBeGreaterThan(0)
      expect(seniorCount).toBeGreaterThanOrEqual(middleCount)
    })

    it('应根据科目选择推荐时长（分钟）', () => {
      const mathTime = engine.getRecommendedSessionMinutes('math')
      const chineseTime = engine.getRecommendedSessionMinutes('chinese')
      const englishTime = engine.getRecommendedSessionMinutes('english')

      expect(mathTime).toBeGreaterThan(0)
      expect(chineseTime).toBeGreaterThan(0)
      expect(englishTime).toBeGreaterThan(0)
    })

    it('综合评估应返回完整的学习建议', () => {
      const advice = engine.evaluate({
        age: 5,
        gradeLevel: 'senior-kindergarten',
        currentSubject: 'math',
        currentDifficulty: 3,
        consecutiveCorrect: 4,
        consecutiveWrong: 0,
        recentAccuracy: 0.85,
        sessionDurationMinutes: 10,
        questionsCompleted: 15,
        averageResponseTimeMs: 3000,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 10,
      })

      expect(advice).toBeDefined()
      expect(advice.adjustedDifficulty).toBeDefined()
      expect(advice.shouldContinue).toBeDefined()
      expect(advice.isFatigued).toBeDefined()
      expect(typeof advice.adjustedDifficulty).toBe('number')
      expect(typeof advice.shouldContinue).toBe('boolean')
      expect(typeof advice.isFatigued).toBe('boolean')
    })

    it('疲劳时综合评估应建议停止', () => {
      const advice = engine.evaluate({
        age: 4,
        gradeLevel: 'middle-kindergarten',
        currentSubject: 'math',
        currentDifficulty: 3,
        consecutiveCorrect: 0,
        consecutiveWrong: 5,
        recentAccuracy: 0.2,
        sessionDurationMinutes: 25,
        questionsCompleted: 30,
        averageResponseTimeMs: 8000,
        dailyLimitMinutes: 30,
        totalDailyMinutes: 25,
      })

      expect(advice.shouldContinue).toBe(false)
      expect(advice.isFatigued).toBe(true)
    })
  })
})
