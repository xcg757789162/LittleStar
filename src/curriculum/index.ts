/**
 * 知识点大纲按需加载入口
 *
 * 从 PostgREST API 加载课程大纲数据（curricula → modules → nodes 三级结构），
 * 通过内存 Map 缓存避免重复请求。
 *
 * 替代原先的 Vite 动态 import 方式，数据源从 TS 文件迁移到 PostgreSQL 数据库。
 */

import type { GradeLevel, Subject } from '@/types/models'
import type { GradeCurriculum, CurriculumModule, CurriculumTemplatePrompt } from './types'
import { apiClient } from '@/services/api'
import type { Curriculum, CurriculumModuleApi, CurriculumNodeApi } from '@/services/api/types'

export type { GradeCurriculum, CurriculumModule, CurriculumKnowledgeNode, CurriculumTemplatePrompt } from './types'

/** 大纲缓存（避免重复加载） */
const curriculumCache = new Map<string, GradeCurriculum>()

/** 生成缓存 key */
function getCacheKey(gradeLevel: GradeLevel, subject: Subject): string {
  return `${gradeLevel}:${subject}`
}

/**
 * 将 API 响应转换为前端 GradeCurriculum 类型
 */
function toGradeCurriculum(data: Curriculum): GradeCurriculum {
  const modules: CurriculumModule[] = (data.curriculumModules ?? [])
    .sort((a: CurriculumModuleApi, b: CurriculumModuleApi) => a.orderIndex - b.orderIndex)
    .map((mod: CurriculumModuleApi) => ({
      id: mod.id,
      name: mod.name,
      description: mod.description,
      order: mod.orderIndex,
      knowledgeNodes: (mod.curriculumNodes ?? []).map((node: CurriculumNodeApi) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        difficulty: node.difficulty,
        contentTypes: node.contentTypes as GradeCurriculum['modules'][0]['knowledgeNodes'][0]['contentTypes'],
        prerequisites: node.prerequisites,
        templatePrompts: (node.templatePrompts as CurriculumTemplatePrompt[]) ?? [],
      })),
    }))

  return {
    gradeLevel: data.gradeLevel as GradeLevel,
    subject: data.subject as Subject,
    version: data.version,
    reference: data.reference,
    modules,
  }
}

/**
 * 按需加载指定年级和科目的知识点大纲
 * 从 PostgREST API 加载，利用嵌套 select 一次获取三级数据。
 * 已加载的大纲会被缓存。
 *
 * @param gradeLevel 年级
 * @param subject 科目
 * @returns 大纲数据
 */
export async function loadCurriculum(
  gradeLevel: GradeLevel,
  subject: Subject,
): Promise<GradeCurriculum> {
  const cacheKey = getCacheKey(gradeLevel, subject)

  // 检查缓存
  const cached = curriculumCache.get(cacheKey)
  if (cached) return cached

  // 从 API 加载（PostgREST 嵌套 select）
  const data = await apiClient.getOne<Curriculum>('/curricula', {
    filters: [
      { column: 'gradeLevel', operator: 'eq', value: gradeLevel },
      { column: 'subject', operator: 'eq', value: subject },
      { column: 'isActive', operator: 'eq', value: true },
    ],
    select: '*, curriculum_modules(*, curriculum_nodes(*))',
  })

  if (!data) {
    throw new Error(`Curriculum not found: ${gradeLevel} / ${subject}`)
  }

  const curriculum = toGradeCurriculum(data)

  // 缓存
  curriculumCache.set(cacheKey, curriculum)

  return curriculum
}

/**
 * 清除大纲缓存（测试用）
 */
export function clearCurriculumCache(): void {
  curriculumCache.clear()
}
