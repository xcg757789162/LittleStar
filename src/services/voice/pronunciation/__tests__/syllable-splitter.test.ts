/**
 * 英文音节拆分引擎测试
 * TDD: 测试词典命中、规则引擎、单音节、重音索引
 */
import { describe, it, expect } from 'vitest'
import { splitSyllables } from '../syllable-splitter'

describe('splitSyllables', () => {
  describe('dictionary hits (common children words)', () => {
    it('should split "apple" → ["ap", "ple"]', () => {
      const result = splitSyllables('apple')
      expect(result.syllables).toEqual(['ap', 'ple'])
      expect(result.word).toBe('apple')
    })

    it('should split "elephant" → ["el", "e", "phant"]', () => {
      const result = splitSyllables('elephant')
      expect(result.syllables).toEqual(['el', 'e', 'phant'])
    })

    it('should split "banana" → ["ba", "na", "na"]', () => {
      const result = splitSyllables('banana')
      expect(result.syllables).toEqual(['ba', 'na', 'na'])
    })

    it('should split "butterfly" → ["but", "ter", "fly"]', () => {
      const result = splitSyllables('butterfly')
      expect(result.syllables).toEqual(['but', 'ter', 'fly'])
    })

    it('should split "dinosaur" → ["di", "no", "saur"]', () => {
      const result = splitSyllables('dinosaur')
      expect(result.syllables).toEqual(['di', 'no', 'saur'])
    })
  })

  describe('single-syllable words', () => {
    it('should not split "cat" → ["cat"]', () => {
      const result = splitSyllables('cat')
      expect(result.syllables).toEqual(['cat'])
    })

    it('should not split "dog" → ["dog"]', () => {
      const result = splitSyllables('dog')
      expect(result.syllables).toEqual(['dog'])
    })

    it('should not split "red" → ["red"]', () => {
      const result = splitSyllables('red')
      expect(result.syllables).toEqual(['red'])
    })
  })

  describe('stress index', () => {
    it('should return stressIndex for "apple" (first syllable)', () => {
      const result = splitSyllables('apple')
      expect(result.stressIndex).toBe(0)
    })

    it('should return stressIndex for "banana" (second syllable)', () => {
      const result = splitSyllables('banana')
      expect(result.stressIndex).toBe(1)
    })

    it('should return stressIndex 0 for single-syllable words', () => {
      const result = splitSyllables('cat')
      expect(result.stressIndex).toBe(0)
    })
  })

  describe('rule engine fallback (unknown words)', () => {
    it('should split unknown multi-syllable words reasonably', () => {
      const result = splitSyllables('robotics')
      expect(result.syllables.length).toBeGreaterThan(1)
      // 确保所有音节拼接起来等于原词
      expect(result.syllables.join('')).toBe('robotics')
    })

    it('should ensure syllables join back to original word', () => {
      const words = ['computer', 'fantastic', 'helicopter']
      words.forEach((word) => {
        const result = splitSyllables(word)
        expect(result.syllables.join('')).toBe(word)
      })
    })
  })

  describe('case insensitivity', () => {
    it('should handle uppercase input', () => {
      const result = splitSyllables('APPLE')
      expect(result.syllables).toEqual(['ap', 'ple'])
    })

    it('should handle mixed case input', () => {
      const result = splitSyllables('Elephant')
      expect(result.syllables).toEqual(['el', 'e', 'phant'])
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = splitSyllables('')
      expect(result.syllables).toEqual([''])
      expect(result.word).toBe('')
    })

    it('should handle single character', () => {
      const result = splitSyllables('a')
      expect(result.syllables).toEqual(['a'])
    })
  })
})
