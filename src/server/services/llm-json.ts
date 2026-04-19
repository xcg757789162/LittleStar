/**
 * LLM JSON utilities
 *
 * 抽取自 course-initializer.ts，供课程初始化、教师团评审等多处共享：
 *   - callLLM：走 task.settings 里 llmModel / llmApiKey 的通用 LLM 调用（Vercel AI SDK generateText）
 *   - extractJSON：从 LLM 回复里抽最外层 JSON，兼容 markdown 围栏、尾逗号、尾部垃圾字符
 *   - callLLMAndParse：调 + 解析，失败时带上原始输出让 LLM 自己修一次
 */

import { generateText } from 'ai'
import { createQuestionModel, type QuestionGenerationSettings } from '../question-model.js'

export async function callLLM(
  settings: Record<string, unknown>,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 180_000,
  /** 附加已累积的对话消息（用于"让 LLM 修正上一次错误 JSON" 之类的重试） */
  extraMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<string> {
  const s = (settings || {}) as QuestionGenerationSettings
  if (!s?.llmModel || !s?.llmApiKey) {
    throw new Error('llmModel and llmApiKey are required in task settings')
  }
  const model = createQuestionModel(s)
  if (!model) throw new Error('cannot resolve LLM provider config')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }, ...extraMessages],
      // 较低温度 → 更稳定的 JSON 输出
      temperature: 0.3,
      // 8K output tokens —— 30 个知识点 + 12 道题的 JSON 很容易超过原来的 4000
      maxOutputTokens: 8000,
      abortSignal: controller.signal,
    })
    if (!text) throw new Error('LLM returned empty content')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 把字符串里最外层的 JSON 结构抽出来。
 * 支持 ```json ... ``` 代码块，支持 {...} 和 [...]，兼容 LLM 在前后多打几句话的情况。
 * 解析失败时会尝试"逐字符右缩"重试（兼容 LLM 末尾多打了半句解释）。
 */
export function extractJSON<T>(content: string): T {
  // 1) 剥 markdown 围栏
  let text = content.trim()
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/)
  if (fence) text = fence[1].trim()

  // 2) 以最外层 '{' 或 '[' 为起点
  const firstBrace = text.indexOf('{')
  const firstBracket = text.indexOf('[')
  const starts = [firstBrace, firstBracket].filter((i) => i >= 0)
  if (starts.length === 0) throw new Error('LLM response contains no JSON object')
  const first = Math.min(...starts)
  const openChar = text[first]
  const closeChar = openChar === '{' ? '}' : ']'
  const last = text.lastIndexOf(closeChar)
  if (last <= first) throw new Error('LLM response has no closing brace')

  const slice = text.slice(first, last + 1)
  try {
    return JSON.parse(slice) as T
  } catch (firstErr) {
    // 3) 兜底 A：移除常见的尾逗号（"x",}  → "x"}）
    const noTrailingCommas = slice.replace(/,(\s*[\]}])/g, '$1')
    try {
      return JSON.parse(noTrailingCommas) as T
    } catch {
      // ignore
    }
    // 4) 兜底 B：从右往左逐个"关闭括号"处截断重试（处理尾部垃圾字符）
    for (let end = last; end > first; end--) {
      if (text[end] !== closeChar) continue
      const candidate = text.slice(first, end + 1).replace(/,(\s*[\]}])/g, '$1')
      try {
        return JSON.parse(candidate) as T
      } catch {
        continue
      }
    }
    throw new Error(
      `Failed to parse JSON: ${(firstErr as Error).message}. raw length=${content.length}, slice length=${slice.length}`,
    )
  }
}

/** 调 LLM + 解析；失败时带上原始输出让 LLM 自己修一次 */
export async function callLLMAndParse<T>(
  settings: Record<string, unknown>,
  systemPrompt: string,
  userPrompt: string,
  label: string,
): Promise<T> {
  let lastRaw = ''
  try {
    lastRaw = await callLLM(settings, systemPrompt, userPrompt)
    return extractJSON<T>(lastRaw)
  } catch (firstErr) {
    const firstErrMsg = (firstErr as Error).message
    console.warn(`[LLM-JSON][${label}] first parse failed: ${firstErrMsg}，尝试让 LLM 修复`)
    // 让 LLM 把上次的坏 JSON 修成合法版本
    const fixUserPrompt = `你上次的回复不是合法 JSON（错误：${firstErrMsg}）。\n请只输出一个合法的 JSON 对象，严格满足 system prompt 中定义的结构，**不要有任何解释文字、markdown 代码围栏、注释或尾逗号**。`
    try {
      const fixed = await callLLM(settings, systemPrompt, userPrompt, 180_000, [
        { role: 'assistant', content: lastRaw || '(上次没有内容)' },
        { role: 'user', content: fixUserPrompt },
      ])
      return extractJSON<T>(fixed)
    } catch (secondErr) {
      // 保留原始回包前 300 字用于排查
      const snippet = (lastRaw || '').slice(0, 300).replace(/\s+/g, ' ')
      throw new Error(
        `${label} JSON 解析失败（两次）：${(secondErr as Error).message}。原始片段：${snippet}`,
      )
    }
  }
}
