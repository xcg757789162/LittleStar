/**
 * usePlacementTests — 入学测评记录 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { PlacementTest, Subject, GradeLevel } from '@/types/models'

/** React Query 缓存键 */
export const placementTestKeys = {
  all: ['placementTests'] as const,
  byChild: (childId: string | number) => ['placementTests', { childId }] as const,
  byChildSubjectGrade: (childId: string | number, subject: Subject, gradeLevel: GradeLevel) =>
    ['placementTests', { childId, subject, gradeLevel }] as const,
}

/** 按孩子查询测评记录 */
export function usePlacementTests(childId: string | number | undefined) {
  return useQuery({
    queryKey: placementTestKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<PlacementTest>('/placement_tests', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'startedAt', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+科目+年级查询测评记录 */
export function usePlacementTestBySubjectGrade(
  childId: string | number | undefined,
  subject: Subject | undefined,
  gradeLevel: GradeLevel | undefined,
) {
  return useQuery({
    queryKey: placementTestKeys.byChildSubjectGrade(childId!, subject!, gradeLevel!),
    queryFn: () =>
      apiClient.get<PlacementTest>('/placement_tests', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'subject', operator: 'eq', value: subject! },
          { column: 'gradeLevel', operator: 'eq', value: gradeLevel! },
        ],
        order: [{ column: 'startedAt', ascending: false }],
        limit: 1,
      }),
    enabled: !!childId && !!subject && !!gradeLevel,
  })
}

/** 创建测评记录输入类型 */
export interface CreatePlacementTestInput {
  childId: number
  subject: Subject
  gradeLevel: GradeLevel
  questions: Array<{
    knowledgeNodeId: string
    questionId: string
    answer: unknown
    isCorrect: boolean
    timeSpent: number
  }>
  startedAt: Date
  completedAt?: Date
  result?: unknown
}

/** 创建测评记录 */
export function useCreatePlacementTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlacementTestInput) =>
      apiClient.post<PlacementTest>('/placement_tests', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: placementTestKeys.byChild(variables.childId),
      })
    },
  })
}

/**
 * 重置评测 — 删除该孩子的评测记录、掌握率记录、课堂缓存。
 * 可指定 subject 仅重置单个科目，不传则重置全部。
 */
export function useResetPlacement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, subject }: { childId: number; subject?: Subject }) => {
      const childFilter = { column: 'childId', operator: 'eq' as const, value: childId }

      if (subject) {
        const subjectFilter = { column: 'subject', operator: 'eq' as const, value: subject }
        const nodePrefix = { column: 'knowledgeNodeId', operator: 'like' as const, value: `${subject}%` }
        await Promise.all([
          apiClient.delete('/placement_tests', { filters: [childFilter, subjectFilter] }),
          apiClient.delete('/mastery_records', { filters: [childFilter, nodePrefix] }),
          apiClient.delete('/classroom_cache', { filters: [childFilter, nodePrefix] }),
        ])
      } else {
        await Promise.all([
          apiClient.delete('/placement_tests', { filters: [childFilter] }),
          apiClient.delete('/mastery_records', { filters: [childFilter] }),
          apiClient.delete('/classroom_cache', { filters: [childFilter] }),
        ])
      }

      return { childId, subject }
    },
    onSuccess: ({ childId }) => {
      queryClient.invalidateQueries({ queryKey: placementTestKeys.byChild(childId) })
      queryClient.invalidateQueries({ queryKey: ['masteryRecords', { childId }] })
      queryClient.invalidateQueries({ queryKey: ['knowledgeNodes'] })
    },
  })
}
