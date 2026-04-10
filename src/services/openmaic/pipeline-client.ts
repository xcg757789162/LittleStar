/**
 * OpenMAIC Pipeline Client
 *
 * 通过逐步调用 OpenMAIC 子 API 端点生成课堂内容。
 * 调用流程：
 *   1. scene-outlines-stream (SSE) → SceneOutline[]
 *   2. 对每个 outline:
 *      2a. scene-content → GeneratedContent
 *      2b. scene-actions → SceneAction[]
 *      2c. tts × N → 每个 speech action 的音频
 *   3. 组装完整 Classroom → 返回
 *
 * 设计决策参考：design.md D1, D3, D4, D5
 */

import type {
  UserRequirements,
  SceneOutline,
  GeneratedContent,
  SceneAction,
  PipelineInput,
  PipelineCallbacks,
  PipelineProgress,
  PipelineStepName,
  AgentInfo,
} from './pipeline-types'
import { isSceneOutline } from './pipeline-types'
import type { Classroom, Scene, Slide } from './types'

// ============================================================
// 配置
// ============================================================

/** Pipeline Client 配置 */
export interface PipelineClientConfig {
  /** OpenMAIC 服务地址 */
  baseUrl?: string
  /** 请求超时（毫秒），默认 60000（子 API 单次可能较慢） */
  timeoutMs?: number
  /** 单步最大重试次数，默认 2 */
  maxRetries?: number
}

/** TTS 生成结果 */
export interface TTSResult {
  /** base64 编码的音频数据 */
  audioBase64: string
  /** 音频时长（毫秒） */
  durationMs: number
}

// ============================================================
// Pipeline Client
// ============================================================

export class OpenMAICPipelineClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor(config?: PipelineClientConfig) {
    const isBrowser = typeof window !== 'undefined'
    this.baseUrl = (config?.baseUrl || (isBrowser ? '/openmaic' : 'http://localhost:3000')).replace(/\/+$/, '')
    this.timeoutMs = config?.timeoutMs ?? 60000
    this.maxRetries = config?.maxRetries ?? 2
  }

  // ============================================================
  // 子 API 调用
  // ============================================================

  /**
   * 生成场景大纲（SSE 流式）
   *
   * 调用 `/api/generate/scene-outlines-stream`，通过 SSE 流式接收大纲。
   * 使用 fetch + ReadableStream（非 EventSource），因为需要自定义 Headers。
   *
   * @param requirements 用户需求
   * @param headers HTTP Headers（含 x-model, x-api-key 等）
   * @returns SceneOutline 数组
   */
  async generateOutlines(
    requirements: UserRequirements,
    headers: Record<string, string>,
  ): Promise<SceneOutline[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/generate/scene-outlines-stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(requirements),
      },
    )

    if (!response.ok) {
      throw new Error(
        `Failed to generate outlines: ${response.status} ${response.statusText}`,
      )
    }

    return this.parseSSEStream(response)
  }

  /**
   * 生成单个场景内容
   *
   * 调用 `/api/generate/scene-content`
   *
   * @param outline 场景大纲
   * @param headers HTTP Headers
   * @returns 生成的内容
   */
  async generateSceneContent(
    outline: SceneOutline,
    headers: Record<string, string>,
  ): Promise<GeneratedContent> {
    return this.fetchWithRetry<GeneratedContent>(
      `${this.baseUrl}/api/generate/scene-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ outline }),
      },
    )
  }

  /**
   * 生成单个场景动作
   *
   * 调用 `/api/generate/scene-actions`
   *
   * @param outline 场景大纲
   * @param content 场景内容
   * @param headers HTTP Headers
   * @returns 动作列表
   */
  async generateSceneActions(
    outline: SceneOutline,
    content: GeneratedContent,
    headers: Record<string, string>,
  ): Promise<SceneAction[]> {
    const data = await this.fetchWithRetry<{ actions: SceneAction[] }>(
      `${this.baseUrl}/api/generate/scene-actions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ outline, content }),
      },
    )
    return data.actions ?? []
  }

  /**
   * 生成 TTS 语音
   *
   * 调用 `/api/generate/tts`
   *
   * @param text 语音文本
   * @param headers HTTP Headers
   * @returns TTS 音频结果
   */
  async generateTTS(
    text: string,
    headers: Record<string, string>,
  ): Promise<TTSResult> {
    const data = await this.fetchWithRetry<{ audio: string; durationMs: number }>(
      `${this.baseUrl}/api/generate/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ text }),
      },
    )
    return {
      audioBase64: data.audio,
      durationMs: data.durationMs,
    }
  }

  /**
   * 生成课堂角色（auto 模式）
   *
   * 调用 `/api/generate/agent-profiles`，让后端根据课程需求自动生成角色列表。
   *
   * @param requirements 用户需求
   * @param headers HTTP Headers（含 x-model, x-api-key 等）
   * @returns AgentInfo 数组（含 voiceId）
   */
  async generateAgentProfiles(
    requirements: UserRequirements,
    headers: Record<string, string>,
  ): Promise<AgentInfo[]> {
    const data = await this.fetchWithRetry<AgentInfo[]>(
      `${this.baseUrl}/api/generate/agent-profiles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(requirements),
      },
    )
    return data
  }

  // ============================================================
  // 编排方法
  // ============================================================

  /**
   * 执行完整 Pipeline — 核心编排方法
   *
   * 按顺序调用所有子 API，组装完整 Classroom 对象。
   * 生成过程中通过 callbacks 报告进度。
   *
   * @param input Pipeline 输入（需求、headers、回调）
   * @returns 完整的 Classroom 对象
   */
  async runFullPipeline(input: PipelineInput): Promise<Classroom> {
    const { requirements, headers, callbacks } = input

    // Step 0: auto 模式下先获取 AI 生成的角色列表
    if (headers['x-agent-mode'] === 'auto') {
      this.reportProgress(callbacks, 'agent-profiles', 2, '正在生成课堂角色...')
      const agentProfiles = await this.generateAgentProfiles(requirements, headers)
      headers['x-agent-profiles'] = JSON.stringify(agentProfiles)
      this.reportProgress(callbacks, 'agent-profiles', 5, `角色生成完成，共 ${agentProfiles.length} 个角色`)
    }

    // Step 1: 生成大纲
    this.reportProgress(callbacks, 'outlines', 5, '正在生成场景大纲...')

    const outlines = await this.generateOutlines(requirements, headers)
    callbacks?.onOutlinesReady?.(outlines)
    this.reportProgress(callbacks, 'outlines', 20, `大纲生成完成，共 ${outlines.length} 个场景`)

    // Step 2: 对每个大纲生成内容、动作、TTS
    const scenes: Scene[] = []
    const totalScenes = outlines.length

    for (let i = 0; i < outlines.length; i++) {
      const outline = outlines[i]

      // 2a: 生成内容
      const contentPercent = 20 + (i / totalScenes) * 30
      this.reportProgress(
        callbacks, 'scene-content', contentPercent,
        `正在生成场景 ${i + 1}/${totalScenes} 的内容...`,
        i, totalScenes,
      )

      const content = await this.generateSceneContent(outline, headers)
      callbacks?.onSceneContentReady?.(i, content)

      // 2b: 生成动作
      const actionsPercent = 50 + (i / totalScenes) * 20
      this.reportProgress(
        callbacks, 'scene-actions', actionsPercent,
        `正在生成场景 ${i + 1}/${totalScenes} 的动作...`,
        i, totalScenes,
      )

      const actions = await this.generateSceneActions(outline, content, headers)
      callbacks?.onSceneActionsReady?.(i, actions)

      // 2c: 为每个 speech action 生成 TTS（串行，D5 决策）
      const speechActions = actions.filter((a) => a.type === 'speech' && a.text)
      for (let j = 0; j < speechActions.length; j++) {
        const action = speechActions[j]
        const ttsPercent = 70 + (i / totalScenes) * 20 + (j / Math.max(speechActions.length, 1)) * (20 / totalScenes)
        this.reportProgress(
          callbacks, 'tts', ttsPercent,
          `正在生成场景 ${i + 1} 的语音 ${j + 1}/${speechActions.length}...`,
          i, totalScenes,
        )

        try {
          const ttsResult = await this.generateTTS(action.text!, headers)
          action.audioBase64 = ttsResult.audioBase64
          action.audioDurationMs = ttsResult.durationMs
          callbacks?.onTTSReady?.(i, j, ttsResult.audioBase64)
        } catch (error) {
          // TTS 失败不中止整个 Pipeline，记录错误
          callbacks?.onError?.('tts', error instanceof Error ? error : new Error(String(error)))
        }
      }

      // 将 outline + content + actions 组装为 Scene
      const scene = this.assembleScene(outline, content, actions)
      scenes.push(scene)
    }

    // Step 3: 组装 Classroom
    this.reportProgress(callbacks, 'assembly', 95, '正在组装课堂数据...')

    const classroom: Classroom = {
      id: `pipeline-${Date.now()}`,
      title: outlines[0]?.title || 'Generated Classroom',
      status: 'completed',
      scenes,
      language: requirements.language,
      createdAt: new Date().toISOString(),
    }

    this.reportProgress(callbacks, 'assembly', 100, '课堂生成完成！')

    return classroom
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 带超时控制的 fetch
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
        throw new Error(`Pipeline request timed out after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 带重试的 fetch（指数退避：1s, 2s）
   */
  private async fetchWithRetry<T>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as Record<string, string>
          throw new Error(
            errorData.error || `API error: ${response.status} ${response.statusText}`,
          )
        }

        return await response.json() as T
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.maxRetries) {
          // 指数退避：1s, 2s
          const delay = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }

  /**
   * 解析 SSE 流
   *
   * 从 ReadableStream 中读取 SSE 事件，解析 outline 和 done/error 事件。
   * 参考 OpenMAIC 前端的 SSE 解析逻辑。
   */
  private async parseSSEStream(response: Response): Promise<SceneOutline[]> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    const outlines: SceneOutline[] = []
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 处理缓冲区中的完整 SSE 事件（以双换行分隔）
        const events = buffer.split('\n\n')
        // 保留最后一个不完整的块
        buffer = events.pop() || ''

        for (const event of events) {
          const result = this.parseSSEEvent(event)
          if (!result) continue

          if (result.type === 'outline' && isSceneOutline(result.data)) {
            outlines.push(result.data)
          } else if (result.type === 'done') {
            // done 事件携带完整 outlines 数组，优先使用
            const doneOutlines = result.outlines as unknown[]
            if (Array.isArray(doneOutlines)) {
              return doneOutlines.filter(isSceneOutline)
            }
            return outlines
          } else if (result.type === 'error') {
            throw new Error(
              (result as Record<string, unknown>).error as string || 'SSE stream error',
            )
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // 如果流正常结束但没有 done 事件，返回已收集的 outlines
    return outlines
  }

  /**
   * 解析单个 SSE 事件文本
   */
  private parseSSEEvent(event: string): Record<string, unknown> | null {
    const lines = event.trim().split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          return JSON.parse(line.slice(6)) as Record<string, unknown>
        } catch {
          // 无效 JSON，忽略
          return null
        }
      }
    }
    return null
  }

  /**
   * 将大纲、内容、动作组装为 Scene
   */
  private assembleScene(
    outline: SceneOutline,
    content: GeneratedContent,
    actions: SceneAction[],
  ): Scene {
    const slides: Slide[] = []

    // 从 content 提取 slides
    if (content.type === 'slide' && content.canvas) {
      const elements = content.canvas.elements || []
      const textElements = elements.filter((el) => el.type === 'text')
      const imageElements = elements.filter((el) => el.type === 'image')

      // 标题页
      const titleText = this.stripHtml((textElements[0]?.content ?? '') as string) || outline.title
      slides.push({
        type: 'title',
        title: titleText,
        content: this.stripHtml((textElements[1]?.content ?? '') as string) || undefined,
        imageUrl: imageElements[0]?.src as string | undefined,
      })

      // 内容页
      const remainingTexts = textElements.slice(2)
        .map((el) => this.stripHtml((el.content ?? '') as string))
        .filter(Boolean)
      if (remainingTexts.length > 0) {
        slides.push({
          type: 'content',
          title: outline.title,
          content: remainingTexts.join('\n\n'),
        })
      }
    } else if (content.type === 'quiz' && content.questions) {
      // 测验页
      for (const q of content.questions) {
        const optionLabels = q.options.map((opt) => `${opt.value}. ${opt.label}`)
        let correctIndex = 0
        if (q.answer.length > 0) {
          correctIndex = q.options.findIndex((opt) => opt.value === q.answer[0])
          if (correctIndex < 0) correctIndex = 0
        }

        slides.push({
          type: 'quiz',
          title: outline.title,
          quiz: {
            question: q.question,
            options: optionLabels,
            correctAnswer: correctIndex,
          },
        })
      }
    }

    // 从 speech actions 提取讲解内容
    const speechTexts = actions
      .filter((a) => a.type === 'speech' && a.text)
      .map((a) => a.text!)

    if (speechTexts.length > 0 && slides.length < 3) {
      slides.push({
        type: 'content',
        title: `${outline.title} - 老师讲解`,
        content: speechTexts.join('\n\n'),
      })
    }

    // 确保至少有一张 slide
    if (slides.length === 0) {
      slides.push({
        type: 'content',
        title: outline.title,
        content: outline.description,
      })
    }

    return {
      id: `scene-${outline.index}`,
      title: outline.title,
      type: (outline.type as Scene['type']) || 'teaching',
      slides,
    }
  }

  /**
   * 报告进度
   */
  private reportProgress(
    callbacks: PipelineCallbacks | undefined,
    step: PipelineStepName,
    percent: number,
    message: string,
    sceneIndex?: number,
    totalScenes?: number,
  ): void {
    if (!callbacks?.onProgress) return

    const progress: PipelineProgress = {
      step,
      percent: Math.round(percent),
      message,
      sceneIndex,
      totalScenes,
    }
    callbacks.onProgress(progress)
  }

  /**
   * 去除 HTML 标签
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
}
