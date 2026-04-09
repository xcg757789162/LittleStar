/**
 * useReportData — 学习报告数据 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { ReportData, GradeLevel, Subject } from '@/types/models'

/** React Query 缓存键 */
export const reportDataKeys = {
  all: ['reportData'] as const,
  byChild: (childId: string | number) => ['reportData', { childId }] as const,
  byChildType: (childId: string | number, type: 'weekly' | 'monthly') =>
    ['reportData', { childId, type }] as const,
}

/** 按孩子查询报告数据 */
export function useReportData(childId: string | number | undefined) {
  return useQuery({
    queryKey: reportDataKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<ReportData>('/report_data', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'generatedAt', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+类型查询报告数据 */
export function useReportDataByType(
  childId: string | number | undefined,
  type: 'weekly' | 'monthly' | undefined,
) {
  return useQuery({
    queryKey: reportDataKeys.byChildType(childId!, type!),
    queryFn: () =>
      apiClient.get<ReportData>('/report_data', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'type', operator: 'eq', value: type! },
        ],
        order: [{ column: 'generatedAt', ascending: false }],
      }),
    enabled: !!childId && !!type,
  })
}

/** 创建报告数据输入类型 */
export interface CreateReportDataInput {
  childId: number
  type: 'weekly' | 'monthly'
  gradeLevel: GradeLevel
  subject?: Subject
  periodStart: string
  periodEnd: string
  metrics: Record<string, unknown>
}

/** 创建报告数据 */
export function useCreateReportData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReportDataInput) =>
      apiClient.post<ReportData>('/report_data', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reportDataKeys.byChild(variables.childId),
      })
    },
  })
}
