/**
 * 热拔插课程（Course）类型定义
 *
 * Course 是课程主体 —— 预置的 math/chinese/english 和用户自建的 "生物"/"理财"/"三角函数" 等
 * 统一存放在 api.courses 表中。Course.slug 就是 Subject 的值，URL 段的一部分（/subject-mastery/:slug）
 * 以及知识点 ID 的前缀（如 slug=biology → nodeId=biology-cell-structure）。
 */

/** 课程生命周期状态 */
export type CourseStatus = 'draft' | 'initializing' | 'ready' | 'failed'

/** 学科类型（与 api.courses.discipline_type 一致） */
export type CourseDisciplineType = 'academic' | 'interest'

/** Socratic 对话消息（存储到 courses.dialog_history） */
export interface CourseDialogMessage {
  role: 'user' | 'assistant'
  content: string
  /** 时间戳（ISO 8601） */
  timestamp: string
  /** 仅 assistant 消息：这一轮 LLM 给出的 3 个候选回复（用于一键回复的胶囊按钮） */
  suggestedReplies?: string[]
}

/**
 * 苏格拉底对话收集的结构化需求（存储到 courses.requirement_spec）
 * LLM 需要把收集到的字段填进来；自由发挥的额外字段放在 extras 里
 */
export interface CourseRequirementSpec {
  /** 学习主题（学科名 or 知识点名） */
  topic?: string
  /** 学习目标 */
  goal?: 'intro' | 'systematic' | 'exam' | 'interest' | string
  /** 覆盖范围 / 深度 */
  scope?: string
  depth?: 'shallow' | 'medium' | 'deep' | string
  /** 学习者当前已有基础 */
  prior_knowledge?: string
  /** 学习方式偏好 */
  preferred_style?: string
  /** 学习者年级 / 水平（问题 3b：LLM 对话中主动询问） */
  level?: string
  /** 自由发挥扩展字段 */
  extras?: Record<string, unknown>
  /** 是否已收集完毕可以进入 finalize */
  ready?: boolean
}

/** 课程完整对象（对应 api.courses 一行） */
export interface Course {
  id: number
  userId: number | null
  slug: string
  name: string
  emoji: string
  colorHex: string
  isSystem: boolean
  status: CourseStatus
  /** 课内应试向 vs 素质兴趣向 */
  disciplineType: CourseDisciplineType
  /** 续阶链：直接上一门课 id，根课为 null */
  parentCourseId: number | null
  /** 链上阶段序号，根课为 0 */
  stageIndex: number
  requirementSpec: CourseRequirementSpec
  dialogHistory: CourseDialogMessage[]
  initTaskId?: number | null
  initError?: string | null
  createdAt: string
  updatedAt: string
  /**
   * 当前选中孩子在该课知识点上的「已掌握 / 总数」比例（仅 mastery≥80 计为掌握）。
   * 无 childId 查询或未加载时为 null；无知识点时为 null。
   */
  completionRatio?: number | null
}

/** 新建课程草稿（前端输入的最小信息） */
export interface CreateCourseDraftInput {
  userId: number
  /** 第一句用户意图，如 "我想学生物" */
  userMessage: string
}

/** 发一轮对话 */
export interface CourseDialogTurnInput {
  courseId: number
  userMessage: string
}

/** 后端返回一轮对话结果 */
export interface CourseDialogTurnResponse {
  courseId: number
  assistantMessage: string
  spec: CourseRequirementSpec
  /** 对话是否已完成，可以进入 finalize */
  ready: boolean
  /** 本轮建议的 3 个候选回复（ready=true 时为空数组） */
  suggestedReplies?: string[]
  /** 若 ready，LLM 提出的建议课程名 */
  suggestedName?: string
  /** 若 ready，LLM 提出的建议 emoji 和颜色 */
  suggestedEmoji?: string
  suggestedColorHex?: string
  /** 若 ready，LLM 提出的建议 slug（URL 段 + 知识点前缀） */
  suggestedSlug?: string
}

/** Finalize 入参 —— 确认课程名和外观，触发初始化任务 */
export interface CourseFinalizeInput {
  courseId: number
  name: string
  emoji?: string
  colorHex?: string
}
