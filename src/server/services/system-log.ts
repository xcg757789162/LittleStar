/**
 * Persistent system log writer.
 *
 * Fire-and-forget INSERTs into api.system_logs so that backend events
 * (task failures, retries, timeouts, quota errors) survive page reloads
 * and are visible in the ParentLogs UI.
 */

import { pool } from '../db.js'

export type LogLevel = 'info' | 'warn' | 'error'

export function writeSystemLog(
  childId: number,
  level: LogLevel,
  tag: string,
  message: string,
  taskId?: number,
): void {
  pool.query(
    `INSERT INTO api.system_logs (child_id, level, tag, message, task_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [childId, level, tag, message, taskId ?? null],
  ).catch((err: unknown) => {
    console.error('[SystemLog] Failed to write log:', err)
  })
}
