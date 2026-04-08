/**
 * 文本匹配降级 Provider 测试
 * TDD: 测试完全匹配、部分匹配、宽容模式、无语音、Levenshtein 距离
 */
import { describe, it, expect, vi } from 'vitest'
import { TextMatchFallbackProvider } from '../text-match-fallback'
import type { STTService } from '../../stt'

// Mock STT 服务
function createMockSTT(recognizeResult: string, confidence = 1.0): STTService {
  return {
    recognize: vi.fn().mockResolvedValue(recognizeResult),
    config: { apiKey: 'test', baseUrl: 'test' },
    // @ts-expect-error 简化 mock
    _confidence: confidence,
  } as unknown as STTService
}

describe('TextMatchFallbackProvider', () => {
  describe('name', () => {
    it('should return "text-match-fallback"', () => {
      const provider = new TextMatchFallbackProvider(createMockSTT(''))
      expect(provider.name).toBe('text-match-fallback')
    })
  })

  describe('checkAvailability', () => {
    it('should always return true (fallback provider)', async () => {
      const provider = new TextMatchFallbackProvider(createMockSTT(''))
      expect(await provider.checkAvailability()).toBe(true)
    })
  })

  describe('scorePronunciation', () => {
    it('should score ≥90 for exact match', async () => {
      const stt = createMockSTT('apple')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.overallScore).toBeGreaterThanOrEqual(90)
      expect(result.stars).toBeGreaterThanOrEqual(4)
    })

    it('should score ≥90 for case-insensitive exact match', async () => {
      const stt = createMockSTT('Apple')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.overallScore).toBeGreaterThanOrEqual(90)
    })

    it('should give proportional score for partial match', async () => {
      // "aple" vs "apple" — 1 字符缺失
      const stt = createMockSTT('aple')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.overallScore).toBeGreaterThan(50)
      expect(result.overallScore).toBeLessThan(90)
    })

    it('should give ≥40 for any spoken content (child-friendly minimum)', async () => {
      // 完全不匹配但有内容
      const stt = createMockSTT('something completely different')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.overallScore).toBeGreaterThanOrEqual(40)
    })

    it('should give 0 for empty/no speech input', async () => {
      const stt = createMockSTT('')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.overallScore).toBe(0)
      expect(result.feedback.nextAction).toBe('retry_slow')
    })

    it('should handle punctuation and whitespace normalization', async () => {
      const stt = createMockSTT('  Hello,  World!  ')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'hello world',
        'en',
      )

      expect(result.overallScore).toBeGreaterThanOrEqual(90)
    })

    it('should calculate Levenshtein distance correctly', async () => {
      // "kitten" vs "sitting" — Levenshtein distance = 3
      const stt = createMockSTT('kitten')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'sitting',
        'en',
      )

      // distance=3, maxLen=7, similarity=4/7≈0.571
      // score = max(40, similarity*100) = 57
      expect(result.overallScore).toBeGreaterThanOrEqual(40)
      expect(result.overallScore).toBeLessThan(90)
    })

    it('should return proper star ratings', async () => {
      const stt = createMockSTT('apple')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      // 完全匹配应得高星
      expect(result.stars).toBeGreaterThanOrEqual(4)
      expect([1, 2, 3, 4, 5]).toContain(result.stars)
    })

    it('should include feedback in result', async () => {
      const stt = createMockSTT('apple')
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      expect(result.feedback).toBeDefined()
      expect(result.feedback.teacherSay).toBeDefined()
      expect(result.feedback.nextAction).toBeDefined()
    })

    it('should handle STT error gracefully', async () => {
      const stt = createMockSTT('')
      vi.mocked(stt.recognize).mockRejectedValue(new Error('STT failed'))
      const provider = new TextMatchFallbackProvider(stt)

      const result = await provider.scorePronunciation(
        new Blob(['audio']),
        'apple',
        'en',
      )

      // 降级时应返回 0 分而不是抛出异常
      expect(result.overallScore).toBe(0)
    })
  })
})
