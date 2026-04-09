/**
 * useMasteryRecords — 掌握率记录 React Query Hooks
 *
 * 按 childId 查询掌握率，支持 upsert（利用 UNIQUE 约束）
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { MasteryRecord } from '@/types/models'

/** React Query 缓存键 */
export const masteryRecordKeys = {
  all: ['masteryRecords'] as const,
  byChild: (childId: string | number) => ['masteryRecords', { childId }] as const,
  byChildNode: (childId: string | number, nodeId: string) =>
    ['masteryRecords', { childId, nodeId }] as const,
}

/** 按孩子查询所有掌握率记录 */
export function useMasteryRecords(childId: string | number | undefined) {
  return useQuery({
    queryKey: masteryRecordKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<MasteryRecord>('/mastery_records', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+知识点查询单条掌握率记录 */
export function useMasteryRecord(
  childId: string | number | undefined,
  nodeId: string | undefined,
) {
  return useQuery({
    queryKey: masteryRecordKeys.byChildNode(childId!, nodeId!),
    queryFn: () =>
      apiClient.getOne<MasteryRecord>('/mastery_records', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'knowledgeNodeId', operator: 'eq', value: nodeId! },
        ],
      }),
    enabled: !!childId && !!nodeId,
  })
}

/** 创建/更新掌握率记录的输入类型 */
export interface UpsertMasteryRecordInput {
  childId: number
  knowledgeNodeId: string
  masteryLevel: number
  lastPracticed?: Date
  nextReviewDate?: Date
  consecutiveCorrect: number
  totalAttempts: number
  totalCorrect: number
}

/**
 * Upsert 掌握率记录
 *
 * 利用 PostgREST 的 `resolution=merge-duplicates` 和 mastery_records 表的
 * UNIQUE(child_id, knowledge_node_id) 约束实现 upsert。
 */
export function useUpsertMasteryRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertMasteryRecordInput) =>
      apiClient.upsert<MasteryRecord>('/mastery_records', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: masteryRecordKeys.byChild(variables.childId),
      })
      queryClient.invalidateQueries({
        queryKey: masteryRecordKeys.byChildNode(variables.childId, variables.knowledgeNodeId),
      })
    },
  })
}

/** 批量更新掌握率（用于会话结束后的批量写入） */
export function useBatchUpsertMasteryRecords() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inputs: UpsertMasteryRecordInput[]) =>
      apiClient.batchUpsert<MasteryRecord>('/mastery_records', inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masteryRecordKeys.all })
    },
  })
}
