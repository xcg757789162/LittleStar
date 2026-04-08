/**
 * 纠音教学循环编排器
 *
 * 管理完整的纠音教学循环：
 * idle → listening → recording → assessing → feedback → drilling
 *
 * 流程：
 * 1. demonstrate(): AI 示范发音 → listening
 * 2. assess(): 评估学生发音 → feedback(通过) 或 retry(未通过)
 * 3. retrySlow(): 慢速重试 → listening
 * 4. drillSyllables(): 分音节练习 → listening
 * 5. generateFeedback(): 生成文字反馈
 */

import { applyChildAdjustments, scoreToStars } from './child-scoring'
import { splitSyllables } from './syllable-splitter'
import { selectFeedback, type FeedbackPhase } from './feedback-templates'
import type { PronunciationScore } from './types'

/** 编排器阶段 */
export type CoordinatorPhase = 'idle' | 'listening' | 'recording' | 'assessing' | 'feedback' | 'retry' | 'drilling'

/** 编排器配置 */
export interface CoordinatorConfig {
  /** 当前练习单词 */
  word: string
  /** 期望参考文本 */
  referenceText: string
  /** 语言 */
  language: string
  /** 通过所需最低星数 */
  passThreshold: number
  /** C2 最大重试次数 */
  maxRetries: number
}

/** 简化的评分结果（从 Provider 返回） */
export interface ProviderScore {
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  phonemes: Array<{ phoneme: string; score: number }>
}

/** 评估结果（带星级） */
export interface AssessResult {
  score: ProviderScore
  adjustedScore: number
  stars: number
  passed: boolean
}

/** Provider 接口（简化） */
export interface CoordinatorProvider {
  name: string
  scorePronunciation: (audio: Blob, text: string, lang: string) => Promise<ProviderScore>
  isAvailable: () => Promise<boolean>
}

/** TTS 接口 */
export interface CoordinatorTTS {
  speak: (text: string, options: { language: string }) => Promise<void>
  speakSlow: (text: string, options: { language: string }) => Promise<void>
}

/** 编排器状态 */
export interface CoordinatorState {
  phase: CoordinatorPhase
  attempts: number
  retryCount: number
  bestScore: ProviderScore | null
  bestStars: number
  passed: boolean
  lastResult: AssessResult | null
  drillCompleted: boolean
}

/**
 * 纠音教学循环编排器
 */
export class PronunciationCoordinator {
  private config: CoordinatorConfig
  private provider: CoordinatorProvider
  private tts: CoordinatorTTS
  private state: CoordinatorState

  constructor(
    config: CoordinatorConfig,
    provider: CoordinatorProvider,
    tts: CoordinatorTTS,
  ) {
    this.config = config
    this.provider = provider
    this.tts = tts
    this.state = {
      phase: 'idle',
      attempts: 0,
      retryCount: 0,
      bestScore: null,
      bestStars: 0,
      passed: false,
      lastResult: null,
      drillCompleted: false,
    }
  }

  /** 获取当前状态 */
  getState(): CoordinatorState {
    return { ...this.state }
  }

  /**
   * AI 示范发音
   * idle → listening
   */
  async demonstrate(): Promise<void> {
    await this.tts.speak(this.config.word, {
      language: this.config.language,
    })
    this.state.phase = 'listening'
  }

  /**
   * 评估学生发音
   * listening → feedback(通过) | retry(未通过，未达重试上限) | drilling(未通过，达重试上限)
   */
  async assess(audioBlob: Blob): Promise<AssessResult> {
    this.state.phase = 'assessing'

    // 调用 Provider 评分
    const rawScore = await this.provider.scorePronunciation(
      audioBlob,
      this.config.referenceText,
      this.config.language,
    )

    // 应用幼儿宽容评分
    const adjustment = applyChildAdjustments(rawScore.overall)
    const stars = scoreToStars(adjustment.adjustedScore)

    // 更新 attempts
    this.state.attempts++

    // 更新 bestScore
    if (!this.state.bestScore || rawScore.overall > this.state.bestScore.overall) {
      this.state.bestScore = { ...rawScore }
      this.state.bestStars = stars
    }

    const result: AssessResult = {
      score: rawScore,
      adjustedScore: adjustment.adjustedScore,
      stars,
      passed: stars >= this.config.passThreshold,
    }

    this.state.lastResult = result

    // 决定下一步
    if (result.passed) {
      // 通过
      this.state.phase = 'feedback'
      this.state.passed = true
    } else if (this.state.retryCount < this.config.maxRetries) {
      // 还能重试
      this.state.phase = 'retry'
    } else {
      // 重试用尽，进入分音节练习
      this.state.phase = 'drilling'
    }

    return result
  }

  /**
   * C2 慢速重试
   * retry → listening
   */
  async retrySlow(): Promise<void> {
    this.state.retryCount++

    await this.tts.speakSlow(this.config.word, {
      language: this.config.language,
    })

    this.state.phase = 'listening'
  }

  /**
   * C1 分音节练习
   * drilling → listening
   */
  async drillSyllables(): Promise<void> {
    const breakdown = splitSyllables(this.config.word)

    // 逐音节慢速播放
    for (const syllable of breakdown.syllables) {
      await this.tts.speakSlow(syllable, {
        language: this.config.language,
      })
    }

    this.state.drillCompleted = true
    this.state.phase = 'listening'
  }

  /**
   * 生成文字反馈
   */
  generateFeedback(): string {
    const lastResult = this.state.lastResult
    if (!lastResult) return ''

    // 确定反馈阶段
    let phase: FeedbackPhase
    if (lastResult.stars >= 5) {
      phase = 'perfect'
    } else if (this.state.drillCompleted) {
      phase = 'after_drill'
    } else if (this.state.attempts > 1) {
      phase = 'retry'
    } else {
      phase = 'first_attempt'
    }

    const syllables = splitSyllables(this.config.word)

    return selectFeedback(lastResult.stars, phase, {
      word: this.config.word,
      syllable: syllables.syllables.join('-'),
      goodPart: syllables.syllables[0],
      focusPart: syllables.syllables.length > 1 ? syllables.syllables[syllables.syllables.length - 1] : undefined,
    })
  }
}
