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
let recoveryTimer: ReturnType<typeof setTimeout> | null = null
let currentTaskId: number | null = null
let currentTaskStartedAt: number | null = null

/** 单个任务最大执行时间（防止 isProcessing 锁死） */
const MAX_TASK_EXECUTION_MS = 180_000
/** 卡住任务恢复间隔 */
const RECOVERY_INTERVAL_MS = 60_000

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

export function startTaskProcessor(): void {
  console.log('[TaskProcessor] 启动任务处理器')
  recoverStuckTasks().catch(console.error)
  processLoop()
  startRecoveryLoop()
}

export function stopTaskProcessor(): void {
  if (processingTimer) {
    clearTimeout(processingTimer)
    processingTimer = null
  }
  if (recoveryTimer) {
    clearTimeout(recoveryTimer)
    recoveryTimer = null
  }
}

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
    checkProcessingTimeout()
    await processNextTask()
  } catch (error) {
    console.error('[TaskProcessor] 处理循环错误:', error)
  }
  processingTimer = setTimeout(processLoop, 3000)
}

/**
 * 周期性恢复卡住的任务（每 60s 检查一次）
 */
function startRecoveryLoop(): void {
  recoveryTimer = setTimeout(async () => {
    try {
      await recoverStuckTasks()
    } catch (error) {
      console.error('[TaskProcessor] 周期恢复失败:', error)
    }
    startRecoveryLoop()
  }, RECOVERY_INTERVAL_MS)
}

/**
 * 检查当前处理中的任务是否超过最大执行时间。
 * 如果超时，强制释放 isProcessing 锁，让后续任务可以被拾取。
 */
function checkProcessingTimeout(): void {
  if (!isProcessing || !currentTaskStartedAt) return

  const elapsed = Date.now() - currentTaskStartedAt
  if (elapsed > MAX_TASK_EXECUTION_MS) {
    console.error(
      `[TaskProcessor] ⚠️ 任务 #${currentTaskId} 执行超过 ${MAX_TASK_EXECUTION_MS / 1000}s，强制释放处理锁`,
    )
    isProcessing = false
    currentTaskId = null
    currentTaskStartedAt = null
  }
}

/**
 * 恢复卡住的任务（status='running' 超过 3 分钟）
 */
async function recoverStuckTasks(): Promise<void> {
  try {
    // 可重试的：重置为 pending
    const retryable = await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'pending', updated_at = NOW()
       WHERE status = 'running'
         AND updated_at < NOW() - INTERVAL '3 minutes'
         AND retry_count < max_retries
       RETURNING id`,
    )
    if (retryable.rowCount && retryable.rowCount > 0) {
      console.log(`[TaskProcessor] 恢复 ${retryable.rowCount} 个卡住的任务为 pending`)
    }

    // 不可重试的：标记为 failed
    const expired = await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'failed', error = COALESCE(error, 'stuck in running state'), updated_at = NOW()
       WHERE status = 'running'
         AND updated_at < NOW() - INTERVAL '3 minutes'
         AND retry_count >= max_retries
       RETURNING id`,
    )
    if (expired.rowCount && expired.rowCount > 0) {
      console.log(`[TaskProcessor] 标记 ${expired.rowCount} 个超限卡住任务为 failed`)
    }
  } catch (error) {
    console.error('[TaskProcessor] 恢复卡住任务失败:', error)
  }
}

/**
 * 处理下一个待执行任务
 */
async function processNextTask(): Promise<void> {
  if (isProcessing) return

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
  currentTaskId = task.id
  currentTaskStartedAt = Date.now()

  console.log(
    `[TaskProcessor] 开始处理任务 #${task.id}: ${task.knowledge_node_id}` +
    ` (retry=${task.retry_count}/${task.max_retries})`,
  )

  try {
    const headers = buildHeadersFromSettingsServer(task.settings)

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
        ).catch((err: unknown) => {
          console.error(`[TaskProcessor] 进度更新失败 #${task.id}:`, err)
        })
      },
      onCheckpoint: async (checkpoint, step, progress) => {
        const safeProgress = normalizeTaskProgress(progress)

        await pool.query(
          `UPDATE api.generation_tasks
           SET checkpoint = $1, current_step = $2, progress = $3, updated_at = NOW()
           WHERE id = $4`,
          [JSON.stringify(checkpoint), step, safeProgress, task.id],
        ).catch((err: unknown) => {
          console.error(`[TaskProcessor] 检查点保存失败 #${task.id}:`, err)
        })
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
      await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'pending', retry_count = retry_count + 1,
             error = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, task.id],
      ).catch((err: unknown) => {
        console.error(`[TaskProcessor] 重试状态更新失败 #${task.id}:`, err)
      })
      console.log(`[TaskProcessor] 任务 #${task.id} 将重试 (${task.retry_count + 1}/${task.max_retries})`)
    } else {
      await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'failed', error = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, task.id],
      ).catch((err: unknown) => {
        console.error(`[TaskProcessor] 失败状态更新失败 #${task.id}:`, err)
      })
      console.log(`[TaskProcessor] 任务 #${task.id} 重试耗尽，标记为 failed`)
    }
  } finally {
    isProcessing = false
    currentTaskId = null
    currentTaskStartedAt = null
  }
}
