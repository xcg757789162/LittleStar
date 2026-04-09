/**
 * useMasterySnapshots — 掌握度每日快照 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { MasterySnapshot, Subject, GradeLevel } from '@/types/models'

/** React Query 缓存键 */
export const masterySnapshotKeys = {
  all: ['masterySnapshots'] as const,
  byChild: (childId: string | number) => ['masterySnapshots', { childId }] as const,
  byChildSubjectGrade: (childId: string | number, subject: Subject, gradeLevel: GradeLevel) =>
    ['masterySnapshots', { childId, subject, gradeLevel }] as const,
}

/** 按孩子查询快照 */
export function useMasterySnapshots(childId: string | number | undefined) {
  return useQuery({
    queryKey: masterySnapshotKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<MasterySnapshot>('/mastery_snapshots', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'date', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+科目+年级查询快照 */
export function useMasterySnapshotsBySubjectGrade(
  childId: string | number | undefined,
  subject: Subject | undefined,
  gradeLevel: GradeLevel | undefined,
) {
  return useQuery({
    queryKey: masterySnapshotKeys.byChildSubjectGrade(childId!, subject!, gradeLevel!),
    queryFn: () =>
      apiClient.get<MasterySnapshot>('/mastery_snapshots', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'subject', operator: 'eq', value: subject! },
          { column: 'gradeLevel', operator: 'eq', value: gradeLevel! },
        ],
        order: [{ column: 'date', ascending: false }],
      }),
    enabled: !!childId && !!subject && !!gradeLevel,
  })
}

/** 创建快照输入类型 */
export interface CreateMasterySnapshotInput {
  childId: number
  date: string
  subject: Subject
  gradeLevel: GradeLevel
  nodesMastery: Record<string, number>
  averageMastery: number
}

/** 创建快照 */
export function useCreateMasterySnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMasterySnapshotInput) =>
      apiClient.post<MasterySnapshot>('/mastery_snapshots', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: masterySnapshotKeys.byChild(variables.childId),
      })
    },
  })
}
