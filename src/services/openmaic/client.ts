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
  ClassroomStatus,
  Classroom,
  Scene,
  Slide,
} from './types'

/** Client 配置 */
export interface OpenMAICClientConfig {
  /** OpenMAIC 服务地址，浏览器环境默认走 /openmaic（Nginx 代理），Node 环境默认 http://localhost:3000 */
  baseUrl?: string
  /** 请求超时时间（毫秒），默认 30000 */
  timeoutMs?: number
}

/** 生成进度详情 */
export interface GenerationProgress {
  /** 进度百分比 0-100 */
  percent: number
  /** 当前阶段描述（中文） */
  stage: string
  /** 当前阶段英文标识 */
  stageKey: 'submitting' | 'queued' | 'generating' | 'assembling' | 'completed' | 'failed' | 'polling'
  /** 已轮询次数 */
  attempt: number
  /** 最大轮询次数 */
  maxAttempts: number
  /** 已用时间（秒） */
  elapsedSeconds: number
}

/** 轮询配置 */
export interface PollOptions {
  /** 轮询间隔（毫秒），默认 5000 */
  intervalMs?: number
  /** 最大轮询次数，默认 180（5s * 180 = 15 分钟） */
  maxAttempts?: number
  /** 进度回调（旧版，仅百分比） */
  onProgress?: (progress: number) => void
  /** 详细进度回调（新版，含阶段信息） */
  onDetailedProgress?: (progress: GenerationProgress) => void
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
    // 浏览器环境通过 /openmaic（Nginx 代理或 Vite proxy）避免跨域，Node 环境直连
    const isBrowser = typeof window !== 'undefined'
    this.baseUrl = (config?.baseUrl || (isBrowser ? '/openmaic' : 'http://localhost:3000')).replace(/\/+$/, '')
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

    const data = await response.json() as Record<string, unknown>

    // 后端返回 jobId，前端类型使用 classroomId，做字段映射
    return {
      classroomId: (data.classroomId ?? data.jobId) as string,
      status: (data.status ?? 'pending') as GenerateClassroomResponse['status'],
    }
  }

  /**
   * 获取课堂完整数据
   * 后端端点: GET /api/classroom?id={classroomId}
   *
   * 后端 OpenMAIC 的数据结构和前端不同，需要做完整适配：
   * - 后端：每个 scene 就是一个"页面"，scene.content.type = 'slide'|'quiz'
   *   - 教学页：scene.content.canvas.elements[] (PPT 式元素)
   *   - 测验页：scene.content.questions[] (题目列表)
   *   - scene.actions[] 有 speech (语音)、spotlight 等动作
   * - 前端期望：Classroom.scenes[].slides[] 嵌套结构
   *
   * @param classroomId 课堂 ID
   */
  async getClassroom(classroomId: string): Promise<Classroom> {
    this.validateClassroomId(classroomId)
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/classroom?id=${encodeURIComponent(classroomId)}`,
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

    const data = await response.json() as Record<string, unknown>
    // 后端返回 { success, data: { classroom: { id, stage, scenes, createdAt } } }
    const rawClassroom = (data.data as Record<string, unknown>)?.classroom as Record<string, unknown>
      ?? data.classroom as Record<string, unknown>
      ?? data

    const stage = rawClassroom.stage as Record<string, unknown> | undefined
    const rawScenes = (rawClassroom.scenes ?? []) as Record<string, unknown>[]

    // 适配：将后端扁平 scenes 转换为前端 Scene[] → Slide[] 嵌套结构
    const frontendScenes = rawScenes.map((rawScene, idx) => {
      return this.convertBackendScene(rawScene, idx)
    })

    return {
      id: rawClassroom.id as string,
      title: (stage?.name ?? stage?.title ?? rawClassroom.title ?? 'Classroom') as string,
      status: 'completed' as const,
      scenes: frontendScenes,
      description: (stage?.description ?? rawClassroom.description) as string | undefined,
      createdAt: rawClassroom.createdAt as string | undefined,
      language: (stage?.language ?? rawClassroom.language) as string | undefined,
    }
  }

  /**
   * 将后端单个 scene 转换为前端 Scene 结构
   * 后端 scene 本身就是一个"页面"，需要包装成含 slides 的 Scene
   */
  private convertBackendScene(
    rawScene: Record<string, unknown>,
    index: number,
  ): Scene {
    const sceneId = (rawScene.id ?? `scene-${index}`) as string
    const sceneTitle = (rawScene.title ?? `Scene ${index + 1}`) as string
    const content = rawScene.content as Record<string, unknown> | undefined
    const contentType = content?.type as string | undefined
    const actions = (rawScene.actions ?? []) as Record<string, unknown>[]

    // 从 actions 中提取 speech 文本作为教学内容
    const speechTexts = actions
      .filter((a) => a.type === 'speech')
      .map((a) => a.text as string)
      .filter(Boolean)

    if (contentType === 'quiz') {
      // 测验页 → quiz scene
      return this.convertQuizScene(sceneId, sceneTitle, content, speechTexts)
    }

    // 教学页 (slide) → teaching scene
    return this.convertTeachingScene(sceneId, sceneTitle, content, speechTexts)
  }

  /**
   * 将后端教学页转换为前端 teaching Scene
   * 从 canvas.elements 提取文本和图片，组合成 slides
   */
  private convertTeachingScene(
    id: string,
    title: string,
    content: Record<string, unknown> | undefined,
    speechTexts: string[],
  ): Scene {
    const slides: Slide[] = []
    const canvas = content?.canvas as Record<string, unknown> | undefined
    const elements = (canvas?.elements ?? []) as Record<string, unknown>[]

    // 提取标题元素（第一个 text 元素通常是标题）
    const textElements = elements.filter((el) => el.type === 'text')
    const imageElements = elements.filter((el) => el.type === 'image')

    // 第一张 slide：标题页
    const titleHtml = (textElements[0]?.content ?? '') as string
    const titleText = this.stripHtml(titleHtml) || title
    const subtitleHtml = (textElements[1]?.content ?? '') as string
    const subtitleText = this.stripHtml(subtitleHtml)

    slides.push({
      type: 'title',
      title: titleText,
      content: subtitleText || undefined,
      imageUrl: imageElements.length > 0 ? (imageElements[0].src as string) : undefined,
    })

    // 剩余文本元素 → content slides（每2-3个元素合并为一页）
    const remainingTexts = textElements.slice(2)
    if (remainingTexts.length > 0) {
      // 将剩余文本合并为 content slides
      const contentParts: string[] = []
      for (const el of remainingTexts) {
        const text = this.stripHtml((el.content ?? '') as string)
        if (text) contentParts.push(text)
      }

      if (contentParts.length > 0) {
        // 合并为一个内容页
        slides.push({
          type: 'content',
          title: title,
          content: contentParts.join('\n\n'),
        })
      }
    }

    // 如果有 speech 文本且还没有作为内容使用，添加一张教学讲解页
    if (speechTexts.length > 0 && slides.length < 3) {
      // 合并所有 speech 文本为讲解内容
      const combinedSpeech = speechTexts.join('\n\n')
      if (combinedSpeech.length > 0) {
        slides.push({
          type: 'content',
          title: `${title} - 老师讲解`,
          content: combinedSpeech.length > 500
            ? combinedSpeech.substring(0, 500) + '...'
            : combinedSpeech,
        })
      }
    }

    // 如果有图片元素，添加图片 slide（跳过已在标题页使用的第一张）
    for (const img of imageElements.slice(1)) {
      slides.push({
        type: 'image',
        title: title,
        imageUrl: img.src as string,
      })
    }

    return {
      id,
      title,
      type: 'teaching',
      slides: slides.length > 0 ? slides : [{ type: 'content', title, content: title }],
    }
  }

  /**
   * 将后端测验页转换为前端 quiz Scene
   * 每个 question 转换为一个 quiz Slide
   */
  private convertQuizScene(
    id: string,
    title: string,
    content: Record<string, unknown> | undefined,
    speechTexts: string[],
  ): Scene {
    const slides: Slide[] = []
    const questions = (content?.questions ?? []) as Record<string, unknown>[]

    // 如果有 speech 开场白，添加一张标题 slide
    if (speechTexts.length > 0) {
      slides.push({
        type: 'title',
        title: `📝 ${title}`,
        content: speechTexts[0].length > 200
          ? speechTexts[0].substring(0, 200) + '...'
          : speechTexts[0],
      })
    }

    // 每个 question → 一个 quiz slide
    for (const q of questions) {
      const questionText = q.question as string
      const options = (q.options ?? []) as Record<string, unknown>[]
      const answer = q.answer as string[] | undefined

      // 将 options [{value: "A", label: "..."}, ...] 转换为 string[]
      const optionLabels = options.map((opt) =>
        `${opt.value as string}. ${opt.label as string}`,
      )

      // 将 answer ["A"] 转换为 correctAnswer index
      let correctIndex = 0
      if (answer && answer.length > 0) {
        correctIndex = options.findIndex((opt) => opt.value === answer[0])
        if (correctIndex < 0) correctIndex = 0
      }

      slides.push({
        type: 'quiz',
        title: title,
        quiz: {
          question: questionText,
          options: optionLabels,
          correctAnswer: correctIndex,
        },
      })

      // 如果有解析，添加一张解析 slide
      const analysis = q.analysis as string | undefined
      if (analysis) {
        slides.push({
          type: 'content',
          title: '📖 题目解析',
          content: analysis,
        })
      }
    }

    return {
      id,
      title,
      type: 'quiz',
      slides: slides.length > 0 ? slides : [{ type: 'content', title, content: '暂无测验题目' }],
    }
  }

  /**
   * 去除 HTML 标签，提取纯文本
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()
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
      `${this.baseUrl}/api/generate-classroom/${encodeURIComponent(classroomId)}`,
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

    const data = await response.json() as Record<string, unknown>

    // 后端使用不同的状态值，做映射：
    // queued → pending, running → processing, succeeded → completed, failed → failed
    const backendStatus = data.status as string
    let mappedStatus: ClassroomStatus
    switch (backendStatus) {
      case 'queued':
        mappedStatus = 'pending'
        break
      case 'running':
        mappedStatus = 'processing'
        break
      case 'succeeded':
        mappedStatus = 'completed'
        break
      case 'failed':
        mappedStatus = 'failed'
        break
      default:
        // 已经是前端标准值或未知状态
        mappedStatus = (['pending', 'processing', 'completed', 'failed'].includes(backendStatus)
          ? backendStatus : 'processing') as ClassroomStatus
    }

    // 后端 progress 是 0-100 整数，前端期望 0-1 浮点
    const rawProgress = data.progress as number | undefined
    const mappedProgress = rawProgress !== undefined ? rawProgress / 100 : undefined

    // 后端完成时数据在 result 字段而非 classroom 字段
    // result: { classroomId, url, scenesCount }
    // 我们暂时不提供完整 classroom 对象（需单独请求），但标记已完成
    const result: ClassroomStatusResponse = {
      status: mappedStatus,
      progress: mappedProgress,
      error: data.error as string | undefined,
    }

    // 如果后端标记完成且有 done: true，尝试构建最小 classroom 对象
    if (mappedStatus === 'completed' && data.done === true) {
      const backendResult = data.result as Record<string, unknown> | undefined
      if (backendResult) {
        // 构建最小可用的 Classroom，后续 pollUntilComplete 会用这个
        result.classroom = {
          id: (backendResult.classroomId ?? classroomId) as string,
          title: (data.message ?? 'Generated Classroom') as string,
          status: 'completed',
          scenes: [],  // 完整场景数据需要从课堂 URL 加载
        }
      }
    }

    return result
  }

  /**
   * 将 API 状态映射为中文阶段描述
   */
  private mapStatusToStage(status: ClassroomStatus, attempt: number): { stage: string; stageKey: GenerationProgress['stageKey'] } {
    switch (status) {
      case 'pending':
        return attempt === 0
          ? { stage: '正在提交生成请求...', stageKey: 'submitting' }
          : { stage: '排队等待中...', stageKey: 'queued' }
      case 'processing':
        return { stage: 'AI 老师正在创作课堂内容...', stageKey: 'generating' }
      case 'completed':
        return { stage: '课堂生成完成！', stageKey: 'completed' }
      case 'failed':
        return { stage: '生成失败', stageKey: 'failed' }
      default:
        return { stage: '正在检查状态...', stageKey: 'polling' }
    }
  }

  /**
   * 估算进度百分比
   * 基于轮询次数和 API 返回的 progress 字段综合计算
   */
  private estimatePercent(apiProgress: number | undefined, attempt: number, maxAttempts: number): number {
    if (apiProgress !== undefined) {
      // API 返回了真实进度（0-1），转成百分比
      return Math.min(Math.round(apiProgress * 100), 99)
    }
    // 没有真实进度时，使用基于轮询次数的模拟进度（对数曲线，不超过 90%）
    const ratio = attempt / maxAttempts
    return Math.min(Math.round(90 * (1 - Math.exp(-3 * ratio))), 90)
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
    this.validateClassroomId(classroomId)
    const intervalMs = options?.intervalMs ?? 5000
    const maxAttempts = options?.maxAttempts ?? 180
    const startTime = Date.now()

    // 初始进度回调
    if (options?.onDetailedProgress) {
      options.onDetailedProgress({
        percent: 5,
        stage: '正在提交生成请求...',
        stageKey: 'submitting',
        attempt: 0,
        maxAttempts,
        elapsedSeconds: 0,
      })
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)

      let statusResponse: ClassroomStatusResponse
      try {
        statusResponse = await this.getClassroomStatus(classroomId)
      } catch (error) {
        // 网络错误时报告状态但继续重试
        if (options?.onDetailedProgress) {
          options.onDetailedProgress({
            percent: this.estimatePercent(undefined, attempt, maxAttempts),
            stage: '网络波动，正在重试...',
            stageKey: 'polling',
            attempt,
            maxAttempts,
            elapsedSeconds,
          })
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        continue
      }

      if (statusResponse.status === 'completed') {
        // 完成进度回调
        if (options?.onDetailedProgress) {
          options.onDetailedProgress({
            percent: 100,
            stage: '课堂生成完成，正在加载课堂数据...',
            stageKey: 'completed',
            attempt,
            maxAttempts,
            elapsedSeconds,
          })
        }

        // 获取完整课堂数据（轮询响应只有元数据，需要单独请求完整课堂含场景）
        // 优先使用轮询响应中的 classroomId（result.classroomId），因为它可能与 jobId 不同
        const fullClassroomId = (statusResponse.classroom?.id) ?? classroomId
        try {
          const fullClassroom = await this.getClassroom(fullClassroomId)
          return fullClassroom
        } catch {
          // 如果获取完整数据失败但有最小 classroom 对象，降级返回
          if (statusResponse.classroom) {
            return statusResponse.classroom
          }
          throw new Error('Classroom generation completed but failed to fetch full classroom data')
        }
      }

      if (statusResponse.status === 'failed') {
        if (options?.onDetailedProgress) {
          options.onDetailedProgress({
            percent: 0,
            stage: `生成失败: ${statusResponse.error || '未知错误'}`,
            stageKey: 'failed',
            attempt,
            maxAttempts,
            elapsedSeconds,
          })
        }
        throw new Error(
          `Classroom generation failed: ${statusResponse.error || 'Unknown error'}`,
        )
      }

      // 进度回调
      const percent = this.estimatePercent(statusResponse.progress, attempt, maxAttempts)
      const { stage, stageKey } = this.mapStatusToStage(statusResponse.status, attempt)

      if (options?.onDetailedProgress) {
        options.onDetailedProgress({
          percent,
          stage,
          stageKey,
          attempt,
          maxAttempts,
          elapsedSeconds,
        })
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
   *
   * 请求链路：/openmaic/ → Nginx → openmaic:3002/
   *
   * 如果 /api/health 不存在，fallback 到根路径（带尾随 /）。
   * @returns true 如果服务在线，false 如果离线
   */
  async checkHealth(): Promise<boolean> {
    try {
      // 优先尝试 /api/generate-classroom 的 OPTIONS 或 GET 一个已知端点
      // 但最安全的方式是请求根路径加尾随 /，确保 Nginx location 匹配
      const response = await this.fetchWithTimeout(`${this.baseUrl}/`, {
        method: 'GET',
      })
      // 2xx 或 3xx 都视为在线（某些框架根路径会 redirect）
      return response.ok || (response.status >= 300 && response.status < 400)
    } catch {
      return false
    }
  }
}
