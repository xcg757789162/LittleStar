/**
 * Requirement 生成器
 *
 * 根据知识点信息、孩子画像和掌握率生成结构化 requirement 文本，
 * 供 OpenMAIC 课堂生成 API 使用。
 *
 * 支持两种模式：
 * - new-teaching: 新知识教学（首次学习）
 * - reinforcement: 加固复习（掌握率低需巩固）
 */

import type { UserRequirements } from '@/services/openmaic/pipeline-types'

// ============================================================
// 类型定义
// ============================================================

/** 生成模式 */
export type RequirementMode = 'new-teaching' | 'reinforcement'

/** 简化的大纲模板提示 */
export interface TemplatePrompt {
  type: string
  prompt: string
  constraints: Record<string, unknown>
}

/** 简化的知识点输入（不依赖完整 KnowledgeNode 模型） */
export interface KnowledgeNodeInput {
  id: string
  name: string
  description: string
  difficulty: number
  templatePrompts: TemplatePrompt[]
  prerequisites: string[]
}

/** 孩子画像输入 */
export interface ChildProfile {
  age: number
}

/** Requirement 生成输入 */
export interface RequirementInput {
  /** 知识点信息 */
  knowledgeNode: KnowledgeNodeInput
  /** 孩子画像 */
  child: ChildProfile
  /** 当前掌握率 0-100 */
  masteryLevel: number
  /** 生成模式 */
  mode: RequirementMode
  /** 目标语言（默认 zh-CN） */
  language?: string
  /** 课时序号（1-based），若有课时计划 */
  lessonIndex?: number
  /** 该知识点总课时数 */
  totalLessons?: number
  /** 本课时标题（来自 knowledge_node_lessons） */
  lessonTitle?: string
  /** 本课时聚焦要点 */
  lessonFocusPoints?: string[]
}

// ============================================================
// RequirementGenerator
// ============================================================

export class RequirementGenerator {
  /**
   * 生成结构化 requirement 文本
   */
  generate(input: RequirementInput): string {
    const { knowledgeNode, child, masteryLevel, mode, language } = input

    const sections: string[] = []

    // 1. 课堂目标（含课时上下文）
    sections.push(this.buildObjective(knowledgeNode, mode, masteryLevel, input))

    // 2. 课时信息（多课时知识点）
    if (input.lessonIndex && input.totalLessons && input.totalLessons > 1) {
      sections.push(this.buildLessonContext(input))
    }

    // 3. 学生画像
    sections.push(this.buildStudentProfile(child))

    // 4. 内容要求
    sections.push(this.buildContentRequirements(knowledgeNode, mode, masteryLevel, input.lessonFocusPoints))

    // 5. 教学风格
    sections.push(this.buildTeachingStyle(child))

    // 6. 模板提示（如有）
    if (knowledgeNode.templatePrompts.length > 0) {
      sections.push(this.buildTemplateHints(knowledgeNode.templatePrompts))
    }

    // 7. 前置知识点（如有）
    if (knowledgeNode.prerequisites.length > 0) {
      sections.push(this.buildPrerequisites(knowledgeNode.prerequisites))
    }

    // 8. 语言要求
    sections.push(this.buildLanguageRequirement(language))

    return sections.join('\n\n')
  }

  /**
   * 生成 OpenMAIC UserRequirements 格式的需求对象
   *
   * 将 generate() 输出的文本包装为 Pipeline Client 所需的 UserRequirements 结构，
   * 包含 requirement、language、可选的 userNickname 和 userBio。
   *
   * @param input 生成输入
   * @param userNickname 孩子昵称（可选，来自 child profile）
   * @param userBio 学生自我介绍（可选，来自家长设置的 selfIntroduction）
   * @returns UserRequirements 对象
   */
  generateUserRequirements(
    input: RequirementInput,
    userNickname?: string,
    userBio?: string,
  ): UserRequirements {
    const requirement = this.generate(input)
    const language = input.language || 'zh-CN'

    const result: UserRequirements = {
      requirement,
      language,
    }

    if (userNickname) {
      result.userNickname = userNickname
    }

    if (userBio) {
      result.userBio = userBio
    }

    return result
  }

  // ---- 私有构建方法 ----

  private buildObjective(
    node: KnowledgeNodeInput,
    mode: RequirementMode,
    masteryLevel: number,
    input?: RequirementInput,
  ): string {
    const lessonSuffix = (input?.lessonIndex && input?.totalLessons && input.totalLessons > 1)
      ? `（第 ${input.lessonIndex}/${input.totalLessons} 课${input.lessonTitle ? `：${input.lessonTitle}` : ''}）`
      : ''

    if (mode === 'new-teaching') {
      return `【课堂目标】\n新知识教学：${node.name}${lessonSuffix}\n${node.description}\n要求以趣味互动的方式介绍和学习该知识点，帮助学生认识和理解核心概念。`
    }

    const intensity = masteryLevel < 30 ? '基础入门' : masteryLevel < 60 ? '巩固练习' : '提升拓展'
    return `【课堂目标】\n加固复习：${node.name}${lessonSuffix}（当前掌握率 ${masteryLevel}%）\n${node.description}\n本次课堂重点为${intensity}，通过大量简单练习帮助学生巩固和加固该知识点。`
  }

  private buildLessonContext(input: RequirementInput): string {
    const lines = ['【课时信息】']
    lines.push(`本节课是【${input.knowledgeNode.name}】的第 ${input.lessonIndex}/${input.totalLessons} 节课。`)

    if (input.lessonTitle) {
      lines.push(`本课主题：${input.lessonTitle}`)
    }

    if (input.lessonFocusPoints && input.lessonFocusPoints.length > 0) {
      lines.push('本课聚焦要点：')
      for (const point of input.lessonFocusPoints) {
        lines.push(`- ${point}`)
      }
    }

    if (input.lessonIndex === 1) {
      lines.push('这是该知识点的第一堂课，请以认知引入为主，建立基本概念。')
    } else if (input.lessonIndex === input.totalLessons) {
      lines.push('这是该知识点的最后一堂课，请包含综合练习和回顾总结。')
    } else {
      lines.push('请在前面课程的基础上，逐步深入本课聚焦要点的教学。')
    }

    return lines.join('\n')
  }

  private buildStudentProfile(child: ChildProfile): string {
    return `【学生画像】\n年龄：${child.age} 岁\n以年龄为主要难度锚点，语言与抽象度需与该年龄段认知相匹配。`
  }

  private buildContentRequirements(
    node: KnowledgeNodeInput,
    mode: RequirementMode,
    masteryLevel: number,
    focusPoints?: string[],
  ): string {
    const lines = ['【内容要求】']

    if (mode === 'new-teaching') {
      lines.push('- 以引入→讲解→互动→测验的教学流程组织内容')
      lines.push('- 教学场景包含卡通插图、数字和物品的数量对应关系展示')
      lines.push('- 测验题目难度为入门级，以选择题为主')
    } else {
      lines.push('- 以回顾→练习→巩固→测验的复习流程组织内容')
      if (masteryLevel < 30) {
        lines.push('- 复习内容以基础简单题为主，降低难度确保学生能正确完成')
        lines.push('- 增加更多的图示和直观演示')
      } else if (masteryLevel < 60) {
        lines.push('- 复习内容包含基础和中等难度的混合练习')
      } else {
        lines.push('- 复习内容以中等和拓展题为主，适当增加挑战性')
      }
    }

    if (focusPoints && focusPoints.length > 0) {
      lines.push('- 本课内容应聚焦于以下要点，不要超出范围：')
      for (const point of focusPoints) {
        lines.push(`  · ${point}`)
      }
    }

    lines.push(`- 知识点难度等级：${node.difficulty}/10`)
    return lines.join('\n')
  }

  private buildTeachingStyle(child: ChildProfile): string {
    const lines = ['【教学风格】']

    if (child.age <= 6) {
      lines.push('- 使用大量卡通动画和有趣的角色引导')
      lines.push('- 语言简单易懂，多用拟声词和夸张表达')
      lines.push('- 每个知识点用游戏化的方式呈现')
      lines.push('- 互动环节注重趣味性和参与感')
    } else if (child.age <= 9) {
      lines.push('- 使用生动的故事和情景引入')
      lines.push('- 语言生动活泼，适合小学低年级')
      lines.push('- 结合日常生活场景帮助理解')
    } else {
      lines.push('- 使用清晰的逻辑和步骤引导')
      lines.push('- 语言简洁准确，适合小学高年级')
      lines.push('- 注重方法总结和举一反三')
    }

    return lines.join('\n')
  }

  private buildTemplateHints(prompts: TemplatePrompt[]): string {
    const lines = ['【出题模板参考】']
    for (const prompt of prompts) {
      lines.push(`- [${prompt.type}] ${prompt.prompt}`)
      if (Object.keys(prompt.constraints).length > 0) {
        lines.push(`  约束：${JSON.stringify(prompt.constraints)}`)
      }
    }
    return lines.join('\n')
  }

  private buildPrerequisites(prerequisites: string[]): string {
    return `【前置知识】\n学生已学习以下前置知识点的基础内容：${prerequisites.join('、')}\n请在课堂中适当引用已学基础知识作为铺垫。`
  }

  private buildLanguageRequirement(language?: string): string {
    if (!language || language.startsWith('zh')) {
      return '【语言】\n使用中文授课。'
    }
    if (language.startsWith('en')) {
      return '【语言】\nTeach in English. Use simple and age-appropriate English vocabulary and sentences.'
    }
    return `【语言】\n使用 ${language} 语言授课。`
  }
}
