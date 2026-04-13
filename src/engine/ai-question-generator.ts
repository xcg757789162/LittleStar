/**
 * AI 评测题目生成器
 *
 * 改为通过同源后端代理生成评测题目，避免浏览器直连第三方模型导致 CORS。
 *
 * 降级策略：超时 10 秒或代理生成失败 → 返回 null，由调用方降级到预设题库。
 */

import type { ChildSettings, QuestionBankItem } from '@/types/models'
import { validateAIQuestion } from './ai-question-schema'

/** AI 生成题目的超时时间（毫秒） */
const AI_GENERATION_TIMEOUT = 10_000

interface BackendQuestionResponse {
  question?: {
    stem: string
    options: Array<{ text: string; emoji?: string }>
    correctIndex: number
    difficulty: number
  }
  error?: string
}

function pickQuestionGenerationSettings(settings: ChildSettings) {
  return {
    llmProviderId: settings.llmProviderId,
    llmModel: settings.llmModel,
    llmApiKey: settings.llmApiKey,
    llmBaseUrl: settings.llmBaseUrl,
  }
}

/**
 * 生成评测选择题
 *
 * @param node 知识点信息（name + description）
 * @param gradeLevel 年级
 * @param subject 科目
 * @param settings 孩子设置（包含 LLM 配置）
 * @returns 生成的题目，失败返回 null（由调用方降级到预设题库）
 */
export async function generateQuestion(
  node: { id: string; name: string; description: string },
  gradeLevel: string,
  subject: string,
  settings: ChildSettings,
): Promise<QuestionBankItem | null> {
  if (!settings.llmModel || !settings.llmApiKey) {
    console.warn('[AIQuestionGenerator] LLM 未配置，跳过 AI 生成')
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_GENERATION_TIMEOUT)

  try {
    const response = await fetch('/api/pre-generate/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node,
        gradeLevel,
        subject,
        settings: pickQuestionGenerationSettings(settings),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({})) as BackendQuestionResponse
      console.warn(
        '[AIQuestionGenerator] 后端代理生成失败，将使用预设题库',
        errorPayload.error || response.status,
      )
      return null
    }

    const payload = await response.json() as BackendQuestionResponse
    const validated = payload.question ? validateAIQuestion(payload.question) : null

    if (!validated) {
      console.warn('[AIQuestionGenerator] 后端代理返回的题目未通过校验')
      return null
    }

    return {
      knowledgeNodeId: node.id,
      stem: validated.stem,
      options: validated.options,
      correctIndex: validated.correctIndex,
      difficulty: validated.difficulty,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[AIQuestionGenerator] AI 生成超时（10s），将使用预设题库')
    } else {
      console.warn('[AIQuestionGenerator] AI 生成失败，将使用预设题库', error)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}
