import type { LittleStarDB } from '@/db/database'
import type { KnowledgeNode, Question } from '@/types/models'
import { mathKnowledgeNodes, mathQuestions } from './math'
import { chineseKnowledgeNodes, chineseQuestions } from './chinese'
import { englishKnowledgeNodes, englishQuestions } from './english'
import { letterKnowledgeNodes, letterQuestions } from './english-letters'
import { songKnowledgeNodes, songQuestions } from './english-songs'
import { dialogueKnowledgeNodes, dialogueQuestions } from './english-dialogues'
import { tprKnowledgeNodes, tprQuestions } from './english-tpr'

/** 种子数据结构 */
export interface SeedData {
  knowledgeNodes: KnowledgeNode[]
  questions: Question[]
}

/** 获取数学种子数据 */
export function getMathSeedData(): SeedData {
  return {
    knowledgeNodes: mathKnowledgeNodes,
    questions: mathQuestions,
  }
}

/** 获取语文种子数据 */
export function getChineseSeedData(): SeedData {
  return {
    knowledgeNodes: chineseKnowledgeNodes,
    questions: chineseQuestions,
  }
}

/** 获取英语种子数据（包含基础 + 字母 + 儿歌 + 对话 + TPR） */
export function getEnglishSeedData(): SeedData {
  return {
    knowledgeNodes: [
      ...englishKnowledgeNodes,
      ...letterKnowledgeNodes,
      ...songKnowledgeNodes,
      ...dialogueKnowledgeNodes,
      ...tprKnowledgeNodes,
    ],
    questions: [
      ...englishQuestions,
      ...letterQuestions,
      ...songQuestions,
      ...dialogueQuestions,
      ...tprQuestions,
    ],
  }
}

/** 获取所有种子数据 */
export function getAllSeedData(): SeedData {
  const math = getMathSeedData()
  const chinese = getChineseSeedData()
  const english = getEnglishSeedData()

  return {
    knowledgeNodes: [...math.knowledgeNodes, ...chinese.knowledgeNodes, ...english.knowledgeNodes],
    questions: [...math.questions, ...chinese.questions, ...english.questions],
  }
}

/**
 * 将种子数据写入数据库
 * 幂等操作：如果数据已存在则跳过
 * 使用事务保证写入原子性
 */
export async function seedDatabase(db: LittleStarDB): Promise<void> {
  const allData = getAllSeedData()

  await db.transaction('rw', [db.knowledgeNodes, db.questions], async () => {
    // 检查是否已有数据（幂等性）
    const existingNodeCount = await db.knowledgeNodes.count()
    if (existingNodeCount > 0) {
      return // 已有数据，跳过播种
    }

    // 批量写入知识点
    await db.knowledgeNodes.bulkPut(allData.knowledgeNodes)

    // 批量写入题目
    await db.questions.bulkPut(allData.questions)
  })
}
