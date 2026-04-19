/**
 * 知识点大纲按需加载入口
 *
 * 从 PostgREST API 加载课程大纲数据（curricula → modules → nodes 三级结构），
 * 通过内存 Map 缓存避免重复请求。
 *
 * 年级维度已下线：每个 subject 对应唯一一条 curricula 行（DB UNIQUE(subject)）。
 */

import type { Subject } from '@/types/models'
import type { GradeCurriculum, CurriculumModule, CurriculumTemplatePrompt } from './types'
import { apiClient } from '@/services/api'
import type { Curriculum, CurriculumModuleApi, CurriculumNodeApi } from '@/services/api/types'

export type { GradeCurriculum, CurriculumModule, CurriculumKnowledgeNode, CurriculumTemplatePrompt } from './types'

const curriculumCache = new Map<string, GradeCurriculum>()

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
    subject: data.subject as Subject,
    version: data.version,
    reference: data.reference,
    modules,
  }
}

/**
 * 按需加载指定学科的知识点大纲
 *
 * @param subject 学科 slug（对应 api.courses.slug / api.curricula.subject）
 * @returns 大纲数据；不存在或 API 失败时返回 null
 */
export async function loadCurriculum(subject: Subject): Promise<GradeCurriculum | null> {
  const cached = curriculumCache.get(subject)
  if (cached) return cached

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const data = await apiClient.getOne<Curriculum>('/curricula', {
      filters: [
        { column: 'subject', operator: 'eq', value: subject },
        { column: 'isActive', operator: 'eq', value: true },
      ],
      select: '*, curriculum_modules(*, curriculum_nodes(*))',
    })

    clearTimeout(timeout)

    if (!data) return null

    const curriculum = toGradeCurriculum(data)
    curriculumCache.set(subject, curriculum)
    return curriculum
  } catch {
    return null
  }
}

export function clearCurriculumCache(): void {
  curriculumCache.clear()
}
