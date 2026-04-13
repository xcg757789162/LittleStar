import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import type { ChildSettings } from '../types/models.js'
import { BACKEND_LLM_PROVIDERS } from '../shared/backend-llm-providers.js'

export type QuestionGenerationSettings = Pick<
  ChildSettings,
  'llmProviderId' | 'llmModel' | 'llmApiKey' | 'llmBaseUrl'
>

export type QuestionProviderType = 'openai' | 'anthropic' | 'google'

const MODEL_PROVIDER_FALLBACKS: Array<{
  pattern: RegExp
  providerId: string
}> = [
  { pattern: /^(qwen|qwq)/i, providerId: 'qwen' },
  { pattern: /^deepseek/i, providerId: 'deepseek' },
  { pattern: /^doubao/i, providerId: 'doubao' },
  { pattern: /^(gpt-|o[1-9]|chatgpt-)/i, providerId: 'openai' },
  { pattern: /^gemini/i, providerId: 'gemini' },
  { pattern: /^claude/i, providerId: 'anthropic' },
  { pattern: /^minimax/i, providerId: 'minimax' },
]

const PROVIDER_TYPE_ALIASES: Record<string, QuestionProviderType> = {
  openai: 'openai',
  'backend-openai': 'openai',
  qwen: 'openai',
  'backend-qwen': 'openai',
  deepseek: 'openai',
  'backend-deepseek': 'openai',
  doubao: 'openai',
  'backend-doubao': 'openai',
  'custom-llm': 'openai',
  'backend-custom': 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  minimax: 'anthropic',
  google: 'google',
  gemini: 'google',
  'backend-gemini': 'google',
}

const DEFAULT_BASE_URL_BY_PROVIDER_ID: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  deepseek: 'https://api.deepseek.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  anthropic: 'https://api.anthropic.com/v1',
  minimax: 'https://api.minimaxi.com/anthropic/v1',
}

function normalizeProviderId(providerId?: string): string | undefined {
  const normalized = providerId?.trim().toLowerCase()
  return normalized || undefined
}

function getBackendLLMProvider(providerId?: string) {
  if (!providerId) {
    return undefined
  }

  return BACKEND_LLM_PROVIDERS.find((item) => item.id === providerId)
}

function extractModelParts(llmModel: string): { providerHint?: string; modelId: string } {
  const normalizedModel = llmModel.trim()
  const colonIdx = normalizedModel.indexOf(':')

  if (colonIdx > 0) {
    return {
      providerHint: normalizeProviderId(normalizedModel.substring(0, colonIdx)),
      modelId: normalizedModel.substring(colonIdx + 1).trim(),
    }
  }

  return {
    modelId: normalizedModel,
  }
}

export function inferProviderIdFromLLMModel(llmModel: string): string | undefined {
  const { providerHint, modelId } = extractModelParts(llmModel)

  if (providerHint) {
    if (PROVIDER_TYPE_ALIASES[providerHint]) {
      return providerHint
    }

    if (getBackendLLMProvider(`backend-${providerHint}`)) {
      return `backend-${providerHint}`
    }
  }

  return MODEL_PROVIDER_FALLBACKS.find((item) => item.pattern.test(modelId))?.providerId
}

export function resolveQuestionProviderId(settings: QuestionGenerationSettings): string | undefined {
  const normalizedProviderId = normalizeProviderId(settings.llmProviderId)

  if (normalizedProviderId && !['backend-custom', 'custom-llm'].includes(normalizedProviderId)) {
    return normalizedProviderId
  }

  return inferProviderIdFromLLMModel(settings.llmModel) ?? normalizedProviderId
}

export function resolveQuestionProviderType(settings: QuestionGenerationSettings): QuestionProviderType {
  const providerId = resolveQuestionProviderId(settings)

  if (providerId) {
    const mappedType = PROVIDER_TYPE_ALIASES[providerId]
    if (mappedType) {
      return mappedType
    }

    const backendProvider = getBackendLLMProvider(providerId)
    if (backendProvider?.providerPrefix === 'google') {
      return 'google'
    }
  }

  return 'openai'
}

export function resolveLLMBaseUrl(settings: QuestionGenerationSettings): string | undefined {
  if (settings.llmBaseUrl?.trim()) {
    return settings.llmBaseUrl.trim()
  }

  const providerId = resolveQuestionProviderId(settings)
  const backendProvider = getBackendLLMProvider(providerId)
  if (backendProvider?.defaultBaseUrl) {
    return backendProvider.defaultBaseUrl
  }

  if (providerId) {
    return DEFAULT_BASE_URL_BY_PROVIDER_ID[providerId]
  }

  return undefined
}

export function createQuestionModel(settings: QuestionGenerationSettings): LanguageModel | null {
  if (!settings.llmModel || !settings.llmApiKey) {
    return null
  }

  const { modelId } = extractModelParts(settings.llmModel)
  const baseURL = resolveLLMBaseUrl(settings)

  try {
    switch (resolveQuestionProviderType(settings)) {
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: settings.llmApiKey,
          baseURL,
        })
        return anthropic.chat(modelId)
      }

      case 'google': {
        const google = createGoogleGenerativeAI({
          apiKey: settings.llmApiKey,
          baseURL,
        })
        return google.chat(modelId)
      }

      case 'openai':
      default: {
        const openai = createOpenAI({
          apiKey: settings.llmApiKey,
          baseURL,
        })
        return openai.chat(modelId)
      }
    }
  } catch {
    return null
  }
}
