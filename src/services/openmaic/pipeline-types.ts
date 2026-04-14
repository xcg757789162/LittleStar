/**
 * Pipeline 类型定义
 *
 * 定义 LittleStar Pipeline Client 调用 OpenMAIC 子 API 所需的所有类型。
 * 这些类型与 OpenMAIC 原生前端（generation-preview）的子 API 参数对齐。
 *
 * Pipeline 调用流程：
 *   scene-outlines-stream (SSE) → scene-content → scene-actions → tts
 */

import type { MediaGenerationRequest } from '../../lib/openmaic/media/types.js'

// ============================================================
// 常量
// ============================================================

/** Pipeline 步骤名称枚举值 */
export const PIPELINE_STEP_NAMES = [
  'agent-profiles',
  'outlines',
  'scene-content',
  'scene-actions',
  'tts',
  'media-generation',
  'assembly',
] as const

// ============================================================
// 基础类型
// ============================================================

/** Pipeline 步骤名称 */
export type PipelineStepName = (typeof PIPELINE_STEP_NAMES)[number]

/**
 * 用户需求 — 传入 Pipeline 的课程需求
 *
 * 对应 OpenMAIC `/api/generate/scene-outlines-stream` 的请求参数
 */
export interface UserRequirements {
  /** 课程需求文本（由 requirement-generator 生成） */
  requirement: string
  /** 目标语言代码（如 'en', 'zh-CN'） */
  language: string
  /** 学生昵称（可选） */
  userNickname?: string
  /** 学生自我介绍（可选，来自家长设置） */
  userBio?: string
}

/**
 * 场景大纲 — SSE 流式返回的单个大纲
 *
 * upstream 当前大纲对象以 `order` 为主，旧实现以 `index` 为主。
 * LittleStar 内部仍保留 `index` 便于兼容既有 scene/action 组装逻辑，
 * 因此解析阶段会把 `order` 规范化为稳定的 `index`。
 */
export interface SceneOutline {
  /** 兼容旧实现的场景索引（规范化后始终可用） */
  index?: number
  /** upstream 原生顺序字段 */
  order?: number
  /** upstream 原生 outline id */
  id?: string
  /** 场景标题 */
  title: string
  /** 场景描述 */
  description: string
  /** 场景类型（可选） */
  type?: string
  /** 其它 upstream 元信息（可选） */
  language?: string
  keyPoints?: string[]
  /** AI 媒体占位符生成请求（gen_img_* / gen_vid_*） */
  mediaGenerations?: MediaGenerationRequest[]
}

/**
 * Canvas 元素 — 教学页中的 PPT 式元素
 */
export interface CanvasElement {
  /** 元素类型：text | image | shape 等 */
  type: string
  /** 文本内容（HTML 格式，text 类型时有值） */
  content?: string
  /** 图片 URL（image 类型时有值） */
  src?: string
  /** 其余属性 */
  [key: string]: unknown
}

/**
 * 测验选项
 */
export interface QuizOption {
  /** 选项值标识（如 'A', 'B', 'C'） */
  value: string
  /** 选项文本 */
  label: string
}

/**
 * 测验题目（后端格式）
 */
export interface QuizQuestion {
  /** 题目文本 */
  question: string
  /** 选项列表 */
  options: QuizOption[]
  /** 正确答案值列表（如 ['A']） */
  answer: string[]
  /** 题目解析（可选） */
  analysis?: string
}

/**
 * 生成的内容 — scene-content API 返回的内容
 *
 * 兼容两类返回：
 * 1. 旧版 LittleStar 期望的 `{ type, canvas/questions }`
 * 2. upstream 当前的裸内容对象（如 slide 直接返回 `{ elements, background }`）
 */
export interface GeneratedContent {
  /** 内容类型（旧版或部分 upstream 路径会显式给出） */
  type?: 'slide' | 'quiz' | 'interactive' | 'pbl'
  /** 旧版 slide 包装 */
  canvas?: {
    elements: CanvasElement[]
    background?: unknown
    remark?: string
    [key: string]: unknown
  }
  /** upstream 裸 slide 内容 */
  elements?: CanvasElement[]
  background?: unknown
  remark?: string
  /** quiz 内容 */
  questions?: QuizQuestion[]
  /** interactive / pbl 内容 */
  html?: string
  scientificModel?: unknown
  projectConfig?: Record<string, unknown>
  /** 其余字段原样透传给 scene-actions */
  [key: string]: unknown
}

/**
 * 场景动作 — scene-actions API 返回的单个动作
 *
 * 对应 OpenMAIC `/api/generate/scene-actions` 响应中的 actions[]
 * speech 动作附加 TTS 生成的音频数据
 */
export interface SceneAction {
  /** 动作类型：speech | spotlight | animation 等 */
  type: string
  /** 语音文本（speech 类型时有值） */
  text?: string
  /** TTS 生成的 base64 音频数据（speech 类型，TTS 生成后附加） */
  audioBase64?: string
  /** 播放器消费的音频 ID（IndexedDB / 兼容字段） */
  audioId?: string
  /** 播放器消费的音频 URL（服务端 URL 或 data URI） */
  audioUrl?: string
  /** 音频时长（毫秒） */
  audioDurationMs?: number
  /** 目标元素 ID（spotlight 类型时有值） */
  targetElementId?: string
  /** 其余属性 */
  [key: string]: unknown
}

const AUDIO_FORMAT_TO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
}

export function buildAudioDataUrl(audioBase64: string, format = 'mp3'): string {
  const trimmed = audioBase64.trim()
  if (!trimmed) return ''
  // Already a usable URL (HTTP path or data URI) — pass through
  if (trimmed.startsWith('data:audio/') || trimmed.startsWith('/') || trimmed.startsWith('http')) return trimmed

  const normalizedFormat = format.trim().toLowerCase()
  const mimeType = normalizedFormat.includes('/')
    ? normalizedFormat
    : AUDIO_FORMAT_TO_MIME[normalizedFormat] ?? `audio/${normalizedFormat || 'mpeg'}`

  return `data:${mimeType};base64,${trimmed}`
}

export function attachGeneratedSpeechAudio(
  action: SceneAction,
  input: {
    audioId: string
    audioBase64?: string
    durationMs?: number
    format?: string
  },
): SceneAction {
  const { audioId, audioBase64, durationMs, format } = input
  const trimmedAudio = audioBase64?.trim()

  if (trimmedAudio) {
    action.audioBase64 = trimmedAudio
    action.audioId = audioId
    action.audioUrl = buildAudioDataUrl(trimmedAudio, format)
  }

  if (typeof durationMs === 'number' && durationMs > 0) {
    action.audioDurationMs = durationMs
  }

  return action
}

/**
 * Agent 信息
 *
 * 对应 OpenMAIC agent-profiles 子 API 返回的角色信息
 * preset 模式下由前端构建，auto 模式下由后端生成
 */
export interface AgentInfo {
  /** 角色唯一 ID */
  id?: string
  /** 角色名称 */
  name: string
  /** 角色图标 emoji（可选） */
  emoji?: string
  /** 角色描述（可选） */
  description?: string
  /** 角色性格描述（可选，auto 模式返回） */
  personality?: string
  /** 角色头像 URL（可选） */
  avatar?: string
  /** MiniMax TTS 音色 voice_id（可选） */
  voiceId?: string
}

/**
 * TTS 配置
 *
 * 用于 `/api/generate/tts` 请求的配置参数
 */
export interface TTSConfig {
  /** TTS 服务提供商 ID（如 'volcengine', 'azure', 'openai'） */
  providerId: string
  /** 语音 ID（如 'zh_female_01'） */
  voiceId: string
  /** 语速（可选，0.5-2.0，默认 1.0） */
  speed?: number
  /** 音调（可选，0.5-2.0，默认 1.0） */
  pitch?: number
}

// ============================================================
// Pipeline 输入/输出/回调类型
// ============================================================

/**
 * Pipeline 进度信息
 *
 * 通过 PipelineCallbacks.onProgress 回调给上层
 */
export interface PipelineProgress {
  /** 当前执行步骤 */
  step: PipelineStepName
  /** 总体完成百分比 0-100 */
  percent: number
  /** 当前步骤描述消息 */
  message: string
  /** 当前场景索引（scene-content/scene-actions/tts 步骤时有值） */
  sceneIndex?: number
  /** 总场景数（scene-content/scene-actions/tts 步骤时有值） */
  totalScenes?: number
}

/**
 * Pipeline 回调接口
 *
 * 所有回调均为可选，调用方按需注册
 */
export interface PipelineCallbacks {
  /** 进度更新回调 */
  onProgress?: (progress: PipelineProgress) => void
  /** 大纲生成完成回调 */
  onOutlinesReady?: (outlines: SceneOutline[]) => void
  /** 单个场景内容生成完成回调 */
  onSceneContentReady?: (sceneIndex: number, content: GeneratedContent) => void
  /** 单个场景动作生成完成回调 */
  onSceneActionsReady?: (sceneIndex: number, actions: SceneAction[]) => void
  /** 单个 TTS 音频生成完成回调 */
  onTTSReady?: (sceneIndex: number, actionIndex: number, audioBase64: string) => void
  /** 步骤级错误回调（不中止整个 Pipeline） */
  onError?: (step: PipelineStepName, error: Error) => void
}

/**
 * Pipeline 输入 — runFullPipeline 的完整输入
 */
export interface PipelineInput {
  /** 课程需求 */
  requirements: UserRequirements
  /** HTTP Headers（从 settingsStore 构建，包含 x-model, x-api-key 等） */
  headers: Record<string, string>
  /** 回调（可选） */
  callbacks?: PipelineCallbacks
}

// ============================================================
// 类型守卫函数
// ============================================================

/**
 * 检查值是否为有效的 SceneOutline
 */
export function isSceneOutline(value: unknown): value is SceneOutline {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    (typeof obj.index === 'number' || typeof obj.order === 'number') &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string'
  )
}

/**
 * 将 upstream/legacy outline 规范化为 LittleStar 内部统一结构
 */
export function normalizeSceneOutline(
  value: unknown,
  fallbackIndex: number,
): SceneOutline | null {
  if (!isSceneOutline(value)) {
    return null
  }

  const obj = value as unknown as Record<string, unknown>
  const index = typeof obj.index === 'number'
    ? obj.index
    : typeof obj.order === 'number'
      ? obj.order
      : fallbackIndex
  const order = typeof obj.order === 'number' ? obj.order : index

  return {
    ...obj,
    index,
    order,
    title: obj.title as string,
    description: obj.description as string,
    type: typeof obj.type === 'string' ? obj.type : undefined,
    id: typeof obj.id === 'string' ? obj.id : undefined,
    language: typeof obj.language === 'string' ? obj.language : undefined,
    keyPoints: Array.isArray(obj.keyPoints)
      ? obj.keyPoints.filter((item): item is string => typeof item === 'string')
      : undefined,
    mediaGenerations: Array.isArray(obj.mediaGenerations)
      ? (obj.mediaGenerations as MediaGenerationRequest[])
      : undefined,
  }
}

/**
 * 获取可安全使用的场景索引
 */
export function getSceneOutlineIndex(outline: SceneOutline): number {
  if (typeof outline.index === 'number') return outline.index
  if (typeof outline.order === 'number') return outline.order
  return 0
}

/**
 * 检查值是否为有效的 PipelineProgress
 */
export function isPipelineProgress(value: unknown): value is PipelineProgress {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.step === 'string' &&
    (PIPELINE_STEP_NAMES as readonly string[]).includes(obj.step) &&
    typeof obj.percent === 'number' &&
    typeof obj.message === 'string'
  )
}
