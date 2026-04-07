import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { LittleStarDB } from '../database'
import type { Child, KnowledgeNode, LearningRecord, Question, DailySession } from '@/types/models'

let testCounter = 0

describe('LittleStarDB', () => {
  let db: LittleStarDB

  beforeEach(async () => {
    testCounter++
    const dbName = `TestDB_${testCounter}_${Date.now()}`
    db = new LittleStarDB(dbName)
  })

  afterEach(async () => {
    if (db.isOpen()) db.close()
    await Dexie.delete(db.name)
  })

  describe('数据库初始化', () => {
    it('应该成功创建数据库实例', () => {
      expect(db).toBeDefined()
      expect(db.name).toContain('TestDB_')
    })

    it('应该包含所有核心表', async () => {
      await db.open()
      const tableNames = db.tables.map((t) => t.name)
      expect(tableNames).toContain('children')
      expect(tableNames).toContain('knowledgeNodes')
      expect(tableNames).toContain('learningRecords')
      expect(tableNames).toContain('masteryRecords')
      expect(tableNames).toContain('questions')
      expect(tableNames).toContain('questionTemplates')
      expect(tableNames).toContain('achievements')
      expect(tableNames).toContain('dailySessions')
    })
  })

  describe('Children CRUD', () => {
    const createMockChild = (): Child => ({
      name: '小明',
      avatar: '🧒',
      age: 5,
      gradeLevel: 'senior-kindergarten',
      createdAt: new Date('2026-01-01'),
      settings: {
        dailyLearningMinutes: 15,
        preferredSubjects: ['math', 'chinese'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
      },
    })

    it('应该能添加一个孩子', async () => {
      const id = await db.children.add(createMockChild())
      expect(id).toBeDefined()
    })

    it('应该能根据 ID 查询孩子', async () => {
      const id = await db.children.add(createMockChild())
      const child = await db.children.get(id)
      expect(child).toBeDefined()
      expect(child!.name).toBe('小明')
      expect(child!.gradeLevel).toBe('senior-kindergarten')
    })

    it('应该能更新孩子信息', async () => {
      const id = await db.children.add(createMockChild())
      await db.children.update(id, { name: '小红' })
      const child = await db.children.get(id)
      expect(child!.name).toBe('小红')
    })

    it('应该能删除一个孩子', async () => {
      const id = await db.children.add(createMockChild())
      await db.children.delete(id)
      const child = await db.children.get(id)
      expect(child).toBeUndefined()
    })

    it('应该能查询所有孩子', async () => {
      await db.children.add(createMockChild())
      const child2 = createMockChild()
      child2.name = '小红'
      await db.children.add(child2)
      const all = await db.children.toArray()
      expect(all.length).toBe(2)
    })
  })

  describe('KnowledgeNodes CRUD', () => {
    const createMockNode = (id: string): KnowledgeNode => ({
      id,
      subject: 'math',
      gradeLevel: 'senior-kindergarten',
      name: '数字认知 1-10',
      description: '认识数字1到10',
      prerequisites: [],
      nextNodes: [],
      difficulty: 1,
      contentType: 'flashcard',
      order: 1,
    })

    it('应该能添加知识点', async () => {
      const id = await db.knowledgeNodes.add(createMockNode('node-1'))
      expect(id).toBe('node-1')
    })

    it('应该能按科目查询知识点', async () => {
      await db.knowledgeNodes.add(createMockNode('node-1'))
      await db.knowledgeNodes.add({
        ...createMockNode('node-2'),
        subject: 'chinese',
        name: '拼音 a',
      })
      const mathNodes = await db.knowledgeNodes.where('subject').equals('math').toArray()
      expect(mathNodes.length).toBe(1)
      expect(mathNodes[0].name).toBe('数字认知 1-10')
    })

    it('应该能按科目和年级查询知识点', async () => {
      await db.knowledgeNodes.add(createMockNode('node-1'))
      await db.knowledgeNodes.add({
        ...createMockNode('node-2'),
        gradeLevel: 'middle-kindergarten',
        name: '数数 1-5',
      })
      const nodes = await db.knowledgeNodes
        .where('[subject+gradeLevel]')
        .equals(['math', 'senior-kindergarten'])
        .toArray()
      expect(nodes.length).toBe(1)
    })
  })

  describe('LearningRecords CRUD', () => {
    const createMockRecord = (): LearningRecord => ({
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      answer: '5',
      isCorrect: true,
      timeSpent: 3000,
      attemptCount: 1,
      timestamp: new Date('2026-01-01'),
    })

    it('应该能添加学习记录', async () => {
      const id = await db.learningRecords.add(createMockRecord())
      expect(id).toBeDefined()
    })

    it('应该能按孩子 ID 查询学习记录', async () => {
      await db.learningRecords.add(createMockRecord())
      const record2 = createMockRecord()
      record2.childId = 'child-2'
      await db.learningRecords.add(record2)
      const records = await db.learningRecords.where('childId').equals('child-1').toArray()
      expect(records.length).toBe(1)
    })

    it('应该能按孩子和知识点联合查询', async () => {
      await db.learningRecords.add(createMockRecord())
      const record2 = createMockRecord()
      record2.knowledgeNodeId = 'node-2'
      await db.learningRecords.add(record2)
      const records = await db.learningRecords
        .where('[childId+knowledgeNodeId]')
        .equals(['child-1', 'node-1'])
        .toArray()
      expect(records.length).toBe(1)
    })
  })

  describe('Questions CRUD', () => {
    const createMockQuestion = (id: string): Question => ({
      id,
      knowledgeNodeId: 'node-1',
      type: 'multiple-choice',
      content: {
        text: '1 + 2 = ?',
        options: [
          { id: 'a', text: '2', isCorrect: false },
          { id: 'b', text: '3', isCorrect: true },
          { id: 'c', text: '4', isCorrect: false },
        ],
      },
      answer: 'b',
      difficulty: 2,
      isAIGenerated: false,
    })

    it('应该能添加题目', async () => {
      const id = await db.questions.add(createMockQuestion('q-1'))
      expect(id).toBe('q-1')
    })

    it('应该能按知识点查询题目', async () => {
      await db.questions.add(createMockQuestion('q-1'))
      await db.questions.add({ ...createMockQuestion('q-2'), knowledgeNodeId: 'node-2' })
      const questions = await db.questions.where('knowledgeNodeId').equals('node-1').toArray()
      expect(questions.length).toBe(1)
    })

    it('应该能按类型和知识点联合查询', async () => {
      await db.questions.add(createMockQuestion('q-1'))
      await db.questions.add({ ...createMockQuestion('q-2'), type: 'flashcard' })
      const questions = await db.questions
        .where('[knowledgeNodeId+type]')
        .equals(['node-1', 'multiple-choice'])
        .toArray()
      expect(questions.length).toBe(1)
    })
  })

  describe('DailySessions CRUD', () => {
    const createMockSession = (): DailySession => ({
      childId: 'child-1',
      date: '2026-01-01',
      startTime: new Date('2026-01-01T09:00:00'),
      questionsCompleted: 10,
      correctCount: 8,
      subjects: ['math', 'chinese'],
      streak: 3,
    })

    it('应该能添加每日会话', async () => {
      const id = await db.dailySessions.add(createMockSession())
      expect(id).toBeDefined()
    })

    it('应该能按孩子和日期查询会话', async () => {
      await db.dailySessions.add(createMockSession())
      const sessions = await db.dailySessions
        .where('[childId+date]')
        .equals(['child-1', '2026-01-01'])
        .toArray()
      expect(sessions.length).toBe(1)
      expect(sessions[0].questionsCompleted).toBe(10)
    })
  })
})
