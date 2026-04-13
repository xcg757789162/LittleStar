/**
 * OpenMAIC 数据类型定义
 *
 * 定义 LittleStar 与 OpenMAIC API 交互所需的所有类型。
 *
 * v2: 迁移为 OpenMAIC 原生 Scene 格式。
 *     Classroom.scenes 现在存储 OpenMAIC 原生 Scene（含 SceneContent + Action[]），
 *     不再使用简化的 Slide[] 格式。Stage 组件可直接消费。
 */

import type { Scene as OpenMAICScene, Stage as OpenMAICStage } from '@/types/openmaic/stage'
import type { Action } from '@/types/openmaic/action'
import type { SceneOutline as PipelineSceneOutline } from './pipeline-types'

// ============================================================
// 常量
// ============================================================

/** 幻灯片类型枚举值（保留兼容旧数据） */
export const SLIDE_TYPES = [
  'title',
  'content',
  'image',
  'quiz',
  'tpr',
  'audio',
] as const

/** 课堂状态枚举值 */
export const CLASSROOM_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const

/** 场景类型枚举值（扩展为 OpenMAIC 原生类型） */
export const SCENE_TYPES = [
  'teaching',
  'quiz',
  'interactive',
  'summary',
  // OpenMAIC 原生类型
  'slide',
  'pbl',
] as const

// ============================================================
// 基础类型
// ============================================================

/** 幻灯片类型 */
export type SlideType = (typeof SLIDE_TYPES)[number]

/** 课堂生成状态 */
export type ClassroomStatus = (typeof CLASSROOM_STATUSES)[number]

/** 场景类型 */
export type SceneType = (typeof SCENE_TYPES)[number]

// ============================================================
// 数据模型
// ============================================================

/** 测验题数据（保留兼容旧数据） */
export interface QuizData {
  /** 题目文本 */
  question: string
  /** 选项列表 */
  options: string[]
  /** 正确答案索引（从 0 开始） */
  correctAnswer: number
  /** 题目配图 URL（可选） */
  imageUrl?: string
}

/** 幻灯片 — 课堂的最小内容单元（保留兼容旧数据） */
export interface Slide {
  /** 幻灯片类型 */
  type: SlideType
  /** 标题（可选） */
  title?: string
  /** 教学文本内容（可选） */
  content?: string
  /** AI 生成的卡通插图 URL（可选） */
  imageUrl?: string
  /** TTS 语音 URL（可选） */
  audioUrl?: string
  /** TPR 肢体动作指令（可选） */
  tprInstruction?: string
  /** 测验题（可选，quiz 类型幻灯片必填） */
  quiz?: QuizData
  /** 拟声词，如 "Woof, woof!"（可选） */
  onomatopoeia?: string
  /** 动画类型提示（可选） */
  animation?: string
}

/**
 * 场景 — 课堂的一个教学阶段
 *
 * v2: 现在存储 OpenMAIC 原生 Scene 数据。
 * `content` 字段为 OpenMAIC SceneContent（SlideContent | QuizContent | InteractiveContent | PBLContent）。
 * `actions` 字段为 OpenMAIC Action[] —— PlaybackEngine 和 ActionEngine 直接消费。
 * `slides` 字段保留向后兼容（旧缓存数据仍包含）。
 */
export interface Scene {
  /** 场景唯一标识 */
  id: string
  /** 场景标题 */
  title: string
  /** 场景类型 */
  type: SceneType
  /** 场景顺序 */
  order?: number

  // === OpenMAIC 原生数据（v2 新增）===

  /** OpenMAIC 场景内容（SlideContent | QuizContent | InteractiveContent | PBLContent） */
  content?: OpenMAICScene['content']
  /** OpenMAIC Action 列表（PlaybackEngine 消费） */
  actions?: Action[]
  /** 白板数据 */
  whiteboards?: OpenMAICScene['whiteboards']
  /** 多 Agent 讨论配置 */
  multiAgent?: OpenMAICScene['multiAgent']
  /** 关联的 Stage ID */
  stageId?: string

  // === 旧格式兼容字段 ===

  /** 该场景包含的幻灯片列表（v1 格式，向后兼容旧缓存） */
  slides?: Slide[]

  // === 元数据 ===
  createdAt?: number
  updatedAt?: number
}

/** 课堂 — 一个知识点的完整教学单元 */
export interface Classroom {
  /** 课堂唯一标识 */
  id: string
  /** 课堂标题 */
  title: string
  /** 课堂生成状态 */
  status: ClassroomStatus
  /** 场景列表（v2: OpenMAIC 原生 Scene 格式） */
  scenes: Scene[]
  /** 课堂描述（可选） */
  description?: string
  /** 创建时间 ISO 8601（可选） */
  createdAt?: string
  /** 语言代码（可选） */
  language?: string

  // === OpenMAIC 原生 Stage 数据（v2 新增）===

  /** OpenMAIC Stage 元数据（v2: 由 Pipeline 生成） */
  stage?: OpenMAICStage
}

// Re-export OpenMAIC native types for convenience
export type { OpenMAICScene, OpenMAICStage, Action }

// ============================================================
// API 请求/响应类型
// ============================================================

/** 课堂生成请求 */
export interface GenerateClassroomRequest {
  /** 教导处生成的结构化 requirement 文本 */
  requirement: string
  /** 目标语言（可选，默认中文） */
  language?: string
  /** 指定模型（可选，使用环境变量默认值） */
  model?: string
}

/** 课堂生成响应（异步） */
export interface GenerateClassroomResponse {
  /** 课堂 ID，用于后续轮询 */
  classroomId: string
  /** 初始状态 */
  status: ClassroomStatus
}

/** 课堂状态轮询响应 */
export interface ClassroomStatusResponse {
  /** 当前状态 */
  status: ClassroomStatus
  /** 生成进度 0-1（可选，processing 时有值） */
  progress?: number
  /** 完成的课堂数据（可选，completed 时有值） */
  classroom?: Classroom
  /** 错误信息（可选，failed 时有值） */
  error?: string
}

// ============================================================
// 类型守卫函数
// ============================================================

/**
 * 检查值是否为有效的 QuizData
 */
export function isQuizData(value: unknown): value is QuizData {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.question === 'string' &&
    Array.isArray(obj.options) &&
    typeof obj.correctAnswer === 'number'
  )
}

/**
 * 检查值是否为有效的 Slide
 */
export function isSlide(value: unknown): value is Slide {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.type === 'string' &&
    (SLIDE_TYPES as readonly string[]).includes(obj.type)
  )
}

/**
 * 检查值是否为有效的 Scene（v2: 支持原生和旧格式）
 */
export function isScene(value: unknown): value is Scene {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  // 基本字段检查
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false
  if (typeof obj.type !== 'string') return false
  if (!(SCENE_TYPES as readonly string[]).includes(obj.type)) return false

  // v2: 有 content 字段说明是原生格式（不需要 slides）
  if (obj.content !== undefined) return true
  // v1: 有 slides 字段说明是旧格式
  if (Array.isArray(obj.slides)) return true
  // 容错：允许两者都没有
  return true
}

/**
 * 检查值是否为有效的 Classroom
 */
export function isClassroom(value: unknown): value is Classroom {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    (CLASSROOM_STATUSES as readonly string[]).includes(obj.status) &&
    Array.isArray(obj.scenes)
  )
}

/**
 * 判断 Scene 是否为 OpenMAIC 原生格式（v2）
 * 原生格式包含 content 字段（SceneContent），旧格式只有 slides 字段
 */
export function isNativeScene(scene: Scene): boolean {
  return scene.content !== undefined && scene.content !== null
}
