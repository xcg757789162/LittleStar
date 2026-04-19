/**
 * 题库加载器
 *
 * 年级维度下线 + 预置课程也走 Socratic 初始化后，所有题库都由后端
 * course-initializer 在初始化时写入 `api.placement_questions`（按 subject 存储）。
 * 本模块负责按 subject 读取并缓存成 `Map<knowledgeNodeId, QuestionBankItem[]>`，
 * 供 placement-test-engine 选题。
 */

import type { Subject, QuestionBankItem, PlacementQuestionOption } from '@/types/models'
import { apiClient } from '@/services/api'

/** 内存缓存：subject → Map<nodeId, QuestionBankItem[]> */
const bankCache = new Map<string, Map<string, QuestionBankItem[]>>()

/**
 * 加载指定学科的预设题库
 *
 * @param subject 学科 slug
 * @returns 知识点 ID → 题目数组 的 Map；无数据时返回空 Map（由上层降级到 AI 生成）
 */
export async function loadQuestionBank(
  subject: Subject,
): Promise<Map<string, QuestionBankItem[]>> {
  const cached = bankCache.get(subject)
  if (cached) return cached

  const dbMap = await loadQuestionBankFromDB(subject)
  bankCache.set(subject, dbMap)
  if (dbMap.size === 0) {
    console.warn(`[QuestionBank] 题库 ${subject} DB 中未找到题目`)
  } else {
    console.info(
      `[QuestionBank] 题库 ${subject} 从 DB 加载成功，共 ${dbMap.size} 个知识点`,
    )
  }
  return dbMap
}

/**
 * 从题库中按知识点获取题目
 *
 * @param bank 已加载的题库 Map
 * @param nodeId 知识点 ID
 * @param difficulty 可选：'easy' 取最低难度，'hard' 取最高难度
 */
export function getQuestionFromBank(
  bank: Map<string, QuestionBankItem[]>,
  nodeId: string,
  difficulty?: 'easy' | 'hard',
): QuestionBankItem | null {
  const questions = bank.get(nodeId)
  if (!questions || questions.length === 0) return null

  if (!difficulty) {
    return questions[Math.floor(Math.random() * questions.length)]
  }

  const sorted = [...questions].sort((a, b) => a.difficulty - b.difficulty)
  return difficulty === 'easy' ? sorted[0] : sorted[sorted.length - 1]
}

/**
 * 从 PostgREST 读取题库（按 subject 归集）
 *
 * DB 表 api.placement_questions 年级维度下线后仅按 subject 过滤；
 * apiClient 会自动做 snake → camel 转换。
 */
interface PlacementQuestionRow {
  id: number
  subject: string
  knowledgeNodeId: string
  source: 'preset' | 'ai'
  stem: string
  options: PlacementQuestionOption[]
  correctIndex: number
  difficulty: number
  createdAt?: string
}

async function loadQuestionBankFromDB(
  subject: Subject,
): Promise<Map<string, QuestionBankItem[]>> {
  const map = new Map<string, QuestionBankItem[]>()
  try {
    const rows = await apiClient.get<PlacementQuestionRow>('/placement_questions', {
      filters: [{ column: 'subject', operator: 'eq', value: subject }],
      select: 'knowledge_node_id,stem,options,correct_index,difficulty',
    })

    for (const row of rows) {
      if (
        !row.stem ||
        !Array.isArray(row.options) ||
        row.options.length < 2 ||
        typeof row.correctIndex !== 'number' ||
        row.correctIndex < 0 ||
        row.correctIndex >= row.options.length
      ) {
        continue
      }
      const item: QuestionBankItem = {
        knowledgeNodeId: row.knowledgeNodeId,
        stem: row.stem,
        options: row.options,
        correctIndex: row.correctIndex,
        difficulty: Math.max(1, Math.min(5, row.difficulty ?? 2)),
      }
      const list = map.get(row.knowledgeNodeId)
      if (list) list.push(item)
      else map.set(row.knowledgeNodeId, [item])
    }
  } catch (err) {
    console.warn(`[QuestionBank] DB 查询 ${subject} 失败:`, err)
  }
  return map
}

/**
 * 清除题库缓存（测试用 / 课程重新初始化后调用以拉新题）
 */
export function clearQuestionBankCache(): void {
  bankCache.clear()
}
