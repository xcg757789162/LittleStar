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

    const results = await Promise.all(
      pendingTasks.map((task) => this.executeTask(task)),
    )

    return results
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
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 1. 提交生成请求
        task.status = 'generating'
        const response = await this.client.generateClassroom({
          requirement: task.requirement,
          language: task.language,
        })

        task.classroomId = response.classroomId

        // 2. 轮询等待完成
        task.status = 'polling'
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
