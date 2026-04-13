/**
 * 任务处理器
 *
 * 从 generation_tasks 表取出 pending 任务（FIFO），串行执行 Pipeline。
 * 成功后将 Classroom JSON 写入 classroom_cache 表。
 * 失败后更新重试计数，未超限则重新标记为 pending。
 * 支持断点恢复：检查 checkpoint 字段，从中断点继续。
 *
 * 设计决策参考：design.md D2, D5
 */

import { pool } from '../db.js'
import { PipelineExecutor } from './pipeline-executor.js'
import { buildHeadersFromSettingsServer } from './headers-builder-server.js'
import { normalizeTaskProgress } from './task-progress.js'
import type { PipelineCheckpoint } from './pipeline-executor.js'
import type { UserRequirements } from '../../services/openmaic/pipeline-types.js'

// ============================================================
// 类型
// ============================================================

interface TaskRow {
  id: number
  child_id: number
  knowledge_node_id: string
  date: string
  requirement: string
  language: string
  settings: Record<string, unknown>
  checkpoint: PipelineCheckpoint | null
  retry_count: number
  max_retries: number
}

// ============================================================
// 状态
// ============================================================

let isProcessing = false
let processingTimer: ReturnType<typeof setTimeout> | null = null

const pipelineExecutor = new PipelineExecutor()

type TaskRequirementsInput = Pick<TaskRow, 'requirement' | 'language' | 'settings'>

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function buildTaskRequirements(task: TaskRequirementsInput): UserRequirements {
  const userNickname = getNonEmptyString(task.settings?.userNickname)
  const userBio = getNonEmptyString(task.settings?.userBio)
    ?? getNonEmptyString(task.settings?.selfIntroduction)

  return {
    requirement: task.requirement,
    language: task.language || 'zh-CN',
    ...(userNickname ? { userNickname } : {}),
    ...(userBio ? { userBio } : {}),
  }
}

// ============================================================
// 核心方法
// ============================================================

/**
 * 启动任务处理循环
 * 每 3 秒检查一次是否有待处理任务
 */
export function startTaskProcessor(): void {
  console.log('[TaskProcessor] 启动任务处理器')
  recoverStuckTasks().catch(console.error)
  processLoop()
}

/**
 * 停止任务处理循环
 */
export function stopTaskProcessor(): void {
  if (processingTimer) {
    clearTimeout(processingTimer)
    processingTimer = null
  }
}

/**
 * 立即触发一次处理（非阻塞）
 */
export function triggerProcessing(): void {
  if (!isProcessing) {
    processNextTask().catch(console.error)
  }
}

// ============================================================
// 内部方法
// ============================================================

async function processLoop(): Promise<void> {
  try {
    await processNextTask()
  } catch (error) {
    console.error('[TaskProcessor] 处理循环错误:', error)
  }
  // 3 秒后再检查
  processingTimer = setTimeout(processLoop, 3000)
}

/**
 * 恢复卡住的任务（status='running' 超过 5 分钟）
 */
async function recoverStuckTasks(): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'pending', updated_at = NOW()
       WHERE status = 'running'
         AND updated_at < NOW() - INTERVAL '5 minutes'
         AND retry_count < max_retries
       RETURNING id`,
    )
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[TaskProcessor] 恢复 ${result.rowCount} 个卡住的任务`)
    }
  } catch (error) {
    console.error('[TaskProcessor] 恢复卡住任务失败:', error)
  }
}

/**
 * 处理下一个待执行任务
 * C2 fix: 使用原子 UPDATE...RETURNING + FOR UPDATE SKIP LOCKED 避免竞态
 */
async function processNextTask(): Promise<void> {
  if (isProcessing) return

  // 原子拾取：在一条语句中 SELECT + UPDATE，避免竞态条件
  const { rows } = await pool.query<TaskRow>(
    `UPDATE api.generation_tasks
     SET status = 'running', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = (
       SELECT id FROM api.generation_tasks
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, child_id, knowledge_node_id, date, requirement, language,
               settings, checkpoint, retry_count, max_retries`,
  )

  if (rows.length === 0) return

  const task = rows[0]
  isProcessing = true

  console.log(`[TaskProcessor] 开始处理任务 #${task.id}: ${task.knowledge_node_id}`)

  try {

    // 构建 Headers
    const headers = buildHeadersFromSettingsServer(task.settings)

    // 执行 Pipeline
    const classroom = await pipelineExecutor.runFullPipeline({
      requirements: buildTaskRequirements(task),
      headers,
      checkpoint: task.checkpoint,
      onProgress: async (step, percent, message) => {
        void message
        const safeProgress = normalizeTaskProgress(percent)

        await pool.query(
          `UPDATE api.generation_tasks
           SET progress = $1, current_step = $2, updated_at = NOW()
           WHERE id = $3`,
          [safeProgress, step, task.id],
        ).catch(console.error)
      },
      onCheckpoint: async (checkpoint, step, progress) => {
        const safeProgress = normalizeTaskProgress(progress)

        await pool.query(
          `UPDATE api.generation_tasks
           SET checkpoint = $1, current_step = $2, progress = $3, updated_at = NOW()
           WHERE id = $4`,
          [JSON.stringify(checkpoint), step, safeProgress, task.id],
        ).catch(console.error)
      },
    })

    // 成功：写入 classroom_cache
    const cacheKey = `${task.knowledge_node_id}::${task.date}`
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    await pool.query(
      `INSERT INTO api.classroom_cache
         (child_id, knowledge_node_id, date, cache_key, classroom_data, cached_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (child_id, cache_key) DO UPDATE
         SET classroom_data = EXCLUDED.classroom_data,
             cached_at = NOW(),
             expires_at = EXCLUDED.expires_at`,
      [task.child_id, task.knowledge_node_id, task.date, cacheKey, JSON.stringify(classroom), expiresAt],
    )

    // 标记完成
    await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'completed', progress = 100, result_cache_key = $1,
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [cacheKey, task.id],
    )

    console.log(`[TaskProcessor] ✅ 任务 #${task.id} 完成, cacheKey: ${cacheKey}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[TaskProcessor] ❌ 任务 #${task.id} 失败:`, errorMsg)

    if (task.retry_count < task.max_retries) {
      // 重试：重新标记为 pending
      await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'pending', retry_count = retry_count + 1,
             error = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, task.id],
      ).catch(console.error)
    } else {
      // 重试耗尽：标记为 failed
      await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'failed', error = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, task.id],
      ).catch(console.error)
    }
  } finally {
    isProcessing = false
  }
}
