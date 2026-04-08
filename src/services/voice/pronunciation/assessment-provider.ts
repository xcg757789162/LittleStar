/**
 * 发音评估 Provider 抽象接口
 * 策略模式：可插拔后端（讯飞 ISE / 文本匹配降级）
 */
import type { PronunciationScore, AssessmentOptions, ProviderConfig } from './types'

/** 发音评估 Provider 接口 */
export interface PronunciationAssessmentProvider {
  /** Provider 名称标识 */
  readonly name: string

  /** 检查服务可用性 */
  checkAvailability(): Promise<boolean>

  /** 发音评分 */
  scorePronunciation(
    audio: Blob,
    expectedText: string,
    lang: 'en' | 'zh',
    options?: AssessmentOptions,
  ): Promise<PronunciationScore>
}

/**
 * 创建发音评估 Provider 实例
 * 优先级：讯飞 ISE → 文本匹配降级
 */
export function createAssessmentProvider(config: ProviderConfig): PronunciationAssessmentProvider {
  // 如果提供了讯飞 API Key，使用讯飞 ISE
  if (config.iflytekApiKey && config.iflytekAppId) {
    return createIflytekISEProvider(config)
  }

  // 降级到文本匹配
  return createTextMatchFallbackProvider()
}

/**
 * 创建讯飞 ISE Provider（占位实现，任务组 2 完善）
 */
function createIflytekISEProvider(_config: ProviderConfig): PronunciationAssessmentProvider {
  return {
    name: 'iflytek-ise',
    async checkAvailability() {
      return true
    },
    async scorePronunciation(
      _audio: Blob,
      _expectedText: string,
      _lang: 'en' | 'zh',
      _options?: AssessmentOptions,
    ): Promise<PronunciationScore> {
      // 占位实现，任务组 2 完善
      throw new Error('IflytekISEProvider not yet implemented')
    },
  }
}

/**
 * 创建文本匹配降级 Provider（占位实现，任务组 2 完善）
 */
function createTextMatchFallbackProvider(): PronunciationAssessmentProvider {
  return {
    name: 'text-match-fallback',
    async checkAvailability() {
      return true
    },
    async scorePronunciation(
      _audio: Blob,
      _expectedText: string,
      _lang: 'en' | 'zh',
      _options?: AssessmentOptions,
    ): Promise<PronunciationScore> {
      // 占位实现，任务组 2 完善
      throw new Error('TextMatchFallbackProvider not yet implemented')
    },
  }
}
