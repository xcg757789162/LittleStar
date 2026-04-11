/**
 * AI 教师
 * 温暖陪伴型人设，负责鼓励、错误分析、安全过滤
 */

import type { AIProvider, ChatMessage } from './provider'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('AITeacher')

/** 鼓励生成输入 */
export interface EncouragementInput {
  childName: string
  isCorrect: boolean
  consecutiveCorrect: number
}

/** 错误分析输入 */
export interface ErrorAnalysisInput {
  question: string
  childAnswer: string
  correctAnswer: string
  subject: string
}

/** 不安全关键词 */
const UNSAFE_KEYWORDS = ['暴力', '恐怖', '血腥', '死亡', '杀', '打架', '骂人', '恶心']

/** 默认鼓励语 */
const DEFAULT_CORRECT_MESSAGES = [
  '你真棒！继续加油！',
  '太厉害了！',
  '答对了，你好聪明！',
]

const DEFAULT_WRONG_MESSAGES = [
  '没关系，再试一次就好啦！',
  '别着急，慢慢想就能答对哦！',
  '加油，你可以的！',
]

/** 系统 prompt */
const SYSTEM_PROMPT = `你是"小星老师"，一位温暖、耐心、充满爱的幼儿园AI老师。
你的说话风格：
- 使用简单易懂的语言，适合4-6岁小朋友
- 总是给予正面鼓励和支持
- 温暖友善，像一个好朋友
- 句子简短，多用叠词和语气词
- 绝不使用任何负面、暴力、恐怖的内容
回复控制在20字以内。`

export class AITeacher {
  private provider: AIProvider

  constructor(provider: AIProvider) {
    this.provider = provider
  }

  /**
   * 生成鼓励语
   */
  async generateEncouragement(input: EncouragementInput): Promise<string> {
    const { childName, isCorrect, consecutiveCorrect } = input

    const userContent = isCorrect
      ? `${childName}答对了！已经连续答对${consecutiveCorrect}题。请给一句简短鼓励。`
      : `${childName}答错了，请给一句温柔的鼓励和引导。`

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    try {
      const response = await this.provider.chatCompletion(messages)
      return this.filterContent(response)
    } catch {
      // API 失败时使用默认消息
      const defaults = isCorrect ? DEFAULT_CORRECT_MESSAGES : DEFAULT_WRONG_MESSAGES
      return defaults[Math.floor(Math.random() * defaults.length)]
    }
  }

  /**
   * 分析错误模式
   */
  async analyzeError(input: ErrorAnalysisInput): Promise<string> {
    const { question, childAnswer, correctAnswer, subject } = input

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `科目：${subject}，题目："${question}"，小朋友回答："${childAnswer}"，正确答案："${correctAnswer}"。请简短分析错误原因并给出学习建议。`,
      },
    ]

    try {
      const response = await this.provider.chatCompletion(messages)
      return this.filterContent(response)
    } catch (err) {
      log.warn('错误分析生成失败，使用默认消息:', err instanceof Error ? err.message : String(err))
      return '这道题有点难，我们多练习几次就会了！'
    }
  }

  /**
   * 安全内容过滤
   */
  private filterContent(content: string): string {
    const hasUnsafe = UNSAFE_KEYWORDS.some((keyword) => content.includes(keyword))
    if (hasUnsafe) {
      return DEFAULT_CORRECT_MESSAGES[0]
    }
    return content
  }
}
