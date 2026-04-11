/**
 * AI 评测题目生成器
 *
 * 使用 Vercel AI SDK 调用 LLM 生成评测选择题。
 * 从 ChildSettings 读取 LLM 配置，直接在前端调用。
 *
 * 降级策略：超时 10 秒或生成失败 → 返回 null，由调用方降级到预设题库。
 */

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import type { ChildSettings, QuestionBankItem } from '@/types/models'
import { aiQuestionSchema, validateAIQuestion } from './ai-question-schema'

/** AI 生成题目的超时时间（毫秒） */
const AI_GENERATION_TIMEOUT = 10_000

/** 年级对应的年龄描述 */
const GRADE_AGE_MAP: Record<string, string> = {
  'middle-kindergarten': '中班（4-5岁）',
  'senior-kindergarten': '大班（5-6岁）',
  'grade-1': '一年级（6-7岁）',
  'grade-2': '二年级（7-8岁）',
  'grade-3': '三年级（8-9岁）',
  'grade-4': '四年级（9-10岁）',
  'grade-5': '五年级（10-11岁）',
  'grade-6': '六年级（11-12岁）',
}

/** 科目中文名 */
const SUBJECT_NAME_MAP: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

/**
 * 从 ChildSettings 创建 LanguageModel 实例
 *
 * 所有后端 LLM Provider 均通过 OpenAI 兼容接口调用。
 */
function createModelFromSettings(settings: ChildSettings): LanguageModel | null {
  if (!settings.llmModel || !settings.llmApiKey) {
    return null
  }

  try {
    // llmModel 格式：'openai:gpt-4o' 或 'qwen-plus' 等
    // 解析出 provider prefix 和 model id
    const colonIdx = settings.llmModel.indexOf(':')
    const modelId = colonIdx > 0
      ? settings.llmModel.substring(colonIdx + 1)
      : settings.llmModel

    const openai = createOpenAI({
      apiKey: settings.llmApiKey,
      baseURL: settings.llmBaseUrl || undefined,
    })

    return openai.chat(modelId)
  } catch {
    console.warn('[AIQuestionGenerator] 创建模型实例失败')
    return null
  }
}

/**
 * 构建生成题目的 system prompt
 */
function buildSystemPrompt(
  nodeName: string,
  nodeDescription: string,
  gradeLevel: string,
  subject: string,
): string {
  const ageDescription = GRADE_AGE_MAP[gradeLevel] || gradeLevel
  const subjectName = SUBJECT_NAME_MAP[subject] || subject

  return `你是一个面向幼儿的教育评测出题专家。

## 任务
根据给定的知识点，生成一道四选一选择题，用于评估 ${ageDescription} 孩子对 ${subjectName} 科目中「${nodeName}」知识点的掌握程度。

## 知识点信息
- 名称：${nodeName}
- 描述：${nodeDescription}
- 科目：${subjectName}
- 年龄段：${ageDescription}

## 要求
1. 题干使用简单口语化中文${subject === 'english' ? '（可中英混合）' : ''}，不超过 30 字，可用 emoji
2. 恰好 4 个选项，每个选项含 text（≤8 字）和 emoji
3. 正确答案的位置要随机（不总是第一个或最后一个）
4. 干扰项合理，不要太离谱
5. 难度 1-5（1=基本认知, 3=理解应用, 5=综合能力）
6. 只输出 JSON，不要其他文字`
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
  const model = createModelFromSettings(settings)
  if (!model) {
    console.warn('[AIQuestionGenerator] LLM 未配置，跳过 AI 生成')
    return null
  }

  try {
    // 使用 AbortController 实现超时
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      AI_GENERATION_TIMEOUT,
    )

    const systemPrompt = buildSystemPrompt(
      node.name,
      node.description,
      gradeLevel,
      subject,
    )

    const { object } = await generateObject({
      model,
      schema: aiQuestionSchema,
      system: systemPrompt,
      prompt: `请为知识点「${node.name}」生成一道评测选择题。`,
      abortSignal: controller.signal,
    })

    clearTimeout(timeout)

    // 额外校验
    const validated = validateAIQuestion(object)
    if (!validated) {
      console.warn('[AIQuestionGenerator] AI 生成的题目未通过校验')
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
  }
}
