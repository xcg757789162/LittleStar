/**
 * 亲子活动 React Query Hooks
 *
 * 从 PostgREST API 查询亲子活动数据（parent_activities 表）。
 * 替代原先从 `english-parent-activities.ts` 硬编码获取的方式。
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { ParentActivity } from '@/services/api/types'

/** 查询所有亲子活动 */
export function useParentActivities() {
  return useQuery({
    queryKey: ['parentActivities'],
    queryFn: () =>
      apiClient.get<ParentActivity>('/parent_activities', {
        filters: [{ column: 'isActive', operator: 'eq', value: true }],
      }),
    staleTime: 24 * 60 * 60 * 1000, // 24 小时缓存（静态数据很少变）
  })
}

/** 根据关联知识点获取推荐的亲子活动 */
export function useActivitiesByNodeIds(nodeIds: string[]) {
  const { data: allActivities } = useParentActivities()

  if (!allActivities || nodeIds.length === 0) return []

  return allActivities.filter((activity) =>
    activity.relatedNodeIds.some((id: string) => nodeIds.includes(id)),
  )
}

/**
 * 获取随机亲子活动（非 hook，直接函数调用）
 * 需要先从 API 获取完整列表，再随机选取
 */
export async function fetchRandomActivity(
  excludeIds?: string[],
): Promise<ParentActivity> {
  const activities = await apiClient.get<ParentActivity>('/parent_activities', {
    filters: [{ column: 'isActive', operator: 'eq', value: true }],
  })

  const available = excludeIds
    ? activities.filter((a) => !excludeIds.includes(a.id))
    : activities

  const pool = available.length > 0 ? available : activities
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 获取推荐的线下延伸建议
 */
export async function fetchOfflineExtensions(nodeIds: string[]): Promise<
  Array<{
    activityId: string
    extension: string
    type: string
  }>
> {
  const activities = await apiClient.get<ParentActivity>('/parent_activities', {
    filters: [{ column: 'isActive', operator: 'eq', value: true }],
  })

  const related = activities.filter((activity) =>
    activity.relatedNodeIds.some((id: string) => nodeIds.includes(id)),
  )

  if (related.length === 0) {
    // 随机推荐 2 个
    const shuffled = [...activities].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2).map((a) => ({
      activityId: a.id,
      extension: a.offlineExtension,
      type: a.type,
    }))
  }

  return related.slice(0, 3).map((a) => ({
    activityId: a.id,
    extension: a.offlineExtension,
    type: a.type,
  }))
}
