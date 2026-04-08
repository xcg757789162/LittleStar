/**
 * 文本匹配降级 Provider
 * 当讯飞 ISE 不可用时，使用 STT 识别结果 + Levenshtein 距离作为降级评分
 */
import type { PronunciationAssessmentProvider } from './assessment-provider'
import type { PronunciationScore, AssessmentOptions } from './types'
import type { STTService } from '../stt'

/** 幼儿最低分保底 */
const CHILD_MIN_SCORE = 40

/**
 * 文本匹配降级 Provider
 * 当专业评测 API 不可用时提供基本反馈
 */
export class TextMatchFallbackProvider implements PronunciationAssessmentProvider {
  readonly name = 'text-match-fallback'
  private stt: STTService

  constructor(stt: STTService) {
    this.stt = stt
  }

  async checkAvailability(): Promise<boolean> {
    return true
  }

  async scorePronunciation(
    audio: Blob,
    expectedText: string,
    _lang: 'en' | 'zh',
    _options?: AssessmentOptions,
  ): Promise<PronunciationScore> {
    let recognizedText = ''

    try {
      recognizedText = await this.stt.recognize(audio)
    } catch {
      // STT 失败时降级为 0 分
      return this.createScore(0, expectedText)
    }

    // 空语音输入
    if (!recognizedText || recognizedText.trim().length === 0) {
      return this.createScore(0, expectedText)
    }

    // 归一化文本
    const normalizedExpected = this.normalizeText(expectedText)
    const normalizedRecognized = this.normalizeText(recognizedText)

    // 完全匹配
    if (normalizedExpected === normalizedRecognized) {
      return this.createScore(95, expectedText)
    }

    // 计算 Levenshtein 距离
    const distance = this.levenshteinDistance(normalizedRecognized, normalizedExpected)
    const maxLen = Math.max(normalizedExpected.length, normalizedRecognized.length)
    const similarity = maxLen > 0 ? (maxLen - distance) / maxLen : 0

    // 映射到分数：相似度 * 100，但保底 40 分（有说话就给分）
    const rawScore = Math.round(similarity * 100)
    const score = Math.max(CHILD_MIN_SCORE, rawScore)

    return this.createScore(score, expectedText)
  }

  /**
   * 创建评分结果
   */
  private createScore(score: number, _expectedText: string): PronunciationScore {
    const stars = this.scoreToStars(score)
    const nextAction = score === 0
      ? 'retry_slow'
      : score >= 70
        ? 'pass'
        : 'retry_slow'

    return {
      overallScore: score,
      stars,
      phonemeScores: [],
      fluencyScore: score,
      completenessScore: score,
      feedback: {
        teacherSay: score === 0
          ? '我没有听到你的声音哦，再试一次好吗？'
          : score >= 90
            ? '说得真棒！'
            : score >= 70
              ? '不错哦，继续加油！'
              : '没关系，我们再来一次～',
        encouragement: score >= 70 ? '🌟🌟🌟' : score >= 40 ? '🌟🌟' : '🌟',
        nextAction,
      },
    }
  }

  /**
   * 分数转星级
   */
  private scoreToStars(score: number): 1 | 2 | 3 | 4 | 5 {
    if (score >= 95) return 5
    if (score >= 85) return 4
    if (score >= 70) return 3
    if (score >= 55) return 2
    return 1
  }

  /**
   * 文本归一化：去标点、大小写、多余空格
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"()\-\[\]{}]/g, '')  // 去标点
      .replace(/\s+/g, ' ')                   // 合并空格
      .trim()
  }

  /**
   * Levenshtein 距离（编辑距离）
   */
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length

    // 优化：空字符串
    if (m === 0) return n
    if (n === 0) return m

    // DP 表
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1,      // 插入
          dp[i - 1][j - 1] + cost, // 替换
        )
      }
    }

    return dp[m][n]
  }
}
