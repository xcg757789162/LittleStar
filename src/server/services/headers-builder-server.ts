/**
 * 服务端版 Headers Builder
 *
 * 从 ChildSettings JSON（通过请求 body 传入）构建 OpenMAIC 子 API 所需的 HTTP Headers。
 * 与前端 headers-builder.ts 逻辑一致，但不依赖前端类型和浏览器 API。
 *
 * 设计决策参考：design.md D6
 */

import { PRESET_AGENTS } from '../../types/models.js'

/**
 * 从 ChildSettings JSON 构建 OpenMAIC HTTP Headers
 */
export function buildHeadersFromSettingsServer(
  settings: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {}

  // LLM 配置（必填）
  const llmModel = settings.llmModel as string | undefined
  const llmApiKey = settings.llmApiKey as string | undefined

  if (!llmModel) {
    throw new Error('未配置 LLM 模型')
  }
  if (!llmApiKey) {
    throw new Error('未配置 API Key')
  }

  headers['x-model'] = llmModel
  headers['x-api-key'] = llmApiKey

  // LLM Base URL
  if (settings.llmBaseUrl) {
    headers['x-base-url'] = settings.llmBaseUrl as string
  }

  // TTS 配置
  headers['x-tts-enabled'] = String(settings.enableTTS ?? true)
  if (settings.ttsProviderId) headers['x-tts-provider'] = settings.ttsProviderId as string
  if (settings.ttsApiKey) headers['x-tts-api-key'] = settings.ttsApiKey as string
  if (settings.ttsVoice) headers['x-tts-voice'] = settings.ttsVoice as string
  headers['x-tts-speed'] = String(settings.ttsSpeed ?? 1)

  // 图片生成
  headers['x-image-generation-enabled'] = String(settings.enableImageGeneration ?? false)
  if (settings.imageProviderId) headers['x-image-provider'] = settings.imageProviderId as string
  if (settings.imageApiKey) headers['x-image-api-key'] = settings.imageApiKey as string
  if (settings.imageBaseUrl) headers['x-image-base-url'] = settings.imageBaseUrl as string

  // 视频生成
  headers['x-video-generation-enabled'] = String(settings.enableVideoGeneration ?? false)

  // Agent 模式
  const agentMode = (settings.classroomAgentMode as string) || 'preset'
  headers['x-agent-mode'] = agentMode

  // Preset 模式下构建 agent-profiles
  // 注意：HTTP header 不能包含非 ASCII 字符（Node.js fetch 会抛出 ByteString 错误）
  // 因此将 JSON 进行 Base64 编码后传递
  if (agentMode === 'preset') {
    const profilesJson = buildAgentProfilesHeader(settings)
    headers['x-agent-profiles'] = Buffer.from(profilesJson, 'utf-8').toString('base64')
    headers['x-agent-profiles-encoding'] = 'base64'
  }

  // Teacher voice
  const teacherAgent = PRESET_AGENTS.find((a) => a.id === 'teacher')
  headers['x-teacher-voice'] = (settings.teacherVoice as string) || teacherAgent?.defaultVoice || 'female-tianmei'

  // Discussion rounds
  headers['x-max-discussion-rounds'] = String(settings.maxDiscussionRounds ?? 2)

  return headers
}

function buildAgentProfilesHeader(settings: Record<string, unknown>): string {
  const profiles: Array<{
    id: string
    name: string
    emoji: string
    description: string
    voiceId: string
  }> = []

  // Teacher
  const teacher = PRESET_AGENTS.find((a) => a.id === 'teacher')!
  profiles.push({
    id: teacher.id,
    name: teacher.name,
    emoji: teacher.emoji,
    description: teacher.description,
    voiceId: (settings.teacherVoice as string) || teacher.defaultVoice,
  })

  // Selected agents
  const selectedAgents = (settings.selectedAgents as string[]) || []
  const agentVoiceMap = (settings.agentVoiceMap as Record<string, string>) || {}

  for (const agentId of selectedAgents) {
    const agent = PRESET_AGENTS.find((a) => a.id === agentId)
    if (agent) {
      profiles.push({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        description: agent.description,
        voiceId: agentVoiceMap[agentId] || agent.defaultVoice,
      })
    }
  }

  return JSON.stringify(profiles)
}
