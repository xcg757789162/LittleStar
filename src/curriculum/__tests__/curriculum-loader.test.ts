import { describe, it, expect } from 'vitest'
import { loadCurriculum } from '../index'
import type { CurriculumModule, CurriculumKnowledgeNode } from '../types'

describe('Curriculum Loader', () => {
  describe('GradeCurriculum 类型结构', () => {
    it('加载的大纲应包含必要字段', async () => {
      const curriculum = await loadCurriculum('grade-1', 'math')
      expect(curriculum).toBeDefined()
      expect(curriculum.gradeLevel).toBe('grade-1')
      expect(curriculum.subject).toBe('math')
      expect(curriculum.version).toBeDefined()
      expect(curriculum.reference).toBeDefined()
      expect(Array.isArray(curriculum.modules)).toBe(true)
      expect(curriculum.modules.length).toBeGreaterThan(0)
    })

    it('每个模块应包含正确的结构', async () => {
      const curriculum = await loadCurriculum('grade-1', 'math')
      const module: CurriculumModule = curriculum.modules[0]
      expect(module.id).toBeDefined()
      expect(module.name).toBeDefined()
      expect(module.description).toBeDefined()
      expect(typeof module.order).toBe('number')
      expect(Array.isArray(module.knowledgeNodes)).toBe(true)
      expect(module.knowledgeNodes.length).toBeGreaterThan(0)
    })

    it('每个知识点应包含正确的结构', async () => {
      const curriculum = await loadCurriculum('grade-1', 'math')
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
    it('应按年级和科目加载对应的大纲', async () => {
      const mathG1 = await loadCurriculum('grade-1', 'math')
      expect(mathG1.gradeLevel).toBe('grade-1')
      expect(mathG1.subject).toBe('math')

      const chineseG1 = await loadCurriculum('grade-1', 'chinese')
      expect(chineseG1.gradeLevel).toBe('grade-1')
      expect(chineseG1.subject).toBe('chinese')
    })

    it('应能加载幼儿园大纲', async () => {
      const kindergartenMath = await loadCurriculum('middle-kindergarten', 'math')
      expect(kindergartenMath.gradeLevel).toBe('middle-kindergarten')
      expect(kindergartenMath.subject).toBe('math')
    })

    it('大纲知识点 ID 应全局唯一', async () => {
      const mathG1 = await loadCurriculum('grade-1', 'math')
      const allNodeIds = mathG1.modules.flatMap(m =>
        m.knowledgeNodes.map(n => n.id)
      )
      const uniqueIds = new Set(allNodeIds)
      expect(uniqueIds.size).toBe(allNodeIds.length)
    })

    it('每个年级每科至少有 8 个核心知识点', async () => {
      const curriculum = await loadCurriculum('grade-1', 'math')
      const totalNodes = curriculum.modules.reduce(
        (sum, m) => sum + m.knowledgeNodes.length, 0
      )
      expect(totalNodes).toBeGreaterThanOrEqual(8)
    })

    it('知识点模板 prompt 应完整', async () => {
      const curriculum = await loadCurriculum('grade-1', 'math')
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
