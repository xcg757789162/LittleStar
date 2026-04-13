/**
 * 课堂缓存管理
 *
 * 管理 OpenMAIC 生成的课堂 JSON 数据的缓存。
 * 按 knowledgeNodeId + date 索引，支持 3 天预生成缓存策略。
 *
 * 存储抽象：通过 CacheStore 接口解耦存储实现。
 * 默认使用内存 Map（兼容 jsdom 测试环境），
 * 生产环境使用 PostgresCacheStore（持久化到 classroom_cache 表）。
 */

import type { Classroom, Scene } from './types'
import { isNativeScene } from './types'
import type { Slide } from '@/lib/openmaic/types/slides'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('ClassroomCache')

/** 缓存条目 */
export interface CacheEntry {
  /** 知识点 ID */
  knowledgeNodeId: string
  /** 日期 YYYY-MM-DD */
  date: string
  /** 课堂数据 */
  classroom: Classroom
  /** 缓存写入时间 */
  cachedAt: number
}

/** 缓存列表项（不含完整课堂数据） */
export interface CacheListItem {
  knowledgeNodeId: string
  date: string
  classroomId: string
  classroomTitle: string
  cachedAt: number
  /** 课堂缩略图 URL（从 scenes/slides 中提取的第一个非空 imageUrl） */
  thumbnailUrl?: string
  /** 第一个 slide scene 的完整 canvas 数据（用于 ThumbnailSlide 高保真渲染） */
  firstSlideCanvas?: Slide
  /** 从 knowledgeNodeId 推断的科目（math/chinese/english） */
  subject?: string
}

/**
 * 从 knowledgeNodeId 推断科目
 * 知识点 ID 格式：math-xxx / chinese-xxx / english-xxx / default-math 等
 */
function inferSubjectFromNodeId(knowledgeNodeId: string): string | undefined {
  const id = knowledgeNodeId.toLowerCase()
  if (id.startsWith('math') || id.endsWith('-math')) return 'math'
  if (id.startsWith('chinese') || id.endsWith('-chinese')) return 'chinese'
  if (id.startsWith('english') || id.endsWith('-english')) return 'english'
  return undefined
}

/**
 * 缓存存储抽象接口
 *
 * 实现此接口以提供自定义持久化存储（如 IndexedDB）。
 * 默认实现使用内存 Map。
 */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>
  set(key: string, value: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  entries(): Promise<[string, CacheEntry][]>
  clear(): Promise<void>
  size(): Promise<number>
}

/**
 * 默认内存存储实现
 */
class MemoryCacheStore implements CacheStore {
  private store = new Map<string, CacheEntry>()

  async get(key: string): Promise<CacheEntry | undefined> {
    return this.store.get(key)
  }

  async set(key: string, value: CacheEntry): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async entries(): Promise<[string, CacheEntry][]> {
    return Array.from(this.store.entries())
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  async size(): Promise<number> {
    return this.store.size
  }
}

/** 生成缓存 key */
function makeCacheKey(knowledgeNodeId: string, date: string): string {
  return `${knowledgeNodeId}::${date}`
}

function isPlaceholderTitle(title: string | undefined): boolean {
  if (!title) return true
  const normalized = title.trim().toLowerCase()
  return normalized === '' || normalized === 'generated classroom' || normalized === 'classroom'
}

function getRenderableSceneTitle(classroom: Classroom): string | undefined {
  for (const scene of classroom.scenes ?? []) {
    if (typeof scene.title === 'string' && !isPlaceholderTitle(scene.title)) {
      return scene.title
    }

    if (scene.slides) {
      for (const slide of scene.slides) {
        if (typeof slide.title === 'string' && !isPlaceholderTitle(slide.title)) {
          return slide.title
        }
      }
    }
  }

  return undefined
}

function resolveClassroomTitle(classroom: Classroom): string {
  if (!isPlaceholderTitle(classroom.title)) {
    return classroom.title
  }

  const stageName = classroom.stage?.name
  if (!isPlaceholderTitle(stageName)) {
    return stageName
  }

  return getRenderableSceneTitle(classroom) || classroom.title || '课堂内容'
}

function isRenderableNativeScene(scene: Scene): boolean {
  if (!isNativeScene(scene) || !scene.content) {
    return false
  }

  const content = scene.content as Record<string, unknown>

  if (content.type === 'slide') {
    const canvas = content.canvas as Record<string, unknown> | undefined
    const elements = canvas?.elements as unknown[] | undefined
    if (Array.isArray(elements) && elements.length > 0) {
      return true
    }
  }

  if (content.type === 'quiz') {
    const questions = content.questions as unknown[] | undefined
    if (Array.isArray(questions) && questions.length > 0) {
      return true
    }
  }

  if (content.type === 'interactive') {
    if (typeof content.url === 'string' && content.url.trim()) return true
    if (typeof content.html === 'string' && content.html.trim()) return true
  }

  if (content.type === 'pbl') {
    if (content.projectConfig && typeof content.projectConfig === 'object') {
      return true
    }
  }

  return Array.isArray(scene.actions) && scene.actions.length > 0
}

function hasRenderableScenes(classroom: Classroom): boolean {
  for (const scene of classroom.scenes ?? []) {
    if (isRenderableNativeScene(scene)) {
      return true
    }
  }

  return false
}

/**
 * 课堂缓存管理器
 *
 * @param store 可选的自定义存储实现，默认使用内存 Map
 * @example
 * ```ts
 * // 默认内存存储
 * const cache = new ClassroomCache()
 *
 * // 注入 IndexedDB 存储（生产环境）
 * const cache = new ClassroomCache(new IndexedDBCacheStore())
 * ```
 */
export class ClassroomCache {
  private store: CacheStore

  constructor(store?: CacheStore) {
    this.store = store ?? new MemoryCacheStore()
  }

  /**
   * 保存课堂到缓存
   * @param knowledgeNodeId 知识点 ID
   * @param date 日期 YYYY-MM-DD
   * @param classroom 课堂数据
   */
  async saveClassroom(
    knowledgeNodeId: string,
    date: string,
    classroom: Classroom,
  ): Promise<void> {
    const key = makeCacheKey(knowledgeNodeId, date)
    const entry: CacheEntry = {
      knowledgeNodeId,
      date,
      classroom,
      cachedAt: Date.now(),
    }
    await this.store.set(key, entry)
  }

  /**
   * 获取缓存的课堂
   * @param knowledgeNodeId 知识点 ID
   * @param date 日期 YYYY-MM-DD
   * @returns 课堂数据，不存在时返回 null
   */
  async getClassroom(
    knowledgeNodeId: string,
    date: string,
  ): Promise<Classroom | null> {
    const key = makeCacheKey(knowledgeNodeId, date)
    const entry = await this.store.get(key)
    if (!entry) return null

    if (!hasRenderableScenes(entry.classroom)) {
      log.warn('移除无法被 Native Stage 渲染的课堂缓存:', key, entry.classroom.title)
      await this.store.delete(key)
      return null
    }

    return entry.classroom
  }

  /**
   * 列出缓存的课堂
   * @param date 可选，按日期过滤
   * @param subject 可选，按科目过滤（通过 knowledgeNodeId 前缀推断）
   * @returns 缓存列表项数组
   */
  async listCachedClassrooms(date?: string, subject?: string): Promise<CacheListItem[]> {
    const items: CacheListItem[] = []
    const entries = await this.store.entries()

    for (const [key, entry] of entries) {
      if (date && entry.date !== date) continue

      // 过滤掉无法渲染的占位课堂，避免“Generated Classroom + 空缩略图”污染首页/课程列表
      if (!hasRenderableScenes(entry.classroom)) {
        log.warn('跳过无效课堂缓存:', key, entry.classroom.title)
        await this.store.delete(key)
        continue
      }

      // 按科目过滤：通过 knowledgeNodeId 推断科目
      const inferredSubject = inferSubjectFromNodeId(entry.knowledgeNodeId)
      if (subject && inferredSubject && inferredSubject !== subject) continue

      // 从 scenes 中提取缩略图数据：
      // 1. firstSlideCanvas — 第一个 slide scene 的完整 canvas 数据（用于 ThumbnailSlide 高保真渲染）
      // 2. thumbnailUrl — 第一个 image 元素的 URL（降级用）
      // 支持 v2（Scene.content.canvas.elements）和 v1（scene.slides）
      let thumbnailUrl: string | undefined
      let firstSlideCanvas: Slide | undefined
      if (entry.classroom.scenes) {
        for (const scene of entry.classroom.scenes) {
          if (thumbnailUrl && firstSlideCanvas) break

          // v2: 从 content.canvas 提取
          const content = scene.content as Record<string, unknown> | undefined
          if (content?.type === 'slide') {
            const canvas = content.canvas as Record<string, unknown> | undefined

            // 提取完整的 slide canvas 数据（用于 ThumbnailSlide）
            if (!firstSlideCanvas && canvas) {
              // canvas 应该是 Slide 结构：{ id, viewportSize, viewportRatio, elements, background, ... }
              const candidate = canvas as unknown as Slide
              if (candidate.elements && Array.isArray(candidate.elements)) {
                firstSlideCanvas = candidate
              }
            }

            // 提取 thumbnailUrl（降级用）
            if (!thumbnailUrl) {
              const elements = canvas?.elements as Array<Record<string, unknown>> | undefined
              if (elements) {
                for (const el of elements) {
                  if (el.type === 'image' && typeof el.src === 'string') {
                    thumbnailUrl = el.src
                    break
                  }
                }
              }
            }
          }

          // v1 fallback: 从 slides 提取
          if (!thumbnailUrl && scene.slides) {
            for (const slide of scene.slides) {
              if (slide.imageUrl) {
                thumbnailUrl = slide.imageUrl
                break
              }
            }
          }
        }
      }

      items.push({
        knowledgeNodeId: entry.knowledgeNodeId,
        date: entry.date,
        classroomId: entry.classroom.id,
        classroomTitle: resolveClassroomTitle(entry.classroom),
        cachedAt: entry.cachedAt,
        thumbnailUrl,
        firstSlideCanvas,
        subject: inferredSubject,
      })
    }

    // 按缓存时间升序排序，保证课程按预生成顺序展示
    items.sort((a, b) => a.cachedAt - b.cachedAt)

    return items
  }

  /**
   * 删除缓存的课堂
   * @param knowledgeNodeId 知识点 ID
   * @param date 日期 YYYY-MM-DD
   */
  async deleteClassroom(
    knowledgeNodeId: string,
    date: string,
  ): Promise<void> {
    const key = makeCacheKey(knowledgeNodeId, date)
    await this.store.delete(key)
  }

  /**
   * 清除过期缓存
   * @param cutoffDate 截止日期 YYYY-MM-DD，该日期之前的缓存将被删除
   */
  async clearExpiredCache(cutoffDate: string): Promise<void> {
    const entries = await this.store.entries()
    let cleared = 0

    for (const [key, entry] of entries) {
      if (entry.date < cutoffDate) {
        await this.store.delete(key)
        cleared++
      }
    }
    log.info('清理过期缓存, cutoff:', cutoffDate, '清除:', cleared, '条')
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    log.info('清除所有缓存')
    await this.store.clear()
  }

  /**
   * 获取缓存条目数量
   */
  async getCacheSize(): Promise<number> {
    const entries = await this.store.entries()
    let validCount = 0

    for (const [key, entry] of entries) {
      if (!hasRenderableScenes(entry.classroom)) {
        log.warn('移除无效课堂缓存计数项:', key, entry.classroom.title)
        await this.store.delete(key)
        continue
      }
      validCount++
    }

    return validCount
  }
}
