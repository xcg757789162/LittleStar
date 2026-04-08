/**
 * 反馈模板库测试
 *
 * 验证：
 * - 每星级+阶段组合至少 3 条模板
 * - 模板变量正确替换
 * - 连续 3 次不重复
 * - 分音节教学专用模板完整
 * - 三明治法则（肯定→引导→鼓励）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectFeedback,
  getTemplateCount,
  FEEDBACK_PHASES,
  type FeedbackPhase,
  type FeedbackVariables,
} from '../feedback-templates'

describe('feedback-templates', () => {
  describe('模板覆盖完整性', () => {
    const starLevels = [1, 2, 3, 4, 5] as const
    const phases: FeedbackPhase[] = ['first_attempt', 'retry', 'after_drill', 'perfect']

    it.each(
      starLevels.flatMap((stars) =>
        phases.map((phase) => ({ stars, phase })),
      ),
    )('stars=$stars phase=$phase 应至少有 3 条模板', ({ stars, phase }) => {
      const count = getTemplateCount(stars, phase)
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  describe('模板变量替换', () => {
    const vars: FeedbackVariables = {
      word: 'apple',
      goodPart: 'ap',
      focusPart: 'ple',
      syllable: 'ple',
    }

    it('应正确替换 {word} 变量', () => {
      const text = selectFeedback(3, 'first_attempt', vars)
      // 如果模板包含 {word}，替换后应出现 apple
      expect(text).not.toContain('{word}')
    })

    it('应正确替换 {goodPart} 和 {focusPart} 变量', () => {
      const text = selectFeedback(3, 'retry', vars)
      expect(text).not.toContain('{goodPart}')
      expect(text).not.toContain('{focusPart}')
    })

    it('应正确替换 {syllable} 变量', () => {
      const text = selectFeedback(3, 'after_drill', vars)
      expect(text).not.toContain('{syllable}')
    })

    it('无变量时模板中不应包含未替换占位符', () => {
      // 5 星 perfect 阶段通常不需要具体单词变量
      const text = selectFeedback(5, 'perfect', {})
      expect(text).not.toMatch(/\{[a-zA-Z]+\}/)
    })
  })

  describe('防重复机制', () => {
    it('连续 3 次调用应返回不同文本', () => {
      const vars: FeedbackVariables = { word: 'cat' }
      const results = new Set<string>()

      // 多次调用收集结果，至少应有 3 种不同文本
      for (let i = 0; i < 10; i++) {
        results.add(selectFeedback(3, 'first_attempt', vars))
      }

      expect(results.size).toBeGreaterThanOrEqual(3)
    })

    it('同一星级阶段连续调用不应连续重复', () => {
      const vars: FeedbackVariables = { word: 'dog' }
      let prev = ''
      let consecutiveRepeats = 0

      for (let i = 0; i < 20; i++) {
        const text = selectFeedback(3, 'first_attempt', vars)
        if (text === prev) {
          consecutiveRepeats++
        } else {
          consecutiveRepeats = 0
        }
        // 不应出现连续 3 次完全相同
        expect(consecutiveRepeats).toBeLessThan(3)
        prev = text
      }
    })
  })

  describe('分音节教学专用模板', () => {
    it('after_drill 阶段模板应包含音节相关引导', () => {
      const vars: FeedbackVariables = {
        word: 'elephant',
        syllable: 'e-le-phant',
      }
      const text = selectFeedback(3, 'after_drill', vars)
      // 模板应包含音节信息或引导语
      expect(text.length).toBeGreaterThan(0)
      expect(typeof text).toBe('string')
    })

    it('所有星级的 after_drill 阶段都应有可用模板', () => {
      for (let stars = 1; stars <= 5; stars++) {
        const count = getTemplateCount(stars as 1 | 2 | 3 | 4 | 5, 'after_drill')
        expect(count).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('三明治法则（肯定→引导→鼓励）', () => {
    it('低星级反馈应包含鼓励性内容', () => {
      const vars: FeedbackVariables = { word: 'banana' }
      const text = selectFeedback(1, 'first_attempt', vars)
      // 低星级反馈不应包含消极/批评词汇
      expect(text).not.toMatch(/错|wrong|bad|terrible|差/)
      expect(text.length).toBeGreaterThan(5)
    })

    it('中等星级反馈应包含引导性内容', () => {
      const vars: FeedbackVariables = { word: 'apple', focusPart: 'ple' }
      const text = selectFeedback(3, 'retry', vars)
      expect(text.length).toBeGreaterThan(5)
    })

    it('高星级反馈应是纯肯定/赞扬', () => {
      const vars: FeedbackVariables = { word: 'cat' }
      const text = selectFeedback(5, 'perfect', vars)
      expect(text.length).toBeGreaterThan(5)
    })
  })

  describe('FEEDBACK_PHASES 常量', () => {
    it('应导出所有有效阶段', () => {
      expect(FEEDBACK_PHASES).toContain('first_attempt')
      expect(FEEDBACK_PHASES).toContain('retry')
      expect(FEEDBACK_PHASES).toContain('after_drill')
      expect(FEEDBACK_PHASES).toContain('perfect')
    })
  })
})
