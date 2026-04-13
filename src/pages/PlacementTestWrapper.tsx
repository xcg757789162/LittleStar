/**
 * 入学测评路由包装组件
 * 从 URL 参数获取 subject 和 grade，传递给 PlacementTestPage
 * 完成后自动导航到下一个未完成的科目
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { PlacementTestPage } from './PlacementTestPage'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import type { GradeLevel, Subject, PlacementResult, PlacementTest } from '@/types/models'

const VALID_SUBJECTS: Subject[] = ['math', 'chinese', 'english']
const VALID_GRADES: GradeLevel[] = [
  'middle-kindergarten',
  'senior-kindergarten',
  'grade-1',
  'grade-2',
  'grade-3',
  'grade-4',
  'grade-5',
  'grade-6',
]

/** 三科顺序 */
const SUBJECT_ORDER: Subject[] = ['math', 'chinese', 'english']

export function PlacementTestWrapper() {
  const { subject, grade } = useParams<{ subject: string; grade: string }>()
  const navigate = useNavigate()

  // 验证参数
  const validSubject = VALID_SUBJECTS.includes(subject as Subject)
    ? (subject as Subject)
    : null
  const validGrade = VALID_GRADES.includes(grade as GradeLevel)
    ? (grade as GradeLevel)
    : null

  /** 完成当前科目测评后，回到科目选择页让用户自由选择下一科 */
  const handleComplete = useCallback(async (_result: PlacementResult) => {
    try {
      const child = useChildStore.getState().currentChild
      const childId = child?.id ?? 'default'

      // 只查 subject 列，避免拉取庞大的 questions/result JSON
      const tests = await apiClient.get<PlacementTest>('/placement_tests', {
        filters: [{ column: 'childId', operator: 'eq', value: Number(childId) }],
        select: 'subject',
      })
      const completedSubjects = new Set(tests.map((t) => t.subject))

      // 检查是否三科都完成了
      const allDone = SUBJECT_ORDER.every((s) => completedSubjects.has(s))

      if (allDone) {
        // 全部完成 → 回首页
        navigate('/', { replace: true })
      } else {
        // 还有未完成的科目 → 回到科目选择页让用户自由选择
        navigate('/placement-test-select', { replace: true })
      }
    } catch {
      navigate('/placement-test-select', { replace: true })
    }
  }, [navigate])

  if (!validSubject || !validGrade) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>无效的测评参数</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  return (
    <PlacementTestPage
      key={`${validSubject}-${validGrade}`}
      subject={validSubject}
      gradeLevel={validGrade}
      onComplete={handleComplete}
      onExit={() => navigate(-1)}
    />
  )
}
