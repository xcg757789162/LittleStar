/**
 * 后端 Pipeline 编排引擎
 *
 * 从前端 OpenMAICPipelineClient 迁移而来。
 * 改为后端直连 OpenMAIC 服务（http://localhost:3002）。
 * 每个步骤完成后通过 onCheckpoint 回调保存断点。
 *
 * 设计决策参考：design.md D3, D5
 */

import type {
  UserRequirements,
  SceneOutline,
  GeneratedContent,
  SceneAction,
  PipelineStepName,
  AgentInfo,
} from '../../services/openmaic/pipeline-types.js'
import {
  normalizeSceneOutline,
  getSceneOutlineIndex,
  attachGeneratedSpeechAudio,
} from '../../services/openmaic/pipeline-types.js'

// ============================================================
// 类型定义
// ============================================================

/** Pipeline 步骤级检查点 */
export interface PipelineCheckpoint {
  /** 已完成的大纲列表 */
  outlines?: SceneOutline[]
  /** 已完成的场景内容 Map<sceneIndex, GeneratedContent> */
  sceneContents?: Record<number, GeneratedContent>
  /** 已完成的场景动作 Map<sceneIndex, SceneAction[]> */
  sceneActions?: Record<number, SceneAction[]>
  /** 已完成 TTS 的标记 Map<"sceneIdx-actionIdx", true> */
  completedTTS?: Record<string, boolean>
  /** 已完成的媒体预生成标记 Map<elementId, true> */
  completedMedia?: Record<string, boolean>
  /** 最后完成的步骤 */
  lastCompletedStep?: PipelineStepName
  /** 最后完成的场景索引 */
  lastSceneIndex?: number
  /** Agent profiles（auto 模式） */
  agentProfiles?: AgentInfo[]
  /** 课堂 stageId（供 scene-content / scene-actions 复用） */
  stageId?: string
  /** 跨场景累积的 speech 文本 */
  previousSpeeches?: string[]
}

/** Pipeline 执行进度回调 */
export interface PipelineProgressCallback {
  (step: PipelineStepName, percent: number, message: string): void
}

/** 检查点保存回调 */
export interface CheckpointCallback {
  (checkpoint: PipelineCheckpoint, step: PipelineStepName, progress: number): Promise<void>
}

/** Non-fatal warning callback (media failures, etc.) */
export interface PipelineWarnCallback {
  (message: string): void
}

/** Pipeline 执行输入 */
export interface PipelineExecutorInput {
  requirements: UserRequirements
  headers: Record<string, string>
  checkpoint?: PipelineCheckpoint | null
  onProgress?: PipelineProgressCallback
  onCheckpoint?: CheckpointCallback
  onWarn?: PipelineWarnCallback
}

/** 简化的 Scene 结构（与前端 Scene 兼容） */
export interface GeneratedScene {
  id: string
  title: string
  type: string
  order: number
  content: unknown
  actions: unknown[]
}

/** 简化的 Classroom 结构 */
export interface GeneratedClassroom {
  id: string
  title: string
  status: 'completed'
  scenes: GeneratedScene[]
  language: string
  createdAt: string
  stage: {
    id: string
    name: string
    description: string
    createdAt: number
    updatedAt: number
    language: string
  }
  outlines: SceneOutline[]
}

interface SceneContentApiResponse {
  success?: boolean
  content?: GeneratedContent
  effectiveOutline?: SceneOutline
}

interface SceneActionsApiResponse {
  success?: boolean
  actions?: SceneAction[]
  scene?: GeneratedScene & { actions?: SceneAction[] }
  previousSpeeches?: string[]
}

interface TTSApiResponse {
  success?: boolean
  audio?: string
  durationMs?: number
  audioId?: string
  base64?: string
  format?: string
}

interface ImageApiResponse {
  success?: boolean
  result?: { url?: string; base64?: string }
  error?: string
  errorCode?: string
}

interface VideoApiResponse {
  success?: boolean
  result?: { url?: string; poster?: string }
  error?: string
  errorCode?: string
}

interface SceneActionsResult {
  actions: SceneAction[]
  previousSpeeches: string[]
  scene?: GeneratedScene
}

// ============================================================
// 画布常量 & 媒体后处理
// ============================================================

const CANVAS_W = 1000
const CANVAS_H = 562.5
const MARGIN = 50
const MAX_MEDIA_W = 600
const MAX_MEDIA_H = CANVAS_H - MARGIN * 2 // 462.5

function parseAspectRatio(ratio: string): number {
  const parts = ratio.split(':').map(Number)
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1]
  return 16 / 9
}

/**
 * Post-process slide content returned by OpenMAIC to clamp oversized
 * AI-generated media elements (gen_img_* / gen_vid_*).
 *
 * LLMs sometimes output full-canvas dimensions for generated images/videos,
 * causing them to dominate the entire slide and overlap text.
 * This enforces max bounds and the declared aspect ratio.
 */
function clampOversizedMedia(
  content: GeneratedContent,
  outline?: SceneOutline,
): GeneratedContent {
  const elements =
    content.canvas?.elements ?? content.elements
  if (!elements || !Array.isArray(elements)) return content

  const mediaGens = outline?.mediaGenerations as
    | Array<{ elementId: string; aspectRatio?: string }>
    | undefined

  let modified = false

  for (const el of elements) {
    if (el.type !== 'image' && el.type !== 'video') continue
    const src = el.src as string | undefined
    if (!src || !/^gen_(img|vid)_/i.test(src)) continue

    const mg = mediaGens?.find((m) => m.elementId === src)
    const targetRatio = parseAspectRatio(mg?.aspectRatio || '16:9')

    let w = (el.width as number) || 400
    let h = (el.height as number) || 300

    const originalW = w
    const originalH = h

    if (w > MAX_MEDIA_W) w = MAX_MEDIA_W
    h = Math.round(w / targetRatio)

    if (h > MAX_MEDIA_H) {
      h = Math.round(MAX_MEDIA_H)
      w = Math.round(h * targetRatio)
    }

    if (w !== originalW || h !== originalH) {
      el.width = w
      el.height = h
      modified = true
    }

    let left = (el.left as number) ?? MARGIN
    let top = (el.top as number) ?? MARGIN
    if (left < MARGIN) { left = MARGIN; modified = true }
    if (top < MARGIN) { top = MARGIN; modified = true }
    if (left + w > CANVAS_W - MARGIN) { left = Math.max(MARGIN, CANVAS_W - MARGIN - w); modified = true }
    if (top + h > CANVAS_H - MARGIN) { top = Math.max(MARGIN, CANVAS_H - MARGIN - h); modified = true }
    el.left = left
    el.top = top
  }

  if (modified) {
    console.log('[PipelineExecutor] Clamped oversized gen media elements')
  }

  return content
}

// ============================================================
// 配置
// ============================================================

/** OpenMAIC 内网直连地址 */
const OPENMAIC_BASE_URL = process.env.OPENMAIC_URL || 'http://localhost:3002'
const TIMEOUT_MS = 180_000
const MAX_RETRIES = 2

// ============================================================
// Pipeline Executor
// ============================================================

export class PipelineExecutor {
  /**
   * 执行完整 Pipeline（支持断点恢复）
   */
  async runFullPipeline(input: PipelineExecutorInput): Promise<GeneratedClassroom> {
    const { requirements, headers, checkpoint, onProgress, onCheckpoint, onWarn } = input

    const cp: PipelineCheckpoint = checkpoint ? { ...checkpoint } : {}
    cp.previousSpeeches = cp.previousSpeeches ? [...cp.previousSpeeches] : []
    cp.stageId = cp.stageId || `pipeline-${Date.now()}`

    // Step 0: 解析/生成 Agent profiles
    // 注意：x-agent-profiles header 包含中文会导致 Node.js fetch ByteString 错误
    // 因此 agentProfiles 从 header 解码后删除 header，改为通过 body 传递给 OpenMAIC
    let agentProfiles: AgentInfo[] | undefined

    if (headers['x-agent-mode'] === 'auto' && !cp.agentProfiles) {
      onProgress?.('agent-profiles', 2, '正在生成课堂角色...')
      agentProfiles = await this.generateAgentProfiles(requirements, headers)
      cp.agentProfiles = agentProfiles
      await onCheckpoint?.(cp, 'agent-profiles', 5)
      onProgress?.('agent-profiles', 5, `角色生成完成，共 ${agentProfiles.length} 个角色`)
    } else if (cp.agentProfiles) {
      agentProfiles = cp.agentProfiles
    } else if (headers['x-agent-profiles']) {
      // 从 header 解码 agent profiles（可能是 Base64 编码）
      try {
        const raw = headers['x-agent-profiles-encoding'] === 'base64'
          ? Buffer.from(headers['x-agent-profiles'], 'base64').toString('utf-8')
          : headers['x-agent-profiles']
        agentProfiles = JSON.parse(raw) as AgentInfo[]
      } catch {
        console.warn('[PipelineExecutor] 无法解析 x-agent-profiles header，跳过')
      }
    }

    // 删除包含中文的 header，避免 ByteString 错误
    delete headers['x-agent-profiles']
    delete headers['x-agent-profiles-encoding']

    // Step 1: 生成大纲（如果 checkpoint 没有）
    let outlines: SceneOutline[]
    if (cp.outlines && cp.outlines.length > 0) {
      outlines = cp.outlines
      onProgress?.('outlines', 20, `大纲已恢复，共 ${outlines.length} 个场景`)
    } else {
      onProgress?.('outlines', 5, '正在生成场景大纲...')
      outlines = await this.generateOutlines(requirements, headers, agentProfiles)
      cp.outlines = outlines
      await onCheckpoint?.(cp, 'outlines', 20)
      onProgress?.('outlines', 20, `大纲生成完成，共 ${outlines.length} 个场景`)
    }

    if (outlines.length === 0) {
      throw new Error('No scene outlines generated from scene-outlines-stream')
    }

    const stageId = cp.stageId
    const stageInfo = this.buildStageInfo(requirements, outlines)

    // Step 2: 对每个大纲生成内容、动作、TTS
    // Progress layout: outlines=0-20%, per-scene=20-95%, assembly=95-100%
    // Each scene gets an equal slice of the 20-95% range to avoid backward jumps.
    const totalScenes = outlines.length
    const SCENE_PROGRESS_START = 20
    const SCENE_PROGRESS_END = 95
    const sceneProgressSlice = (SCENE_PROGRESS_END - SCENE_PROGRESS_START) / totalScenes

    if (!cp.sceneContents) cp.sceneContents = {}
    if (!cp.sceneActions) cp.sceneActions = {}
    if (!cp.completedTTS) cp.completedTTS = {}

    const scenes: GeneratedScene[] = []

    for (let i = 0; i < outlines.length; i++) {
      const outline = outlines[i]
      const sceneBase = SCENE_PROGRESS_START + i * sceneProgressSlice

      // 2a: 生成内容（检查 checkpoint）
      let content: GeneratedContent
      if (cp.sceneContents[i]) {
        content = cp.sceneContents[i]
      } else {
        const contentPercent = sceneBase
        onProgress?.('scene-content', contentPercent, `正在生成场景 ${i + 1}/${totalScenes} 的内容...`)
        content = await this.generateSceneContent(
          outline,
          outlines,
          stageId,
          stageInfo,
          headers,
          agentProfiles,
        )
        content = clampOversizedMedia(content, outline)
        cp.sceneContents[i] = content
        await onCheckpoint?.(cp, 'scene-content', Math.round(contentPercent))
      }

      // 2b: 生成动作（检查 checkpoint）
      let actions: SceneAction[]
      let generatedScene: GeneratedScene | undefined
      if (cp.sceneActions[i]) {
        actions = cp.sceneActions[i]
      } else {
        const actionsPercent = sceneBase + sceneProgressSlice * 0.25
        onProgress?.('scene-actions', actionsPercent, `正在生成场景 ${i + 1}/${totalScenes} 的动作...`)
        const sceneActionsResult = await this.generateSceneActions(
          outline,
          outlines,
          content,
          stageId,
          cp.previousSpeeches,
          headers,
          agentProfiles,
        )
        actions = sceneActionsResult.actions
        generatedScene = sceneActionsResult.scene
        cp.sceneActions[i] = actions
        cp.previousSpeeches = sceneActionsResult.previousSpeeches
        await onCheckpoint?.(cp, 'scene-actions', Math.round(actionsPercent))
      }

      // 2c: TTS (occupies 50% of each scene's slice)
      const speechActions = actions.filter((a) => a.type === 'speech' && a.text)
      for (let j = 0; j < speechActions.length; j++) {
        const ttsKey = `${i}-${j}`
        if (cp.completedTTS[ttsKey]) continue

        const ttsPercent = sceneBase + sceneProgressSlice * 0.5
          + (j / Math.max(speechActions.length, 1)) * sceneProgressSlice * 0.3
        onProgress?.('tts', ttsPercent, `正在生成场景 ${i + 1} 的语音 ${j + 1}/${speechActions.length}...`)

        try {
          const audioId = `scene-${i}-speech-${j}`
          const ttsResult = await this.generateTTS(
            speechActions[j].text!,
            headers,
            audioId,
          )
          attachGeneratedSpeechAudio(speechActions[j], {
            audioId,
            audioBase64: ttsResult.audio,
            durationMs: ttsResult.durationMs,
            format: ttsResult.format,
          })
          cp.completedTTS[ttsKey] = true
          await onCheckpoint?.(cp, 'tts', Math.round(ttsPercent))
        } catch (error) {
          console.error(`[PipelineExecutor] TTS 失败 scene=${i} action=${j}:`, error)
        }
      }

      // 2d: Media pre-generation (images/videos)
      if (!cp.completedMedia) cp.completedMedia = {}
      const mediaGens = outline.mediaGenerations ?? []
      const elements = content.canvas?.elements ?? content.elements ?? []
      for (let m = 0; m < mediaGens.length; m++) {
        const mg = mediaGens[m]
        if (cp.completedMedia[mg.elementId]) continue
        const el = elements.find(
          (e: Record<string, unknown>) => e.src === mg.elementId,
        )
        if (!el) continue

        const mediaPercent = sceneBase + sceneProgressSlice * 0.8
          + (m / Math.max(mediaGens.length, 1)) * sceneProgressSlice * 0.2
        onProgress?.(
          'media-generation',
          mediaPercent,
          `正在预生成场景 ${i + 1} 的${mg.type === 'image' ? '图片' : '视频'}...`,
        )

        try {
          const url = await this.generateMediaAsset(mg, headers)
          if (url) {
            el.src = url
            cp.sceneContents![i] = content
            cp.completedMedia[mg.elementId] = true
            await onCheckpoint?.(cp, 'media-generation', Math.round(mediaPercent))
          }
        } catch (error) {
          const msg = `媒体预生成失败 ${mg.elementId}: ${error instanceof Error ? error.message : String(error)}`
          console.error(`[PipelineExecutor] ${msg}`)
          onWarn?.(msg)
        }
      }

      // 组装 Scene
      const scene = generatedScene
        ? this.normalizeScene(generatedScene, outline, content, actions)
        : this.assembleScene(outline, content, actions)
      scenes.push(scene)
    }

    // Step 3: 组装 Classroom
    onProgress?.('assembly', 96, '正在组装课堂数据...')

    const classroom: GeneratedClassroom = {
      id: stageId,
      title: outlines[0]?.title || 'Generated Classroom',
      status: 'completed',
      scenes,
      language: requirements.language,
      createdAt: new Date().toISOString(),
      stage: {
        id: stageId,
        name: outlines[0]?.title || 'Generated Classroom',
        description: outlines.map((o) => o.description).join('; '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: requirements.language,
      },
      outlines,
    }

    onProgress?.('assembly', 100, '课堂生成完成！')
    return classroom
  }

  // ============================================================
  // 子 API 调用方法
  // ============================================================

  private async generateAgentProfiles(
    requirements: UserRequirements,
    headers: Record<string, string>,
  ): Promise<AgentInfo[]> {
    const data = await this.fetchWithRetry<AgentInfo[]>(
      `${OPENMAIC_BASE_URL}/api/generate/agent-profiles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(requirements),
      },
    )
    return data
  }

  private async generateOutlines(
    requirements: UserRequirements,
    headers: Record<string, string>,
    agents?: AgentInfo[],
  ): Promise<SceneOutline[]> {
    const response = await this.fetchWithTimeout(
      `${OPENMAIC_BASE_URL}/api/generate/scene-outlines-stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          requirements,
          ...(agents && agents.length > 0 ? { agents } : {}),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to generate outlines: ${response.status} ${response.statusText}`)
    }

    return this.parseSSEStream(response)
  }

  private async generateSceneContent(
    outline: SceneOutline,
    allOutlines: SceneOutline[],
    stageId: string,
    stageInfo: { name: string; description: string; language: string },
    headers: Record<string, string>,
    agents?: AgentInfo[],
  ): Promise<GeneratedContent> {
    const data = await this.fetchWithRetry<GeneratedContent | SceneContentApiResponse>(
      `${OPENMAIC_BASE_URL}/api/generate/scene-content`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          outline,
          allOutlines,
          stageInfo,
          stageId,
          agents,
        }),
      },
    )

    if (this.isGeneratedContent(data)) {
      return data
    }

    if (this.isGeneratedContent(data.content)) {
      return data.content
    }

    throw new Error('Invalid scene-content response: missing content payload')
  }

  private async generateSceneActions(
    outline: SceneOutline,
    allOutlines: SceneOutline[],
    content: GeneratedContent,
    stageId: string,
    previousSpeeches: string[],
    headers: Record<string, string>,
    agents?: AgentInfo[],
  ): Promise<SceneActionsResult> {
    const data = await this.fetchWithRetry<SceneActionsApiResponse>(
      `${OPENMAIC_BASE_URL}/api/generate/scene-actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          outline,
          allOutlines,
          content,
          stageId,
          previousSpeeches,
          agents,
        }),
      },
    )

    const actions = Array.isArray(data.actions)
      ? data.actions
      : Array.isArray(data.scene?.actions)
        ? data.scene.actions
        : []

    const nextPreviousSpeeches = Array.isArray(data.previousSpeeches)
      ? data.previousSpeeches.filter((item): item is string => typeof item === 'string')
      : previousSpeeches

    return {
      actions,
      previousSpeeches: nextPreviousSpeeches,
      scene: data.scene,
    }
  }

  private async generateTTS(
    text: string,
    headers: Record<string, string>,
    audioId: string,
  ): Promise<{ audio: string; durationMs: number; format?: string }> {
    const ttsEnabled = headers['x-tts-enabled'] !== 'false'
    const ttsProviderId = headers['x-tts-provider']
    const ttsVoice = headers['x-tts-voice']

    if (!ttsEnabled || !ttsProviderId || !ttsVoice || ttsProviderId === 'browser-native-tts') {
      return { audio: '', durationMs: 0 }
    }

    const body: Record<string, unknown> = {
      text,
      audioId,
      ttsProviderId,
      ttsVoice,
    }

    const ttsSpeed = this.parseNumberHeader(headers['x-tts-speed'])
    if (ttsSpeed !== undefined) {
      body.ttsSpeed = ttsSpeed
    }
    if (headers['x-tts-api-key']) {
      body.ttsApiKey = headers['x-tts-api-key']
    }
    if (headers['x-tts-base-url']) {
      body.ttsBaseUrl = headers['x-tts-base-url']
    }

    const data = await this.fetchWithRetry<TTSApiResponse>(
      `${OPENMAIC_BASE_URL}/api/generate/tts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      },
    )

    return {
      audio: data.audio ?? data.base64 ?? '',
      durationMs: data.durationMs ?? 0,
      format: data.format,
    }
  }

  /**
   * Pre-generate a single image or video via the OpenMAIC API and return the
   * resulting URL. Returns undefined if generation is disabled or headers are
   * missing the required provider config.
   */
  private async generateMediaAsset(
    req: { type: 'image' | 'video'; prompt: string; elementId: string; aspectRatio?: string; style?: string },
    headers: Record<string, string>,
  ): Promise<string | undefined> {
    const MEDIA_TIMEOUT = 120_000

    if (req.type === 'image') {
      if (headers['x-image-generation-enabled'] === 'false') return undefined
      if (!headers['x-image-provider']) return undefined

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-image-provider': headers['x-image-provider'],
      }
      if (headers['x-image-model']) reqHeaders['x-image-model'] = headers['x-image-model']
      if (headers['x-image-api-key']) reqHeaders['x-api-key'] = headers['x-image-api-key']
      if (headers['x-image-base-url']) reqHeaders['x-base-url'] = headers['x-image-base-url']

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), MEDIA_TIMEOUT)
      try {
        const res = await fetch(`${OPENMAIC_BASE_URL}/api/generate/image`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            prompt: req.prompt,
            aspectRatio: req.aspectRatio,
            style: req.style,
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as Record<string, string>
          throw new Error(err.error || `Image API returned ${res.status}`)
        }
        const data = (await res.json()) as ImageApiResponse
        if (!data.success) throw new Error(data.error || 'Image generation failed')
        const url =
          data.result?.url ||
          (data.result?.base64 ? `data:image/png;base64,${data.result.base64}` : undefined)
        if (url) {
          console.log(`[PipelineExecutor] 图片预生成完成: ${req.elementId}`)
        }
        return url
      } finally {
        clearTimeout(timeoutId)
      }
    }

    // Video generation
    if (headers['x-video-generation-enabled'] === 'false') return undefined
    if (!headers['x-video-provider']) return undefined

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-video-provider': headers['x-video-provider'],
    }
    if (headers['x-video-model']) reqHeaders['x-video-model'] = headers['x-video-model']
    if (headers['x-video-api-key']) reqHeaders['x-api-key'] = headers['x-video-api-key']
    if (headers['x-video-base-url']) reqHeaders['x-base-url'] = headers['x-video-base-url']

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_TIMEOUT)
    try {
      const res = await fetch(`${OPENMAIC_BASE_URL}/api/generate/video`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          prompt: req.prompt,
          aspectRatio: req.aspectRatio,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>
        throw new Error(err.error || `Video API returned ${res.status}`)
      }
      const data = (await res.json()) as VideoApiResponse
      if (!data.success) throw new Error(data.error || 'Video generation failed')
      if (data.result?.url) {
        console.log(`[PipelineExecutor] 视频预生成完成: ${req.elementId}`)
      }
      return data.result?.url
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Pipeline request timed out after ${TIMEOUT_MS}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async fetchWithRetry<T>(url: string, init?: RequestInit): Promise<T> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as Record<string, string>
          throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
        }
        return await response.json() as T
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError!
  }

  private async parseSSEStream(response: Response): Promise<SceneOutline[]> {
    const text = await response.text()
    const outlines: SceneOutline[] = []

    // 解析 SSE 文本
    const events = text.split('\n\n')
    for (const event of events) {
      const lines = event.trim().split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        let data: Record<string, unknown>
        try {
          data = JSON.parse(line.slice(6)) as Record<string, unknown>
        } catch (parseError) {
          // I6 fix: 记录 SSE 解析失败，方便排查空大纲
          console.warn('[PipelineExecutor] SSE JSON 解析失败:', line.slice(6, 100), parseError)
          continue
        }

        if (data.type === 'outline') {
          const normalized = normalizeSceneOutline(data.data, outlines.length)
          if (normalized) {
            outlines.push(normalized)
          }
        } else if (data.type === 'done') {
          const doneOutlines = data.outlines as unknown[]
          if (Array.isArray(doneOutlines)) {
            return doneOutlines
              .map((outline, index) => normalizeSceneOutline(outline, index))
              .filter((outline): outline is SceneOutline => outline !== null)
          }
          return outlines
        } else if (data.type === 'error') {
          throw new Error((data.error as string) || 'SSE stream error')
        }
      }
    }

    return outlines
  }

  private assembleScene(
    outline: SceneOutline,
    content: GeneratedContent,
    actions: SceneAction[],
  ): GeneratedScene {
    const outlineIndex = getSceneOutlineIndex(outline)
    const sceneType = this.mapSceneType(outline.type)

    let sceneContent: unknown
    if (content.type === 'slide' && content.canvas) {
      sceneContent = { type: 'slide' as const, canvas: this.ensureFullSlideCanvas(content.canvas) }
    } else if (content.type === 'quiz' && content.questions) {
      sceneContent = {
        type: 'quiz' as const,
        questions: content.questions.map((q, idx) => ({
          id: `q-${outlineIndex}-${idx}`,
          type: 'single' as const,
          question: q.question,
          options: q.options.map((opt) => ({ label: opt.label, value: opt.value })),
          answer: q.answer,
          analysis: q.analysis,
        })),
      }
    } else {
      sceneContent = {
        type: 'slide' as const,
        canvas: this.ensureFullSlideCanvas({
          elements: [
            { type: 'text', content: `<p>${outline.title}</p>` },
            { type: 'text', content: `<p>${outline.description}</p>` },
          ],
        }),
      }
    }

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
      actions: nativeActions,
    }
  }

  private normalizeScene(
    scene: GeneratedScene,
    outline: SceneOutline,
    content: GeneratedContent,
    actions: SceneAction[],
  ): GeneratedScene {
    const fallbackScene = this.assembleScene(outline, content, actions)

    let finalContent = scene.content ?? fallbackScene.content
    if (finalContent && typeof finalContent === 'object' && 'type' in finalContent) {
      const typed = finalContent as { type: string; canvas?: Record<string, unknown> }
      if (typed.type === 'slide' && typed.canvas) {
        finalContent = { ...typed, canvas: this.ensureFullSlideCanvas(typed.canvas) }
      }
    }

    return {
      id: typeof scene.id === 'string' ? scene.id : fallbackScene.id,
      title: typeof scene.title === 'string' ? scene.title : fallbackScene.title,
      type: typeof scene.type === 'string' ? scene.type : fallbackScene.type,
      order: typeof scene.order === 'number' ? scene.order : fallbackScene.order,
      content: finalContent,
      actions: Array.isArray(scene.actions) ? scene.actions : fallbackScene.actions,
    }
  }

  private buildStageInfo(
    requirements: UserRequirements,
    outlines: SceneOutline[],
  ): { name: string; description: string; language: string } {
    return {
      name: outlines[0]?.title || 'Generated Classroom',
      description: requirements.requirement,
      language: requirements.language,
    }
  }

  private isGeneratedContent(value: unknown): value is GeneratedContent {
    if (value === null || value === undefined || typeof value !== 'object') {
      return false
    }
    const obj = value as Record<string, unknown>
    const canvas = obj.canvas as Record<string, unknown> | undefined
    return (
      obj.type === 'slide' ||
      obj.type === 'quiz' ||
      obj.type === 'interactive' ||
      obj.type === 'pbl' ||
      Array.isArray(obj.questions) ||
      Array.isArray(obj.elements) ||
      Array.isArray(canvas?.elements) ||
      typeof obj.html === 'string' ||
      (obj.projectConfig !== null && typeof obj.projectConfig === 'object')
    )
  }

  private static readonly DEFAULT_SLIDE_THEME = {
    backgroundColor: '#ffffff',
    themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'],
    fontColor: '#333333',
    fontName: 'Microsoft YaHei',
    outline: { color: '#d14424', width: 2, style: 'solid' },
    shadow: { h: 0, v: 0, blur: 10, color: '#000000' },
  }

  private ensureFullSlideCanvas(canvas: Record<string, unknown>): Record<string, unknown> {
    return {
      id: canvas.id ?? `slide-${Date.now()}`,
      viewportSize: canvas.viewportSize ?? 1000,
      viewportRatio: canvas.viewportRatio ?? 0.5625,
      theme: canvas.theme ?? PipelineExecutor.DEFAULT_SLIDE_THEME,
      ...canvas,
    }
  }

  private toSlideCanvas(content: GeneratedContent): Record<string, unknown> | null {
    if (content.canvas && typeof content.canvas === 'object' && Array.isArray(content.canvas.elements)) {
      return content.canvas as unknown as Record<string, unknown>
    }

    if (!Array.isArray(content.elements)) {
      return null
    }

    return {
      elements: content.elements,
      ...(content.background !== undefined ? { background: content.background } : {}),
      ...(content.remark !== undefined ? { remark: content.remark } : {}),
    }
  }

  private parseNumberHeader(value: string | undefined): number | undefined {
    if (!value) return undefined
    const num = Number(value)
    return Number.isFinite(num) ? num : undefined
  }

  private mapSceneType(type?: string): string {
    switch (type) {
      case 'slide': case 'teaching': case 'content': return 'slide'
      case 'quiz': return 'quiz'
      case 'interactive': return 'interactive'
      case 'pbl': return 'pbl'
      case 'summary': return 'summary'
      default: return 'slide'
    }
  }
}
