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

/** Pipeline 执行输入 */
export interface PipelineExecutorInput {
  requirements: UserRequirements
  headers: Record<string, string>
  checkpoint?: PipelineCheckpoint | null
  onProgress?: PipelineProgressCallback
  onCheckpoint?: CheckpointCallback
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

interface SceneActionsResult {
  actions: SceneAction[]
  previousSpeeches: string[]
  scene?: GeneratedScene
}

// ============================================================
// 配置
// ============================================================

/** OpenMAIC 内网直连地址 */
const OPENMAIC_BASE_URL = process.env.OPENMAIC_URL || 'http://localhost:3002'
const TIMEOUT_MS = 90_000
const MAX_RETRIES = 2

// ============================================================
// Pipeline Executor
// ============================================================

export class PipelineExecutor {
  /**
   * 执行完整 Pipeline（支持断点恢复）
   */
  async runFullPipeline(input: PipelineExecutorInput): Promise<GeneratedClassroom> {
    const { requirements, headers, checkpoint, onProgress, onCheckpoint } = input

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
    const totalScenes = outlines.length
    if (!cp.sceneContents) cp.sceneContents = {}
    if (!cp.sceneActions) cp.sceneActions = {}
    if (!cp.completedTTS) cp.completedTTS = {}

    const scenes: GeneratedScene[] = []

    for (let i = 0; i < outlines.length; i++) {
      const outline = outlines[i]

      // 2a: 生成内容（检查 checkpoint）
      let content: GeneratedContent
      if (cp.sceneContents[i]) {
        content = cp.sceneContents[i]
      } else {
        const contentPercent = 20 + (i / totalScenes) * 30
        onProgress?.('scene-content', contentPercent, `正在生成场景 ${i + 1}/${totalScenes} 的内容...`)
        content = await this.generateSceneContent(
          outline,
          outlines,
          stageId,
          stageInfo,
          headers,
          agentProfiles,
        )
        cp.sceneContents[i] = content
        await onCheckpoint?.(cp, 'scene-content', Math.round(contentPercent))
      }

      // 2b: 生成动作（检查 checkpoint）
      let actions: SceneAction[]
      let generatedScene: GeneratedScene | undefined
      if (cp.sceneActions[i]) {
        actions = cp.sceneActions[i]
      } else {
        const actionsPercent = 50 + (i / totalScenes) * 20
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

      // 2c: TTS
      const speechActions = actions.filter((a) => a.type === 'speech' && a.text)
      for (let j = 0; j < speechActions.length; j++) {
        const ttsKey = `${i}-${j}`
        if (cp.completedTTS[ttsKey]) continue

        const ttsPercent = 70 + (i / totalScenes) * 20 + (j / Math.max(speechActions.length, 1)) * (20 / totalScenes)
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
          // TTS 失败不中止
        }
      }

      // 组装 Scene
      const scene = generatedScene
        ? this.normalizeScene(generatedScene, outline, content, actions)
        : this.assembleScene(outline, content, actions)
      scenes.push(scene)
    }

    // Step 3: 组装 Classroom
    onProgress?.('assembly', 95, '正在组装课堂数据...')

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
      sceneContent = { type: 'slide' as const, canvas: content.canvas }
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
        canvas: {
          elements: [
            { type: 'text', content: `<p>${outline.title}</p>` },
            { type: 'text', content: `<p>${outline.description}</p>` },
          ],
        },
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

    return {
      id: typeof scene.id === 'string' ? scene.id : fallbackScene.id,
      title: typeof scene.title === 'string' ? scene.title : fallbackScene.title,
      type: typeof scene.type === 'string' ? scene.type : fallbackScene.type,
      order: typeof scene.order === 'number' ? scene.order : fallbackScene.order,
      content: scene.content ?? fallbackScene.content,
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
