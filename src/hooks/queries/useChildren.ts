/**
 * useChildren — 孩子数据 React Query Hooks
 *
 * 提供孩子列表查询、创建、更新、删除的 hooks
 * 通过 PostgREST API + RLS 自动隔离当前用户的数据
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { Child, ChildSettings } from '@/types/models'

/** React Query 缓存键 */
export const childrenKeys = {
  all: ['children'] as const,
  detail: (id: string | number) => ['children', id] as const,
}

/** 查询孩子列表 */
export function useChildren() {
  return useQuery({
    queryKey: childrenKeys.all,
    queryFn: () =>
      apiClient.get<Child>('/children', {
        order: [{ column: 'createdAt', ascending: true }],
      }),
  })
}

/** 查询单个孩子 */
export function useChild(id: string | number | undefined) {
  return useQuery({
    queryKey: childrenKeys.detail(id!),
    queryFn: () =>
      apiClient.getOne<Child>('/children', {
        filters: [{ column: 'id', operator: 'eq', value: Number(id) }],
      }),
    enabled: !!id,
  })
}

/** 创建孩子输入类型 */
export interface CreateChildInput {
  name: string
  avatar: string
  age: number
  gradeLevel: string
  settings: ChildSettings
}

/** 创建孩子 */
export function useCreateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChildInput) =>
      apiClient.post<Child>('/children', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all })
    },
  })
}

/** 更新孩子输入类型 */
export interface UpdateChildInput {
  id: number
  updates: Partial<Omit<Child, 'id' | 'createdAt'>>
}

/** 更新孩子 */
export function useUpdateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: UpdateChildInput) =>
      apiClient.patch<Child>('/children', updates, {
        filters: [{ column: 'id', operator: 'eq', value: id }],
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all })
      queryClient.invalidateQueries({ queryKey: childrenKeys.detail(variables.id) })
    },
  })
}

/** 更新孩子设置（便捷方法） */
export function useUpdateChildSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, settings }: { id: number; settings: Partial<ChildSettings> }) => {
      // 先读取当前设置，合并后更新
      const current = await apiClient.getOne<Child>('/children', {
        filters: [{ column: 'id', operator: 'eq', value: id }],
      })
      if (!current) throw new Error('孩子不存在')

      const mergedSettings = { ...current.settings, ...settings }
      return apiClient.patch<Child>('/children', { settings: mergedSettings }, {
        filters: [{ column: 'id', operator: 'eq', value: id }],
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all })
      queryClient.invalidateQueries({ queryKey: childrenKeys.detail(variables.id) })
    },
  })
}

/** 删除孩子 */
export function useDeleteChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete('/children', {
        filters: [{ column: 'id', operator: 'eq', value: id }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all })
    },
  })
}
