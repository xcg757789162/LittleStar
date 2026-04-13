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
import {
  normalizeSceneOutline,
  getSceneOutlineIndex,
  attachGeneratedSpeechAudio,
} from './pipeline-types'
import type { Classroom, Scene, Slide } from './types'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('PipelineClient')

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
    const defaultUrl = isBrowser ? '/openmaic' : 'http://localhost:3000'
    this.baseUrl = (config?.baseUrl || defaultUrl).replace(/\/+$/, '')
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
    log.info('→ 生成场景大纲 (SSE)...')
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/generate/scene-outlines-stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ requirements }),
      },
    )

    if (!response.ok) {
      log.error('← 大纲生成失败:', response.status, response.statusText)
      throw new Error(
        `Failed to generate outlines: ${response.status} ${response.statusText}`,
      )
    }

    const outlines = await this.parseSSEStream(response)
    if (outlines.length === 0) {
      throw new Error('No scene outlines generated from scene-outlines-stream')
    }
    log.info('← 大纲生成完成, 共', outlines.length, '个场景')
    return outlines
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
    log.debug('→ 生成场景内容, scene:', outline.index, outline.title)
    const result = await this.fetchWithRetry<GeneratedContent>(
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
    log.debug('← 场景内容生成完成, scene:', outline.index)
    return result
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
    log.info('🚀 开始完整 Pipeline, language:', requirements.language)

    // Step 0: auto 模式下先获取 AI 生成的角色列表
    if (headers['x-agent-mode'] === 'auto') {
      this.reportProgress(callbacks, 'agent-profiles', 2, '正在生成课堂角色...')
      const agentProfiles = await this.generateAgentProfiles(requirements, headers)
      // 注意：HTTP header 不能包含非 ASCII 字符，用 Base64 编码
      headers['x-agent-profiles'] = btoa(unescape(encodeURIComponent(JSON.stringify(agentProfiles))))
      headers['x-agent-profiles-encoding'] = 'base64'
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
          const audioId = `scene-${i}-speech-${j}`
          const ttsResult = await this.generateTTS(action.text!, headers)
          attachGeneratedSpeechAudio(action, {
            audioId,
            audioBase64: ttsResult.audioBase64,
            durationMs: ttsResult.durationMs,
            format: ttsResult.format,
          })
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

    // Step 3: 组装 Classroom（v2: 包含 OpenMAIC Stage 元数据）
    this.reportProgress(callbacks, 'assembly', 95, '正在组装课堂数据...')

    const classroomId = `pipeline-${Date.now()}`
    const classroom: Classroom = {
      id: classroomId,
      title: outlines[0]?.title || 'Generated Classroom',
      status: 'completed',
      scenes,
      language: requirements.language,
      createdAt: new Date().toISOString(),
      // v2: 嵌入 OpenMAIC Stage 元数据，Bridge Store 可直接使用
      stage: {
        id: classroomId,
        name: outlines[0]?.title || 'Generated Classroom',
        description: outlines.map((o) => o.description).join('; '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: requirements.language,
      },
      outlines,
    }

    this.reportProgress(callbacks, 'assembly', 100, '课堂生成完成！')
    log.info('✅ Pipeline 完成, classroomId:', classroom.id, 'scenes:', scenes.length)

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
    const endpoint = url.replace(this.baseUrl, '')

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.warn(`重试 ${endpoint} (第 ${attempt} 次)...`)
        }
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
        log.warn(`${endpoint} 第 ${attempt + 1} 次请求失败:`, lastError.message)

        if (attempt < this.maxRetries) {
          // 指数退避：1s, 2s
          const delay = Math.pow(2, attempt) * 1000
          log.debug(`等待 ${delay}ms 后重试...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    log.error(`${endpoint} 重试 ${this.maxRetries} 次后仍然失败`)
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

          if (result.type === 'outline') {
            const normalized = normalizeSceneOutline(result.data, outlines.length)
            if (normalized) {
              outlines.push(normalized)
            }
          } else if (result.type === 'done') {
            // done 事件携带完整 outlines 数组，优先使用
            const doneOutlines = result.outlines as unknown[]
            if (Array.isArray(doneOutlines)) {
              return doneOutlines
                .map((outline, index) => normalizeSceneOutline(outline, index))
                .filter((outline): outline is SceneOutline => outline !== null)
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
        } catch (parseErr) {
          // 无效 JSON，记录并忽略
          log.warn('SSE 事件 JSON 解析失败:', line.slice(6, 100), parseErr)
          return null
        }
      }
    }
    return null
  }

  /**
   * 将大纲、内容、动作组装为 Scene（v2: 保留 OpenMAIC 原始格式）
   *
   * 不再扁平化为简化 Slide[]，而是直接保留 OpenMAIC 原始的 SceneContent + Action[]。
   * Stage 组件和 PlaybackEngine/ActionEngine 可以直接消费这些数据。
   *
   * 数据映射：
   *   GeneratedContent → Scene.content (SceneContent)
   *   SceneAction[]    → Scene.actions (Action[])
   */
  private assembleScene(
    outline: SceneOutline,
    content: GeneratedContent,
    actions: SceneAction[],
  ): Scene {
    const outlineIndex = getSceneOutlineIndex(outline)

    // 映射 outline.type → OpenMAIC SceneType
    const sceneType = this.mapSceneType(outline.type)

    // 构建 OpenMAIC 原生 SceneContent
    let sceneContent: Scene['content']

    if (content.type === 'slide' && content.canvas) {
      // 教学页：保留原始 canvas 数据
      sceneContent = {
        type: 'slide' as const,
        canvas: content.canvas as never, // GeneratedContent.canvas → PPTist Slide
      }
    } else if (content.type === 'quiz' && content.questions) {
      // 测验页：保留原始 questions（OpenMAIC 格式）
      sceneContent = {
        type: 'quiz' as const,
        questions: content.questions.map((q, idx) => ({
          id: `q-${outlineIndex}-${idx}`,
          type: 'single' as const,
          question: q.question,
          options: q.options.map((opt) => ({
            label: opt.label,
            value: opt.value,
          })),
          answer: q.answer,
          analysis: q.analysis,
        })),
      }
    } else {
      // fallback: 用 outline 信息构建简单 slide
      sceneContent = {
        type: 'slide' as const,
        canvas: {
          elements: [
            { type: 'text', content: `<p>${outline.title}</p>` },
            { type: 'text', content: `<p>${outline.description}</p>` },
          ],
        } as never,
      }
    }

    // 将 Pipeline 的 SceneAction[] 转换为 OpenMAIC 原生 Action[]
    // SceneAction 的字段与 Action 基本兼容（都有 type, text, audioBase64 等）
    const nativeActions = actions.map((a, idx) => ({
      id: `action-${outlineIndex}-${idx}`,
      ...a,
    }))

    return {
      id: `scene-${outlineIndex}`,
      title: outline.title,
      type: sceneType,
      order: outlineIndex,
      content: sceneContent,
      actions: nativeActions as Scene['actions'],
    }
  }

  /**
   * 映射 outline 场景类型到 LittleStar Scene 类型
   */
  private mapSceneType(type?: string): Scene['type'] {
    switch (type) {
      case 'slide':
      case 'teaching':
      case 'content':
        return 'slide'
      case 'quiz':
        return 'quiz'
      case 'interactive':
        return 'interactive'
      case 'pbl':
        return 'pbl'
      case 'summary':
        return 'summary'
      default:
        return 'slide'
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

}
