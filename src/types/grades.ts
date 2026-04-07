/**
 * 年级工具函数模块
 * 提供年级顺序、标签、导航等工具函数
 */

import type { GradeLevel } from './models'

/** 年级顺序（从低到高） */
export const GRADE_ORDER: GradeLevel[] = [
  'middle-kindergarten',
  'senior-kindergarten',
  'grade-1',
  'grade-2',
  'grade-3',
  'grade-4',
  'grade-5',
  'grade-6',
]

/** 年级中文标签 */
export const GRADE_LABELS: Record<GradeLevel, string> = {
  'middle-kindergarten': '中班',
  'senior-kindergarten': '大班',
  'grade-1': '一年级',
  'grade-2': '二年级',
  'grade-3': '三年级',
  'grade-4': '四年级',
  'grade-5': '五年级',
  'grade-6': '六年级',
}

/**
 * 获取下一个年级
 * @returns 下一个年级，如果已是最高年级则返回 null
 */
export function getNextGrade(current: GradeLevel): GradeLevel | null {
  const index = GRADE_ORDER.indexOf(current)
  if (index === -1 || index === GRADE_ORDER.length - 1) return null
  return GRADE_ORDER[index + 1]
}

/**
 * 获取年级在顺序中的索引
 * @returns 年级索引（0-based），未找到返回 -1
 */
export function getGradeIndex(grade: GradeLevel): number {
  return GRADE_ORDER.indexOf(grade)
}

/**
 * 判断年级 a 是否在年级 b 之前（更低）
 */
export function isGradeBefore(a: GradeLevel, b: GradeLevel): boolean {
  return getGradeIndex(a) < getGradeIndex(b)
}

/**
 * 获取上一个年级
 * @returns 上一个年级，如果已是最低年级则返回 null
 */
export function getPreviousGrade(current: GradeLevel): GradeLevel | null {
  const index = GRADE_ORDER.indexOf(current)
  if (index <= 0) return null
  return GRADE_ORDER[index - 1]
}
