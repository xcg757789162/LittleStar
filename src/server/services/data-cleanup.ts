/**
 * Data Cleanup Service — periodic maintenance tasks
 *
 * Handles:
 *   1. Orphan audio file cleanup (files with no DB reference)
 *   2. Old learning_records / classroom_history cleanup
 *   3. Expired generation_tasks cleanup
 *
 * Runs on a configurable interval (default: every 6 hours).
 */

import { pool } from '../db.js'
import fs from 'node:fs/promises'
import path from 'node:path'

const MEDIA_DATA_DIR = process.env.MEDIA_DATA_DIR || '/data/media'
const AUDIO_DIR = path.join(MEDIA_DATA_DIR, 'audio')

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000
const LEARNING_RECORDS_RETENTION_DAYS = 180
const FAILED_TASKS_RETENTION_DAYS = 30
const SYSTEM_LOGS_RETENTION_DAYS = 7
/** 草稿课程（status='draft'，用户在苏格拉底对话中途退出）的过期时间 */
const STALE_DRAFT_COURSE_HOURS = 24

let cleanupTimer: ReturnType<typeof setTimeout> | null = null

export function startDataCleanup(): void {
  console.log('[DataCleanup] Starting periodic data cleanup service')
  scheduleNext()
}

export function stopDataCleanup(): void {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer)
    cleanupTimer = null
  }
}

function scheduleNext(): void {
  cleanupTimer = setTimeout(async () => {
    try {
      await runCleanup()
    } catch (error) {
      console.error('[DataCleanup] Cleanup cycle failed:', error)
    }
    scheduleNext()
  }, CLEANUP_INTERVAL_MS)
}

async function runCleanup(): Promise<void> {
  const start = Date.now()
  console.log('[DataCleanup] Starting cleanup cycle...')

  await cleanExpiredTasks()
  await cleanExpiredSystemLogs()
  await cleanOldLearningRecords()
  await cleanStaleDraftCourses()
  await cleanOrphanAudioFiles()

  console.log(`[DataCleanup] Cleanup cycle completed in ${Date.now() - start}ms`)
}

/**
 * Remove failed/completed generation_tasks older than retention period.
 */
async function cleanExpiredTasks(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM api.generation_tasks
       WHERE status IN ('completed', 'failed')
         AND updated_at < NOW() - $1::interval
       RETURNING id`,
      [`${FAILED_TASKS_RETENTION_DAYS} days`],
    )
    const count = result.rowCount ?? 0
    if (count > 0) {
      console.log(`[DataCleanup] Cleaned ${count} old generation_tasks`)
    }
  } catch (error) {
    console.error('[DataCleanup] cleanExpiredTasks failed:', error)
  }
}

/**
 * Remove system_logs older than retention period (TTL).
 */
async function cleanExpiredSystemLogs(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM api.system_logs
       WHERE created_at < NOW() - $1::interval
       RETURNING id`,
      [`${SYSTEM_LOGS_RETENTION_DAYS} days`],
    )
    const count = result.rowCount ?? 0
    if (count > 0) {
      console.log(`[DataCleanup] Cleaned ${count} expired system_logs (>${SYSTEM_LOGS_RETENTION_DAYS}d)`)
    }
  } catch (error) {
    console.error('[DataCleanup] cleanExpiredSystemLogs failed:', error)
  }
}

/**
 * Remove old learning_records beyond retention period.
 */
async function cleanOldLearningRecords(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM api.learning_records
       WHERE created_at < NOW() - $1::interval
       RETURNING id`,
      [`${LEARNING_RECORDS_RETENTION_DAYS} days`],
    )
    const count = result.rowCount ?? 0
    if (count > 0) {
      console.log(`[DataCleanup] Cleaned ${count} old learning_records`)
    }
  } catch (error) {
    console.error('[DataCleanup] cleanOldLearningRecords failed:', error)
  }
}

/**
 * 删除被用户放弃的 draft 课程（苏格拉底对话中途退出）。
 *
 * 判定：status = 'draft' 且 updated_at 超过 STALE_DRAFT_COURSE_HOURS 小时。
 * draft 状态下还未初始化 knowledge_nodes / placement_* 等下游表，
 * 所以只需清 api.courses 行，FK 级联即可清干净 curricula / generation_tasks。
 */
async function cleanStaleDraftCourses(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM api.courses
       WHERE status = 'draft'
         AND is_system = FALSE
         AND updated_at < NOW() - $1::interval
       RETURNING id, slug`,
      [`${STALE_DRAFT_COURSE_HOURS} hours`],
    )
    const count = result.rowCount ?? 0
    if (count > 0) {
      console.log(
        `[DataCleanup] Removed ${count} stale draft courses (>${STALE_DRAFT_COURSE_HOURS}h)`,
      )
    }
  } catch (error) {
    console.error('[DataCleanup] cleanStaleDraftCourses failed:', error)
  }
}

/**
 * Scan audio directories and remove any that are not referenced by
 * classroom_cache or classroom_snapshots.
 *
 * Directory naming convention:
 *   /data/media/audio/{childId}/{knowledgeNodeId}_{date}/
 *
 * We query DB for all active audio paths (from both cache and snapshots)
 * and delete directories that don't match.
 */
async function cleanOrphanAudioFiles(): Promise<void> {
  try {
    const stat = await fs.stat(AUDIO_DIR).catch(() => null)
    if (!stat?.isDirectory()) return

    // Collect all referenced audio URL prefixes from DB
    const referencedPrefixes = new Set<string>()

    // From classroom_cache: extract child_id + knowledge_node_id + date
    const cacheRows = await pool.query<{ child_id: number; knowledge_node_id: string; date: string }>(
      `SELECT child_id, knowledge_node_id, date FROM api.classroom_cache`,
    )
    for (const row of cacheRows.rows) {
      referencedPrefixes.add(`${row.child_id}/${sanitize(row.knowledge_node_id)}_${row.date}`)
    }

    // From classroom_snapshots: extract audio paths from JSON
    // We only need to check if the child+node+date combo exists
    const historyRows = await pool.query<{ child_id: number; knowledge_node_id: string; date: string }>(
      `SELECT ch.child_id, ch.knowledge_node_id, ch.date
       FROM api.classroom_snapshots cs
       JOIN api.classroom_history ch ON cs.history_id = ch.id`,
    )
    for (const row of historyRows.rows) {
      referencedPrefixes.add(`${row.child_id}/${sanitize(row.knowledge_node_id)}_${row.date}`)
    }

    // Scan disk: /data/media/audio/{childId}/{nodeId_date}/
    const childDirs = await fs.readdir(AUDIO_DIR).catch(() => [] as string[])
    let removed = 0

    for (const childDir of childDirs) {
      const childPath = path.join(AUDIO_DIR, childDir)
      const childStat = await fs.stat(childPath).catch(() => null)
      if (!childStat?.isDirectory()) continue

      const nodeDirs = await fs.readdir(childPath).catch(() => [] as string[])
      for (const nodeDir of nodeDirs) {
        const key = `${childDir}/${nodeDir}`
        if (!referencedPrefixes.has(key)) {
          const dirPath = path.join(childPath, nodeDir)
          await fs.rm(dirPath, { recursive: true, force: true })
          removed++
        }
      }

      // Remove empty child directories
      const remaining = await fs.readdir(childPath).catch(() => ['x'])
      if (remaining.length === 0) {
        await fs.rmdir(childPath).catch(() => {})
      }
    }

    if (removed > 0) {
      console.log(`[DataCleanup] Removed ${removed} orphan audio directories`)
    }
  } catch (error) {
    console.error('[DataCleanup] cleanOrphanAudioFiles failed:', error)
  }
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_')
}
