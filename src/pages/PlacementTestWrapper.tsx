/**
 * 入学测评路由包装组件
 * 从 URL 参数获取 subject 和 grade，传递给 PlacementTestPage
 * 完成任意单科评测后返回首页（用户可在首页继续评测其他科目）
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { PlacementTestPage } from './PlacementTestPage'
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

  /** 完成当前科目测评后 → 直接回首页（首页展示各科评测状态，用户可自行选择继续评测其他科目） */
  const handleComplete = useCallback(async (_result: PlacementResult) => {
    navigate('/', { replace: true })
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
