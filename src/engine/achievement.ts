/**
 * 成就引擎
 * 触发条件：里程碑/连续学习/星球解锁
 */

import type { AchievementType } from '@/types/models'

export interface AchievementCheckInput {
  totalQuestionsCompleted: number
  consecutiveDays: number
  subjectMasteries: Record<string, number>
  earnedAchievementIds: string[]
}

export interface AchievementResult {
  id: string
  type: AchievementType
  name: string
  description: string
}

interface AchievementRule {
  id: string
  type: AchievementType
  name: string
  description: string
  check: (input: AchievementCheckInput) => boolean
}

const RULES: AchievementRule[] = [
  // 里程碑成就
  {
    id: 'milestone-10',
    type: 'milestone',
    name: '初学者',
    description: '完成 10 道题目',
    check: (input) => input.totalQuestionsCompleted >= 10,
  },
  {
    id: 'milestone-50',
    type: 'milestone',
    name: '小学霸',
    description: '完成 50 道题目',
    check: (input) => input.totalQuestionsCompleted >= 50,
  },
  {
    id: 'milestone-100',
    type: 'milestone',
    name: '学习达人',
    description: '完成 100 道题目',
    check: (input) => input.totalQuestionsCompleted >= 100,
  },
  // 连续学习成就
  {
    id: 'streak-3',
    type: 'streak',
    name: '坚持三天',
    description: '连续学习 3 天',
    check: (input) => input.consecutiveDays >= 3,
  },
  {
    id: 'streak-7',
    type: 'streak',
    name: '一周不间断',
    description: '连续学习 7 天',
    check: (input) => input.consecutiveDays >= 7,
  },
  {
    id: 'streak-30',
    type: 'streak',
    name: '学习之星',
    description: '连续学习 30 天',
    check: (input) => input.consecutiveDays >= 30,
  },
  // 星球解锁
  {
    id: 'planet-math',
    type: 'planet',
    name: '数学星球',
    description: '数学掌握率达到 80%',
    check: (input) => (input.subjectMasteries['math'] ?? 0) >= 80,
  },
  {
    id: 'planet-chinese',
    type: 'planet',
    name: '语文星球',
    description: '语文掌握率达到 80%',
    check: (input) => (input.subjectMasteries['chinese'] ?? 0) >= 80,
  },
  {
    id: 'planet-english',
    type: 'planet',
    name: '英语星球',
    description: '英语掌握率达到 80%',
    check: (input) => (input.subjectMasteries['english'] ?? 0) >= 80,
  },
]

export class AchievementEngine {
  checkAchievements(input: AchievementCheckInput): AchievementResult[] {
    const newAchievements: AchievementResult[] = []

    for (const rule of RULES) {
      if (input.earnedAchievementIds.includes(rule.id)) continue
      if (rule.check(input)) {
        newAchievements.push({
          id: rule.id,
          type: rule.type,
          name: rule.name,
          description: rule.description,
        })
      }
    }

    return newAchievements
  }
}
