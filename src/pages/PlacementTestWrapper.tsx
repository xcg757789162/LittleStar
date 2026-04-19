/**
 * 入学测评路由包装组件
 * 从 URL 获取课程 slug（与 api.courses.slug / subject 一致），交给 PlacementTestPage。
 * 完成后按「所有 ready 课程是否都已测评」决定回首页或测评选择页。
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { PlacementTestPage } from './PlacementTestPage'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import type { Subject, PlacementResult, PlacementTest } from '@/types/models'
import type { Course } from '@/types/course'

/** 合法 slug：纯小写字母/数字/连字符，2-40 字 */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,39}$/

export function PlacementTestWrapper() {
  const { courseSlug } = useParams<{ courseSlug: string }>()
  const navigate = useNavigate()

  const validSubject =
    courseSlug && SLUG_REGEX.test(courseSlug) ? (courseSlug as Subject) : null

  const handleComplete = useCallback(async (_result: PlacementResult) => {
    try {
      const child = useChildStore.getState().currentChild
      const childId = child?.id ?? 'default'

      const [tests, courses] = await Promise.all([
        apiClient.get<PlacementTest>('/placement_tests', {
          filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
          select: 'subject',
        }),
        apiClient.get<Course>('/courses', {
          filters: [{ column: 'status', operator: 'eq', value: 'ready' }],
          select: 'slug,status',
        }),
      ])

      const completedSubjects = new Set(tests.map((t) => t.subject))
      const readySlugs = courses.map((c) => c.slug)
      const allDone = readySlugs.length > 0 && readySlugs.every((s) => completedSubjects.has(s))

      if (allDone) {
        navigate('/', { replace: true })
      } else {
        navigate('/placement-test-select', { replace: true })
      }
    } catch {
      navigate('/placement-test-select', { replace: true })
    }
  }, [navigate])

  if (!validSubject) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>无效的测评参数</p>
        <button type="button" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  return (
    <PlacementTestPage
      key={validSubject}
      subject={validSubject}
      onComplete={handleComplete}
      onExit={() => navigate(-1)}
    />
  )
}
