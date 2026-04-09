/**
 * useClassroomHistory — 课堂历史 React Query Hooks
 *
 * - 列表查询使用 classroom_history_list 视图（不含 classroomData）
 * - 详情查询使用 classroom_history + classroom_snapshots 关联
 * - 创建同时写入 classroom_history + classroom_snapshots
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

/** 课堂历史列表项（不含 classroomData） */
export interface ClassroomHistoryItem {
  id: number
  childId: number
  knowledgeNodeId: string
  knowledgeNodeName: string
  subject: string
  classroomId: string
  classroomTitle: string
  date: string
  completedAt: string
  round: number
  isReview: boolean
  questionsCompleted: number
  correctCount: number
  accuracy: number
}

/** 课堂历史详情（含 snapshot） */
export interface ClassroomHistoryDetail extends ClassroomHistoryItem {
  classroomSnapshots: Array<{
    id: number
    historyId: number
    classroomData: unknown
  }>
}

/** React Query 缓存键 */
export const classroomHistoryKeys = {
  all: ['classroomHistory'] as const,
  byChild: (childId: string | number) => ['classroomHistory', { childId }] as const,
  detail: (id: number) => ['classroomHistory', 'detail', id] as const,
}

/** 查询课堂历史列表（不含 classroomData，使用视图） */
export function useClassroomHistoryList(childId: string | number | undefined) {
  return useQuery({
    queryKey: classroomHistoryKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<ClassroomHistoryItem>('/classroom_history_list', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'completedAt', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 查询课堂历史详情（含 classroomData snapshot） */
export function useClassroomHistoryDetail(historyId: number | undefined) {
  return useQuery({
    queryKey: classroomHistoryKeys.detail(historyId!),
    queryFn: () =>
      apiClient.getOne<ClassroomHistoryDetail>('/classroom_history', {
        select: '*,classroom_snapshots(id,history_id,classroom_data)',
        filters: [{ column: 'id', operator: 'eq', value: historyId! }],
      }),
    enabled: !!historyId,
  })
}

/** 创建课堂历史记录的输入 */
export interface CreateClassroomHistoryInput {
  childId: number
  knowledgeNodeId: string
  knowledgeNodeName: string
  subject: string
  classroomId: string
  classroomTitle: string
  date: string
  round: number
  isReview: boolean
  questionsCompleted: number
  correctCount: number
  accuracy: number
  /** 课堂完整数据（存入 classroom_snapshots） */
  classroomData?: unknown
}

/** 创建课堂历史记录（主表 + 快照表） */
export function useCreateClassroomHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateClassroomHistoryInput) => {
      const { classroomData, ...historyData } = input

      // 1. 创建主记录
      const history = await apiClient.post<ClassroomHistoryItem>(
        '/classroom_history',
        historyData,
      )

      // 2. 如果有 classroomData，创建快照
      if (classroomData && history.id) {
        await apiClient.post('/classroom_snapshots', {
          historyId: history.id,
          classroomData,
        })
      }

      return history
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: classroomHistoryKeys.byChild(variables.childId),
      })
    },
  })
}
