/**
 * useGradeUnlocks — 年级解锁记录 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { GradeUnlock, Subject } from '@/types/models'

/** React Query 缓存键 */
export const gradeUnlockKeys = {
  all: ['gradeUnlocks'] as const,
  byChild: (childId: string | number) => ['gradeUnlocks', { childId }] as const,
  byChildSubject: (childId: string | number, subject: Subject) =>
    ['gradeUnlocks', { childId, subject }] as const,
}

/** 按孩子查询解锁记录 */
export function useGradeUnlocks(childId: string | number | undefined) {
  return useQuery({
    queryKey: gradeUnlockKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<GradeUnlock>('/grade_unlocks', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'unlockedAt', ascending: true }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+科目查询解锁记录 */
export function useGradeUnlocksBySubject(
  childId: string | number | undefined,
  subject: Subject | undefined,
) {
  return useQuery({
    queryKey: gradeUnlockKeys.byChildSubject(childId!, subject!),
    queryFn: () =>
      apiClient.get<GradeUnlock>('/grade_unlocks', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'subject', operator: 'eq', value: subject! },
        ],
        order: [{ column: 'unlockedAt', ascending: true }],
      }),
    enabled: !!childId && !!subject,
  })
}

/** 创建解锁记录输入类型 */
export interface CreateGradeUnlockInput {
  childId: number
  subject: Subject
  gradeLevel: string
  masteryAtUnlock: number
  placementTestId?: number
}

/** 创建解锁记录 */
export function useCreateGradeUnlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGradeUnlockInput) =>
      apiClient.post<GradeUnlock>('/grade_unlocks', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: gradeUnlockKeys.byChild(variables.childId),
      })
    },
  })
}
