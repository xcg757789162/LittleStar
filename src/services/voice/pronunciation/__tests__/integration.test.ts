/**
 * 集成测试
 *
 * 验证：
 * - voice/index.ts 导出新模块
 * - 纠音完成后自动创建 LearningRecord
 * - 发音评分参与掌握率计算
 */
import { describe, it, expect, vi } from 'vitest'

describe('voice/index.ts 统一导出', () => {
  it('应导出发音评估核心类型', async () => {
    const voiceModule = await import('../../index')
    // Provider 工厂
    expect(voiceModule.createAssessmentProvider).toBeDefined()
    // 编排器
    expect(voiceModule.PronunciationCoordinator).toBeDefined()
    // 评分
    expect(voiceModule.applyChildAdjustments).toBeDefined()
    expect(voiceModule.scoreToStars).toBeDefined()
    // 音节
    expect(voiceModule.splitSyllables).toBeDefined()
    // 反馈
    expect(voiceModule.selectFeedback).toBeDefined()
  })

  it('应导出具体 Provider', async () => {
    const voiceModule = await import('../../index')
    expect(voiceModule.IflytekISEProvider).toBeDefined()
    expect(voiceModule.TextMatchFallbackProvider).toBeDefined()
  })
})

describe('createPronunciationRecord 集成', () => {
  it('应创建包含发音评分的学习记录', async () => {
    const { createPronunciationRecord } = await import('../../index')
    expect(createPronunciationRecord).toBeDefined()

    const record = createPronunciationRecord({
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      word: 'apple',
      pronunciationScore: 85,
      pronunciationStars: 4,
      timeSpent: 5000,
      attemptCount: 2,
    })

    expect(record.childId).toBe('child-1')
    expect(record.pronunciationScore).toBe(85)
    expect(record.pronunciationStars).toBe(4)
    expect(record.isCorrect).toBe(true) // ≥3 星即正确
    expect(record.answer).toBe('apple')
    expect(record.timeSpent).toBe(5000)
    expect(record.attemptCount).toBe(2)
    expect(record.timestamp).toBeInstanceOf(Date)
  })

  it('低于 3 星应标记为不正确', async () => {
    const { createPronunciationRecord } = await import('../../index')
    const record = createPronunciationRecord({
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      word: 'elephant',
      pronunciationScore: 40,
      pronunciationStars: 1,
      timeSpent: 8000,
      attemptCount: 3,
    })

    expect(record.isCorrect).toBe(false) // 1 星不算通过
    expect(record.pronunciationStars).toBe(1)
  })
})
