/**
 * useKnowledgeNodes — 知识点数据 React Query Hooks
 *
 * 知识点是公共只读数据（anon 角色可访问），
 * 设置较长的 staleTime 减少不必要的请求。
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { KnowledgeNode, Subject } from '@/types/models'

export const knowledgeNodeKeys = {
  all: ['knowledgeNodes'] as const,
  bySubject: (subject: Subject) => ['knowledgeNodes', { subject }] as const,
  detail: (id: string) => ['knowledgeNodes', id] as const,
}

const PUBLIC_STALE_TIME = 30 * 60 * 1000

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
