import Dexie, { type EntityTable } from 'dexie'
import type {
  Child,
  KnowledgeNode,
  LearningRecord,
  MasteryRecord,
  Question,
  QuestionTemplate,
  Achievement,
  DailySession,
} from '@/types/models'

/**
 * LittleStar 本地数据库
 * 基于 Dexie.js (IndexedDB) 实现
 */
export class LittleStarDB extends Dexie {
  /** 孩子表 */
  children!: EntityTable<Child, 'id'>
  /** 知识点表 */
  knowledgeNodes!: EntityTable<KnowledgeNode, 'id'>
  /** 学习记录表 */
  learningRecords!: EntityTable<LearningRecord, 'id'>
  /** 掌握率记录表 */
  masteryRecords!: EntityTable<MasteryRecord, 'id'>
  /** 题目表 */
  questions!: EntityTable<Question, 'id'>
  /** AI 出题模板表 */
  questionTemplates!: EntityTable<QuestionTemplate, 'id'>
  /** 成就表 */
  achievements!: EntityTable<Achievement, 'id'>
  /** 每日学习会话表 */
  dailySessions!: EntityTable<DailySession, 'id'>

  constructor(databaseName: string = 'LittleStarDB') {
    super(databaseName)

    this.version(1).stores({
      // 孩子表：自增主键，按名称索引
      children: '++id, name, gradeLevel',

      // 知识点表：字符串主键（支持预设 ID），按科目、年级、难度索引
      knowledgeNodes: 'id, subject, [subject+gradeLevel], difficulty, order',

      // 学习记录表：自增主键，按孩子ID、知识点ID、时间索引
      learningRecords: '++id, childId, knowledgeNodeId, [childId+knowledgeNodeId], timestamp',

      // 掌握率记录表：自增主键，按孩子+知识点联合索引
      masteryRecords: '++id, childId, knowledgeNodeId, [childId+knowledgeNodeId], nextReviewDate',

      // 题目表：字符串主键（支持预设 ID），按知识点ID、类型索引
      questions: 'id, knowledgeNodeId, type, [knowledgeNodeId+type], difficulty, isAIGenerated',

      // AI 出题模板表：自增主键，按科目、知识点索引
      questionTemplates: '++id, subject, knowledgeNodeId, [subject+gradeLevel]',

      // 成就表：自增主键，按孩子ID、类型索引
      achievements: '++id, childId, type, [childId+type], earnedAt',

      // 每日学习会话表：自增主键，按孩子ID、日期索引
      dailySessions: '++id, childId, date, [childId+date]',
    })
  }
}

/** 默认数据库实例 */
export const db = new LittleStarDB()
