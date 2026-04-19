/**
 * 课程学科键与 discipline_type 的规则分类（写入 courses / requirement_spec.meta）。
 */

import { classifyDisciplineFromSlug, type DisciplineTypeDb } from './discipline-classifier.js'

export interface SubjectClassification {
  subjectKey: string
  disciplineType: DisciplineTypeDb
}

export function resolveSubjectClassification(
  slug: string,
  requirementSpec: Record<string, unknown>,
): SubjectClassification {
  const rawMeta = requirementSpec.meta
  if (rawMeta && typeof rawMeta === 'object') {
    const sk = (rawMeta as Record<string, unknown>).subjectKey
    if (typeof sk === 'string' && sk.trim()) {
      const subjectKey = sk.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
      if (subjectKey) {
        return { subjectKey, disciplineType: classifyDisciplineFromSlug(subjectKey) }
      }
    }
  }
  const base = (slug.split('-')[0] ?? slug).toLowerCase().replace(/[^a-z0-9-]/g, '') || slug.toLowerCase()
  return {
    subjectKey: base.slice(0, 30),
    disciplineType: classifyDisciplineFromSlug(slug),
  }
}
