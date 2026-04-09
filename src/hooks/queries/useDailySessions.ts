/**
 * useDailySessions — 每日学习会话 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { DailySession } from '@/types/models'

/** React Query 缓存键 */
export const dailySessionKeys = {
  all: ['dailySessions'] as const,
  byChild: (childId: string | number) => ['dailySessions', { childId }] as const,
  byChildDate: (childId: string | number, date: string) =>
    ['dailySessions', { childId, date }] as const,
}

/** 按孩子查询每日会话 */
export function useDailySessions(childId: string | number | undefined) {
  return useQuery({
    queryKey: dailySessionKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<DailySession>('/daily_sessions', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'date', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+日期查询会话 */
export function useDailySessionByDate(
  childId: string | number | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: dailySessionKeys.byChildDate(childId!, date!),
    queryFn: () =>
      apiClient.get<DailySession>('/daily_sessions', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'date', operator: 'eq', value: date! },
        ],
      }),
    enabled: !!childId && !!date,
  })
}

/** 创建每日会话输入类型 */
export interface CreateDailySessionInput {
  childId: number
  date: string
  startTime: Date
  endTime?: Date
  questionsCompleted: number
  correctCount: number
  subjects: string[]
  streak: number
}

/** 创建每日会话 */
export function useCreateDailySession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDailySessionInput) =>
      apiClient.post<DailySession>('/daily_sessions', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dailySessionKeys.byChild(variables.childId),
      })
    },
  })
}
