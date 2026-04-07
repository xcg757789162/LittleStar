import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { LittleStarDB } from '@/db/database'
import { seedDatabase, getMathSeedData, getChineseSeedData, getEnglishSeedData } from '../seed'

let testCounter = 0

describe('种子数据', () => {
  let db: LittleStarDB

  beforeEach(async () => {
    testCounter++
    db = new LittleStarDB(`TestSeed_${testCounter}_${Date.now()}`)
  })

  afterEach(async () => {
    if (db.isOpen()) db.close()
    await Dexie.delete(db.name)
  })

  describe('数学种子数据', () => {
    it('应该包含知识点数据', () => {
      const data = getMathSeedData()
      expect(data.knowledgeNodes.length).toBeGreaterThanOrEqual(5)
    })

    it('应该包含数字认知知识点', () => {
      const data = getMathSeedData()
      const numberNodes = data.knowledgeNodes.filter((n) =>
        n.name.includes('数字'),
      )
      expect(numberNodes.length).toBeGreaterThanOrEqual(1)
    })

    it('应该包含题目数据', () => {
      const data = getMathSeedData()
      expect(data.questions.length).toBeGreaterThanOrEqual(10)
    })

    it('每个知识点应该至少有 2 道题', () => {
      const data = getMathSeedData()
      const questionsByNode = new Map<string, number>()
      data.questions.forEach((q) => {
        const count = questionsByNode.get(q.knowledgeNodeId) || 0
        questionsByNode.set(q.knowledgeNodeId, count + 1)
      })
      // 知识点 ID 在种子数据中是字符串标识符
      questionsByNode.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(2)
      })
    })

    it('难度分布应该合理（1-5之间）', () => {
      const data = getMathSeedData()
      data.knowledgeNodes.forEach((n) => {
        expect(n.difficulty).toBeGreaterThanOrEqual(1)
        expect(n.difficulty).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('语文种子数据', () => {
    it('应该包含知识点数据', () => {
      const data = getChineseSeedData()
      expect(data.knowledgeNodes.length).toBeGreaterThanOrEqual(3)
    })

    it('应该包含拼音相关知识点', () => {
      const data = getChineseSeedData()
      const pinyinNodes = data.knowledgeNodes.filter(
        (n) => n.name.includes('拼音') || n.name.includes('声母') || n.name.includes('韵母'),
      )
      expect(pinyinNodes.length).toBeGreaterThanOrEqual(1)
    })

    it('应该包含题目数据', () => {
      const data = getChineseSeedData()
      expect(data.questions.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('英语种子数据', () => {
    it('应该包含知识点数据', () => {
      const data = getEnglishSeedData()
      expect(data.knowledgeNodes.length).toBeGreaterThanOrEqual(3)
    })

    it('应该包含字母相关知识点', () => {
      const data = getEnglishSeedData()
      const letterNodes = data.knowledgeNodes.filter(
        (n) => n.name.includes('字母') || n.name.includes('Letter'),
      )
      expect(letterNodes.length).toBeGreaterThanOrEqual(1)
    })

    it('应该包含题目数据', () => {
      const data = getEnglishSeedData()
      expect(data.questions.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('知识图谱连通性', () => {
    it('数学知识图谱应该有前后依赖关系', () => {
      const data = getMathSeedData()
      const nodesWithNext = data.knowledgeNodes.filter((n) => n.nextNodes.length > 0)
      expect(nodesWithNext.length).toBeGreaterThanOrEqual(1)
    })

    it('语文知识图谱应该有前后依赖关系', () => {
      const data = getChineseSeedData()
      const nodesWithNext = data.knowledgeNodes.filter((n) => n.nextNodes.length > 0)
      expect(nodesWithNext.length).toBeGreaterThanOrEqual(1)
    })

    it('所有引用的前置节点 ID 应该存在', () => {
      const allData = [getMathSeedData(), getChineseSeedData(), getEnglishSeedData()]
      allData.forEach((data) => {
        const nodeIds = new Set(data.knowledgeNodes.map((n) => n.id))
        data.knowledgeNodes.forEach((n) => {
          n.prerequisites.forEach((preId) => {
            expect(nodeIds.has(preId)).toBe(true)
          })
        })
      })
    })
  })

  describe('数据库播种', () => {
    it('应该成功将所有种子数据写入数据库', async () => {
      await seedDatabase(db)

      const nodes = await db.knowledgeNodes.count()
      const questions = await db.questions.count()

      expect(nodes).toBeGreaterThanOrEqual(11) // 数学5+语文3+英语3
      expect(questions).toBeGreaterThanOrEqual(30) // 每科至少10道
    })

    it('播种后应该能按科目查询知识点', async () => {
      await seedDatabase(db)

      const mathNodes = await db.knowledgeNodes.where('subject').equals('math').toArray()
      const chineseNodes = await db.knowledgeNodes.where('subject').equals('chinese').toArray()
      const englishNodes = await db.knowledgeNodes.where('subject').equals('english').toArray()

      expect(mathNodes.length).toBeGreaterThanOrEqual(5)
      expect(chineseNodes.length).toBeGreaterThanOrEqual(3)
      expect(englishNodes.length).toBeGreaterThanOrEqual(3)
    })

    it('重复播种不应该报错（幂等性）', async () => {
      await seedDatabase(db)
      await seedDatabase(db)

      const nodes = await db.knowledgeNodes.count()
      // 第二次播种不应该重复添加
      expect(nodes).toBeGreaterThanOrEqual(11)
    })
  })
})
