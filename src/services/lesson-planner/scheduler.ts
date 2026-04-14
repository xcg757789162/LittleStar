/**
 * 生成调度器
 *
 * 批量提交 OpenMAIC 课堂生成请求，管理异步轮询，
 * 成功后写入缓存，失败自动重试。
 */

import type { ClassroomCache } from '@/services/openmaic/cache'
import type { OpenMAICPipelineClient } from '@/services/openmaic/pipeline-client'
import type { PipelineProgress } from '@/services/openmaic/pipeline-types'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('Scheduler')

// ============================================================
// 类型定义
// ============================================================

/** 任务进度回调参数 */
export interface TaskProgressInfo {
  /** 当前完成的任务数 */
  completedCount: number
  /** 当前失败的任务数 */
  failedCount: number
  /** 任务总数 */
  totalCount: number
  /** 最近完成/变更的任务 */
  latestTask: GenerationTask
  /** 当前阶段描述（中文） */
  stageText: string
}

/** 调度器配置 */
export interface SchedulerConfig {
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 重试间隔序列（毫秒），默认 [5000, 15000, 30000] */
  retryIntervals?: number[]
  /** 轮询间隔（毫秒），默认 5000 */
  pollIntervalMs?: number
  /** 最大轮询次数，默认 120 */
  maxPollAttempts?: number
  /** 任务进度回调 */
  onTaskProgress?: (info: TaskProgressInfo) => void

  // === Pipeline Client 配置（必填） ===
  /** Pipeline Client 实例 */
  pipelineClient: OpenMAICPipelineClient
  /** Pipeline API 请求 Headers（通过 buildHeadersFromSettings 构建） */
  pipelineHeaders: Record<string, string>
  /** Pipeline 步骤级进度回调 */
  onPipelineProgress?: (progress: PipelineProgress) => void
}

/** 生成任务输入 */
export interface GenerationTaskInput {
  knowledgeNodeId: string
  lessonIndex?: number
  date: string
  requirement: string
  language?: string
}

/** 生成任务状态 */
export type TaskStatus = 'pending' | 'generating' | 'polling' | 'completed' | 'failed'

/** 生成任务 */
export interface GenerationTask {
  id: string
  knowledgeNodeId: string
  lessonIndex: number
  date: string
  requirement: string
  language?: string
  status: TaskStatus
  classroomId?: string
  retryCount: number
  error?: string
}

// ============================================================
// GenerationScheduler
// ============================================================

export class GenerationScheduler {
  private readonly cache: ClassroomCache
  private readonly maxRetries: number
  private readonly retryIntervals: number[]
  private readonly onTaskProgress?: (info: TaskProgressInfo) => void
  private readonly pipelineClient: OpenMAICPipelineClient
  private readonly pipelineHeaders: Record<string, string>
  private readonly onPipelineProgress?: (progress: PipelineProgress) => void
  private tasks: GenerationTask[] = []
  private taskIdCounter = 0

  constructor(
    cache: ClassroomCache,
    config: SchedulerConfig,
  ) {
    this.cache = cache
    this.maxRetries = config.maxRetries ?? 3
    this.retryIntervals = config.retryIntervals ?? [5000, 15000, 30000]
    this.onTaskProgress = config.onTaskProgress
    this.pipelineClient = config.pipelineClient
    this.pipelineHeaders = config.pipelineHeaders
    this.onPipelineProgress = config.onPipelineProgress
  }

  /**
   * 提交一个生成任务
   */
  submitTask(input: GenerationTaskInput): GenerationTask {
    const task: GenerationTask = {
      id: `task-${++this.taskIdCounter}`,
      knowledgeNodeId: input.knowledgeNodeId,
      lessonIndex: input.lessonIndex ?? 1,
      date: input.date,
      requirement: input.requirement,
      language: input.language,
      status: 'pending',
      retryCount: 0,
    }

    this.tasks.push(task)
    return { ...task }
  }

  /**
   * 执行所有待处理的任务
   *
   * **串行执行**（非并行），原因：
   * 1. OpenMAIC 后端 AI 模型调用资源密集，并行 N 个请求会导致后端过载/限流
   * 2. 串行时每完成一个任务即更新进度（"1/4 → 2/4"），用户体验更好
   * 3. 避免并行轮询全部卡在 "0/4" 不动的问题
   *
   * @returns 所有任务的最终状态
   */
  async executeTasks(): Promise<GenerationTask[]> {
    const pendingTasks = this.tasks.filter((t) => t.status === 'pending')
    const totalCount = pendingTasks.length

    // 初始进度通知
    if (this.onTaskProgress && totalCount > 0) {
      this.onTaskProgress({
        completedCount: 0,
        failedCount: 0,
        totalCount,
        latestTask: { ...pendingTasks[0] },
        stageText: `正在准备 ${totalCount} 节课堂...`,
      })
    }

    // 串行执行：逐个生成，每个完成后立即通知进度
    let completedSoFar = 0
    let failedSoFar = 0
    const results: GenerationTask[] = []

    for (const task of pendingTasks) {
      // 通知正在处理第 N 个任务
      this.onTaskProgress?.({
        completedCount: completedSoFar,
        failedCount: failedSoFar,
        totalCount,
        latestTask: { ...task },
        stageText: `正在生成第 ${completedSoFar + failedSoFar + 1}/${totalCount} 节课堂...`,
      })

      const result = await this.executeTask(task)
      if (result.status === 'completed') completedSoFar++
      if (result.status === 'failed') failedSoFar++
      this.notifyProgress(result, completedSoFar, failedSoFar, totalCount)
      results.push(result)
    }

    log.info('所有任务执行完毕:', completedSoFar, '成功,', failedSoFar, '失败')
    return results
  }

  /**
   * 通知任务进度变更
   */
  private notifyProgress(task: GenerationTask, completed: number, failed: number, total: number): void {
    if (!this.onTaskProgress) return
    const remaining = total - completed - failed
    let stageText: string
    if (completed === total) {
      stageText = `全部 ${total} 节课堂准备完成！`
    } else if (remaining > 0) {
      stageText = `正在生成课堂...（${completed}/${total}）`
    } else {
      stageText = `${completed} 节完成，${failed} 节失败`
    }
    this.onTaskProgress({
      completedCount: completed,
      failedCount: failed,
      totalCount: total,
      latestTask: { ...task },
      stageText,
    })
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(knowledgeNodeId: string, date: string): GenerationTask | undefined {
    const task = this.tasks.find(
      (t) => t.knowledgeNodeId === knowledgeNodeId && t.date === date,
    )
    return task ? { ...task } : undefined
  }

  /**
   * 获取待处理任务数量
   */
  getPendingCount(): number {
    return this.tasks.filter((t) => t.status === 'pending').length
  }

  /**
   * 清除所有任务
   */
  clearTasks(): void {
    this.tasks = []
  }

  // ---- 私有方法 ----

  /**
   * 执行单个任务（含重试逻辑）
   *
   * 使用 Pipeline Client 生成课堂。失败时按重试策略重试 Pipeline。
   * 不再降级到旧 API（旧 API 使用 Docker 环境变量的 OPENAI_API_KEY，已弃用）。
   */
  private async executeTask(task: GenerationTask): Promise<GenerationTask> {
    const totalCount = this.tasks.length

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        task.status = 'generating'
        this.onTaskProgress?.({
          completedCount: this.tasks.filter((t) => t.status === 'completed').length,
          failedCount: this.tasks.filter((t) => t.status === 'failed').length,
          totalCount,
          latestTask: { ...task },
          stageText: `正在通过 Pipeline 生成第 ${this.tasks.filter((t) => t.status === 'completed').length + 1}/${totalCount} 节课堂...`,
        })

        const classroom = await this.pipelineClient.runFullPipeline({
          requirements: {
            requirement: task.requirement,
            language: task.language || 'zh-CN',
          },
          headers: this.pipelineHeaders,
          callbacks: {
            onProgress: this.onPipelineProgress,
          },
        })

        // Pipeline 成功 → 写入缓存
        await this.cache.saveClassroom(
          task.knowledgeNodeId,
          task.lessonIndex,
          task.date,
          classroom,
        )

        task.status = 'completed'
        task.retryCount = attempt
        return { ...task }
      } catch (error) {
        if (attempt < this.maxRetries) {
          task.retryCount = attempt + 1
          console.warn(
            `[Scheduler] Pipeline 第 ${attempt + 1} 次失败，将重试:`,
            error instanceof Error ? error.message : String(error),
          )
          const waitMs = this.retryIntervals[attempt] ?? this.retryIntervals[this.retryIntervals.length - 1]
          await new Promise((resolve) => setTimeout(resolve, waitMs))
        } else {
          // 重试耗尽
          task.status = 'failed'
          task.retryCount = this.maxRetries
          task.error = error instanceof Error ? error.message : String(error)
          return { ...task }
        }
      }
    }

    // 不应执行到这里
    task.status = 'failed'
    task.error = 'Unknown error'
    return { ...task }
  }
}
