import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { LittleStarDB } from '../database'
import { KnowledgeGraphService } from '../knowledge-graph'
import type { KnowledgeNode } from '@/types/models'

let testCounter = 0

describe('KnowledgeGraphService', () => {
  let db: LittleStarDB
  let service: KnowledgeGraphService

  const createTestNodes = (): KnowledgeNode[] => [
    {
      id: 'math-1',
      subject: 'math',
      gradeLevel: 'middle-kindergarten',
      name: '数字认知 1-5',
      description: '认识数字1到5',
      prerequisites: [],
      nextNodes: ['math-2'],
      difficulty: 1,
      contentType: 'flashcard',
      order: 1,
    },
    {
      id: 'math-2',
      subject: 'math',
      gradeLevel: 'middle-kindergarten',
      name: '数字认知 6-10',
      description: '认识数字6到10',
      prerequisites: ['math-1'],
      nextNodes: ['math-3'],
      difficulty: 2,
      contentType: 'flashcard',
      order: 2,
    },
    {
      id: 'math-3',
      subject: 'math',
      gradeLevel: 'senior-kindergarten',
      name: '10以内加法',
      description: '学习10以内的加法运算',
      prerequisites: ['math-2'],
      nextNodes: [],
      difficulty: 3,
      contentType: 'quiz',
      order: 3,
    },
    {
      id: 'chinese-1',
      subject: 'chinese',
      gradeLevel: 'middle-kindergarten',
      name: '声母认读',
      description: '认识拼音声母',
      prerequisites: [],
      nextNodes: ['chinese-2'],
      difficulty: 1,
      contentType: 'voice',
      order: 1,
    },
    {
      id: 'chinese-2',
      subject: 'chinese',
      gradeLevel: 'middle-kindergarten',
      name: '韵母认读',
      description: '认识拼音韵母',
      prerequisites: ['chinese-1'],
      nextNodes: ['chinese-3'],
      difficulty: 2,
      contentType: 'voice',
      order: 2,
    },
    {
      id: 'chinese-3',
      subject: 'chinese',
      gradeLevel: 'senior-kindergarten',
      name: '拼读练习',
      description: '声母+韵母拼读',
      prerequisites: ['chinese-2'],
      nextNodes: [],
      difficulty: 3,
      contentType: 'voice',
      order: 3,
    },
  ]

  beforeEach(async () => {
    testCounter++
    db = new LittleStarDB(`TestKG_${testCounter}_${Date.now()}`)
    service = new KnowledgeGraphService(db)

    const nodes = createTestNodes()
    await db.knowledgeNodes.bulkPut(nodes)
  })

  afterEach(async () => {
    if (db.isOpen()) db.close()
    await Dexie.delete(db.name)
  })

  describe('节点查询', () => {
    it('应该能获取所有知识点', async () => {
      const allNodes = await service.getAllNodes()
      expect(allNodes.length).toBe(6)
    })

    it('应该能按科目过滤知识点', async () => {
      const mathNodes = await service.getNodesBySubject('math')
      expect(mathNodes.length).toBe(3)
      mathNodes.forEach((n) => expect(n.subject).toBe('math'))
    })

    it('应该能按科目和年级过滤知识点', async () => {
      const nodes = await service.getNodesBySubjectAndGrade('math', 'middle-kindergarten')
      expect(nodes.length).toBe(2)
    })

    it('应该能按 ID 获取知识点', async () => {
      const node = await service.getNodeById('math-1')
      expect(node).toBeDefined()
      expect(node!.name).toBe('数字认知 1-5')
    })
  })

  describe('依赖关系解析', () => {
    it('应该能获取节点的前置依赖', async () => {
      const prerequisites = await service.getPrerequisites('math-3')
      expect(prerequisites.length).toBe(1)
      expect(prerequisites[0].name).toBe('数字认知 6-10')
    })

    it('应该能获取节点的后续节点', async () => {
      const nextNodes = await service.getNextNodes('math-1')
      expect(nextNodes.length).toBe(1)
      expect(nextNodes[0].name).toBe('数字认知 6-10')
    })

    it('根节点应该没有前置依赖', async () => {
      const prerequisites = await service.getPrerequisites('math-1')
      expect(prerequisites.length).toBe(0)
    })

    it('叶子节点应该没有后续节点', async () => {
      const nextNodes = await service.getNextNodes('math-3')
      expect(nextNodes.length).toBe(0)
    })
  })

  describe('解锁判断', () => {
    it('没有前置依赖的节点应该直接可解锁', async () => {
      const canUnlock = await service.canUnlock('math-1', new Map())
      expect(canUnlock).toBe(true)
    })

    it('前置依赖未达标时不应该解锁', async () => {
      const masteryMap = new Map([['math-1', 50]])
      const canUnlock = await service.canUnlock('math-2', masteryMap)
      expect(canUnlock).toBe(false)
    })

    it('前置依赖达标时应该能解锁', async () => {
      const masteryMap = new Map([['math-1', 90]])
      const canUnlock = await service.canUnlock('math-2', masteryMap)
      expect(canUnlock).toBe(true)
    })
  })

  describe('按学习顺序排序', () => {
    it('应该按 order 字段排序', async () => {
      const nodes = await service.getNodesBySubjectOrdered('math')
      expect(nodes[0].name).toBe('数字认知 1-5')
      expect(nodes[1].name).toBe('数字认知 6-10')
      expect(nodes[2].name).toBe('10以内加法')
    })
  })
})
