import { describe, it, expect, beforeEach } from 'vitest'
import { AdaptiveRouter } from '../adaptive-router'
import type { KnowledgeNode, Subject } from '@/types/models'

describe('AdaptiveRouter', () => {
  let router: AdaptiveRouter

  const createNodes = (): KnowledgeNode[] => [
    {
      id: 'math-1', subject: 'math', gradeLevel: 'middle-kindergarten',
      name: '数字1-5', description: '', prerequisites: [], nextNodes: ['math-2'],
      difficulty: 1, contentType: 'flashcard', order: 1,
    },
    {
      id: 'math-2', subject: 'math', gradeLevel: 'middle-kindergarten',
      name: '数字6-10', description: '', prerequisites: ['math-1'], nextNodes: ['math-3'],
      difficulty: 2, contentType: 'flashcard', order: 2,
    },
    {
      id: 'math-3', subject: 'math', gradeLevel: 'senior-kindergarten',
      name: '加法', description: '', prerequisites: ['math-2'], nextNodes: [],
      difficulty: 3, contentType: 'quiz', order: 3,
    },
    {
      id: 'cn-1', subject: 'chinese', gradeLevel: 'middle-kindergarten',
      name: '声母', description: '', prerequisites: [], nextNodes: ['cn-2'],
      difficulty: 1, contentType: 'voice', order: 1,
    },
    {
      id: 'cn-2', subject: 'chinese', gradeLevel: 'middle-kindergarten',
      name: '韵母', description: '', prerequisites: ['cn-1'], nextNodes: [],
      difficulty: 2, contentType: 'voice', order: 2,
    },
    {
      id: 'en-1', subject: 'english', gradeLevel: 'middle-kindergarten',
      name: '字母', description: '', prerequisites: [], nextNodes: [],
      difficulty: 1, contentType: 'flashcard', order: 1,
    },
  ]

  beforeEach(() => {
    router = new AdaptiveRouter()
  })

  describe('下一知识点推荐', () => {
    it('新用户应推荐无前置依赖的入门知识点', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>()

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
      })

      expect(next).toBeDefined()
      expect(next!.id).toBe('math-1') // 无前置依赖的第一个
    })

    it('当前知识点掌握后应推荐后续知识点', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>([
        ['math-1', 90], // 已掌握
      ])

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
      })

      expect(next).toBeDefined()
      expect(next!.id).toBe('math-2') // 前置已达标，推荐下一个
    })

    it('前置未达标不应推荐（未解锁）', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>([
        ['math-1', 50], // 未掌握
      ])

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
      })

      // 应推荐 math-1 复习，而不是 math-2
      expect(next).toBeDefined()
      expect(next!.id).toBe('math-1')
    })

    it('所有知识点掌握后返回需复习的', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>([
        ['math-1', 95],
        ['math-2', 90],
        ['math-3', 85],
      ])

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
      })

      // 应推荐掌握率最低的进行复习
      expect(next).toBeDefined()
      expect(next!.id).toBe('math-3')
    })
  })

  describe('多科目平衡', () => {
    it('应推荐练习最少的科目', () => {
      const practiceCount: Record<Subject, number> = {
        math: 10,
        chinese: 2,
        english: 5,
      }

      const recommended = router.recommendSubject(practiceCount)
      expect(recommended).toBe('chinese') // 练习最少
    })

    it('练习量相同时任意科目都可以', () => {
      const equalPractice: Record<Subject, number> = {
        math: 5,
        chinese: 5,
        english: 5,
      }

      const recommended = router.recommendSubject(equalPractice)
      expect(['math', 'chinese', 'english']).toContain(recommended)
    })
  })

  describe('难度梯度控制', () => {
    it('当前掌握率低时应推荐低难度知识点', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>()

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
        maxDifficulty: 2,
      })

      expect(next).toBeDefined()
      expect(next!.difficulty).toBeLessThanOrEqual(2)
    })

    it('不应推荐超过难度上限的知识点', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>([
        ['math-1', 95],
        ['math-2', 95],
      ])

      const next = router.recommendNext({
        nodes,
        masteryMap,
        currentSubject: 'math',
        maxDifficulty: 2,
      })

      if (next) {
        expect(next.difficulty).toBeLessThanOrEqual(2)
      }
    })
  })

  describe('新知识与复习混合', () => {
    it('应返回混合比例推荐列表', () => {
      const nodes = createNodes()
      const masteryMap = new Map<string, number>([
        ['math-1', 60], // 需复习
      ])

      const recommendations = router.getRecommendations({
        nodes,
        masteryMap,
        currentSubject: 'math',
        count: 3,
      })

      expect(recommendations.length).toBeGreaterThanOrEqual(1)
      expect(recommendations.length).toBeLessThanOrEqual(3)
    })
  })
})
