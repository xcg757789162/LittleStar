/**
 * 知识点大纲体系类型定义
 * 参考教育部 2022 年版课程标准
 */

import type { GradeLevel, Subject, ContentType, QuestionType } from '@/types/models'

/** 年级大纲定义 */
export interface GradeCurriculum {
  gradeLevel: GradeLevel
  subject: Subject
  /** 大纲版本（如 '2022-v1'） */
  version: string
  /** 参考标准名称 */
  reference: string
  modules: CurriculumModule[]
}

/** 知识模块（大纲的一个章节） */
export interface CurriculumModule {
  id: string
  name: string
  description: string
  order: number
  knowledgeNodes: CurriculumKnowledgeNode[]
}

/** 大纲中的知识点定义 */
export interface CurriculumKnowledgeNode {
  /** 知识点 ID（全局唯一，如 'math-g1-add-within-10'） */
  id: string
  name: string
  description: string
  /** 难度 1-10 */
  difficulty: number
  /** 支持的内容类型 */
  contentTypes: ContentType[]
  /** 前置知识点 ID */
  prerequisites: string[]
  /** AI 出题模板 */
  templatePrompts: CurriculumTemplatePrompt[]
}

/** 大纲中的 AI 出题模板 */
export interface CurriculumTemplatePrompt {
  type: QuestionType
  prompt: string
  constraints: Record<string, unknown>
}
