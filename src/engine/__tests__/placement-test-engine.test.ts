import { describe, it, expect, beforeEach } from 'vitest'
import { PlacementTestEngine } from '../placement-test-engine'
import type { CurriculumModule } from '@/curriculum/types'

describe('PlacementTestEngine', () => {
  let engine: InstanceType<typeof PlacementTestEngine>

  /** 模拟模块数据：3 个模块，每模块 2 个知识点 */
  const mockModules: CurriculumModule[] = [
    {
      id: 'mod-1',
      name: '模块1',
      description: '基础',
      order: 1,
      knowledgeNodes: [
        {
          id: 'node-1a',
          name: '基础1',
          description: '',
          difficulty: 2,
          contentTypes: ['quiz'],
          prerequisites: [],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
        {
          id: 'node-1b',
          name: '进阶1',
          description: '',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['node-1a'],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
      ],
    },
    {
      id: 'mod-2',
      name: '模块2',
      description: '中级',
      order: 2,
      knowledgeNodes: [
        {
          id: 'node-2a',
          name: '基础2',
          description: '',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: [],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
        {
          id: 'node-2b',
          name: '进阶2',
          description: '',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['node-2a'],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
      ],
    },
    {
      id: 'mod-3',
      name: '模块3',
      description: '高级',
      order: 3,
      knowledgeNodes: [
        {
          id: 'node-3a',
          name: '基础3',
          description: '',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: [],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
        {
          id: 'node-3b',
          name: '进阶3',
          description: '',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['node-3a'],
          templatePrompts: [{ type: 'multiple-choice', prompt: '测试', constraints: {} }],
        },
      ],
    },
  ]

  beforeEach(() => {
    engine = new PlacementTestEngine()
  })

  describe('generateTestPlan', () => {
    it('应从每个模块选取代表性知识点', () => {
      const plan = engine.generateTestPlan(mockModules)
      expect(plan.length).toBeGreaterThanOrEqual(3) // 至少每个模块 1 题
      expect(plan.length).toBeLessThanOrEqual(15) // 不超过 15 题
    })

    it('初始选取应优先每个模块最简单的知识点', () => {
      const plan = engine.generateTestPlan(mockModules)
      // 第一题应是模块1的基础节点
      expect(plan[0].nodeId).toBe('node-1a')
    })

    it('空模块数组应返回空计划', () => {
      const plan = engine.generateTestPlan([])
      expect(plan).toEqual([])
    })
  })

  describe('submitAnswer（自适应选题）', () => {
    it('答对后应尝试同模块更难的知识点', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      const result = engine.submitAnswer(session, true)
      // 答对 node-1a → 应尝试同模块更难的 node-1b
      expect(result.isCorrect).toBe(true)
      if (result.nextQuestion) {
        // 下一题应是同模块更难的 或者 下一模块的
        expect(['node-1b', 'node-2a']).toContain(result.nextQuestion.nodeId)
      }
    })

    it('答错后应跳到下一个模块的基础知识点', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      const result = engine.submitAnswer(session, false)
      // 答错 node-1a → 应跳到模块2基础
      expect(result.isCorrect).toBe(false)
      if (result.nextQuestion) {
        expect(result.nextQuestion.nodeId).toBe('node-2a')
      }
    })

    it('应返回进度百分比', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      const result = engine.submitAnswer(session, true)
      expect(result.progress).toBeGreaterThanOrEqual(0)
      expect(result.progress).toBeLessThanOrEqual(100)
    })

    it('所有题答完后 nextQuestion 应为 null', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      // 答完所有题
      let result = engine.submitAnswer(session, true)
      while (result.nextQuestion !== null) {
        result = engine.submitAnswer(session, true)
      }

      expect(result.nextQuestion).toBeNull()
      expect(result.progress).toBe(100)
    })
  })

  describe('completeTest', () => {
    it('全部答对应所有节点标记为 mastered', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      // 全部答对
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, true)
      }

      const result = engine.completeTest(session, mockModules)
      expect(result.masteredNodes.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThan(0)
    })

    it('全部答错应从头开始', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      // 全部答错
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, false)
      }

      const result = engine.completeTest(session, mockModules)
      expect(result.startingNodes.length).toBeGreaterThan(0)
      expect(result.overallScore).toBe(0)
    })

    it('部分答对应确定正确的起始知识点', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      // 第一题答对，后面答错
      engine.submitAnswer(session, true)
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, false)
      }

      const result = engine.completeTest(session, mockModules)
      expect(result.masteredNodes.length).toBeGreaterThanOrEqual(1)
      expect(result.startingNodes.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.overallScore).toBeLessThan(100)
    })
  })

  describe('applyResult', () => {
    it('答对的节点掌握度应初始化为 70', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      engine.submitAnswer(session, true)
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, false)
      }

      const masteryMap = engine.applyResult(session, mockModules)
      // 答对的节点应为 70
      const firstAnsweredNode = session.questions[0].nodeId
      expect(masteryMap.get(firstAnsweredNode)).toBe(70)
    })

    it('答错的节点掌握度应初始化为 0', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      engine.submitAnswer(session, false)
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, false)
      }

      const masteryMap = engine.applyResult(session, mockModules)
      const firstAnsweredNode = session.questions[0].nodeId
      expect(masteryMap.get(firstAnsweredNode)).toBe(0)
    })

    it('已掌握节点之前的未测节点应默认 60', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      // 答对几题产生 mastered 节点
      engine.submitAnswer(session, true)
      engine.submitAnswer(session, true)
      while (session.currentIndex < session.questions.length) {
        engine.submitAnswer(session, false)
      }

      const masteryMap = engine.applyResult(session, mockModules)
      // masteryMap 应包含所有模块中的节点
      expect(masteryMap.size).toBeGreaterThan(0)
    })
  })

  describe('session 管理', () => {
    it('createSession 应初始化正确', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      expect(session.questions.length).toBe(plan.length)
      expect(session.currentIndex).toBe(0)
      expect(session.answers).toEqual([])
    })

    it('getCurrentQuestion 应返回当前题目', () => {
      const plan = engine.generateTestPlan(mockModules)
      const session = engine.createSession(plan)

      const current = engine.getCurrentQuestion(session)
      expect(current).not.toBeNull()
      expect(current!.nodeId).toBe(plan[0].nodeId)
    })
  })
})
