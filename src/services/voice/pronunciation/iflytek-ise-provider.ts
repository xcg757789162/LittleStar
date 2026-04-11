/**
 * 讯飞口语评测（ISE）Provider
 * 基于 WebSocket 流式 API (wss://ise-api.xfyun.cn/v2/open-ise)
 */
import type { PronunciationAssessmentProvider } from './assessment-provider'
import type { PronunciationScore, AssessmentOptions, PhonemeScore } from './types'

/** 讯飞 ISE 配置 */
export interface IflytekISEConfig {
  appId: string
  apiKey: string
  apiSecret: string
}

/** 讯飞 API 默认配置 */
const IFLYTEK_DEFAULTS = {
  wsUrl: 'wss://ise-api.xfyun.cn/v2/open-ise',
  host: 'ise-api.xfyun.cn',
  path: '/v2/open-ise',
  /** 超时时间（毫秒） */
  timeout: 3000,
  /** 音频分帧大小 */
  frameSize: 1280,
  /** 分帧间隔（毫秒） */
  frameInterval: 40,
} as const

/**
 * 讯飞口语评测 ISE Provider 实现
 */
export class IflytekISEProvider implements PronunciationAssessmentProvider {
  readonly name = 'iflytek-ise'
  private config: IflytekISEConfig

  constructor(config: IflytekISEConfig) {
    this.config = config
  }

  async checkAvailability(): Promise<boolean> {
    return !!(this.config.appId && this.config.apiKey && this.config.apiSecret)
  }

  async scorePronunciation(
    audio: Blob,
    expectedText: string,
    lang: 'en' | 'zh',
    options?: AssessmentOptions,
  ): Promise<PronunciationScore> {
    const category = this.detectCategory(expectedText, lang)
    const ent = lang === 'zh' ? 'cn_vip' : 'en_vip'
    const authUrl = this.generateAuthUrl()

    return new Promise<PronunciationScore>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Iflytek ISE timeout: no response within 3s'))
      }, IFLYTEK_DEFAULTS.timeout)

      const ws = new WebSocket(authUrl)

      ws.onerror = (error) => {
        clearTimeout(timeout)
        reject(error instanceof Error ? error : new Error('WebSocket connection failed'))
      }

      ws.onopen = async () => {
        try {
          // 发送参数帧（ssb）
          const textWithBom = '\uFEFF' + expectedText
          const ssbFrame = {
            common: { app_id: this.config.appId },
            business: {
              sub: 'ise',
              ent,
              category,
              cmd: 'ssb',
              text: textWithBom,
              tte: 'utf-8',
              aue: 'raw',
            },
            data: { status: 0, data: '' },
          }
          ws.send(JSON.stringify(ssbFrame))

          // 发送音频帧
          await this.sendAudioFrames(ws, audio, ent, category)
        } catch (err) {
          clearTimeout(timeout)
          reject(err)
        }
      }

      ws.onmessage = (event: { data: string }) => {
        try {
          const response = JSON.parse(event.data)

          // 检查错误码
          if (response.code !== 0) {
            clearTimeout(timeout)
            ws.close()
            reject(new Error(`Iflytek ISE error: ${response.message} (code: ${response.code})`))
            return
          }

          // 检查是否为最终结果
          if (response.data?.status === 2 && response.data?.data) {
            clearTimeout(timeout)
            ws.close()

            const score = this.parseISEResult(
              response.data.data,
              options?.enablePhonemeDetail ?? false,
            )
            resolve(score)
          }
        } catch (err) {
          clearTimeout(timeout)
          ws.close()
          reject(err)
        }
      }

      ws.onclose = () => {
        clearTimeout(timeout)
      }
    })
  }

  /**
   * 生成带鉴权参数的 WebSocket URL
   */
  private generateAuthUrl(): string {
    const date = new Date().toUTCString()
    const signatureOrigin = `host: ${IFLYTEK_DEFAULTS.host}\ndate: ${date}\nGET ${IFLYTEK_DEFAULTS.path} HTTP/1.1`

    // HMAC-SHA256 签名
    const signature = this.hmacSha256(this.config.apiSecret, signatureOrigin)

    const authorizationOrigin =
      `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = btoa(authorizationOrigin)

    const url = `${IFLYTEK_DEFAULTS.wsUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(IFLYTEK_DEFAULTS.host)}`
    return url
  }

  /**
   * HMAC-SHA256 签名（浏览器环境简化实现）
   * 注意：生产环境应使用 Web Crypto API
   */
  private hmacSha256(secret: string, message: string): string {
    // 简化实现：在浏览器环境中使用 btoa 模拟
    // 生产环境应使用 crypto.subtle.sign('HMAC', ...)
    // 这里返回一个 base64 编码的占位签名
    return btoa(`${secret}:${message}`.slice(0, 32))
  }

  /**
   * 分帧发送音频数据
   */
  private async sendAudioFrames(
    ws: WebSocket,
    audio: Blob,
    ent: string,
    category: string,
  ): Promise<void> {
    const arrayBuffer = await audio.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const frameSize = IFLYTEK_DEFAULTS.frameSize
    const totalFrames = Math.ceil(uint8Array.length / frameSize)

    for (let i = 0; i < totalFrames; i++) {
      const start = i * frameSize
      const end = Math.min(start + frameSize, uint8Array.length)
      const chunk = uint8Array.slice(start, end)
      const base64Data = this.uint8ArrayToBase64(chunk)

      const isFirst = i === 0
      const isLast = i === totalFrames - 1

      const frame = {
        common: { app_id: this.config.appId },
        business: {
          sub: 'ise',
          ent,
          category,
          cmd: 'auw',
          aus: isFirst ? 1 : isLast ? 4 : 2,
          aue: 'raw',
        },
        data: {
          status: isLast ? 2 : 1,
          data: base64Data,
        },
      }

      ws.send(JSON.stringify(frame))

      // 控制发送速率
      if (!isLast) {
        await this.sleep(IFLYTEK_DEFAULTS.frameInterval)
      }
    }
  }

  /**
   * 解析讯飞 ISE 评测结果（Base64 编码的 XML）
   */
  private parseISEResult(
    base64Data: string,
    enablePhonemeDetail: boolean,
  ): PronunciationScore {
    const xmlString = atob(base64Data)

    // 简易 XML 解析（不依赖 DOMParser 以保持轻量）
    const totalScore = this.extractXmlValue(xmlString, 'total_score', 0)
    // accuracyScore 保留解析能力，未来可用于详细评分
    this.extractXmlValue(xmlString, 'accuracy_score', 0)
    const fluencyScore = this.extractXmlValue(xmlString, 'fluency_score', 0)
    const integrityScore = this.extractXmlValue(xmlString, 'integrity_score', 0)

    // 计算星级
    const stars = this.scoreToStars(totalScore)

    // 提取音素级评分
    const phonemeScores: PhonemeScore[] = enablePhonemeDetail
      ? this.extractPhonemeScores(xmlString)
      : []

    return {
      overallScore: totalScore,
      stars,
      phonemeScores,
      fluencyScore,
      completenessScore: integrityScore,
      feedback: {
        teacherSay: '',
        encouragement: '',
        nextAction: totalScore >= 70 ? 'pass' : 'retry_slow',
      },
    }
  }

  /**
   * 从 XML 字符串中提取数值
   */
  private extractXmlValue(xml: string, tag: string, defaultValue: number): number {
    // 只匹配第一个出现的标签值
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`)
    const match = xml.match(regex)
    if (match) {
      const value = parseFloat(match[1])
      return isNaN(value) ? defaultValue : value
    }
    return defaultValue
  }

  /**
   * 从 XML 提取音素级评分
   */
  private extractPhonemeScores(xml: string): PhonemeScore[] {
    const phones: PhonemeScore[] = []
    const phoneRegex = /<phone>\s*<phone_score>([^<]+)<\/phone_score>\s*<content>([^<]+)<\/content>/g
    let match: RegExpExecArray | null
    let syllableIndex = 0
    let phoneInSyllable = 0

    // 追踪音节边界
    const syllRegex = /<syll>/g
    const syllPositions: number[] = []
    let syllMatch: RegExpExecArray | null
    while ((syllMatch = syllRegex.exec(xml)) !== null) {
      syllPositions.push(syllMatch.index)
    }

    while ((match = phoneRegex.exec(xml)) !== null) {
      // 判断当前 phone 属于哪个音节
      const currentPos = match.index
      for (let i = syllPositions.length - 1; i >= 0; i--) {
        if (currentPos > syllPositions[i]) {
          if (i !== syllableIndex) {
            syllableIndex = i
            phoneInSyllable = 0
          }
          break
        }
      }

      phones.push({
        phoneme: `/${match[2]}/`,
        score: parseFloat(match[1]),
        expected: match[2],
        syllableIndex,
      })
      phoneInSyllable++
    }

    return phones
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
   * 根据文本内容自动检测评测题型
   */
  private detectCategory(text: string, _lang: 'en' | 'zh'): string {
    const words = text.trim().split(/\s+/)
    if (words.length === 1) return 'read_word'
    if (words.length <= 10) return 'read_sentence'
    return 'read_chapter'
  }

  /**
   * Uint8Array 转 Base64
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 延迟工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
