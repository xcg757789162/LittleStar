/**
 * 预设题库加载器
 *
 * 从 JSON 文件加载预设评测题目，按知识点 ID 索引。
 * 每个科目+年级组合对应一个 JSON 文件。
 */

import type { Subject, GradeLevel, QuestionBankItem } from '@/types/models'

/** 题库 JSON 文件格式：知识点 ID → 题目数组 */
export type QuestionBankData = Record<string, QuestionBankItem[]>

/** 内存缓存 */
const bankCache = new Map<string, Map<string, QuestionBankItem[]>>()

/** 生成缓存 key */
function getCacheKey(subject: Subject, gradeLevel: GradeLevel): string {
  return `${subject}:${gradeLevel}`
}

/**
 * 加载指定科目+年级的预设题库
 *
 * @param subject 科目
 * @param gradeLevel 年级
 * @returns 知识点 ID → 题目数组 的 Map，加载失败返回空 Map
 */
export async function loadQuestionBank(
  subject: Subject,
  gradeLevel: GradeLevel,
): Promise<Map<string, QuestionBankItem[]>> {
  const cacheKey = getCacheKey(subject, gradeLevel)

  // 检查缓存
  const cached = bankCache.get(cacheKey)
  if (cached) return cached

  try {
    // 将 gradeLevel 转换为文件名格式（如 middle-kindergarten）
    const fileName = `${subject}-${gradeLevel}.json`
    // 动态 import JSON 文件
    const data: QuestionBankData = (await import(`./${fileName}`)).default

    // 转换为 Map
    const questionMap = new Map<string, QuestionBankItem[]>()
    for (const [nodeId, questions] of Object.entries(data)) {
      // 校验题目格式
      const validQuestions = questions.filter(
        (q) =>
          q.stem &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3 &&
          q.difficulty >= 1 &&
          q.difficulty <= 5,
      )
      if (validQuestions.length > 0) {
        // 为每个题目补充 knowledgeNodeId
        questionMap.set(
          nodeId,
          validQuestions.map((q) => ({
            ...q,
            knowledgeNodeId: nodeId,
          })),
        )
      }
    }

    // 缓存
    bankCache.set(cacheKey, questionMap)

    return questionMap
  } catch {
    console.warn(
      `[QuestionBank] 题库 ${subject}-${gradeLevel} 加载失败，将使用 AI 生成题目`,
    )
    // 返回空 Map（由调用方降级到 AI 生成）
    const emptyMap = new Map<string, QuestionBankItem[]>()
    bankCache.set(cacheKey, emptyMap)
    return emptyMap
  }
}

/**
 * 从题库中按知识点获取题目
 *
 * @param bank 已加载的题库 Map
 * @param nodeId 知识点 ID
 * @param difficulty 可选：按难度筛选（'easy' 取最低难度，'hard' 取最高难度）
 * @returns 题目，未找到返回 null
 */
export function getQuestionFromBank(
  bank: Map<string, QuestionBankItem[]>,
  nodeId: string,
  difficulty?: 'easy' | 'hard',
): QuestionBankItem | null {
  const questions = bank.get(nodeId)
  if (!questions || questions.length === 0) return null

  if (!difficulty) {
    // 随机选一题
    return questions[Math.floor(Math.random() * questions.length)]
  }

  // 按难度排序
  const sorted = [...questions].sort((a, b) => a.difficulty - b.difficulty)
  return difficulty === 'easy' ? sorted[0] : sorted[sorted.length - 1]
}

/**
 * 清除题库缓存（测试用）
 */
export function clearQuestionBankCache(): void {
  bankCache.clear()
}
