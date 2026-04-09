/**
 * useQuestions — 题目数据 React Query Hooks
 *
 * 题目是公共只读数据，设置较长 staleTime
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { Question } from '@/types/models'

/** React Query 缓存键 */
export const questionKeys = {
  all: ['questions'] as const,
  byNode: (nodeId: string) => ['questions', { nodeId }] as const,
  byNodeType: (nodeId: string, type: string) => ['questions', { nodeId, type }] as const,
}

const PUBLIC_STALE_TIME = 30 * 60 * 1000

/** 查询所有题目 */
export function useQuestions() {
  return useQuery({
    queryKey: questionKeys.all,
    queryFn: () => apiClient.get<Question>('/questions'),
    staleTime: PUBLIC_STALE_TIME,
  })
}

/** 按知识点查询题目 */
export function useQuestionsByNode(nodeId: string | undefined) {
  return useQuery({
    queryKey: questionKeys.byNode(nodeId!),
    queryFn: () =>
      apiClient.get<Question>('/questions', {
        filters: [{ column: 'knowledgeNodeId', operator: 'eq', value: nodeId! }],
      }),
    enabled: !!nodeId,
    staleTime: PUBLIC_STALE_TIME,
  })
}

/** 按知识点和类型查询题目 */
export function useQuestionsByNodeType(nodeId: string | undefined, type: string | undefined) {
  return useQuery({
    queryKey: questionKeys.byNodeType(nodeId!, type!),
    queryFn: () =>
      apiClient.get<Question>('/questions', {
        filters: [
          { column: 'knowledgeNodeId', operator: 'eq', value: nodeId! },
          { column: 'type', operator: 'eq', value: type! },
        ],
      }),
    enabled: !!nodeId && !!type,
    staleTime: PUBLIC_STALE_TIME,
  })
}
