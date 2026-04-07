/**
 * LittleStar 核心数据模型类型定义
 */

/** 年级等级 */
export type GradeLevel = 'middle-kindergarten' | 'senior-kindergarten'

/** 科目 */
export type Subject = 'math' | 'chinese' | 'english'

/** 题目类型 */
export type QuestionType = 'flashcard' | 'multiple-choice' | 'handwriting' | 'voice'

/** 内容类型 */
export type ContentType = 'flashcard' | 'quiz' | 'writing' | 'voice'

/** 孩子设置 */
export interface ChildSettings {
  dailyLearningMinutes: number
  preferredSubjects: Subject[]
  difficultyAdjustment: number // -2 到 +2
  voiceEnabled: boolean
  soundEffectsEnabled: boolean
}

/** 用户（孩子） */
export interface Child {
  id?: string
  name: string
  avatar: string
  age: number
  gradeLevel: GradeLevel
  createdAt: Date
  settings: ChildSettings
}

/** 知识点 */
export interface KnowledgeNode {
  id?: string
  subject: Subject
  gradeLevel: GradeLevel
  name: string
  description: string
  prerequisites: string[] // 前置知识点 ID
  nextNodes: string[] // 后续知识点 ID
  difficulty: number // 1-10
  contentType: ContentType
  order: number // 学习顺序
}

/** 学习记录 */
export interface LearningRecord {
  id?: string
  childId: string
  knowledgeNodeId: string
  questionId: string
  answer: unknown
  isCorrect: boolean
  timeSpent: number // 毫秒
  attemptCount: number
  timestamp: Date
}

/** 掌握率记录 */
export interface MasteryRecord {
  id?: string
  childId: string
  knowledgeNodeId: string
  masteryLevel: number // 0-100
  lastPracticed: Date
  nextReviewDate: Date
  consecutiveCorrect: number
  totalAttempts: number
  totalCorrect: number
}

/** 题目内容 */
export interface QuestionContent {
  text: string
  imageUrl?: string
  audioUrl?: string
  options?: QuestionOption[]
  hint?: string
}

/** 题目选项 */
export interface QuestionOption {
  id: string
  text: string
  imageUrl?: string
  isCorrect: boolean
}

/** 题目 */
export interface Question {
  id?: string
  knowledgeNodeId: string
  type: QuestionType
  content: QuestionContent
  answer: unknown
  difficulty: number
  isAIGenerated: boolean
  templateId?: string
}

/** AI 出题模板 */
export interface QuestionTemplate {
  id?: string
  subject: Subject
  gradeLevel: GradeLevel
  knowledgeNodeId: string
  templateType: string
  prompt: string
  constraints: Record<string, unknown>
  validationRules: Record<string, unknown>
}

/** 成就类型 */
export type AchievementType = 'milestone' | 'streak' | 'planet' | 'special'

/** 成就 */
export interface Achievement {
  id?: string
  childId: string
  type: AchievementType
  name: string
  description: string
  earnedAt: Date
  metadata: Record<string, unknown>
}

/** 每日学习会话 */
export interface DailySession {
  id?: string
  childId: string
  date: string // YYYY-MM-DD
  startTime: Date
  endTime?: Date
  questionsCompleted: number
  correctCount: number
  subjects: Subject[]
  streak: number
}
