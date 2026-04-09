/**
 * 课程大纲 React Query Hooks
 *
 * 从 PostgREST API 查询课程大纲数据。
 * 利用 PostgREST 嵌套 select 一次获取 curricula → modules → nodes 三级结构。
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { Curriculum } from '@/services/api/types'

/** 查询指定年级和科目的课程大纲 */
export function useCurriculum(gradeLevel: string, subject: string) {
  return useQuery({
    queryKey: ['curriculum', gradeLevel, subject],
    queryFn: () =>
      apiClient.getOne<Curriculum>('/curricula', {
        filters: [
          { column: 'gradeLevel', operator: 'eq', value: gradeLevel },
          { column: 'subject', operator: 'eq', value: subject },
          { column: 'isActive', operator: 'eq', value: true },
        ],
        select: '*, curriculum_modules(*, curriculum_nodes(*))',
      }),
    staleTime: 24 * 60 * 60 * 1000, // 24 小时缓存（大纲数据基本不变）
    enabled: !!gradeLevel && !!subject,
  })
}

/** 查询所有活跃的课程大纲列表（不含嵌套数据） */
export function useCurriculaList() {
  return useQuery({
    queryKey: ['curricula', 'list'],
    queryFn: () =>
      apiClient.get<Curriculum>('/curricula', {
        filters: [{ column: 'isActive', operator: 'eq', value: true }],
        order: [{ column: 'gradeLevel' }, { column: 'subject' }],
      }),
    staleTime: 24 * 60 * 60 * 1000,
  })
}
