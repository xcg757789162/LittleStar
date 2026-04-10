/**
 * 生成调度器
 *
 * 批量提交 OpenMAIC 课堂生成请求，管理异步轮询，
 * 成功后写入缓存，失败自动重试。
 */

import type { OpenMAICClient } from '@/services/openmaic/client'
import type { ClassroomCache } from '@/services/openmaic/cache'

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
}

/** 生成任务输入 */
export interface GenerationTaskInput {
  knowledgeNodeId: string
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
  private readonly client: OpenMAICClient
  private readonly cache: ClassroomCache
  private readonly maxRetries: number
  private readonly retryIntervals: number[]
  private readonly pollIntervalMs: number
  private readonly maxPollAttempts: number
  private readonly onTaskProgress?: (info: TaskProgressInfo) => void
  private tasks: GenerationTask[] = []
  private taskIdCounter = 0

  constructor(
    client: OpenMAICClient,
    cache: ClassroomCache,
    config?: SchedulerConfig,
  ) {
    this.client = client
    this.cache = cache
    this.maxRetries = config?.maxRetries ?? 3
    this.retryIntervals = config?.retryIntervals ?? [5000, 15000, 30000]
    this.pollIntervalMs = config?.pollIntervalMs ?? 5000
    this.maxPollAttempts = config?.maxPollAttempts ?? 120
    this.onTaskProgress = config?.onTaskProgress
  }

  /**
   * 提交一个生成任务
   */
  submitTask(input: GenerationTaskInput): GenerationTask {
    const task: GenerationTask = {
      id: `task-${++this.taskIdCounter}`,
      knowledgeNodeId: input.knowledgeNodeId,
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

    // 并行执行，每个任务完成时通过 notify 回调通知
    let completedSoFar = 0
    let failedSoFar = 0

    const results = await Promise.all(
      pendingTasks.map(async (task) => {
        const result = await this.executeTask(task)
        if (result.status === 'completed') completedSoFar++
        if (result.status === 'failed') failedSoFar++
        this.notifyProgress(result, completedSoFar, failedSoFar, totalCount)
        return result
      }),
    )

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
   */
  private async executeTask(task: GenerationTask): Promise<GenerationTask> {
    const totalCount = this.tasks.length
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 1. 提交生成请求
        task.status = 'generating'
        this.onTaskProgress?.({
          completedCount: this.tasks.filter((t) => t.status === 'completed').length,
          failedCount: this.tasks.filter((t) => t.status === 'failed').length,
          totalCount,
          latestTask: { ...task },
          stageText: `正在提交生成请求...`,
        })
        const response = await this.client.generateClassroom({
          requirement: task.requirement,
          language: task.language,
        })

        task.classroomId = response.classroomId

        // 2. 轮询等待完成
        task.status = 'polling'
        this.onTaskProgress?.({
          completedCount: this.tasks.filter((t) => t.status === 'completed').length,
          failedCount: this.tasks.filter((t) => t.status === 'failed').length,
          totalCount,
          latestTask: { ...task },
          stageText: `AI 老师正在创作课堂内容...`,
        })
        const classroom = await this.client.pollUntilComplete(
          response.classroomId,
          {
            intervalMs: this.pollIntervalMs,
            maxAttempts: this.maxPollAttempts,
          },
        )

        // 3. 写入缓存
        await this.cache.saveClassroom(
          task.knowledgeNodeId,
          task.date,
          classroom,
        )

        // 4. 标记完成
        task.status = 'completed'
        task.retryCount = attempt // 0 = 首次成功，N = 经过 N 次重试后成功
        return { ...task }
      } catch (error) {
        if (attempt < this.maxRetries) {
          task.retryCount = attempt + 1 // 记录已进行的重试次数
          // 等待后重试
          const waitMs = this.retryIntervals[attempt] ?? this.retryIntervals[this.retryIntervals.length - 1]
          await new Promise((resolve) => setTimeout(resolve, waitMs))
        } else {
          // 重试耗尽
          task.status = 'failed'
          task.retryCount = this.maxRetries // 已用尽所有重试次数
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
