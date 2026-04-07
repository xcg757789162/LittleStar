import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuestionGenerator } from '../ai/question-generator'
import type { AIProvider } from '../ai/provider'

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator
  let mockProvider: AIProvider

  beforeEach(() => {
    mockProvider = {
      chatCompletion: vi.fn().mockResolvedValue(
        JSON.stringify({
          question: '3 + 2 = ?',
          options: [
            { id: 'a', text: '4', isCorrect: false },
            { id: 'b', text: '5', isCorrect: true },
            { id: 'c', text: '6', isCorrect: false },
          ],
          answer: '5',
          difficulty: 2,
        }),
      ),
    }
    generator = new QuestionGenerator(mockProvider)
  })

  it('应能生成题目', async () => {
    const question = await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })
    expect(question).toBeDefined()
    expect(question.question).toBeDefined()
    expect(typeof question.question).toBe('string')
  })

  it('生成的题目应包含选项', async () => {
    const question = await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })
    expect(question.options).toBeDefined()
    expect(question.options!.length).toBeGreaterThanOrEqual(2)
  })

  it('选项中应有且只有一个正确答案', async () => {
    const question = await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })
    const correctOptions = question.options!.filter((o) => o.isCorrect)
    expect(correctOptions.length).toBe(1)
  })

  it('AI 返回非法 JSON 时应降级到种子题库', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue('invalid json')
    const question = await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })
    expect(question).toBeDefined()
    expect(question.question).toBeDefined()
    expect(question.isFallback).toBe(true)
  })

  it('API 失败时应降级到种子题库', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'))
    const question = await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })
    expect(question).toBeDefined()
    expect(question.isFallback).toBe(true)
  })

  it('应发送正确的 prompt', async () => {
    await generator.generate({
      subject: 'math',
      knowledgeNodeId: 'math-1',
      difficulty: 2,
      type: 'multiple-choice',
    })

    const callArgs = (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const systemMsg = callArgs.find((m: { role: string }) => m.role === 'system')
    expect(systemMsg).toBeDefined()
    expect(systemMsg.content).toContain('幼儿')
  })
})
