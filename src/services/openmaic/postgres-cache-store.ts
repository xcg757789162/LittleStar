/**
 * PostgreSQL 持久化课堂缓存存储
 *
 * 实现 CacheStore 接口，通过 PostgREST API 将课堂缓存
 * 持久化到 classroom_cache 表。
 *
 * 替代默认的 MemoryCacheStore（内存 Map），解决刷新即丢问题。
 * 通过 child_id 实现多孩子隔离 + RLS 安全。
 */

import { apiClient } from '@/services/api'
import type { CacheStore, CacheEntry } from './cache'
import type { Classroom } from './types'

/** 数据库行类型（camelCase，apiClient 已自动转换） */
interface DbCacheRow {
  id: number
  childId: number
  knowledgeNodeId: string
  date: string
  cacheKey: string
  classroomData: Classroom
  cachedAt: string
  expiresAt: string | null
}

/** 将数据库行转换为 CacheEntry */
function toEntry(row: DbCacheRow): CacheEntry {
  return {
    knowledgeNodeId: row.knowledgeNodeId,
    date: row.date,
    classroom: row.classroomData,
    cachedAt: new Date(row.cachedAt).getTime(),
  }
}

/**
 * PostgreSQL 持久化缓存存储
 *
 * @example
 * ```ts
 * const store = new PostgresCacheStore(childId)
 * const cache = new ClassroomCache(store)
 * ```
 */
export class PostgresCacheStore implements CacheStore {
  private childId: number

  constructor(childId: number) {
    this.childId = childId
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    const row = await apiClient.getOne<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
    return row ? toEntry(row) : undefined
  }

  async set(key: string, value: CacheEntry): Promise<void> {
    // 计算 3 天后过期时间
    const expiresAt = new Date(value.cachedAt + 3 * 24 * 60 * 60 * 1000).toISOString()

    await apiClient.upsert('/classroom_cache', {
      childId: this.childId,
      cacheKey: key,
      knowledgeNodeId: value.knowledgeNodeId,
      date: value.date,
      classroomData: value.classroom,
      cachedAt: new Date(value.cachedAt).toISOString(),
      expiresAt,
    }, 'child_id,cache_key')
  }

  async delete(key: string): Promise<void> {
    await apiClient.delete('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
  }

  async entries(): Promise<[string, CacheEntry][]> {
    const rows = await apiClient.get<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
      ],
    })
    return rows.map((r) => [r.cacheKey, toEntry(r)])
  }

  async clear(): Promise<void> {
    await apiClient.delete('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
      ],
    })
  }

  async size(): Promise<number> {
    const rows = await apiClient.get<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
      ],
      select: 'id',
    })
    return rows.length
  }
}
