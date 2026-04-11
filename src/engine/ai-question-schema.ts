/**
 * AI 生成评测题目的 Zod Schema 验证
 *
 * 使用 Zod v4 定义结构化输出 schema，同时用于：
 * 1. Vercel AI SDK 的 generateObject schema 参数（自动约束 LLM 输出格式）
 * 2. 生成后的二次校验（确保题目质量）
 */

import { z } from 'zod'

/** 选项 schema */
const questionOptionSchema = z.object({
  /** 选项文字，1-8 个字符 */
  text: z.string().min(1).max(20),
  /** 选项 emoji（可选） */
  emoji: z.string().optional(),
})

/** AI 生成题目的 Zod schema — 用于 generateObject */
export const aiQuestionSchema = z.object({
  /** 题干，1-30 个字符 */
  stem: z.string().min(1).max(60).describe('题干文字，简短口语化，可包含 emoji'),
  /** 4 个选项 */
  options: z
    .array(questionOptionSchema)
    .length(4)
    .describe('恰好 4 个选项，每个含 text 和可选 emoji'),
  /** 正确选项索引 0-3 */
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe('正确答案的索引，0-3'),
  /** 难度 1-5 */
  difficulty: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('题目难度，1=最简单，5=最难'),
})

/** AI 生成题目的类型推断 */
export type AIQuestionOutput = z.infer<typeof aiQuestionSchema>

/**
 * 校验 AI 生成的题目是否满足质量要求
 *
 * 除了 Zod schema 的结构校验外，还执行以下业务逻辑校验：
 * - 题干不为空白
 * - 4 个选项的 text 互不相同
 * - correctIndex 对应的选项存在
 *
 * @param data 经过 Zod parse 后的数据
 * @returns 校验通过返回数据，否则返回 null
 */
export function validateAIQuestion(
  data: AIQuestionOutput,
): AIQuestionOutput | null {
  // 题干不为空白
  if (!data.stem.trim()) return null

  // 选项 text 互不相同
  const texts = data.options.map((o: { text: string; emoji?: string }) => o.text.trim())
  if (new Set(texts).size !== 4) return null

  // 每个选项 text 不为空
  if (texts.some((t: string) => t.length === 0)) return null

  // correctIndex 范围校验（Zod 已约束，双重保险）
  if (data.correctIndex < 0 || data.correctIndex > 3) return null

  return data
}
