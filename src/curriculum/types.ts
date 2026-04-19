/**
 * 知识点大纲体系类型定义
 *
 * 年级维度已下线（2026-04），按 subject 唯一匹配一份大纲。难度/学段由
 * requirement_spec（按年龄/目标水平）承载，不再由 gradeLevel 承载。
 */

import type { Subject, ContentType, QuestionType } from '@/types/models'

/** 学科大纲定义 */
export interface GradeCurriculum {
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
