/**
 * OpenMAIC API Client
 *
 * 封装对本机 Docker 部署的 OpenMAIC 服务的 HTTP API 调用。
 * 支持课堂生成、状态轮询、数据拉取和健康检查。
 */

import type {
  GenerateClassroomRequest,
  GenerateClassroomResponse,
  ClassroomStatusResponse,
  Classroom,
} from './types'

/** Client 配置 */
export interface OpenMAICClientConfig {
  /** OpenMAIC 服务地址，默认 http://localhost:3000 */
  baseUrl?: string
  /** 请求超时时间（毫秒），默认 30000 */
  timeoutMs?: number
}

/** 轮询配置 */
export interface PollOptions {
  /** 轮询间隔（毫秒），默认 5000 */
  intervalMs?: number
  /** 最大轮询次数，默认 120（5s * 120 = 10 分钟） */
  maxAttempts?: number
  /** 进度回调 */
  onProgress?: (progress: number) => void
}

/** OpenMAIC API 错误 */
export class OpenMAICApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message)
    this.name = 'OpenMAICApiError'
  }
}

export class OpenMAICClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(config?: OpenMAICClientConfig) {
    this.baseUrl = (config?.baseUrl || 'http://localhost:3000').replace(/\/+$/, '')
    this.timeoutMs = config?.timeoutMs || 30000
  }

  /**
   * 带超时控制的 fetch 包装
   * 使用 AbortController 在超时后中止请求
   */
  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 验证 classroomId 格式，防止路径注入
   * 仅允许字母、数字、连字符和下划线
   */
  private validateClassroomId(classroomId: string): void {
    if (!classroomId || !/^[\w-]+$/.test(classroomId)) {
      throw new Error(
        `Invalid classroomId: "${classroomId}". Only alphanumeric characters, hyphens, and underscores are allowed.`,
      )
    }
  }

  /**
   * 提交课堂生成请求（异步）
   * @returns 包含 classroomId 的响应，用于后续轮询
   */
  async generateClassroom(
    request: GenerateClassroomRequest,
  ): Promise<GenerateClassroomResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/generate-classroom`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new OpenMAICApiError(
        (errorData as Record<string, string>).error ||
          `Failed to generate classroom: ${response.statusText}`,
        response.status,
        response.statusText,
      )
    }

    return response.json() as Promise<GenerateClassroomResponse>
  }

  /**
   * 获取课堂数据
   * @param classroomId 课堂 ID
   */
  async getClassroom(classroomId: string): Promise<Classroom> {
    this.validateClassroomId(classroomId)
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/classroom/${encodeURIComponent(classroomId)}`,
      { method: 'GET' },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new OpenMAICApiError(
        (errorData as Record<string, string>).error ||
          `Failed to get classroom: ${response.statusText}`,
        response.status,
        response.statusText,
      )
    }

    return response.json() as Promise<Classroom>
  }

  /**
   * 获取课堂生成状态
   * @param classroomId 课堂 ID
   */
  async getClassroomStatus(
    classroomId: string,
  ): Promise<ClassroomStatusResponse> {
    this.validateClassroomId(classroomId)
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/classroom/${encodeURIComponent(classroomId)}`,
      { method: 'GET' },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new OpenMAICApiError(
        (errorData as Record<string, string>).error ||
          `Failed to get classroom status: ${response.statusText}`,
        response.status,
        response.statusText,
      )
    }

    return response.json() as Promise<ClassroomStatusResponse>
  }

  /**
   * 轮询直到课堂生成完成
   * @param classroomId 课堂 ID
   * @param options 轮询配置
   * @returns 完成的课堂数据
   */
  async pollUntilComplete(
    classroomId: string,
    options?: PollOptions,
  ): Promise<Classroom> {
    const intervalMs = options?.intervalMs ?? 5000
    const maxAttempts = options?.maxAttempts ?? 120

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await this.getClassroomStatus(classroomId)

      if (statusResponse.status === 'completed' && statusResponse.classroom) {
        return statusResponse.classroom
      }

      if (statusResponse.status === 'failed') {
        throw new Error(
          `Classroom generation failed: ${statusResponse.error || 'Unknown error'}`,
        )
      }

      if (statusResponse.progress !== undefined && options?.onProgress) {
        options.onProgress(statusResponse.progress)
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(
      `Classroom generation timed out after max attempts (${maxAttempts})`,
    )
  }

  /**
   * 检查 OpenMAIC 服务健康状态
   * @returns true 如果服务在线，false 如果离线
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(this.baseUrl, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }
}
