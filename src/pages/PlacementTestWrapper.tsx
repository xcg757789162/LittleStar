/**
 * 入学测评路由包装组件
 * 从 URL 参数获取 subject 和 grade，传递给 PlacementTestPage
 */

import { useParams, useNavigate } from 'react-router-dom'
import { PlacementTestPage } from './PlacementTestPage'
import type { GradeLevel, Subject } from '@/types/models'

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
      subject={validSubject}
      gradeLevel={validGrade}
      onComplete={() => navigate('/')}
      onExit={() => navigate(-1)}
    />
  )
}
