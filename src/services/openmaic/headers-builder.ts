/**
 * Headers Builder — 从 ChildSettings 构建 OpenMAIC API HTTP Headers
 *
 * 设计决策 D2：家长在设置面板中一次性配置后，Pipeline Client 自动
 * 从 ChildSettings 读取配置并构建 HTTP Headers，所有子 API 调用复用。
 *
 * Header 映射关系：
 *   llmModel          → x-model
 *   llmApiKey         → x-api-key
 *   llmBaseUrl        → x-base-url        (非空时才包含)
 *   enableTTS         → x-tts-enabled
 *   ttsProviderId     → x-tts-provider    (非空时才包含)
 *   ttsApiKey         → x-tts-api-key     (非空时才包含)
 *   ttsVoice          → x-tts-voice       (非空时才包含)
 *   ttsSpeed          → x-tts-speed
 *   enableImageGen    → x-image-generation-enabled
 *   imageProviderId   → x-image-provider  (非空时才包含)
 *   imageApiKey       → x-image-api-key   (非空时才包含)
 *   imageBaseUrl      → x-image-base-url  (非空时才包含)
 *   enableVideoGen    → x-video-generation-enabled
 *   classroomAgentMode → x-agent-mode
 *   [preset 模式]     → x-agent-profiles   (JSON, 角色+音色)
 *   teacherVoice      → x-teacher-voice
 *   maxDiscussionRounds → x-max-discussion-rounds
 */

import type { ChildSettings } from '@/types/models'
import { PRESET_AGENTS } from '@/types/models'

/**
 * 从 ChildSettings 构建 OpenMAIC 子 API 所需的 HTTP Headers
 *
 * @param settings 孩子设置（包含高级课堂设置）
 * @returns HTTP Headers 键值对
 * @throws Error 当必要配置（llmModel、llmApiKey）缺失时
 */
export function buildHeadersFromSettings(
  settings: ChildSettings,
): Record<string, string> {
  // === 必填字段校验 ===
  if (!settings.llmModel) {
    throw new Error(
      '未配置 LLM 模型，请在家长设置面板的「高级课堂设置」中选择模型',
    )
  }
  if (!settings.llmApiKey) {
    throw new Error(
      '未配置 API Key，请在家长设置面板的「高级课堂设置」中填写 API Key',
    )
  }

  // === 构建 Headers ===
  const headers: Record<string, string> = {}

  // LLM 配置（必填）
  headers['x-model'] = settings.llmModel
  headers['x-api-key'] = settings.llmApiKey

  // LLM Base URL（可选）
  if (settings.llmBaseUrl) {
    headers['x-base-url'] = settings.llmBaseUrl
  }

  // TTS 配置
  headers['x-tts-enabled'] = String(settings.enableTTS)
  if (settings.ttsProviderId) {
    headers['x-tts-provider'] = settings.ttsProviderId
  }
  if (settings.ttsApiKey) {
    headers['x-tts-api-key'] = settings.ttsApiKey
  }
  if (settings.ttsVoice) {
    headers['x-tts-voice'] = settings.ttsVoice
  }
  headers['x-tts-speed'] = String(settings.ttsSpeed)

  // 图片生成配置
  headers['x-image-generation-enabled'] = String(settings.enableImageGeneration)
  if (settings.imageProviderId) {
    headers['x-image-provider'] = settings.imageProviderId
  }
  if (settings.imageApiKey) {
    headers['x-image-api-key'] = settings.imageApiKey
  }
  if (settings.imageBaseUrl) {
    headers['x-image-base-url'] = settings.imageBaseUrl
  }

  // 视频生成
  headers['x-video-generation-enabled'] = String(settings.enableVideoGeneration)

  // Agent 模式
  headers['x-agent-mode'] = settings.classroomAgentMode

  // === 角色配置 Headers（新增） ===

  // x-agent-profiles：仅 preset 模式下发送
  // 注意：HTTP header 不能包含非 ASCII 字符（浏览器/Node.js fetch 会抛出 ByteString 错误）
  // 因此将 JSON 进行 Base64 编码后传递
  if (settings.classroomAgentMode === 'preset') {
    const profilesJson = buildAgentProfilesHeader(settings)
    headers['x-agent-profiles'] = btoa(unescape(encodeURIComponent(profilesJson)))
    headers['x-agent-profiles-encoding'] = 'base64'
  }

  // x-teacher-voice：始终发送（fallback 到 teacher 默认音色）
  const teacherAgent = PRESET_AGENTS.find(a => a.id === 'teacher')
  headers['x-teacher-voice'] = settings.teacherVoice || teacherAgent?.defaultVoice || 'female-tianmei'

  // x-max-discussion-rounds：始终发送
  headers['x-max-discussion-rounds'] = String(settings.maxDiscussionRounds)

  return headers
}

/**
 * 构建 x-agent-profiles Header 的 JSON 值
 *
 * preset 模式下，组装 teacher + selectedAgents 的角色列表，
 * voiceId 优先取 agentVoiceMap，fallback 到角色的 defaultVoice。
 */
function buildAgentProfilesHeader(settings: ChildSettings): string {
  const profiles: Array<{
    id: string
    name: string
    emoji: string
    description: string
    voiceId: string
  }> = []

  // 1. 始终包含教师
  const teacher = PRESET_AGENTS.find(a => a.id === 'teacher')!
  profiles.push({
    id: teacher.id,
    name: teacher.name,
    emoji: teacher.emoji,
    description: teacher.description,
    voiceId: settings.teacherVoice || teacher.defaultVoice,
  })

  // 2. 包含已勾选的学生角色
  for (const agentId of settings.selectedAgents) {
    const agent = PRESET_AGENTS.find(a => a.id === agentId)
    if (agent) {
      profiles.push({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        description: agent.description,
        voiceId: settings.agentVoiceMap[agentId] || agent.defaultVoice,
      })
    }
  }

  return JSON.stringify(profiles)
}
