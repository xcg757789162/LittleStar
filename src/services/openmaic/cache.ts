/**
 * 课堂缓存管理
 *
 * 管理 OpenMAIC 生成的课堂 JSON 数据的本地缓存。
 * 按 knowledgeNodeId + date 索引，支持 3 天预生成缓存策略。
 *
 * 存储抽象：通过 CacheStore 接口解耦存储实现。
 * 默认使用内存 Map（兼容 jsdom 测试环境），
 * 生产环境可注入 IndexedDB 或其他持久化实现。
 */

import type { Classroom } from './types'

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
    return entry?.classroom ?? null
  }

  /**
   * 列出缓存的课堂
   * @param date 可选，按日期过滤
   * @returns 缓存列表项数组
   */
  async listCachedClassrooms(date?: string): Promise<CacheListItem[]> {
    const items: CacheListItem[] = []
    const entries = await this.store.entries()

    for (const [, entry] of entries) {
      if (date && entry.date !== date) continue
      items.push({
        knowledgeNodeId: entry.knowledgeNodeId,
        date: entry.date,
        classroomId: entry.classroom.id,
        classroomTitle: entry.classroom.title,
        cachedAt: entry.cachedAt,
      })
    }

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

    for (const [key, entry] of entries) {
      if (entry.date < cutoffDate) {
        await this.store.delete(key)
      }
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    await this.store.clear()
  }

  /**
   * 获取缓存条目数量
   */
  async getCacheSize(): Promise<number> {
    return this.store.size()
  }
}
