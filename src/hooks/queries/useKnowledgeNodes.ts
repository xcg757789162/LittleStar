/**
 * useKnowledgeNodes — 知识点数据 React Query Hooks
 *
 * 知识点是公共只读数据（anon 角色可访问），
 * 设置较长的 staleTime 减少不必要的请求。
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { KnowledgeNode, Subject, GradeLevel } from '@/types/models'

/** React Query 缓存键 */
export const knowledgeNodeKeys = {
  all: ['knowledgeNodes'] as const,
  bySubject: (subject: Subject) => ['knowledgeNodes', { subject }] as const,
  bySubjectGrade: (subject: Subject, gradeLevel: GradeLevel) =>
    ['knowledgeNodes', { subject, gradeLevel }] as const,
  detail: (id: string) => ['knowledgeNodes', id] as const,
}

/** 30 分钟 — 公共数据变更频率低 */
const PUBLIC_STALE_TIME = 30 * 60 * 1000

/** 查询所有知识点 */
export function useKnowledgeNodes() {
  return useQuery({
    queryKey: knowledgeNodeKeys.all,
    queryFn: () =>
      apiClient.get<KnowledgeNode>('/knowledge_nodes', {
        order: [{ column: 'orderIndex', ascending: true }],
      }),
    staleTime: PUBLIC_STALE_TIME,
  })
}

/** 按科目查询知识点 */
export function useKnowledgeNodesBySubject(subject: Subject | undefined) {
  return useQuery({
    queryKey: knowledgeNodeKeys.bySubject(subject!),
    queryFn: () =>
      apiClient.get<KnowledgeNode>('/knowledge_nodes', {
        filters: [{ column: 'subject', operator: 'eq', value: subject! }],
        order: [{ column: 'orderIndex', ascending: true }],
      }),
    enabled: !!subject,
    staleTime: PUBLIC_STALE_TIME,
  })
}

/** 按科目和年级查询知识点 */
export function useKnowledgeNodesBySubjectGrade(
  subject: Subject | undefined,
  gradeLevel: GradeLevel | undefined,
) {
  return useQuery({
    queryKey: knowledgeNodeKeys.bySubjectGrade(subject!, gradeLevel!),
    queryFn: () =>
      apiClient.get<KnowledgeNode>('/knowledge_nodes', {
        filters: [
          { column: 'subject', operator: 'eq', value: subject! },
          { column: 'gradeLevel', operator: 'eq', value: gradeLevel! },
        ],
        order: [{ column: 'orderIndex', ascending: true }],
      }),
    enabled: !!subject && !!gradeLevel,
    staleTime: PUBLIC_STALE_TIME,
  })
}

/** 查询单个知识点 */
export function useKnowledgeNode(id: string | undefined) {
  return useQuery({
    queryKey: knowledgeNodeKeys.detail(id!),
    queryFn: () =>
      apiClient.getOne<KnowledgeNode>('/knowledge_nodes', {
        filters: [{ column: 'id', operator: 'eq', value: id! }],
      }),
    enabled: !!id,
    staleTime: PUBLIC_STALE_TIME,
  })
}
