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
import type { CacheStore, CacheEntry, CacheEntryMetadata } from './cache'
import type { Classroom } from './types'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('PGCacheStore')

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
    log.debug('PostgresCacheStore 初始化, childId:', childId)
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    log.debug('DB get:', key)
    const row = await apiClient.getOne<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
    log.debug('DB get 结果:', key, row ? '找到' : '未找到')
    if (!row) return undefined

    // Touch LRU timestamp (fire-and-forget, don't block the read)
    apiClient.patch('/classroom_cache', {
      lastAccessedAt: new Date().toISOString(),
    }, {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    }).catch(() => { /* best-effort */ })

    return toEntry(row)
  }

  async set(key: string, value: CacheEntry): Promise<void> {
    log.info('DB set:', key, 'nodeId:', value.knowledgeNodeId)

    await apiClient.upsert('/classroom_cache', {
      childId: this.childId,
      cacheKey: key,
      knowledgeNodeId: value.knowledgeNodeId,
      date: value.date,
      classroomData: value.classroom,
      cachedAt: new Date(value.cachedAt).toISOString(),
      expiresAt: null,
    }, 'child_id,cache_key')
    log.debug('DB set 完成:', key)
  }

  async delete(key: string): Promise<void> {
    log.info('DB delete:', key)
    await apiClient.delete('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
  }

  async entries(): Promise<[string, CacheEntry][]> {
    log.debug('DB entries, childId:', this.childId)
    const rows = await apiClient.get<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
      ],
    })
    log.debug('DB entries 返回:', rows.length, '条')
    return rows.map((r) => [r.cacheKey, toEntry(r)])
  }

  async clear(): Promise<void> {
    log.info('DB clear, childId:', this.childId)
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
    log.debug('DB size:', rows.length)
    return rows.length
  }

  /**
   * Lightweight count that avoids fetching the large classroomData column.
   * Optionally filters by subject prefix on knowledge_node_id.
   */
  async countBySubject(subject?: string): Promise<number> {
    const filters: Array<{ column: string; operator: string; value: unknown }> = [
      { column: 'childId', operator: 'eq', value: this.childId },
    ]
    if (subject) {
      filters.push({ column: 'knowledgeNodeId', operator: 'like', value: `${subject}*` })
    }
    const rows = await apiClient.get<{ id: number }>('/classroom_cache', {
      filters,
      select: 'id',
    })
    log.debug('DB countBySubject:', subject ?? 'all', rows.length)
    return rows.length
  }

  /**
   * Lightweight metadata listing — excludes the large classroomData column.
   * Used for list views and cleanup operations.
   */
  async metadataEntries(): Promise<CacheEntryMetadata[]> {
    log.debug('DB metadataEntries, childId:', this.childId)
    const rows = await apiClient.get<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
      ],
      select: 'cache_key,knowledge_node_id,date,cached_at',
    })
    return rows.map((r) => ({
      cacheKey: r.cacheKey,
      knowledgeNodeId: r.knowledgeNodeId,
      date: r.date,
      cachedAt: new Date(r.cachedAt).getTime(),
    }))
  }

  /**
   * Delete expired entries directly in DB without fetching data.
   */
  async deleteExpired(cutoffDate: string): Promise<number> {
    log.info('DB deleteExpired, cutoff:', cutoffDate)
    const expired = await apiClient.get<{ id: number }>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'date', operator: 'lt', value: cutoffDate },
      ],
      select: 'id',
    })
    if (expired.length === 0) return 0

    await apiClient.delete('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'date', operator: 'lt', value: cutoffDate },
      ],
    })
    return expired.length
  }
}
