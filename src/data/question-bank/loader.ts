/**
 * 预设题库加载器
 *
 * 从 JSON 文件加载预设评测题目，按知识点 ID 索引。
 * 每个科目+年级组合对应一个 JSON 文件。
 *
 * 注意：使用静态 import 确保 Vite 打包时正确包含 JSON 文件，
 * 避免纯动态 import(`./${var}`) 在生产构建后找不到模块。
 */

import type { Subject, GradeLevel, QuestionBankItem } from '@/types/models'

// === 静态 import 所有题库 JSON ===
// 中班（4-5岁）
import mathMiddleKindergarten from './math-middle-kindergarten.json'
import chineseMiddleKindergarten from './chinese-middle-kindergarten.json'
import englishMiddleKindergarten from './english-middle-kindergarten.json'
// 大班（5-6岁）
import mathSeniorKindergarten from './math-senior-kindergarten.json'
import chineseSeniorKindergarten from './chinese-senior-kindergarten.json'
import englishSeniorKindergarten from './english-senior-kindergarten.json'
// 一年级（6-7岁）
import mathGrade1 from './math-grade-1.json'
import chineseGrade1 from './chinese-grade-1.json'
import englishGrade1 from './english-grade-1.json'

/** 题库 JSON 文件格式：知识点 ID → 题目数组 */
export type QuestionBankData = Record<string, QuestionBankItem[]>

/** 静态题库映射表（确保 Vite 打包时正确包含） */
const questionBankRegistry: Record<string, QuestionBankData> = {
  // 中班
  'math:middle-kindergarten': mathMiddleKindergarten as unknown as QuestionBankData,
  'chinese:middle-kindergarten': chineseMiddleKindergarten as unknown as QuestionBankData,
  'english:middle-kindergarten': englishMiddleKindergarten as unknown as QuestionBankData,
  // 大班
  'math:senior-kindergarten': mathSeniorKindergarten as unknown as QuestionBankData,
  'chinese:senior-kindergarten': chineseSeniorKindergarten as unknown as QuestionBankData,
  'english:senior-kindergarten': englishSeniorKindergarten as unknown as QuestionBankData,
  // 一年级
  'math:grade-1': mathGrade1 as unknown as QuestionBankData,
  'chinese:grade-1': chineseGrade1 as unknown as QuestionBankData,
  'english:grade-1': englishGrade1 as unknown as QuestionBankData,
}

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
    // 从静态注册表获取题库数据
    const data: QuestionBankData | undefined = questionBankRegistry[cacheKey]

    if (!data) {
      console.warn(
        `[QuestionBank] 题库 ${subject}-${gradeLevel} 未注册，将使用 AI 生成题目`,
      )
      const emptyMap = new Map<string, QuestionBankItem[]>()
      bankCache.set(cacheKey, emptyMap)
      return emptyMap
    }

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

    console.info(
      `[QuestionBank] 题库 ${subject}-${gradeLevel} 加载成功，共 ${questionMap.size} 个知识点`,
    )

    // 缓存
    bankCache.set(cacheKey, questionMap)

    return questionMap
  } catch (err) {
    console.warn(
      `[QuestionBank] 题库 ${subject}-${gradeLevel} 加载失败:`, err,
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
