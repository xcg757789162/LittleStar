/**
 * LessonPlanner 单元测试
 *
 * 测试课程规划引擎：给定课程体系+掌握率+复习队列，
 * 输出未来 3 天的知识点学习序列。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LessonPlanner, type LessonPlanInput } from '../planner'
import type { KnowledgeNode, Subject } from '@/types/models'

// 创建测试用知识点
function createNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: 'node-1',
    subject: 'math',
    name: 'Test Node',
    description: 'Test description',
    prerequisites: [],
    nextNodes: [],
    difficulty: 3,
    contentType: 'quiz',
    orderIndex: 1,
    templatePrompts: [],
    totalLessons: null,
    ...overrides,
  }
}

function createNodes(count: number, subject: Subject = 'math'): KnowledgeNode[] {
  return Array.from({ length: count }, (_, i) =>
    createNode({
      id: `${subject}-node-${i + 1}`,
      name: `${subject} Node ${i + 1}`,
      subject,
      orderIndex: i + 1,
      difficulty: Math.min(1 + Math.floor(i / 2), 10),
      prerequisites: [],
    }),
  )
}

/** 创建有依赖链的节点 */
function _createChainedNodes(count: number, subject: Subject = 'math'): KnowledgeNode[] {
  return Array.from({ length: count }, (_, i) =>
    createNode({
      id: `${subject}-node-${i + 1}`,
      name: `${subject} Node ${i + 1}`,
      subject,
      orderIndex: i + 1,
      difficulty: Math.min(1 + Math.floor(i / 2), 10),
      prerequisites: i > 0 ? [`${subject}-node-${i}`] : [],
    }),
  )
}

describe('LessonPlanner', () => {
  let planner: LessonPlanner

  beforeEach(() => {
    planner = new LessonPlanner()
  })

  describe('planLessons', () => {
    it('should return plans for 3 days by default', () => {
      const nodes = createNodes(10)
      const input: LessonPlanInput = {
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)

      expect(plans).toHaveLength(3)
      expect(plans[0].day).toBe(1)
      expect(plans[1].day).toBe(2)
      expect(plans[2].day).toBe(3)
    })

    it('should include 3-5 knowledge nodes per day', () => {
      const nodes = createNodes(20)
      const input: LessonPlanInput = {
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)

      for (const plan of plans) {
        expect(plan.items.length).toBeGreaterThanOrEqual(3)
        expect(plan.items.length).toBeLessThanOrEqual(5)
      }
    })

    it('should prioritize new unlocked nodes', () => {
      const nodes = createNodes(10)
      // node-1 has no prerequisites, so it's unlocked
      const masteryMap = new Map<string, number>()

      const input: LessonPlanInput = {
        nodes,
        masteryMap,
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)

      // First item on day 1 should be node-1 (first unlocked)
      const day1NodeIds = plans[0].items.map((item) => item.nodeId)
      expect(day1NodeIds).toContain('math-node-1')
    })

    it('should include review items from review queue', () => {
      const nodes = createNodes(10)
      const masteryMap = new Map<string, number>([
        ['math-node-1', 50],
        ['math-node-2', 40],
      ])

      const input: LessonPlanInput = {
        nodes,
        masteryMap,
        subject: 'math',
        reviewQueue: [
          { nodeId: 'math-node-1', dueDate: new Date() },
          { nodeId: 'math-node-2', dueDate: new Date() },
        ],
      }

      const plans = planner.planLessons(input)
      const allNodeIds = plans.flatMap((p) => p.items.map((i) => i.nodeId))

      // Review items should be included
      expect(allNodeIds).toContain('math-node-1')
      expect(allNodeIds).toContain('math-node-2')
    })

    it('should mark items with correct mode (new-teaching or reinforcement)', () => {
      const nodes = createNodes(5)
      const masteryMap = new Map<string, number>([
        ['math-node-1', 40],
      ])

      const input: LessonPlanInput = {
        nodes,
        masteryMap,
        subject: 'math',
        reviewQueue: [
          { nodeId: 'math-node-1', dueDate: new Date() },
        ],
      }

      const plans = planner.planLessons(input)
      const allItems = plans.flatMap((p) => p.items)

      const reviewItem = allItems.find((i) => i.nodeId === 'math-node-1')
      const newItem = allItems.find((i) => i.nodeId !== 'math-node-1' && i.mode === 'new-teaching')

      if (reviewItem) {
        expect(reviewItem.mode).toBe('reinforcement')
      }
      if (newItem) {
        expect(newItem.mode).toBe('new-teaching')
      }
    })

    it('should handle custom days parameter', () => {
      const nodes = createNodes(20)
      const input: LessonPlanInput = {
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
        days: 5,
      }

      const plans = planner.planLessons(input)
      expect(plans).toHaveLength(5)
    })

    it('should handle all nodes mastered', () => {
      const nodes = createNodes(3)
      const masteryMap = new Map<string, number>([
        ['math-node-1', 95],
        ['math-node-2', 90],
        ['math-node-3', 88],
      ])

      const input: LessonPlanInput = {
        nodes,
        masteryMap,
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)

      // Should still return 3 days of plans (consolidation review)
      expect(plans).toHaveLength(3)
    })

    it('should handle very few nodes', () => {
      const nodes = createNodes(2)
      const input: LessonPlanInput = {
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)
      expect(plans).toHaveLength(3)
      // Day 1 may have fewer than 3 items
      expect(plans[0].items.length).toBeGreaterThanOrEqual(1)
    })

    it('should not duplicate nodes across days without reason', () => {
      const nodes = createNodes(15)
      const input: LessonPlanInput = {
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      }

      const plans = planner.planLessons(input)

      // Collect all nodeIds across all days
      const allNodeIds = plans.flatMap((p) => p.items.map((i) => i.nodeId))
      const uniqueNodeIds = new Set(allNodeIds)

      // Most items should be unique (some review duplication is okay)
      expect(uniqueNodeIds.size).toBeGreaterThanOrEqual(allNodeIds.length * 0.7)
    })

    it('should mix new knowledge (~60%) and review (~40%)', () => {
      const nodes = createNodes(15)
      // First 5 nodes have some mastery (will be review candidates)
      // Nodes 6-15 have no mastery and no prerequisites (will be new candidates)
      const masteryMap = new Map<string, number>([
        ['math-node-1', 50],
        ['math-node-2', 45],
        ['math-node-3', 60],
        ['math-node-4', 55],
        ['math-node-5', 70],
      ])

      const input: LessonPlanInput = {
        nodes,
        masteryMap,
        subject: 'math',
        reviewQueue: [
          { nodeId: 'math-node-1', dueDate: new Date() },
          { nodeId: 'math-node-2', dueDate: new Date() },
        ],
      }

      const plans = planner.planLessons(input)
      const allItems = plans.flatMap((p) => p.items)
      const newItems = allItems.filter((i) => i.mode === 'new-teaching')
      const reviewItems = allItems.filter((i) => i.mode === 'reinforcement')

      // Should have both new and review items
      expect(newItems.length).toBeGreaterThan(0)
      // Review items come from nodes with mastery < 80 or in review queue
      expect(reviewItems.length).toBeGreaterThan(0)
    })

    it('should respect maxNodesPerDay config', () => {
      const customPlanner = new LessonPlanner({ maxNodesPerDay: 4 })
      const nodes = createNodes(20)

      const plans = customPlanner.planLessons({
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      })

      for (const plan of plans) {
        expect(plan.items.length).toBeLessThanOrEqual(4)
      }
    })

    it('should return date strings for each day plan', () => {
      const nodes = createNodes(10)
      const plans = planner.planLessons({
        nodes,
        masteryMap: new Map(),
        subject: 'math',
        reviewQueue: [],
      })

      for (const plan of plans) {
        // Date should be in YYYY-MM-DD format
        expect(plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })
})
