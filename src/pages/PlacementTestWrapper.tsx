/**
 * 入学测评路由包装组件
 * 从 URL 参数获取 subject 和 grade，传递给 PlacementTestPage
 * 完成后自动导航到下一个未完成的科目
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { PlacementTestPage } from './PlacementTestPage'
import { db } from '@/db/database'
import { useChildStore } from '@/stores/childStore'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'

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

  /** 完成当前科目测评后，检查下一个未完成的科目 */
  const handleComplete = useCallback(async (_result: PlacementResult) => {
    try {
      const child = useChildStore.getState().currentChild
      const childId = child?.id ?? 'default'
      const gradeLevel = child?.gradeLevel ?? 'middle-kindergarten'

      // 查询已完成的科目
      const tests = await db.placementTests
        .where('childId')
        .equals(childId)
        .toArray()
      const completedSubjects = new Set(tests.map((t) => t.subject))

      // 找下一个未完成的科目
      const nextSubject = SUBJECT_ORDER.find((s) => !completedSubjects.has(s))

      if (nextSubject) {
        // 还有未完成的科目 → 导航到下一科
        navigate(`/placement-test/${nextSubject}/${gradeLevel}`, { replace: true })
      } else {
        // 全部完成 → 回首页
        navigate('/', { replace: true })
      }
    } catch {
      navigate('/')
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
