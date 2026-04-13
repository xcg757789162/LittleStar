/**
 * AI 评测题目生成器
 *
 * 通过同源后端代理生成评测题目，避免浏览器直连第三方模型导致 CORS。
 *
 * 降级策略：所有重试耗尽或不可重试错误 → 返回 null，由调用方降级到预设题库。
 *
 * 超时 / 重试设计：
 *   - 单次请求超时 35s（服务端 30s 上限 + 5s 网络裕量）
 *   - 可重试错误（超时 / 过载 / 限流）最多重试 2 次，指数退避
 *   - 不可重试错误（400 参数错误、校验失败）立即放弃
 */

import type { ChildSettings, QuestionBankItem } from '@/types/models'
import { validateAIQuestion } from './ai-question-schema'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('AIQuestionGen')

const REQUEST_TIMEOUT_MS = 35_000
const MAX_RETRIES = 2
const BASE_BACKOFF_MS = 2_000

interface BackendQuestionResponse {
  question?: {
    stem: string
    options: Array<{ text: string; emoji?: string }>
    correctIndex: number
    difficulty: number
  }
  error?: string
  retryable?: boolean
}

function pickQuestionGenerationSettings(settings: ChildSettings) {
  return {
    llmProviderId: settings.llmProviderId,
    llmModel: settings.llmModel,
    llmApiKey: settings.llmApiKey,
    llmBaseUrl: settings.llmBaseUrl,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function attemptGenerate(
  node: { id: string; name: string; description: string },
  gradeLevel: string,
  subject: string,
  settings: ChildSettings,
): Promise<{ result: QuestionBankItem | null; retryable: boolean; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

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
      const payload = await response.json().catch(() => ({})) as BackendQuestionResponse
      const retryable = payload.retryable ?? (response.status >= 500)
      return { result: null, retryable, error: payload.error || `HTTP ${response.status}` }
    }

    const payload = await response.json() as BackendQuestionResponse
    const validated = payload.question ? validateAIQuestion(payload.question) : null

    if (!validated) {
      return { result: null, retryable: false, error: '题目未通过校验' }
    }

    return {
      result: {
        knowledgeNodeId: node.id,
        stem: validated.stem,
        options: validated.options,
        correctIndex: validated.correctIndex,
        difficulty: validated.difficulty,
      },
      retryable: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { result: null, retryable: true, error: `请求超时 (${REQUEST_TIMEOUT_MS / 1000}s)` }
    }
    const message = error instanceof Error ? error.message : String(error)
    return { result: null, retryable: true, error: message }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 生成评测选择题（带重试）
 *
 * @returns 生成的题目，失败返回 null（由调用方降级到预设题库）
 */
export async function generateQuestion(
  node: { id: string; name: string; description: string },
  gradeLevel: string,
  subject: string,
  settings: ChildSettings,
): Promise<QuestionBankItem | null> {
  if (!settings.llmModel || !settings.llmApiKey) {
    log.warn('LLM 未配置，跳过 AI 生成')
    return null
  }

  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
      log.info(`第 ${attempt + 1} 次重试 (${node.name})，等待 ${backoff}ms...`)
      await sleep(backoff)
    }

    const { result, retryable, error } = await attemptGenerate(node, gradeLevel, subject, settings)

    if (result) {
      if (attempt > 0) {
        log.info(`重试成功 (${node.name})，第 ${attempt + 1} 次尝试`)
      }
      return result
    }

    lastError = error || '未知错误'

    if (!retryable) {
      log.warn(`不可重试错误 (${node.name}): ${lastError}，降级到预设题库`)
      return null
    }

    if (attempt < MAX_RETRIES) {
      log.warn(`可重试错误 (${node.name}): ${lastError}`)
    }
  }

  log.warn(`${MAX_RETRIES + 1} 次尝试均失败 (${node.name}): ${lastError}，降级到预设题库`)
  return null
}
