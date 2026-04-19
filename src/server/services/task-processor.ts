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
import { externalizeClassroomAudio } from './audio-file-store.js'
import { writeSystemLog } from './system-log.js'
import { processCourseInitTask } from './course-initializer.js'
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
  lesson_index: number
  task_type: string
  course_id: number | null
}

// ============================================================
// 状态
// ============================================================

let isProcessing = false
let processingTimer: ReturnType<typeof setTimeout> | null = null
let recoveryTimer: ReturnType<typeof setTimeout> | null = null
let currentTaskId: number | null = null
let currentTaskStartedAt: number | null = null

/** 单个任务最大执行时间（防止 isProcessing 锁死）
 *  完整 Pipeline 含多场景大纲/内容/TTS/媒体生成，通常需要 5-10 分钟 */
const MAX_TASK_EXECUTION_MS = 900_000
/** 卡住任务恢复间隔 */
const RECOVERY_INTERVAL_MS = 120_000
/** 限流后延迟重试间隔 */
const RATE_LIMIT_DELAY_SECONDS = 60

const RATE_LIMIT_PATTERNS = [
  'rate limit', 'rate_limit', 'ratelimit',
  'quota', 'usage limit',
  '429', 'too many requests',
  'TTSRateLimitError', 'concurrency',
]

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

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
  recoverOnStartup().then(() => recoverStuckTasks()).catch(console.error)
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
 * 启动时强制恢复：进程刚启动不可能有正在运行的任务，
 * 全部 running 状态都是上一个进程残留的，无条件重置为 pending。
 */
async function recoverOnStartup(): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'pending', updated_at = NOW()
       WHERE status = 'running'
       RETURNING id`,
    )
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[TaskProcessor] 启动恢复: 重置 ${result.rowCount} 个残留 running 任务为 pending`)
    }
  } catch (error) {
    console.error('[TaskProcessor] 启动恢复失败:', error)
  }
}

/**
 * 周期性恢复卡住的任务（status='running' 超过 15 分钟未更新）
 */
async function recoverStuckTasks(): Promise<void> {
  try {
    // 可重试的：重置为 pending（任务超过 15 分钟未更新才认为卡住）
    const retryable = await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'pending', updated_at = NOW()
       WHERE status = 'running'
         AND updated_at < NOW() - INTERVAL '15 minutes'
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
         AND updated_at < NOW() - INTERVAL '15 minutes'
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
     SET status = 'running', started_at = COALESCE(started_at, NOW()),
         scheduled_after = NULL, updated_at = NOW()
     WHERE id = (
       SELECT id FROM api.generation_tasks
       WHERE status = 'pending'
         AND (scheduled_after IS NULL OR scheduled_after <= NOW())
       ORDER BY created_at ASC, id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, child_id, knowledge_node_id, date, requirement, language,
               settings, checkpoint, retry_count, max_retries, lesson_index, task_type, course_id`,
  )

  if (rows.length === 0) return

  const task = rows[0]
  isProcessing = true
  currentTaskId = task.id
  currentTaskStartedAt = Date.now()

  console.log(
    `[TaskProcessor] 开始处理任务 #${task.id} (type=${task.task_type || 'classroom-prebuild'})` +
    ` (retry=${task.retry_count}/${task.max_retries})`,
  )

  // ============================================================
  // 分支：课程初始化（course-initialization）
  // 单独的处理链路，不走 OpenMAIC pipeline，不写 classroom_cache
  // ============================================================
  if (task.task_type === 'course-initialization') {
    try {
      if (!task.course_id) throw new Error('course-initialization task requires course_id')
      await processCourseInitTask({
        id: task.id,
        child_id: task.child_id,
        course_id: task.course_id,
        settings: task.settings,
        checkpoint: (task.checkpoint as unknown) as never,
      })
      console.log(`[TaskProcessor] ✅ 课程初始化任务 #${task.id} 完成`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[TaskProcessor] ❌ 课程初始化 #${task.id} 失败:`, errorMsg)
      if (task.retry_count < task.max_retries) {
        await pool.query(
          `UPDATE api.generation_tasks
           SET status = 'pending', retry_count = retry_count + 1,
               error = $1, updated_at = NOW()
           WHERE id = $2`,
          [errorMsg, task.id],
        )
      } else {
        await pool.query(
          `UPDATE api.generation_tasks
           SET status = 'failed', error = $1, updated_at = NOW()
           WHERE id = $2`,
          [errorMsg, task.id],
        )
      }
      writeSystemLog(task.child_id, 'error', 'CourseInit',
        `课程初始化失败: ${errorMsg}`, task.id)
    } finally {
      isProcessing = false
      currentTaskId = null
      currentTaskStartedAt = null
    }
    return
  }

  writeSystemLog(task.child_id, 'info', 'PreGeneration',
    `开始生成课堂: ${task.knowledge_node_id}${task.retry_count > 0 ? ` (第 ${task.retry_count} 次重试)` : ''}`,
    task.id)

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
      onWarn: (msg) => {
        writeSystemLog(task.child_id, 'warn', 'PreGeneration', msg, task.id)
      },
    })

    // 用 knowledge_node_lessons 中的课时标题覆盖 pipeline 生成的通用标题
    const lessonIdx = task.lesson_index ?? 1
    try {
      const { rows: lessonRows } = await pool.query<{ title: string }>(
        `SELECT title FROM api.knowledge_node_lessons
         WHERE knowledge_node_id = $1 AND lesson_index = $2 LIMIT 1`,
        [task.knowledge_node_id, lessonIdx],
      )
      if (lessonRows.length > 0 && lessonRows[0].title) {
        classroom.title = lessonRows[0].title
        if (classroom.stage) {
          classroom.stage.name = lessonRows[0].title
        }
      }
    } catch {
      // best-effort: keep pipeline-generated title if query fails
    }

    // Extract base64 audio from JSON → write to /data/media/audio/ files
    // This shrinks classroomData from ~41MB to ~1MB (audio served via Nginx)
    const audioCount = await externalizeClassroomAudio(
      classroom, task.child_id, task.knowledge_node_id, task.date,
    )
    if (audioCount > 0) {
      console.log(`[TaskProcessor] Externalized ${audioCount} audio files for task #${task.id}`)
    }

    // 成功：写入 classroom_cache (no TTL — evicted on completion or by LRU capacity limit)
    const cacheKey = `${task.knowledge_node_id}::${lessonIdx}::${task.date}`

    await pool.query(
      `INSERT INTO api.classroom_cache
         (child_id, knowledge_node_id, date, cache_key, classroom_data, cached_at, expires_at, lesson_index)
       VALUES ($1, $2, $3, $4, $5, NOW(), NULL, $6)
       ON CONFLICT (child_id, cache_key) DO UPDATE
         SET classroom_data = EXCLUDED.classroom_data,
             cached_at = NOW(),
             expires_at = NULL,
             lesson_index = EXCLUDED.lesson_index`,
      [task.child_id, task.knowledge_node_id, task.date, cacheKey, JSON.stringify(classroom), lessonIdx],
    )

    // Evict oldest cache entries if this child exceeds capacity (20 per child)
    await pool.query(
      `SELECT api.evict_classroom_cache($1, 20)`,
      [task.child_id],
    ).catch((err: unknown) => {
      console.error(`[TaskProcessor] LRU eviction failed for child ${task.child_id}:`, err)
    })

    await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'completed', progress = 100, result_cache_key = $1,
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [cacheKey, task.id],
    )

    console.log(`[TaskProcessor] ✅ 任务 #${task.id} 完成, cacheKey: ${cacheKey}`)
    writeSystemLog(task.child_id, 'info', 'PreGeneration',
      `课堂生成完成: ${task.knowledge_node_id}`, task.id)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[TaskProcessor] ❌ 任务 #${task.id} 失败:`, errorMsg)

    if (isRateLimitError(errorMsg)) {
      await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'pending', error = $1,
             scheduled_after = NOW() + INTERVAL '${RATE_LIMIT_DELAY_SECONDS} seconds',
             updated_at = NOW()
         WHERE id = $2`,
        [errorMsg, task.id],
      ).catch((err: unknown) => {
        console.error(`[TaskProcessor] 限流延迟更新失败 #${task.id}:`, err)
      })
      console.log(`[TaskProcessor] 任务 #${task.id} 触发限流，${RATE_LIMIT_DELAY_SECONDS}s 后重试（不消耗重试次数）`)
      writeSystemLog(task.child_id, 'warn', 'PreGeneration',
        `API 限流，${RATE_LIMIT_DELAY_SECONDS}s 后自动重试: ${errorMsg}`, task.id)
    } else if (task.retry_count < task.max_retries) {
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
      writeSystemLog(task.child_id, 'warn', 'PreGeneration',
        `课堂生成将重试 (${task.retry_count + 1}/${task.max_retries}): ${errorMsg}`,
        task.id)
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
      writeSystemLog(task.child_id, 'error', 'PreGeneration',
        `课堂生成失败 (重试耗尽): ${errorMsg}`, task.id)
    }
  } finally {
    isProcessing = false
    currentTaskId = null
    currentTaskStartedAt = null
  }
}
