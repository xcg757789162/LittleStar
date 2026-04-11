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
import { isSceneOutline } from '../../services/openmaic/pipeline-types.js'

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

    // Step 0: auto 模式下获取 AI 角色
    if (headers['x-agent-mode'] === 'auto' && !cp.agentProfiles) {
      onProgress?.('agent-profiles', 2, '正在生成课堂角色...')
      const agentProfiles = await this.generateAgentProfiles(requirements, headers)
      cp.agentProfiles = agentProfiles
      headers['x-agent-profiles'] = JSON.stringify(agentProfiles)
      await onCheckpoint?.(cp, 'agent-profiles', 5)
      onProgress?.('agent-profiles', 5, `角色生成完成，共 ${agentProfiles.length} 个角色`)
    } else if (cp.agentProfiles) {
      headers['x-agent-profiles'] = JSON.stringify(cp.agentProfiles)
    }

    // Step 1: 生成大纲（如果 checkpoint 没有）
    let outlines: SceneOutline[]
    if (cp.outlines && cp.outlines.length > 0) {
      outlines = cp.outlines
      onProgress?.('outlines', 20, `大纲已恢复，共 ${outlines.length} 个场景`)
    } else {
      onProgress?.('outlines', 5, '正在生成场景大纲...')
      outlines = await this.generateOutlines(requirements, headers)
      cp.outlines = outlines
      await onCheckpoint?.(cp, 'outlines', 20)
      onProgress?.('outlines', 20, `大纲生成完成，共 ${outlines.length} 个场景`)
    }

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
        content = await this.generateSceneContent(outline, headers)
        cp.sceneContents[i] = content
        await onCheckpoint?.(cp, 'scene-content', Math.round(contentPercent))
      }

      // 2b: 生成动作（检查 checkpoint）
      let actions: SceneAction[]
      if (cp.sceneActions[i]) {
        actions = cp.sceneActions[i]
      } else {
        const actionsPercent = 50 + (i / totalScenes) * 20
        onProgress?.('scene-actions', actionsPercent, `正在生成场景 ${i + 1}/${totalScenes} 的动作...`)
        actions = await this.generateSceneActions(outline, content, headers)
        cp.sceneActions[i] = actions
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
          const ttsResult = await this.generateTTS(speechActions[j].text!, headers)
          speechActions[j].audioBase64 = ttsResult.audio
          speechActions[j].audioDurationMs = ttsResult.durationMs
          cp.completedTTS[ttsKey] = true
          await onCheckpoint?.(cp, 'tts', Math.round(ttsPercent))
        } catch (error) {
          console.error(`[PipelineExecutor] TTS 失败 scene=${i} action=${j}:`, error)
          // TTS 失败不中止
        }
      }

      // 组装 Scene
      const scene = this.assembleScene(outline, content, actions)
      scenes.push(scene)
    }

    // Step 3: 组装 Classroom
    onProgress?.('assembly', 95, '正在组装课堂数据...')

    const classroomId = `pipeline-${Date.now()}`
    const classroom: GeneratedClassroom = {
      id: classroomId,
      title: outlines[0]?.title || 'Generated Classroom',
      status: 'completed',
      scenes,
      language: requirements.language,
      createdAt: new Date().toISOString(),
      stage: {
        id: classroomId,
        name: outlines[0]?.title || 'Generated Classroom',
        description: outlines.map((o) => o.description).join('; '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: requirements.language,
      },
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
  ): Promise<SceneOutline[]> {
    const response = await this.fetchWithTimeout(
      `${OPENMAIC_BASE_URL}/api/generate/scene-outlines-stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(requirements),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to generate outlines: ${response.status} ${response.statusText}`)
    }

    return this.parseSSEStream(response)
  }

  private async generateSceneContent(
    outline: SceneOutline,
    headers: Record<string, string>,
  ): Promise<GeneratedContent> {
    return this.fetchWithRetry<GeneratedContent>(
      `${OPENMAIC_BASE_URL}/api/generate/scene-content`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ outline }),
      },
    )
  }

  private async generateSceneActions(
    outline: SceneOutline,
    content: GeneratedContent,
    headers: Record<string, string>,
  ): Promise<SceneAction[]> {
    const data = await this.fetchWithRetry<{ actions: SceneAction[] }>(
      `${OPENMAIC_BASE_URL}/api/generate/scene-actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ outline, content }),
      },
    )
    return data.actions ?? []
  }

  private async generateTTS(
    text: string,
    headers: Record<string, string>,
  ): Promise<{ audio: string; durationMs: number }> {
    return this.fetchWithRetry<{ audio: string; durationMs: number }>(
      `${OPENMAIC_BASE_URL}/api/generate/tts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ text }),
      },
    )
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
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>
            if (data.type === 'outline' && isSceneOutline(data.data)) {
              outlines.push(data.data as SceneOutline)
            } else if (data.type === 'done') {
              const doneOutlines = data.outlines as unknown[]
              if (Array.isArray(doneOutlines)) {
                return doneOutlines.filter(isSceneOutline)
              }
              return outlines
            } else if (data.type === 'error') {
              throw new Error((data.error as string) || 'SSE stream error')
            }
          } catch (parseError) {
            // I6 fix: 记录 SSE 解析失败，方便排查空大纲
            console.warn('[PipelineExecutor] SSE JSON 解析失败:', line.slice(6, 100), parseError)
          }
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
    const sceneType = this.mapSceneType(outline.type)

    let sceneContent: unknown
    if (content.type === 'slide' && content.canvas) {
      sceneContent = { type: 'slide' as const, canvas: content.canvas }
    } else if (content.type === 'quiz' && content.questions) {
      sceneContent = {
        type: 'quiz' as const,
        questions: content.questions.map((q, idx) => ({
          id: `q-${outline.index}-${idx}`,
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
      id: `action-${outline.index}-${idx}`,
      ...a,
    }))

    return {
      id: `scene-${outline.index}`,
      title: outline.title,
      type: sceneType,
      order: outline.index,
      content: sceneContent,
      actions: nativeActions,
    }
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
