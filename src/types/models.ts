/**
 * LittleStar 核心数据模型类型定义
 */

/** 年级等级 */
export type GradeLevel =
  | 'middle-kindergarten'   // 中班 (4-5岁)
  | 'senior-kindergarten'   // 大班 (5-6岁)
  | 'grade-1'              // 一年级 (6-7岁)
  | 'grade-2'              // 二年级 (7-8岁)
  | 'grade-3'              // 三年级 (8-9岁)
  | 'grade-4'              // 四年级 (9-10岁)
  | 'grade-5'              // 五年级 (10-11岁)
  | 'grade-6'              // 六年级 (11-12岁)

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
  /** 发音评分 0-100（语音题专用） */
  pronunciationScore?: number
  /** 发音星级 1-5（语音题专用） */
  pronunciationStars?: number
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

// ===== Phase 2: 年级解锁 + 入学测评 + 学习报告 =====

/** 年级解锁配置 */
export interface UnlockConfig {
  /** 解锁掌握度阈值（默认 80） */
  masteryThreshold: number
  /** 最少掌握知识点比例（默认 0.8） */
  minMasteredRatio: number
}

/** 年级解锁记录 — 每个孩子每个科目独立追踪 */
export interface GradeUnlock {
  id?: string
  childId: string
  subject: Subject
  gradeLevel: GradeLevel
  unlockedAt: Date
  masteryAtUnlock: number
  placementTestId?: string
}

/** 入学测评记录 */
export interface PlacementTest {
  id?: string
  childId: string
  subject: Subject
  gradeLevel: GradeLevel
  questions: PlacementQuestion[]
  startedAt: Date
  completedAt?: Date
  result?: PlacementResult
}

/** 测评题目 */
export interface PlacementQuestion {
  knowledgeNodeId: string
  questionId: string
  answer: unknown
  isCorrect: boolean
  timeSpent: number // 毫秒
}

/** 测评结果 */
export interface PlacementResult {
  masteredNodes: string[]
  startingNodes: string[]
  overallScore: number // 0-100
}

/** 学习报告数据（聚合缓存） */
export interface ReportData {
  id?: string
  childId: string
  type: 'weekly' | 'monthly'
  gradeLevel: GradeLevel
  subject?: Subject
  periodStart: string // YYYY-MM-DD
  periodEnd: string
  metrics: ReportMetrics
  generatedAt: Date
}

/** 报告指标 */
export interface ReportMetrics {
  /** 总学习时长（分钟） */
  totalLearningMinutes: number
  /** 每天学习时长（分钟） */
  dailyLearningMinutes: number[]
  /** 知识点掌握趋势 */
  knowledgeMastery: KnowledgeMasteryTrend[]
  /** 成就列表 */
  achievements: ReportAchievement[]
  /** 薄弱知识点 */
  weakPoints: WeakPoint[]
  /** 年级进度 */
  gradeProgress: GradeProgress
}

/** 知识点掌握趋势 */
export interface KnowledgeMasteryTrend {
  nodeId: string
  nodeName: string
  startLevel: number
  endLevel: number
  trend: 'up' | 'down' | 'stable'
}

/** 报告中的成就 */
export interface ReportAchievement {
  name: string
  earnedAt: Date
}

/** 薄弱知识点 */
export interface WeakPoint {
  nodeId: string
  nodeName: string
  masteryLevel: number
  suggestion: string
}

/** 年级进度 */
export interface GradeProgress {
  totalNodes: number
  masteredNodes: number
  percentage: number
  estimatedCompletionDays?: number
}

/** 掌握度每日快照 */
export interface MasterySnapshot {
  id?: string
  childId: string
  date: string // YYYY-MM-DD
  subject: Subject
  gradeLevel: GradeLevel
  /** 各知识点掌握度 */
  nodesMastery: Record<string, number>
  /** 平均掌握度 */
  averageMastery: number
}
