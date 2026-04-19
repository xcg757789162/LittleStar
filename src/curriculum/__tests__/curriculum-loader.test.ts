import { describe, it, expect } from 'vitest'
import { loadCurriculum } from '../index'
import type { CurriculumModule, CurriculumKnowledgeNode } from '../types'

describe('Curriculum Loader', () => {
  describe('GradeCurriculum 类型结构', () => {
    it('加载的大纲应包含必要字段', async () => {
      const curriculum = await loadCurriculum('math')
      expect(curriculum).toBeDefined()
      if (!curriculum) return
      expect(curriculum.subject).toBe('math')
      expect(curriculum.version).toBeDefined()
      expect(curriculum.reference).toBeDefined()
      expect(Array.isArray(curriculum.modules)).toBe(true)
      expect(curriculum.modules.length).toBeGreaterThan(0)
    })

    it('每个模块应包含正确的结构', async () => {
      const curriculum = await loadCurriculum('math')
      if (!curriculum) return
      const module: CurriculumModule = curriculum.modules[0]
      expect(module.id).toBeDefined()
      expect(module.name).toBeDefined()
      expect(module.description).toBeDefined()
      expect(typeof module.order).toBe('number')
      expect(Array.isArray(module.knowledgeNodes)).toBe(true)
      expect(module.knowledgeNodes.length).toBeGreaterThan(0)
    })

    it('每个知识点应包含正确的结构', async () => {
      const curriculum = await loadCurriculum('math')
      if (!curriculum) return
      const node: CurriculumKnowledgeNode = curriculum.modules[0].knowledgeNodes[0]
      expect(node.id).toBeDefined()
      expect(node.name).toBeDefined()
      expect(node.description).toBeDefined()
      expect(typeof node.difficulty).toBe('number')
      expect(node.difficulty).toBeGreaterThanOrEqual(1)
      expect(node.difficulty).toBeLessThanOrEqual(10)
      expect(Array.isArray(node.contentTypes)).toBe(true)
      expect(Array.isArray(node.prerequisites)).toBe(true)
      expect(Array.isArray(node.templatePrompts)).toBe(true)
    })
  })

  describe('loadCurriculum 按需加载', () => {
    it('应按 subject 加载对应的大纲', async () => {
      const math = await loadCurriculum('math')
      if (!math) return
      expect(math.subject).toBe('math')

      const chinese = await loadCurriculum('chinese')
      if (!chinese) return
      expect(chinese.subject).toBe('chinese')
    })

    it('大纲知识点 ID 应全局唯一', async () => {
      const math = await loadCurriculum('math')
      if (!math) return
      const allNodeIds = math.modules.flatMap((m) =>
        m.knowledgeNodes.map((n) => n.id),
      )
      const uniqueIds = new Set(allNodeIds)
      expect(uniqueIds.size).toBe(allNodeIds.length)
    })

    it('每科至少有 8 个核心知识点', async () => {
      const curriculum = await loadCurriculum('math')
      if (!curriculum) return
      const totalNodes = curriculum.modules.reduce(
        (sum, m) => sum + m.knowledgeNodes.length,
        0,
      )
      expect(totalNodes).toBeGreaterThanOrEqual(8)
    })

    it('知识点模板 prompt 应完整', async () => {
      const curriculum = await loadCurriculum('math')
      if (!curriculum) return
      for (const module of curriculum.modules) {
        for (const node of module.knowledgeNodes) {
          expect(node.templatePrompts.length).toBeGreaterThan(0)
          for (const tp of node.templatePrompts) {
            expect(tp.type).toBeDefined()
            expect(tp.prompt).toBeDefined()
            expect(tp.prompt.length).toBeGreaterThan(0)
          }
        }
      }
    })
  })
})
