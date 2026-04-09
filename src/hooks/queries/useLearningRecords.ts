/**
 * useLearningRecords — 学习记录 React Query Hooks
 *
 * 按 childId 查询学习记录，创建新记录的 mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { LearningRecord } from '@/types/models'

/** React Query 缓存键 */
export const learningRecordKeys = {
  all: ['learningRecords'] as const,
  byChild: (childId: string | number) => ['learningRecords', { childId }] as const,
  byChildNode: (childId: string | number, nodeId: string) =>
    ['learningRecords', { childId, nodeId }] as const,
}

/** 按孩子查询学习记录 */
export function useLearningRecords(childId: string | number | undefined) {
  return useQuery({
    queryKey: learningRecordKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<LearningRecord>('/learning_records', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'timestamp', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+知识点查询学习记录 */
export function useLearningRecordsByNode(
  childId: string | number | undefined,
  nodeId: string | undefined,
) {
  return useQuery({
    queryKey: learningRecordKeys.byChildNode(childId!, nodeId!),
    queryFn: () =>
      apiClient.get<LearningRecord>('/learning_records', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'knowledgeNodeId', operator: 'eq', value: nodeId! },
        ],
        order: [{ column: 'timestamp', ascending: false }],
      }),
    enabled: !!childId && !!nodeId,
  })
}

/** 创建学习记录输入类型 */
export interface CreateLearningRecordInput {
  childId: number
  knowledgeNodeId: string
  questionId: string
  answer: unknown
  isCorrect: boolean
  timeSpent: number
  attemptCount: number
  pronunciationScore?: number
  pronunciationStars?: number
}

/** 创建学习记录 */
export function useCreateLearningRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLearningRecordInput) =>
      apiClient.post<LearningRecord>('/learning_records', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: learningRecordKeys.byChild(variables.childId),
      })
    },
  })
}
