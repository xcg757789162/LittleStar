/**
 * 知识点大纲按需加载入口
 * 使用动态 import 实现代码分割
 */

import type { GradeLevel, Subject } from '@/types/models'
import type { GradeCurriculum } from './types'

export type { GradeCurriculum, CurriculumModule, CurriculumKnowledgeNode, CurriculumTemplatePrompt } from './types'

/** 大纲缓存（避免重复加载） */
const curriculumCache = new Map<string, GradeCurriculum>()

/** 生成缓存 key */
function getCacheKey(gradeLevel: GradeLevel, subject: Subject): string {
  return `${gradeLevel}:${subject}`
}

/** 年级到目录名的映射 */
function getGradeDir(gradeLevel: GradeLevel): string {
  switch (gradeLevel) {
    case 'middle-kindergarten':
    case 'senior-kindergarten':
      return 'kindergarten'
    case 'grade-1':
      return 'grade-1'
    case 'grade-2':
      return 'grade-2'
    case 'grade-3':
      return 'grade-3'
    case 'grade-4':
      return 'grade-4'
    case 'grade-5':
      return 'grade-5'
    case 'grade-6':
      return 'grade-6'
    default:
      throw new Error(`Unknown grade level: ${gradeLevel}`)
  }
}

/** 科目到文件名的映射 */
function getSubjectFile(subject: Subject): string {
  switch (subject) {
    case 'math':
      return 'math'
    case 'chinese':
      return 'chinese'
    case 'english':
      return 'english'
    default:
      throw new Error(`Unknown subject: ${subject}`)
  }
}

/**
 * 按需加载指定年级和科目的知识点大纲
 * 使用动态 import 实现代码分割，已加载的大纲会被缓存
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

  const gradeDir = getGradeDir(gradeLevel)
  const subjectFile = getSubjectFile(subject)

  // 动态 import 实现按需加载
  const moduleMap: Record<string, () => Promise<{ default: GradeCurriculum }>> = {
    'kindergarten:math': () => import('./kindergarten/math'),
    'kindergarten:chinese': () => import('./kindergarten/chinese'),
    'kindergarten:english': () => import('./kindergarten/english'),
    'grade-1:math': () => import('./grade-1/math'),
    'grade-1:chinese': () => import('./grade-1/chinese'),
    'grade-1:english': () => import('./grade-1/english'),
    'grade-2:math': () => import('./grade-2/math'),
    'grade-2:chinese': () => import('./grade-2/chinese'),
    'grade-2:english': () => import('./grade-2/english'),
    'grade-3:math': () => import('./grade-3/math'),
    'grade-3:chinese': () => import('./grade-3/chinese'),
    'grade-3:english': () => import('./grade-3/english'),
    'grade-4:math': () => import('./grade-4/math'),
    'grade-4:chinese': () => import('./grade-4/chinese'),
    'grade-4:english': () => import('./grade-4/english'),
    'grade-5:math': () => import('./grade-5/math'),
    'grade-5:chinese': () => import('./grade-5/chinese'),
    'grade-5:english': () => import('./grade-5/english'),
    'grade-6:math': () => import('./grade-6/math'),
    'grade-6:chinese': () => import('./grade-6/chinese'),
    'grade-6:english': () => import('./grade-6/english'),
  }

  const importKey = `${gradeDir}:${subjectFile}`
  const importer = moduleMap[importKey]

  if (!importer) {
    throw new Error(`Curriculum not found: ${gradeLevel} / ${subject}`)
  }

  const module = await importer()
  const curriculum = module.default

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
