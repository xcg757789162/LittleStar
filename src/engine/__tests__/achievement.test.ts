import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementEngine } from '../achievement'

describe('AchievementEngine', () => {
  let engine: AchievementEngine

  beforeEach(() => {
    engine = new AchievementEngine()
  })

  it('完成10题应触发里程碑成就', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 10,
      consecutiveDays: 1,
      subjectMasteries: {},
      earnedAchievementIds: [],
    })
    const milestone = achievements.find((a) => a.type === 'milestone')
    expect(milestone).toBeDefined()
  })

  it('连续3天学习应触发连续学习成就', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 5,
      consecutiveDays: 3,
      subjectMasteries: {},
      earnedAchievementIds: [],
    })
    const streak = achievements.find((a) => a.type === 'streak')
    expect(streak).toBeDefined()
  })

  it('科目掌握率达到80%应触发星球解锁', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 20,
      consecutiveDays: 1,
      subjectMasteries: { math: 85 },
      earnedAchievementIds: [],
    })
    const planet = achievements.find((a) => a.type === 'planet')
    expect(planet).toBeDefined()
  })

  it('已获得的成就不应重复触发', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 10,
      consecutiveDays: 1,
      subjectMasteries: {},
      earnedAchievementIds: ['milestone-10'],
    })
    const duplicates = achievements.filter((a) => a.id === 'milestone-10')
    expect(duplicates.length).toBe(0)
  })

  it('不满足条件不应触发成就', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 2,
      consecutiveDays: 1,
      subjectMasteries: {},
      earnedAchievementIds: [],
    })
    expect(achievements.length).toBe(0)
  })

  it('成就应包含必要信息', () => {
    const achievements = engine.checkAchievements({
      totalQuestionsCompleted: 10,
      consecutiveDays: 3,
      subjectMasteries: { math: 85 },
      earnedAchievementIds: [],
    })
    achievements.forEach((a) => {
      expect(a.id).toBeDefined()
      expect(a.name).toBeDefined()
      expect(a.type).toBeDefined()
      expect(a.description).toBeDefined()
    })
  })
})
