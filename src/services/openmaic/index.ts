/**
 * OpenMAIC 集成模块
 *
 * 统一导出 OpenMAIC API Client、课堂缓存管理和数据类型定义。
 *
 * @example
 * ```ts
 * import { OpenMAICClient, ClassroomCache, isClassroom } from '@/services/openmaic'
 *
 * const client = new OpenMAICClient({ baseUrl: 'http://localhost:3000' })
 * const cache = new ClassroomCache()
 *
 * // 生成课堂
 * const { classroomId } = await client.generateClassroom({ requirement: '...' })
 *
 * // 轮询等待完成
 * const classroom = await client.pollUntilComplete(classroomId)
 *
 * // 缓存课堂
 * await cache.saveClassroom('kn-counting-1-5', 1, '2026-04-08', classroom)
 * ```
 */

// Types
export type {
  Classroom,
  Scene,
  Slide,
  SlideType,
  ClassroomStatus,
  SceneType,
  QuizData,
  GenerateClassroomRequest,
  GenerateClassroomResponse,
  ClassroomStatusResponse,
} from './types'

// Type guards & constants
export {
  isClassroom,
  isScene,
  isSlide,
  isQuizData,
  SLIDE_TYPES,
  CLASSROOM_STATUSES,
  SCENE_TYPES,
} from './types'

// Client
export { OpenMAICClient, OpenMAICApiError } from './client'
export type { OpenMAICClientConfig, PollOptions } from './client'

// Pipeline Client
export { OpenMAICPipelineClient } from './pipeline-client'
export type { PipelineClientConfig, TTSResult } from './pipeline-client'

// Pipeline Types
export type {
  UserRequirements,
  SceneOutline,
  GeneratedContent,
  CanvasElement,
  QuizOption,
  QuizQuestion,
  SceneAction,
  AgentInfo,
  TTSConfig,
  PipelineInput,
  PipelineCallbacks,
  PipelineProgress,
  PipelineStepName,
} from './pipeline-types'

export {
  PIPELINE_STEP_NAMES,
  isSceneOutline,
  isPipelineProgress,
} from './pipeline-types'

// Headers Builder
export { buildHeadersFromSettings } from './headers-builder'

// Cache
export { ClassroomCache } from './cache'
export type { CacheEntry, CacheListItem, CacheStore } from './cache'
export { PostgresCacheStore } from './postgres-cache-store'
