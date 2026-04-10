/**
 * RequirementGenerator 单元测试
 *
 * 测试根据 KnowledgeNode + ChildProfile + masteryLevel 生成结构化 requirement 文本。
 * 支持两种模式：新知识教学 和 加固复习。
 */

import { describe, it, expect } from 'vitest'
import {
  RequirementGenerator,
  type RequirementInput,
  type RequirementMode,
} from '../requirement-generator'
import type { UserRequirements } from '@/services/openmaic/pipeline-types'

// 辅助工厂
function makeInput(overrides: Partial<RequirementInput> = {}): RequirementInput {
  return {
    knowledgeNode: {
      id: 'math-k-counting-1-5',
      name: '认识数字 1-5',
      description: '学习认识和书写数字 1 到 5，理解数量对应关系',
      difficulty: 2,
      templatePrompts: [
        {
          type: 'flashcard' as const,
          prompt: '展示数字 {n} 和对应数量的物品',
          constraints: { minN: 1, maxN: 5 },
        },
      ],
      prerequisites: [],
    },
    child: {
      age: 5,
      gradeLevel: 'senior-kindergarten' as const,
    },
    masteryLevel: 0,
    mode: 'new-teaching' as RequirementMode,
    language: 'zh-CN',
    ...overrides,
  }
}

describe('RequirementGenerator', () => {
  let generator: RequirementGenerator

  beforeEach(() => {
    generator = new RequirementGenerator()
  })

  describe('generate', () => {
    it('should generate a requirement string for new teaching', () => {
      const input = makeInput()
      const result = generator.generate(input)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(50)
    })

    it('should include knowledge node name in requirement', () => {
      const input = makeInput()
      const result = generator.generate(input)

      expect(result).toContain('认识数字 1-5')
    })

    it('should include knowledge node description', () => {
      const input = makeInput()
      const result = generator.generate(input)

      expect(result).toContain('1 到 5')
    })

    it('should include age-appropriate language for young children', () => {
      const input = makeInput({ child: { age: 4, gradeLevel: 'middle-kindergarten' } })
      const result = generator.generate(input)

      // 幼儿课堂应强调趣味性
      expect(result).toMatch(/趣味|有趣|卡通|动画|游戏/)
    })

    it('should reference template prompts when available', () => {
      const input = makeInput()
      const result = generator.generate(input)

      // 模板提示应被纳入 requirement
      expect(result).toMatch(/数字|物品|数量/)
    })

    it('should generate reinforcement requirement for low mastery', () => {
      const input = makeInput({
        mode: 'reinforcement',
        masteryLevel: 30,
      })
      const result = generator.generate(input)

      expect(result).toMatch(/加固|复习|巩固/)
    })

    it('should adjust difficulty description based on mastery level', () => {
      const lowMastery = generator.generate(makeInput({ masteryLevel: 20, mode: 'reinforcement' }))
      const midMastery = generator.generate(makeInput({ masteryLevel: 50, mode: 'reinforcement' }))

      // 低掌握率应该强调基础和简单
      expect(lowMastery).toMatch(/基础|简单|入门/)
    })

    it('should include language specification', () => {
      const result = generator.generate(makeInput({ language: 'en' }))
      expect(result).toMatch(/[Ee]nglish|英文/)
    })

    it('should include grade level context', () => {
      const result = generator.generate(makeInput())
      expect(result).toMatch(/大班|幼儿园|5.*岁/)
    })

    it('should handle knowledge node without template prompts', () => {
      const input = makeInput({
        knowledgeNode: {
          id: 'math-k-shapes',
          name: '认识基本图形',
          description: '学习认识圆形、三角形和正方形',
          difficulty: 1,
          templatePrompts: [],
          prerequisites: [],
        },
      })
      const result = generator.generate(input)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(50)
      expect(result).toContain('认识基本图形')
    })

    it('should include prerequisites context when available', () => {
      const input = makeInput({
        knowledgeNode: {
          id: 'math-k-counting-6-10',
          name: '认识数字 6-10',
          description: '学习认识和书写数字 6 到 10',
          difficulty: 3,
          templatePrompts: [],
          prerequisites: ['math-k-counting-1-5'],
        },
      })
      const result = generator.generate(input)

      // 有前置知识点时应提及基础
      expect(result).toMatch(/前置|基础|已学/)
    })

    it('should handle high difficulty nodes', () => {
      const input = makeInput({
        knowledgeNode: {
          id: 'math-g1-add-within-20',
          name: '20 以内加法',
          description: '学习 20 以内的加法运算',
          difficulty: 6,
          templatePrompts: [],
          prerequisites: ['math-g1-add-within-10'],
        },
        child: { age: 7, gradeLevel: 'grade-1' },
      })
      const result = generator.generate(input)

      expect(result).toContain('20 以内加法')
    })
  })

  describe('mode handling', () => {
    it('new-teaching mode should focus on introduction', () => {
      const result = generator.generate(makeInput({ mode: 'new-teaching' }))
      expect(result).toMatch(/教学|学习|认识|介绍/)
    })

    it('reinforcement mode should focus on practice', () => {
      const result = generator.generate(makeInput({ mode: 'reinforcement', masteryLevel: 35 }))
      expect(result).toMatch(/加固|复习|巩固|练习/)
    })
  })

  describe('edge cases', () => {
    it('should handle masteryLevel of 0 for new teaching', () => {
      const result = generator.generate(makeInput({ masteryLevel: 0, mode: 'new-teaching' }))
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(50)
    })

    it('should handle masteryLevel of 100', () => {
      const result = generator.generate(makeInput({ masteryLevel: 100, mode: 'reinforcement' }))
      expect(typeof result).toBe('string')
    })

    it('should produce different output for different modes', () => {
      const newTeaching = generator.generate(makeInput({ mode: 'new-teaching', masteryLevel: 30 }))
      const reinforcement = generator.generate(makeInput({ mode: 'reinforcement', masteryLevel: 30 }))

      expect(newTeaching).not.toBe(reinforcement)
    })
  })

  describe('generateUserRequirements', () => {
    it('should return an object conforming to UserRequirements interface', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input, '小明')

      // 验证返回的对象结构
      expect(result).toBeDefined()
      expect(typeof result.requirement).toBe('string')
      expect(typeof result.language).toBe('string')
    })

    it('should include requirement text with teaching objective', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input, '小明')

      expect(result.requirement).toContain('认识数字 1-5')
      expect(result.requirement.length).toBeGreaterThan(50)
    })

    it('should set language from input', () => {
      const input = makeInput({ language: 'en' })
      const result = generator.generateUserRequirements(input)

      expect(result.language).toBe('en')
    })

    it('should default language to zh-CN', () => {
      const input = makeInput({ language: undefined })
      const result = generator.generateUserRequirements(input)

      expect(result.language).toBe('zh-CN')
    })

    it('should include userNickname when provided', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input, '小星星')

      expect(result.userNickname).toBe('小星星')
    })

    it('should omit userNickname when not provided', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input)

      expect(result.userNickname).toBeUndefined()
    })

    it('should include userBio when provided', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input, '小明', '我喜欢画画和小动物')

      expect(result.userBio).toBe('我喜欢画画和小动物')
    })

    it('should omit userBio when not provided', () => {
      const input = makeInput()
      const result = generator.generateUserRequirements(input)

      expect(result.userBio).toBeUndefined()
    })

    it('should use the same requirement text as generate()', () => {
      const input = makeInput()
      const text = generator.generate(input)
      const userReq = generator.generateUserRequirements(input)

      expect(userReq.requirement).toBe(text)
    })

    it('should satisfy UserRequirements type structure', () => {
      const input = makeInput()
      const result: UserRequirements = generator.generateUserRequirements(input, '小明', '我5岁了')

      // 类型检查 — 这里主要确保编译通过
      expect(result.requirement).toBeDefined()
      expect(result.language).toBeDefined()
      expect(result.userNickname).toBe('小明')
      expect(result.userBio).toBe('我5岁了')
    })
  })
})
