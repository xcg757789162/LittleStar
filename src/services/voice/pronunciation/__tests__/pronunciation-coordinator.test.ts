/**
 * 纠音教学循环编排器测试
 *
 * 验证：
 * - 完整状态机 6 阶段流转
 * - 首次通过（跳过重试）
 * - C2 第1/2次重试后通过
 * - C2 失败进入 C1
 * - C1 后终态反馈
 * - TTS 语速设置
 * - attempts 记录 & bestScore 追踪
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PronunciationCoordinator,
  type CoordinatorConfig,
  type CoordinatorState,
} from '../pronunciation-coordinator'
import type { PronunciationScore } from '../types'

// Mock Provider
function createMockProvider(score: Partial<PronunciationScore> = {}) {
  return {
    name: 'mock' as const,
    scorePronunciation: vi.fn().mockResolvedValue({
      overall: 80,
      accuracy: 80,
      fluency: 80,
      completeness: 80,
      phonemes: [],
      ...score,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  }
}

// Mock TTS
function createMockTTS() {
  return {
    speak: vi.fn().mockResolvedValue(undefined),
    speakSlow: vi.fn().mockResolvedValue(undefined),
  }
}

describe('PronunciationCoordinator', () => {
  let coordinator: PronunciationCoordinator
  let mockProvider: ReturnType<typeof createMockProvider>
  let mockTTS: ReturnType<typeof createMockTTS>

  const defaultConfig: CoordinatorConfig = {
    word: 'apple',
    referenceText: 'apple',
    language: 'en',
    passThreshold: 3, // 3 星通过
    maxRetries: 2,
  }

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockTTS = createMockTTS()
    coordinator = new PronunciationCoordinator(defaultConfig, mockProvider, mockTTS)
  })

  describe('初始状态', () => {
    it('初始阶段应为 idle', () => {
      expect(coordinator.getState().phase).toBe('idle')
    })

    it('初始 attempts 为 0', () => {
      expect(coordinator.getState().attempts).toBe(0)
    })

    it('初始 bestScore 为 null', () => {
      expect(coordinator.getState().bestScore).toBeNull()
    })
  })

  describe('AI 示范阶段 (demonstrate)', () => {
    it('应调用 TTS 以正常速度示范发音', async () => {
      await coordinator.demonstrate()
      expect(mockTTS.speak).toHaveBeenCalledWith('apple', expect.objectContaining({
        language: 'en',
      }))
      expect(coordinator.getState().phase).toBe('listening')
    })
  })

  describe('评估流程 (assess)', () => {
    it('首次高分（≥3星）应直接通过，进入 feedback', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 85,
        accuracy: 85,
        fluency: 85,
        completeness: 85,
        phonemes: [],
      })

      await coordinator.demonstrate()
      const result = await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      expect(result.stars).toBeGreaterThanOrEqual(3)
      expect(coordinator.getState().phase).toBe('feedback')
      expect(coordinator.getState().passed).toBe(true)
    })

    it('首次低分应进入 retry 阶段', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30,
        accuracy: 30,
        fluency: 30,
        completeness: 30,
        phonemes: [],
      })

      await coordinator.demonstrate()
      const result = await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      expect(result.stars).toBeLessThan(3)
      expect(coordinator.getState().phase).toBe('retry')
      expect(coordinator.getState().attempts).toBe(1)
    })

    it('attempts 应随每次评估递增', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30,
        accuracy: 30,
        fluency: 30,
        completeness: 30,
        phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().attempts).toBe(1)

      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().attempts).toBe(2)
    })
  })

  describe('C2 重试流程 (retrySlow)', () => {
    it('重试时应调用 TTS 以慢速播放', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30,
        accuracy: 30,
        fluency: 30,
        completeness: 30,
        phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()

      expect(mockTTS.speakSlow).toHaveBeenCalledWith('apple', expect.objectContaining({
        language: 'en',
      }))
    })

    it('第1次重试后通过应进入 feedback', async () => {
      // 首次失败
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })
      // 重试成功
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 85, accuracy: 85, fluency: 85, completeness: 85, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      const result = await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      expect(result.stars).toBeGreaterThanOrEqual(3)
      expect(coordinator.getState().phase).toBe('feedback')
      expect(coordinator.getState().passed).toBe(true)
    })

    it('第2次重试后仍失败应进入 drill 阶段 (C1)', async () => {
      // 持续低分
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })

      await coordinator.demonstrate()

      // 首次评估
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('retry')

      // 第1次重试 + 评估
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('retry')

      // 第2次重试 + 评估 → 超过 maxRetries，进入 drill
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('drilling')
    })
  })

  describe('C1 分音节练习 (drillSyllables)', () => {
    it('drill 阶段应逐音节调用 TTS', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })

      await coordinator.demonstrate()
      // 三次失败进入 drill
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      expect(coordinator.getState().phase).toBe('drilling')

      await coordinator.drillSyllables()
      // TTS 应该被调用（示范音节）
      expect(mockTTS.speakSlow.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('drill 完成后应回到评估流程', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      await coordinator.drillSyllables()
      expect(coordinator.getState().phase).toBe('listening')
    })
  })

  describe('bestScore 追踪', () => {
    it('bestScore 应追踪最高分', async () => {
      // 首次 30 分
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })
      // 重试 60 分
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 60, accuracy: 60, fluency: 60, completeness: 60, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().bestScore?.overall).toBe(30)

      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().bestScore?.overall).toBe(60)
    })

    it('更低的分数不应覆盖 bestScore', async () => {
      // 首次 60 分
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 60, accuracy: 60, fluency: 60, completeness: 60, phonemes: [],
      })
      // 重试 40 分
      mockProvider.scorePronunciation.mockResolvedValueOnce({
        overall: 40, accuracy: 40, fluency: 40, completeness: 40, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      expect(coordinator.getState().bestScore?.overall).toBe(60)
    })
  })

  describe('反馈生成 (generateFeedback)', () => {
    it('通过时应生成正面反馈', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 90, accuracy: 90, fluency: 90, completeness: 90, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      const feedback = coordinator.generateFeedback()
      expect(feedback).toBeTruthy()
      expect(typeof feedback).toBe('string')
      expect(feedback.length).toBeGreaterThan(0)
    })

    it('未通过时应生成鼓励性反馈', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [],
      })

      await coordinator.demonstrate()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))

      const feedback = coordinator.generateFeedback()
      expect(feedback).toBeTruthy()
      expect(typeof feedback).toBe('string')
    })
  })

  describe('完整流程集成', () => {
    it('完整成功流程: demonstrate → assess(pass) → feedback', async () => {
      mockProvider.scorePronunciation.mockResolvedValue({
        overall: 90, accuracy: 90, fluency: 90, completeness: 90, phonemes: [],
      })

      // 开始
      expect(coordinator.getState().phase).toBe('idle')

      // 示范
      await coordinator.demonstrate()
      expect(coordinator.getState().phase).toBe('listening')

      // 评估通过
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('feedback')
      expect(coordinator.getState().passed).toBe(true)
      expect(coordinator.getState().attempts).toBe(1)
    })

    it('完整失败-drill-成功流程', async () => {
      let callCount = 0
      mockProvider.scorePronunciation.mockImplementation(async () => {
        callCount++
        // 前 3 次失败，第 4 次成功
        if (callCount <= 3) {
          return { overall: 30, accuracy: 30, fluency: 30, completeness: 30, phonemes: [] }
        }
        return { overall: 85, accuracy: 85, fluency: 85, completeness: 85, phonemes: [] }
      })

      await coordinator.demonstrate()

      // 首次失败
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('retry')

      // 第1次重试 + 失败
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('retry')

      // 第2次重试 + 失败 → drilling
      await coordinator.retrySlow()
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('drilling')

      // 分音节练习
      await coordinator.drillSyllables()
      expect(coordinator.getState().phase).toBe('listening')

      // drill 后评估通过
      await coordinator.assess(new Blob(['audio'], { type: 'audio/wav' }))
      expect(coordinator.getState().phase).toBe('feedback')
      expect(coordinator.getState().passed).toBe(true)
    })
  })
})
