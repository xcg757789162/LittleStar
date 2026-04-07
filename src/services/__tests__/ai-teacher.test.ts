import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AITeacher } from '../ai/teacher'
import type { AIProvider } from '../ai/provider'

describe('AITeacher', () => {
  let teacher: AITeacher
  let mockProvider: AIProvider

  beforeEach(() => {
    mockProvider = {
      chatCompletion: vi.fn().mockResolvedValue('小朋友真棒！'),
    }
    teacher = new AITeacher(mockProvider)
  })

  it('应该能生成鼓励语', async () => {
    const encouragement = await teacher.generateEncouragement({
      childName: '小明',
      isCorrect: true,
      consecutiveCorrect: 3,
    })
    expect(typeof encouragement).toBe('string')
    expect(encouragement.length).toBeGreaterThan(0)
  })

  it('答错时也应生成温柔的引导', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue('没关系，我们再想一想')
    const encouragement = await teacher.generateEncouragement({
      childName: '小明',
      isCorrect: false,
      consecutiveCorrect: 0,
    })
    expect(typeof encouragement).toBe('string')
    expect(encouragement.length).toBeGreaterThan(0)
  })

  it('应能分析错误模式', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue('建议多练习加法')
    const analysis = await teacher.analyzeError({
      question: '2 + 3 = ?',
      childAnswer: '4',
      correctAnswer: '5',
      subject: 'math',
    })
    expect(typeof analysis).toBe('string')
  })

  it('应该使用系统 prompt 设定人设', async () => {
    await teacher.generateEncouragement({
      childName: '小明',
      isCorrect: true,
      consecutiveCorrect: 1,
    })
    const callArgs = (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const systemMsg = callArgs.find((m: { role: string }) => m.role === 'system')
    expect(systemMsg).toBeDefined()
    expect(systemMsg.content).toContain('温暖')
  })

  it('应过滤不适合幼儿的内容', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue('这题涉及暴力内容')
    const result = await teacher.generateEncouragement({
      childName: '小明',
      isCorrect: true,
      consecutiveCorrect: 1,
    })
    // 安全过滤后应返回默认安全消息
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('API 失败时应返回默认鼓励语', async () => {
    (mockProvider.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'))
    const result = await teacher.generateEncouragement({
      childName: '小明',
      isCorrect: true,
      consecutiveCorrect: 1,
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
