/**
 * 根据课程 slug 粗分学科类型（写入 api.courses.discipline_type）。
 * 细粒度 subjectKey 由后续 subject-classifier 任务补充。
 */

const ACADEMIC_SLUGS = new Set([
  'math',
  'chinese',
  'english',
  'politics',
  'history',
  'biology',
  'geography',
  'physics',
  'chemistry',
  'science',
])

export type DisciplineTypeDb = 'academic' | 'interest'

export function classifyDisciplineFromSlug(slug: string): DisciplineTypeDb {
  const base = slug.split('-')[0]?.toLowerCase() ?? slug.toLowerCase()
  return ACADEMIC_SLUGS.has(base) ? 'academic' : 'interest'
}
