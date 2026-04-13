import { describe, expect, it } from 'vitest'
import { normalizeTaskProgress } from '../task-progress'

describe('normalizeTaskProgress', () => {
  it('rounds floating pipeline progress into database-safe integers', () => {
    expect(normalizeTaskProgress(70.66666666666667)).toBe(71)
    expect(normalizeTaskProgress(71.33333333333333)).toBe(71)
    expect(normalizeTaskProgress(53.333333333333336)).toBe(53)
  })

  it('clamps invalid and out-of-range values into the valid progress range', () => {
    expect(normalizeTaskProgress(Number.NaN)).toBe(0)
    expect(normalizeTaskProgress(-5)).toBe(0)
    expect(normalizeTaskProgress(100.9)).toBe(100)
  })
})
