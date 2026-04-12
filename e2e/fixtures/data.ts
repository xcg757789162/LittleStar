import type { E2EEnv } from '../config/env'
import type { GradeLevel, Subject } from '../../src/types/models'

export interface E2ECredentials {
  username: string
  password: string
  nickname: string
}

export interface E2EChildSeed {
  name: string
  avatar: string
  age: number
  gradeLevel: GradeLevel
}

export interface PreparedLessonPickerSeed {
  token: string
  userId: number
  childId: number
  childName: string
  gradeLevel: GradeLevel
  subject: Subject
  subjectLabel: string
  credentials: E2ECredentials
}

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export const LESSON_PICKER_SUBJECT_CANDIDATES: Subject[] = ['math', 'chinese', 'english']

export const DEFAULT_CHILD_SEED: E2EChildSeed = {
  name: '课堂体验生',
  avatar: '⭐',
  age: 5,
  gradeLevel: 'middle-kindergarten',
}

export function buildPickerCredentials(env: E2EEnv): E2ECredentials {
  return {
    username: env.pickerUser.username,
    password: env.pickerUser.password,
    nickname: 'E2E课堂家长',
  }
}
