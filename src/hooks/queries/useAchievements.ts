/**
 * useAchievements — 成就 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { Achievement, AchievementType } from '@/types/models'

/** React Query 缓存键 */
export const achievementKeys = {
  all: ['achievements'] as const,
  byChild: (childId: string | number) => ['achievements', { childId }] as const,
  byChildType: (childId: string | number, type: AchievementType) =>
    ['achievements', { childId, type }] as const,
}

/** 按孩子查询成就 */
export function useAchievements(childId: string | number | undefined) {
  return useQuery({
    queryKey: achievementKeys.byChild(childId!),
    queryFn: () =>
      apiClient.get<Achievement>('/achievements', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        order: [{ column: 'earnedAt', ascending: false }],
      }),
    enabled: !!childId,
  })
}

/** 按孩子+类型查询成就 */
export function useAchievementsByType(
  childId: string | number | undefined,
  type: AchievementType | undefined,
) {
  return useQuery({
    queryKey: achievementKeys.byChildType(childId!, type!),
    queryFn: () =>
      apiClient.get<Achievement>('/achievements', {
        filters: [
          { column: 'childId', operator: 'eq', value: Number(childId) },
          { column: 'type', operator: 'eq', value: type! },
        ],
      }),
    enabled: !!childId && !!type,
  })
}

/** 创建成就输入类型 */
export interface CreateAchievementInput {
  childId: number
  type: AchievementType
  name: string
  description: string
  metadata?: Record<string, unknown>
}

/** 创建成就 */
export function useCreateAchievement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAchievementInput) =>
      apiClient.post<Achievement>('/achievements', input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: achievementKeys.byChild(variables.childId),
      })
    },
  })
}
