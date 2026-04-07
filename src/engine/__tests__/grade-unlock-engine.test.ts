import { describe, it, expect } from 'vitest'
import { GradeUnlockEngine } from '../grade-unlock-engine'

describe('GradeUnlockEngine', () => {
  const engine = new GradeUnlockEngine()

  describe('checkUnlockEligibility', () => {
    it('当掌握度达到阈值且达到比例要求时应返回 eligible', () => {
      const result = engine.checkUnlockEligibility({
        currentGrade: 'middle-kindergarten',
        subject: 'math',
        masteryMap: new Map([
          ['math-kg-num-1-5', 90],
          ['math-kg-num-6-10', 85],
          ['math-kg-counting', 88],
          ['math-kg-compare', 82],
          ['math-kg-add-within-5', 80],
          ['math-kg-add-within-10', 81],
          ['math-kg-shapes', 85],
        ]),
        totalNodes: 7,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(result.eligible).toBe(true)
      expect(result.nextGrade).toBe('senior-kindergarten')
      expect(result.masteredCount).toBeGreaterThanOrEqual(6) // 7 * 0.8 = 5.6, ceil = 6
    })

    it('当掌握度未达到阈值时应返回 not eligible', () => {
      const result = engine.checkUnlockEligibility({
        currentGrade: 'middle-kindergarten',
        subject: 'math',
        masteryMap: new Map([
          ['math-kg-num-1-5', 90],
          ['math-kg-num-6-10', 50],
          ['math-kg-counting', 40],
          ['math-kg-compare', 30],
          ['math-kg-add-within-5', 20],
          ['math-kg-add-within-10', 10],
          ['math-kg-shapes', 85],
        ]),
        totalNodes: 7,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(result.eligible).toBe(false)
      expect(result.nextGrade).toBe('senior-kindergarten')
    })

    it('当已是最高年级时应返回 not eligible 且 nextGrade 为 null', () => {
      const result = engine.checkUnlockEligibility({
        currentGrade: 'grade-6',
        subject: 'math',
        masteryMap: new Map([['math-g6-all', 100]]),
        totalNodes: 1,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(result.eligible).toBe(false)
      expect(result.nextGrade).toBeNull()
    })

    it('当知识点为空时应返回 not eligible', () => {
      const result = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap: new Map(),
        totalNodes: 0,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(result.eligible).toBe(false)
    })
  })

  describe('getUnlockProgress', () => {
    it('应返回正确的解锁进度百分比', () => {
      const progress = engine.getUnlockProgress({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap: new Map([
          ['node-1', 90],
          ['node-2', 85],
          ['node-3', 50],
          ['node-4', 30],
        ]),
        totalNodes: 4,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      // 2 out of 4 mastered (90, 85 >= 80), need ceil(4*0.8) = 4 mastered
      // progress = 2/4 = 0.5 = 50%
      expect(progress.masteredCount).toBe(2)
      expect(progress.requiredCount).toBe(4) // ceil(4 * 0.8)
      expect(progress.percentage).toBe(50)
    })

    it('进度不应超过 100%', () => {
      const progress = engine.getUnlockProgress({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap: new Map([
          ['node-1', 90],
          ['node-2', 95],
        ]),
        totalNodes: 2,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(progress.percentage).toBeLessThanOrEqual(100)
    })
  })

  describe('getCurrentGrade', () => {
    it('应根据已解锁记录返回最高年级', () => {
      const grade = engine.getCurrentGrade([
        { subject: 'math', gradeLevel: 'middle-kindergarten', unlockedAt: new Date('2026-01-01') },
        { subject: 'math', gradeLevel: 'senior-kindergarten', unlockedAt: new Date('2026-02-01') },
        { subject: 'math', gradeLevel: 'grade-1', unlockedAt: new Date('2026-03-01') },
      ])

      expect(grade).toBe('grade-1')
    })

    it('没有解锁记录时应返回 null', () => {
      const grade = engine.getCurrentGrade([])
      expect(grade).toBeNull()
    })

    it('单条记录应直接返回该年级', () => {
      const grade = engine.getCurrentGrade([
        { subject: 'math', gradeLevel: 'grade-3', unlockedAt: new Date('2026-01-01') },
      ])
      expect(grade).toBe('grade-3')
    })
  })

  describe('createUnlockRecord', () => {
    it('应创建正确的解锁记录', () => {
      const record = engine.createUnlockRecord({
        childId: 'child-1',
        subject: 'math',
        gradeLevel: 'grade-2',
        averageMastery: 85,
      })

      expect(record.childId).toBe('child-1')
      expect(record.subject).toBe('math')
      expect(record.gradeLevel).toBe('grade-2')
      expect(record.masteryAtUnlock).toBe(85)
      expect(record.unlockedAt).toBeInstanceOf(Date)
    })

    it('应支持可选的 placementTestId', () => {
      const record = engine.createUnlockRecord({
        childId: 'child-1',
        subject: 'english',
        gradeLevel: 'grade-1',
        averageMastery: 90,
        placementTestId: 'test-123',
      })

      expect(record.placementTestId).toBe('test-123')
    })
  })

  describe('edge cases', () => {
    it('不同科目的进度应独立计算', () => {
      const mathResult = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap: new Map([['m1', 90], ['m2', 85], ['m3', 80], ['m4', 82]]),
        totalNodes: 4,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      const cnResult = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'chinese',
        masteryMap: new Map([['c1', 50], ['c2', 40]]),
        totalNodes: 2,
        config: { masteryThreshold: 80, minMasteredRatio: 0.8 },
      })

      expect(mathResult.eligible).toBe(true)
      expect(cnResult.eligible).toBe(false)
    })

    it('使用默认配置值', () => {
      const result = engine.checkUnlockEligibility({
        currentGrade: 'grade-1',
        subject: 'math',
        masteryMap: new Map([
          ['m1', 80], ['m2', 80], ['m3', 80], ['m4', 80],
          ['m5', 80], ['m6', 80], ['m7', 80], ['m8', 80],
        ]),
        totalNodes: 8,
      })

      // 默认 masteryThreshold=80, minMasteredRatio=0.8
      // 8个节点全部>=80, need ceil(8*0.8)=7, 实际8>=7 → eligible
      expect(result.eligible).toBe(true)
    })
  })
})
