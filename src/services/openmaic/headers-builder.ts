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
 *   ttsVoice          → x-tts-voice       (非空时才包含)
 *   ttsSpeed          → x-tts-speed
 *   enableImageGen    → x-image-generation-enabled
 *   enableVideoGen    → x-video-generation-enabled
 *   classroomAgentMode → x-agent-mode
 */

import type { ChildSettings } from '@/types/models'

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
  if (settings.ttsVoice) {
    headers['x-tts-voice'] = settings.ttsVoice
  }
  headers['x-tts-speed'] = String(settings.ttsSpeed)

  // 生成功能开关
  headers['x-image-generation-enabled'] = String(settings.enableImageGeneration)
  headers['x-video-generation-enabled'] = String(settings.enableVideoGeneration)

  // Agent 模式
  headers['x-agent-mode'] = settings.classroomAgentMode

  return headers
}
