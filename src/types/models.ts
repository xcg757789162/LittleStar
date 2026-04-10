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

// ===== 用户认证模型 =====

/** 用户（家长） */
export interface User {
  id?: string
  /** 用户名（唯一） */
  username: string
  /** 密码哈希（简易版本使用 btoa 编码，生产环境应使用 bcrypt） */
  passwordHash: string
  /** 昵称 */
  nickname: string
  /** 创建时间 */
  createdAt: Date
  /** 最后登录时间 */
  lastLoginAt?: Date
}

/** Agent 模式 */
export type ClassroomAgentMode = 'preset' | 'auto'

/** 孩子设置 */
export interface ChildSettings {
  dailyLearningMinutes: number
  preferredSubjects: Subject[]
  difficultyAdjustment: number // -2 到 +2
  voiceEnabled: boolean
  soundEffectsEnabled: boolean

  // === 高级课堂设置（Pipeline Client 使用） ===

  /** TTS 语音合成开关 */
  enableTTS: boolean
  /** TTS 服务提供商 ID（如 'volcengine', 'azure', 'openai'） */
  ttsProviderId: string
  /** TTS 语音 ID */
  ttsVoice: string
  /** TTS 语速（0.5-2.0） */
  ttsSpeed: number
  /** 图片生成开关 */
  enableImageGeneration: boolean
  /** 视频生成开关 */
  enableVideoGeneration: boolean
  /** 课堂 Agent 模式：preset(预设角色) | auto(自动生成) */
  classroomAgentMode: ClassroomAgentMode
  /** 学生自我介绍（传给 OpenMAIC 的 userBio） */
  selfIntroduction: string
  /** LLM 模型标识（如 'openai:gpt-4o'） */
  llmModel: string
  /** LLM API Key */
  llmApiKey: string
  /** LLM Base URL */
  llmBaseUrl: string
}

/** 高级课堂设置默认值 */
export const DEFAULT_ADVANCED_SETTINGS: Pick<ChildSettings,
  | 'enableTTS' | 'ttsProviderId' | 'ttsVoice' | 'ttsSpeed'
  | 'enableImageGeneration' | 'enableVideoGeneration'
  | 'classroomAgentMode' | 'selfIntroduction'
  | 'llmModel' | 'llmApiKey' | 'llmBaseUrl'
> = {
  enableTTS: true,
  ttsProviderId: '',
  ttsVoice: '',
  ttsSpeed: 1.0,
  enableImageGeneration: false,
  enableVideoGeneration: false,
  classroomAgentMode: 'preset',
  selfIntroduction: '',
  llmModel: '',
  llmApiKey: '',
  llmBaseUrl: '',
}

/** 用户（孩子） */
export interface Child {
  id?: string
  /** 所属用户（家长）ID */
  userId: string
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
  orderIndex: number // 学习顺序
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
  /** 重学次数（每次"再学一遍"时 +1） */
  reviewCount?: number
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
  /** 关联的课堂 ID（OpenMAIC 课堂） */
  classroomId?: string
  /** 关联的知识点 ID */
  knowledgeNodeId?: string
  /** 是否为复习/重学会话 */
  isReview?: boolean
  /** 学习轮次（第几次学这个知识点） */
  round?: number
}

/** 课堂学习历史（持久化已完成的课堂记录） */
export interface ClassroomHistory {
  id?: string
  /** 孩子 ID */
  childId: string
  /** 知识点 ID */
  knowledgeNodeId: string
  /** 知识点名称 */
  knowledgeNodeName: string
  /** 科目 */
  subject: Subject
  /** 课堂 ID（OpenMAIC） */
  classroomId: string
  /** 课堂标题 */
  classroomTitle: string
  /** 课堂 JSON 数据（完整 Classroom 对象序列化） */
  classroomData: string
  /** 学习日期 YYYY-MM-DD */
  date: string
  /** 完成时间 */
  completedAt: Date
  /** 学习轮次（第几次学这个知识点） */
  round: number
  /** 是否为复习/重学 */
  isReview: boolean
  /** 答题数 */
  questionsCompleted: number
  /** 正确数 */
  correctCount: number
  /** 正确率 0-100 */
  accuracy: number
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
