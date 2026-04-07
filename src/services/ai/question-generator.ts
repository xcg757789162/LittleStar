/**
 * AI 出题生成器
 * 按模板+约束条件调千问 API 生成题目，失败时 Fallback 到种子题库
 */

import type { AIProvider, ChatMessage } from './provider'
import type { QuestionType, Subject } from '@/types/models'

/** 出题输入 */
export interface GenerateInput {
  subject: Subject
  knowledgeNodeId: string
  difficulty: number
  type: QuestionType
}

/** 出题选项 */
export interface GeneratedOption {
  id: string
  text: string
  isCorrect: boolean
}

/** 出题结果 */
export interface GeneratedQuestion {
  question: string
  options?: GeneratedOption[]
  answer: string
  difficulty: number
  isFallback?: boolean
}

/** 出题系统 prompt */
const SYSTEM_PROMPT = `你是一个面向幼儿园小朋友（4-6岁）的出题系统。
请按以下要求生成题目：
- 题目适合幼儿认知水平
- 用简单的语言描述
- 选择题提供 3-4 个选项，只有一个正确
- 返回纯 JSON 格式，不要多余文字

JSON 格式：
{
  "question": "题目文本",
  "options": [{"id":"a","text":"选项1","isCorrect":false},{"id":"b","text":"选项2","isCorrect":true}],
  "answer": "正确答案",
  "difficulty": 数字
}`

/** 降级题库 */
const FALLBACK_QUESTIONS: Record<string, GeneratedQuestion[]> = {
  math: [
    {
      question: '1 + 1 = ?',
      options: [
        { id: 'a', text: '1', isCorrect: false },
        { id: 'b', text: '2', isCorrect: true },
        { id: 'c', text: '3', isCorrect: false },
      ],
      answer: '2',
      difficulty: 1,
      isFallback: true,
    },
    {
      question: '下面哪个数字最大？',
      options: [
        { id: 'a', text: '3', isCorrect: false },
        { id: 'b', text: '7', isCorrect: true },
        { id: 'c', text: '5', isCorrect: false },
      ],
      answer: '7',
      difficulty: 2,
      isFallback: true,
    },
  ],
  chinese: [
    {
      question: '"b" 的声母发音是？',
      options: [
        { id: 'a', text: '波', isCorrect: true },
        { id: 'b', text: '破', isCorrect: false },
        { id: 'c', text: '得', isCorrect: false },
      ],
      answer: '波',
      difficulty: 1,
      isFallback: true,
    },
  ],
  english: [
    {
      question: 'What color is an apple? 🍎',
      options: [
        { id: 'a', text: 'Blue', isCorrect: false },
        { id: 'b', text: 'Red', isCorrect: true },
        { id: 'c', text: 'Green', isCorrect: false },
      ],
      answer: 'Red',
      difficulty: 1,
      isFallback: true,
    },
  ],
}

export class QuestionGenerator {
  private provider: AIProvider

  constructor(provider: AIProvider) {
    this.provider = provider
  }

  async generate(input: GenerateInput): Promise<GeneratedQuestion> {
    const { subject, difficulty, type } = input

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `请生成一道面向幼儿园小朋友的${this.getSubjectName(subject)}${this.getTypeName(type)}题，难度 ${difficulty}/10。`,
      },
    ]

    try {
      const response = await this.provider.chatCompletion(messages)
      const parsed = this.parseResponse(response)
      if (parsed) return parsed
      // 解析失败 fallback
      return this.getFallback(subject)
    } catch {
      return this.getFallback(subject)
    }
  }

  private parseResponse(response: string): GeneratedQuestion | null {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null

      const parsed = JSON.parse(jsonMatch[0]) as {
        question?: string
        options?: GeneratedOption[]
        answer?: string
        difficulty?: number
      }

      if (!parsed.question || !parsed.answer) return null

      return {
        question: parsed.question,
        options: parsed.options,
        answer: parsed.answer,
        difficulty: parsed.difficulty ?? 1,
      }
    } catch {
      return null
    }
  }

  private getFallback(subject: Subject): GeneratedQuestion {
    const questions = FALLBACK_QUESTIONS[subject] ?? FALLBACK_QUESTIONS.math
    return questions[Math.floor(Math.random() * questions.length)]
  }

  private getSubjectName(subject: Subject): string {
    const map: Record<Subject, string> = { math: '数学', chinese: '语文', english: '英语' }
    return map[subject]
  }

  private getTypeName(type: QuestionType): string {
    const map: Record<QuestionType, string> = {
      'multiple-choice': '选择',
      flashcard: '闪卡',
      handwriting: '书写',
      voice: '语音',
    }
    return map[type]
  }
}
