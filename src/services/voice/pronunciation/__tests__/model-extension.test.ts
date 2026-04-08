/**
 * 数据模型扩展测试
 * TDD: 验证 LearningRecord 新增发音评分字段，uiStore 新增发音练习状态
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { LearningRecord } from '@/types/models'
import { useUIStore } from '@/stores/uiStore'

describe('LearningRecord pronunciation extension', () => {
  it('should support optional pronunciationScore field', () => {
    const record: LearningRecord = {
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      answer: 'apple',
      isCorrect: true,
      timeSpent: 3000,
      attemptCount: 1,
      timestamp: new Date(),
      pronunciationScore: 85,
    }
    expect(record.pronunciationScore).toBe(85)
  })

  it('should support optional pronunciationStars field', () => {
    const record: LearningRecord = {
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      answer: 'apple',
      isCorrect: true,
      timeSpent: 3000,
      attemptCount: 1,
      timestamp: new Date(),
      pronunciationStars: 4,
    }
    expect(record.pronunciationStars).toBe(4)
  })

  it('should work without pronunciation fields (backward compatible)', () => {
    const record: LearningRecord = {
      childId: 'child-1',
      knowledgeNodeId: 'node-1',
      questionId: 'q-1',
      answer: 'apple',
      isCorrect: true,
      timeSpent: 3000,
      attemptCount: 1,
      timestamp: new Date(),
    }
    expect(record.pronunciationScore).toBeUndefined()
    expect(record.pronunciationStars).toBeUndefined()
  })
})

describe('uiStore pronunciation state', () => {
  beforeEach(() => {
    useUIStore.getState().reset()
  })

  it('should have pronunciationPhase state', () => {
    const state = useUIStore.getState()
    expect(state.pronunciationPhase).toBe('idle')
  })

  it('should have isRecordingPronunciation state', () => {
    const state = useUIStore.getState()
    expect(state.isRecordingPronunciation).toBe(false)
  })

  it('should set pronunciationPhase', () => {
    useUIStore.getState().setPronunciationPhase('recording')
    expect(useUIStore.getState().pronunciationPhase).toBe('recording')
  })

  it('should set isRecordingPronunciation', () => {
    useUIStore.getState().setIsRecordingPronunciation(true)
    expect(useUIStore.getState().isRecordingPronunciation).toBe(true)
  })

  it('should support all pronunciation phases', () => {
    const phases = ['idle', 'listening', 'recording', 'assessing', 'feedback', 'drilling'] as const
    phases.forEach((phase) => {
      useUIStore.getState().setPronunciationPhase(phase)
      expect(useUIStore.getState().pronunciationPhase).toBe(phase)
    })
  })

  it('should reset pronunciation state on reset()', () => {
    useUIStore.getState().setPronunciationPhase('recording')
    useUIStore.getState().setIsRecordingPronunciation(true)
    useUIStore.getState().reset()
    expect(useUIStore.getState().pronunciationPhase).toBe('idle')
    expect(useUIStore.getState().isRecordingPronunciation).toBe(false)
  })
})
