/**
 * 发音评估类型定义与 Provider 接口测试
 * TDD: 先写测试，确认类型完整性和工厂函数行为
 */
import { describe, it, expect, vi } from 'vitest'
import type {
  PronunciationScore,
  PhonemeScore,
  TeacherFeedback,
  SyllableBreakdown,
  PronunciationSession,
  AssessmentOptions,
} from '../types'
import type { PronunciationAssessmentProvider } from '../assessment-provider'
import { createAssessmentProvider } from '../assessment-provider'

describe('Pronunciation Types', () => {
  describe('PronunciationScore', () => {
    it('should have all required fields with correct types', () => {
      const score: PronunciationScore = {
        overallScore: 85,
        stars: 4,
        phonemeScores: [],
        fluencyScore: 80,
        completenessScore: 90,
        feedback: {
          teacherSay: '说得真好！',
          encouragement: '继续加油！',
          nextAction: 'pass',
        },
      }
      expect(score.overallScore).toBe(85)
      expect(score.stars).toBe(4)
      expect(score.phonemeScores).toEqual([])
      expect(score.fluencyScore).toBe(80)
      expect(score.completenessScore).toBe(90)
      expect(score.feedback.teacherSay).toBe('说得真好！')
      expect(score.feedback.nextAction).toBe('pass')
    })

    it('should support stars range 1-5', () => {
      const scores: PronunciationScore[] = [1, 2, 3, 4, 5].map((s) => ({
        overallScore: s * 20,
        stars: s as 1 | 2 | 3 | 4 | 5,
        phonemeScores: [],
        fluencyScore: 0,
        completenessScore: 0,
        feedback: {
          teacherSay: '',
          encouragement: '',
          nextAction: 'pass' as const,
        },
      }))
      expect(scores).toHaveLength(5)
      expect(scores[0].stars).toBe(1)
      expect(scores[4].stars).toBe(5)
    })
  })

  describe('PhonemeScore', () => {
    it('should have all required fields', () => {
      const phoneme: PhonemeScore = {
        phoneme: '/æ/',
        score: 75,
        expected: 'æ',
        syllableIndex: 0,
      }
      expect(phoneme.phoneme).toBe('/æ/')
      expect(phoneme.score).toBe(75)
      expect(phoneme.expected).toBe('æ')
      expect(phoneme.syllableIndex).toBe(0)
    })

    it('should support optional actual field', () => {
      const phoneme: PhonemeScore = {
        phoneme: '/æ/',
        score: 60,
        expected: 'æ',
        actual: 'ɛ',
        syllableIndex: 0,
      }
      expect(phoneme.actual).toBe('ɛ')
    })
  })

  describe('TeacherFeedback', () => {
    it('should have all required fields', () => {
      const feedback: TeacherFeedback = {
        teacherSay: '你说得真棒！',
        encouragement: '🌟🌟🌟',
        nextAction: 'pass',
      }
      expect(feedback.teacherSay).toBe('你说得真棒！')
      expect(feedback.encouragement).toBe('🌟🌟🌟')
      expect(feedback.nextAction).toBe('pass')
    })

    it('should support all nextAction types', () => {
      const actions: TeacherFeedback['nextAction'][] = [
        'pass',
        'retry_slow',
        'drill_syllable',
        'final_encourage',
      ]
      actions.forEach((action) => {
        const feedback: TeacherFeedback = {
          teacherSay: '',
          encouragement: '',
          nextAction: action,
        }
        expect(feedback.nextAction).toBe(action)
      })
    })

    it('should support optional focusArea', () => {
      const feedback: TeacherFeedback = {
        teacherSay: '',
        encouragement: '',
        focusArea: '元音 /æ/',
        nextAction: 'retry_slow',
      }
      expect(feedback.focusArea).toBe('元音 /æ/')
    })
  })

  describe('SyllableBreakdown', () => {
    it('should have all required fields', () => {
      const breakdown: SyllableBreakdown = {
        word: 'elephant',
        syllables: ['el', 'e', 'phant'],
        stressIndex: 0,
      }
      expect(breakdown.word).toBe('elephant')
      expect(breakdown.syllables).toEqual(['el', 'e', 'phant'])
      expect(breakdown.stressIndex).toBe(0)
    })
  })

  describe('PronunciationSession', () => {
    it('should have all required fields', () => {
      const session: PronunciationSession = {
        word: 'apple',
        expectedText: 'apple',
        currentPhase: 'initial',
        attempts: [],
        bestScore: 0,
        finalStars: 0,
      }
      expect(session.word).toBe('apple')
      expect(session.expectedText).toBe('apple')
      expect(session.currentPhase).toBe('initial')
      expect(session.attempts).toEqual([])
      expect(session.bestScore).toBe(0)
      expect(session.finalStars).toBe(0)
    })

    it('should support all phase values', () => {
      const phases: PronunciationSession['currentPhase'][] = [
        'initial',
        'c2_retry_1',
        'c2_retry_2',
        'c1_drill',
        'c1_final',
        'completed',
      ]
      phases.forEach((phase) => {
        const session: PronunciationSession = {
          word: 'test',
          expectedText: 'test',
          currentPhase: phase,
          attempts: [],
          bestScore: 0,
          finalStars: 0,
        }
        expect(session.currentPhase).toBe(phase)
      })
    })
  })

  describe('AssessmentOptions', () => {
    it('should allow all fields to be optional', () => {
      const options: AssessmentOptions = {}
      expect(options.ageGroup).toBeUndefined()
      expect(options.strictness).toBeUndefined()
      expect(options.enablePhonemeDetail).toBeUndefined()
    })

    it('should support all option values', () => {
      const options: AssessmentOptions = {
        ageGroup: 'child',
        strictness: 'lenient',
        enablePhonemeDetail: true,
      }
      expect(options.ageGroup).toBe('child')
      expect(options.strictness).toBe('lenient')
      expect(options.enablePhonemeDetail).toBe(true)
    })
  })
})

describe('PronunciationAssessmentProvider', () => {
  describe('Interface compliance', () => {
    it('should define name, checkAvailability and scorePronunciation', () => {
      // 创建一个 mock 来验证接口形状
      const mockProvider: PronunciationAssessmentProvider = {
        name: 'mock-provider',
        checkAvailability: vi.fn().mockResolvedValue(true),
        scorePronunciation: vi.fn().mockResolvedValue({
          overallScore: 80,
          stars: 4,
          phonemeScores: [],
          fluencyScore: 75,
          completenessScore: 85,
          feedback: {
            teacherSay: 'Good!',
            encouragement: '🌟',
            nextAction: 'pass',
          },
        }),
      }
      expect(mockProvider.name).toBe('mock-provider')
      expect(typeof mockProvider.checkAvailability).toBe('function')
      expect(typeof mockProvider.scorePronunciation).toBe('function')
    })
  })

  describe('createAssessmentProvider', () => {
    it('should create a provider instance', () => {
      const provider = createAssessmentProvider({
        iflytekApiKey: 'test-key',
        iflytekAppId: 'test-app-id',
      })
      expect(provider).toBeDefined()
      expect(provider.name).toBeDefined()
      expect(typeof provider.checkAvailability).toBe('function')
      expect(typeof provider.scorePronunciation).toBe('function')
    })

    it('should fall back to TextMatchFallback when no API keys provided', () => {
      const provider = createAssessmentProvider({})
      expect(provider).toBeDefined()
      expect(provider.name).toBe('text-match-fallback')
    })

    it('should prefer IflytekISE when API keys are provided', () => {
      const provider = createAssessmentProvider({
        iflytekApiKey: 'test-key',
        iflytekAppId: 'test-app-id',
      })
      expect(provider.name).toBe('iflytek-ise')
    })
  })
})
