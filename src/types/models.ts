/**
 * LittleStar 核心数据模型类型定义
 *
 * 年级（GradeLevel）概念已于 2026-04 下线：改以"孩子年龄 + 课程 requirement_spec"
 * 作为难度锚点，课程按需通过 Socratic 初始化 + 课程链动态续作来衔接难度。
 */

/**
 * 科目 slug
 *
 * 历史上只有 'math' | 'chinese' | 'english' 三个字面量，新的热拔插课程体系下，
 * 任何 `api.courses.slug` 值都是合法 Subject（如 'biology' / 'finance' / 'trigonometry'）。
 * 保留 BUILTIN_SUBJECTS 作为预置回退。
 */
export type Subject = string

/** 预置系统课程 slug（与 api.courses.is_system=TRUE 的种子数据对应） */
export const BUILTIN_SUBJECTS = ['math', 'chinese', 'english'] as const
export type BuiltinSubject = typeof BUILTIN_SUBJECTS[number]

/** 判断是否为预置课程 slug */
export function isBuiltinSubject(s: string): s is BuiltinSubject {
  return (BUILTIN_SUBJECTS as readonly string[]).includes(s)
}

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

  /** LLM 提供商选择器 ID（对应 BACKEND_LLM_PROVIDERS 中的 id） */
  llmProviderId: string
  /** LLM 模型标识（如 'openai:gpt-4o'），由提供商选择器自动拼接 */
  llmModel: string
  /** LLM API Key */
  llmApiKey: string
  /** LLM Base URL */
  llmBaseUrl: string

  /** TTS 语音合成开关 */
  enableTTS: boolean
  /** TTS 服务提供商 ID（如 'minimax', 'openai'） */
  ttsProviderId: string
  /** TTS API Key（独立于 LLM 的 API Key） */
  ttsApiKey: string
  /** TTS 语音 ID */
  ttsVoice: string
  /** TTS 语速（0.5-2.0） */
  ttsSpeed: number

  /** ASR 语音识别开关 */
  enableASR: boolean
  /** ASR 服务提供商 ID（如 'openai-whisper', 'qwen-asr', 'browser-native'） */
  asrProviderId: string
  /** ASR API Key */
  asrApiKey: string
  /** ASR Base URL */
  asrBaseUrl: string
  /** ASR 语言（默认 auto） */
  asrLanguage: string

  /** ISE 发音评测开关 */
  enableISE: boolean
  /** ISE 服务提供商 ID（如 'iflytek-ise', 'text-match-fallback'） */
  iseProviderId: string
  /** ISE App ID（讯飞） */
  iseAppId: string
  /** ISE API Key（讯飞） */
  iseApiKey: string
  /** ISE API Secret（讯飞） */
  iseApiSecret: string

  /** WebSearch 网络搜索开关 */
  enableWebSearch: boolean
  /** WebSearch 提供商 ID（如 'tavily'） */
  webSearchProviderId: string
  /** WebSearch API Key */
  webSearchApiKey: string

  /** PDF 文档解析开关 */
  enablePDF: boolean
  /** PDF 文档解析提供商 ID（如 'unpdf', 'mineru'） */
  pdfProviderId: string
  /** PDF API Key */
  pdfApiKey: string
  /** PDF Base URL */
  pdfBaseUrl: string

  /** 图片生成开关 */
  enableImageGeneration: boolean
  /** 图片生成提供商 ID（如 'qwen-image', 'minimax'） */
  imageProviderId: string
  /** 图片生成 API Key */
  imageApiKey: string
  /** 图片生成 Base URL */
  imageBaseUrl: string

  /** 视频生成开关 */
  enableVideoGeneration: boolean
  /** 视频生成提供商 ID（如 'seedance', 'kling', 'minimax-video'） */
  videoProviderId: string
  /** 视频生成 API Key */
  videoApiKey: string
  /** 视频生成 Base URL */
  videoBaseUrl: string

  /** 图片生成模型 ID（如 'dall-e-3', 'seedream-3.0'） */
  imageModelId: string
  /** 视频生成模型 ID（如 'seedance-1-0'） */
  videoModelId: string

  /** 课堂 Agent 模式：preset(预设角色) | auto(自动生成) */
  classroomAgentMode: ClassroomAgentMode
  /** 已选中的学生角色 ID 列表（不含 teacher，teacher 始终启用） */
  selectedAgents: string[]
  /** 角色音色映射：角色 ID → voice_id（覆盖默认音色） */
  agentVoiceMap: Record<string, string>
  /** 教师音色 voice_id（空字符串表示使用默认） */
  teacherVoice: string
  /** 课堂讨论最大轮数（1-10） */
  maxDiscussionRounds: number
  /** 学生自我介绍（传给 OpenMAIC 的 userBio） */
  selfIntroduction: string
}

/** 高级课堂设置默认值 */
export const DEFAULT_ADVANCED_SETTINGS: Pick<ChildSettings,
  | 'llmProviderId' | 'llmModel' | 'llmApiKey' | 'llmBaseUrl'
  | 'enableTTS' | 'ttsProviderId' | 'ttsApiKey' | 'ttsVoice' | 'ttsSpeed'
  | 'enableASR' | 'asrProviderId' | 'asrApiKey' | 'asrBaseUrl' | 'asrLanguage'
  | 'enableISE' | 'iseProviderId' | 'iseAppId' | 'iseApiKey' | 'iseApiSecret'
  | 'enableWebSearch' | 'webSearchProviderId' | 'webSearchApiKey'
  | 'enablePDF' | 'pdfProviderId' | 'pdfApiKey' | 'pdfBaseUrl'
  | 'enableImageGeneration' | 'imageProviderId' | 'imageApiKey' | 'imageBaseUrl' | 'imageModelId'
  | 'enableVideoGeneration' | 'videoProviderId' | 'videoApiKey' | 'videoBaseUrl' | 'videoModelId'
  | 'classroomAgentMode' | 'selfIntroduction'
  | 'selectedAgents' | 'agentVoiceMap' | 'teacherVoice' | 'maxDiscussionRounds'
> = {
  llmProviderId: 'backend-qwen',
  llmModel: '',
  llmApiKey: '',
  llmBaseUrl: '',
  enableTTS: true,
  ttsProviderId: '',
  ttsApiKey: '',
  ttsVoice: '',
  ttsSpeed: 1.0,
  enableASR: true,
  asrProviderId: 'openai-whisper',
  asrApiKey: '',
  asrBaseUrl: '',
  asrLanguage: 'auto',
  enableISE: false,
  iseProviderId: 'text-match-fallback',
  iseAppId: '',
  iseApiKey: '',
  iseApiSecret: '',
  enableWebSearch: false,
  webSearchProviderId: 'tavily',
  webSearchApiKey: '',
  enablePDF: false,
  pdfProviderId: 'unpdf',
  pdfApiKey: '',
  pdfBaseUrl: '',
  enableImageGeneration: true,
  imageProviderId: '',
  imageApiKey: '',
  imageBaseUrl: '',
  imageModelId: '',
  enableVideoGeneration: true,
  videoProviderId: '',
  videoApiKey: '',
  videoBaseUrl: '',
  videoModelId: '',
  classroomAgentMode: 'preset',
  selfIntroduction: '',
  selectedAgents: ['assistant', 'showoff', 'curious'],
  agentVoiceMap: {},
  teacherVoice: '',
  maxDiscussionRounds: 3,
}

/** 用户（孩子） */
export interface Child {
  id?: string
  /** 所属用户（家长）ID */
  userId: string
  name: string
  avatar: string
  age: number
  createdAt: Date
  settings: ChildSettings
}

/** 知识点 */
export interface KnowledgeNode {
  id?: string
  subject: Subject
  name: string
  description: string
  prerequisites: string[] // 前置知识点 ID
  nextNodes: string[] // 后续知识点 ID
  difficulty: number // 1-10
  contentType: ContentType
  orderIndex: number // 学习顺序
  templatePrompts: TemplatePromptData[]
  totalLessons: number | null // null = AI 尚未拆分
}

/** 知识点课时模板提示 */
export interface TemplatePromptData {
  type: string
  prompt: string
  constraints: Record<string, unknown>
}

/** 知识点课时计划（AI 拆分的单课时） */
export interface KnowledgeNodeLesson {
  id?: number
  knowledgeNodeId: string
  lessonIndex: number
  title: string
  description: string
  focusPoints: string[]
  createdAt?: Date
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
  /** 课时序号（1-based，该知识点的第几节课） */
  lessonIndex: number
}

// ===== 入学测评 =====

/** 评测阶段 */
export type PlacementPhase = 'single' | 'phase1' | 'phase2'

/** 入学测评记录 */
export interface PlacementTest {
  id?: string
  childId: string
  subject: Subject
  questions: PlacementQuestion[]
  startedAt: Date
  completedAt?: Date
  result?: PlacementResult
  /** 评测阶段：single(旧版单阶段) | phase1(摸底) | phase2(验证) */
  phase: PlacementPhase
  /** 阶段一分析结果（仅 phase2 记录使用） */
  phase1Result?: Phase1Analysis
  /** 关联的阶段一记录 ID（仅 phase2 记录使用） */
  parentTestId?: string
}

/** 测评题目（扩展支持选择题） */
export interface PlacementQuestion {
  knowledgeNodeId: string
  questionId: string
  answer: unknown
  isCorrect: boolean
  timeSpent: number // 毫秒
  /** 题干文本 */
  stem?: string
  /** 4 个选项 */
  options?: PlacementQuestionOption[]
  /** 正确选项索引 0-3 */
  correctIndex?: number
  /** 用户选择的索引 */
  selectedIndex?: number
  /** 是否超时未答 */
  timedOut?: boolean
  /** 题目来源 */
  source?: 'preset' | 'ai'
  /** 难度 1-5 */
  difficulty?: number
}

/** 评测选择题选项 */
export interface PlacementQuestionOption {
  /** 选项文字 */
  text: string
  /** 选项 emoji（可选） */
  emoji?: string
}

/** 预设题库中的题目格式 */
export interface QuestionBankItem {
  /** 关联知识点 ID */
  knowledgeNodeId: string
  /** 题干 */
  stem: string
  /** 4 个选项 */
  options: PlacementQuestionOption[]
  /** 正确选项索引 0-3 */
  correctIndex: number
  /** 难度 1-5 */
  difficulty: number
}

/**
 * 评测场景类型（核心引擎根据场景调整出题策略和 AI prompt 语境）
 * - placement: 入学/初始水平测评
 * - exam: 课后/阶段性考试
 * - practice: 针对性练习（根据薄弱点出题加强）
 */
export type AssessmentType = 'placement' | 'exam' | 'practice'

/** 阶段二模式 */
export type Phase2Mode = 'verify' | 'challenge' | 'mixed'

/** Phase 1 单题作答摘要（供 Phase 2 自适应出题使用） */
export interface Phase1AnswerSummary {
  nodeId: string
  nodeName: string
  moduleId: string
  isCorrect: boolean
  timeSpent: number
  timedOut: boolean
}

/** Phase 2 出题上下文（传给 AI，让 LLM 根据学生表现出针对性题目） */
export interface Phase2QuestionContext {
  assessmentType: AssessmentType
  phase2Mode: Phase2Mode
  overallPhase1Score: number
  sameModulePerformance?: {
    nodeName: string
    isCorrect: boolean
    difficulty: number
  }[]
  purpose: string
}

/** 阶段一分析结果 */
export interface Phase1Analysis {
  /** 薄弱模块 ID 列表 */
  weakModules: string[]
  /** 不确定的知识点（答对但耗时长，或相邻知识点结果矛盾） */
  uncertainNodes: string[]
  /** 阶段一总得分 0-100 */
  overallPhase1Score: number
  /** 各模块得分 */
  moduleScores: Record<string, number>
  /** 是否需要阶段二（始终为 true，评测的目的是精准定位水平） */
  needsPhase2: boolean
  /**
   * 阶段二模式：
   * - 'verify'：阶段一表现差（<60%），用简单题验证薄弱点
   * - 'challenge'：阶段一表现优秀（>=80%），用更难的题找到真实上限
   * - 'mixed'：阶段一表现一般（60-80%），验证+挑战混合
   */
  phase2Mode: Phase2Mode
  /** Phase 1 每道题的作答摘要（传给 Phase 2 AI 出题用） */
  answerSummaries: Phase1AnswerSummary[]
}

/** 测评结果 */
export interface PlacementResult {
  masteredNodes: string[]
  startingNodes: string[]
  overallScore: number // 0-100
}

// ===== MiniMax 音色与预设角色 =====

/** MiniMax TTS 音色定义 */
export interface MiniMaxVoice {
  /** MiniMax 官方 voice_id */
  id: string
  /** 中文显示名 */
  label: string
  /** 性别分类 */
  gender: 'male' | 'female' | 'boy' | 'girl'
}

/** 预设课堂角色定义 */
export interface PresetAgent {
  /** 角色唯一 ID */
  id: string
  /** 角色名称（中文） */
  name: string
  /** 角色图标 */
  emoji: string
  /** 角色描述 */
  description: string
  /** 默认 MiniMax 音色 voice_id */
  defaultVoice: string
  /** 是否为教师角色（教师不可取消） */
  isTeacher: boolean
}

/** OpenAI TTS 音色列表 */
export const OPENAI_VOICES: { id: string; label: string }[] = [
  { id: 'alloy', label: 'Alloy (中性)' },
  { id: 'echo', label: 'Echo (男声)' },
  { id: 'fable', label: 'Fable (叙事)' },
  { id: 'onyx', label: 'Onyx (低沉男声)' },
  { id: 'nova', label: 'Nova (女声)' },
  { id: 'shimmer', label: 'Shimmer (柔和女声)' },
]

/** MiniMax 官方系统音色列表（12 个） */
export const MINIMAX_VOICES: MiniMaxVoice[] = [
  // 👧 女声
  { id: 'female-tianmei', label: '甜美女声', gender: 'female' },
  { id: 'female-chengshu', label: '成熟女声', gender: 'female' },
  { id: 'female-shaonv', label: '少女音色', gender: 'female' },
  { id: 'female-yujie', label: '知性女声', gender: 'female' },
  { id: 'Chinese (Mandarin)_Sweet_Lady', label: '甜美淑女', gender: 'female' },
  // 👦 男声
  { id: 'male-qn-qingse', label: '青涩青年', gender: 'male' },
  { id: 'male-qn-jingying', label: '精英青年', gender: 'male' },
  { id: 'male-qn-daxuesheng', label: '大学生音色', gender: 'male' },
  { id: 'Chinese (Mandarin)_Gentleman', label: '温润男声', gender: 'male' },
  // 🧒 童声
  { id: 'clever_boy', label: '聪明男童', gender: 'boy' },
  { id: 'cute_boy', label: '可爱男童', gender: 'boy' },
  { id: 'lovely_girl', label: '萌萌女童', gender: 'girl' },
]

/** 预设课堂角色列表（1 教师 + 5 学生） */
export const PRESET_AGENTS: PresetAgent[] = [
  {
    id: 'teacher',
    name: 'AI 教师',
    emoji: '👨‍🏫',
    description: '主讲教师，引导课堂节奏和知识讲解',
    defaultVoice: 'female-tianmei',
    isTeacher: true,
  },
  {
    id: 'assistant',
    name: 'AI 助教',
    emoji: '🎯',
    description: '辅助老师，帮忙补充讲解和引导互动',
    defaultVoice: 'male-qn-jingying',
    isTeacher: false,
  },
  {
    id: 'showoff',
    name: '显眼包',
    emoji: '🌟',
    description: '活泼爱表现，经常抢答和分享',
    defaultVoice: 'clever_boy',
    isTeacher: false,
  },
  {
    id: 'curious',
    name: '好奇宝宝',
    emoji: '🤔',
    description: '爱提问，追根究底，常问"为什么"',
    defaultVoice: 'lovely_girl',
    isTeacher: false,
  },
  {
    id: 'notetaker',
    name: '笔记员',
    emoji: '📝',
    description: '认真记录要点，帮助整理和总结',
    defaultVoice: 'female-shaonv',
    isTeacher: false,
  },
  {
    id: 'thinker',
    name: '思考者',
    emoji: '💭',
    description: '深度分析，善于总结规律和对比',
    defaultVoice: 'Chinese (Mandarin)_Gentleman',
    isTeacher: false,
  },
]
