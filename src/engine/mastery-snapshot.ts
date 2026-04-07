/**
 * 每日掌握度快照
 * 学习会话结束时保存当天的掌握度快照
 */

import type { MasterySnapshot, Subject, GradeLevel } from '@/types/models'

/** 快照生成输入 */
export interface SnapshotInput {
  childId: string
  subject: Subject
  gradeLevel: GradeLevel
  /** 各知识点掌握度 */
  nodesMastery: Record<string, number>
}

/** 已保存快照的日期缓存 (childId-subject-date -> true) */
const savedToday = new Set<string>()

/**
 * 生成快照 key（用于判重：每天每科只保存一次）
 */
function snapshotKey(childId: string, subject: Subject, date: string): string {
  return `${childId}-${subject}-${date}`
}

/**
 * 获取当天日期字符串 YYYY-MM-DD
 */
function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 生成掌握度快照（如果当天已保存则跳过）
 * @returns 快照对象，如果当天已保存则返回 null
 */
export function generateDailySnapshot(input: SnapshotInput): MasterySnapshot | null {
  const { childId, subject, gradeLevel, nodesMastery } = input
  const date = todayString()
  const key = snapshotKey(childId, subject, date)

  // 当天已保存，跳过
  if (savedToday.has(key)) {
    return null
  }

  const entries = Object.values(nodesMastery)
  const averageMastery = entries.length > 0
    ? Math.round(entries.reduce((s, v) => s + v, 0) / entries.length)
    : 0

  const snapshot: MasterySnapshot = {
    childId,
    date,
    subject,
    gradeLevel,
    nodesMastery: { ...nodesMastery },
    averageMastery,
  }

  savedToday.add(key)
  return snapshot
}

/**
 * 重置当天保存缓存（用于测试或日期切换）
 */
export function resetSnapshotCache(): void {
  savedToday.clear()
}
