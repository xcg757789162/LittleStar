/**
 * ClassroomAudioService — 课堂语音播放核心服务
 *
 * 设计决策（参见 design.md D1/D4/D5）：
 * - 宿主层 TTS 播放，绕过 iframe AudioContext 限制
 * - 双层降级：CosyVoice API → Web Speech API
 * - 串行播放队列：新请求自动中断旧播放
 * - 语言自动检测：中文字符占比 > 30% → zh-CN，否则 en-US
 */

import { TTSService, type TTSConfig } from '../voice/tts'
import { getCosyVoiceConfig } from '../config'

// ── 类型定义 ──────────────────────────────────────────────

export type TTSChannel = 'cosyvoice' | 'webspeech'
export type PlaybackState = 'idle' | 'speaking' | 'error'

export interface ClassroomAudioConfig {
  /** 是否启用语音（联动 uiStore.voiceEnabled） */
  enabled: boolean
  /** 首选 TTS 通道（默认自动降级） */
  preferredChannel?: TTSChannel
  /** 语速（0.5 ~ 2.0） */
  speed?: number
  /** 音量（0 ~ 1.0） */
  volume?: number
}

export interface SpeakOptions {
  /** 语言，不传则自动检测 */
  lang?: string
  /** 强制指定 TTS 通道 */
  channel?: TTSChannel
  /** 播放完成回调 */
  onEnd?: () => void
  /** 播放错误回调 */
  onError?: (error: Error) => void
}

// ── 语言检测工具 ─────────────────────────────────────────

/** 检测文本中中文字符占比 */
function detectLanguage(text: string): string {
  if (!text) return 'en-US'
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)
  const ratio = chineseChars ? chineseChars.length / text.length : 0
  return ratio > 0.3 ? 'zh-CN' : 'en-US'
}

// ── 主服务类 ─────────────────────────────────────────────

export class ClassroomAudioService {
  private audioContext: AudioContext | null = null
  private ttsService: TTSService | null = null
  private config: ClassroomAudioConfig

  /** 当前播放状态 */
  private state: PlaybackState = 'idle'
  /** 当前正在播放的 AudioBufferSourceNode（CosyVoice 通道） */
  private currentSource: AudioBufferSourceNode | null = null
  /** 中断标记：每次 speak() 生成新 ID，旧请求检测到不匹配即放弃 */
  private currentRequestId = 0
  /** CosyVoice 播放 Promise 的 resolve 回调（用于 stop() 时手动 resolve，防止 C2 内存泄漏） */
  private cosyResolve: ((value: boolean) => void) | null = null

  constructor(config?: Partial<ClassroomAudioConfig>) {
    this.config = {
      enabled: true,
      speed: 1.0,
      volume: 1.0,
      ...config,
    }
  }

  // ── AudioContext 管理 ──────────────────────────────────

  /**
   * 设置外部预激活的 AudioContext
   * 必须在用户交互的同步调用栈中创建并传入
   */
  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx
  }

  /** 获取或创建 AudioContext，确保处于 running 状态 */
  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    return this.audioContext
  }

  // ── CosyVoice TTS 初始化（惰性） ──────────────────────

  private getTTSService(): TTSService | null {
    if (this.ttsService) return this.ttsService

    const cosyConfig = getCosyVoiceConfig()
    if (!cosyConfig.apiKey) {
      // API Key 未配置，CosyVoice 不可用
      return null
    }

    const ttsConfig: TTSConfig = {
      apiKey: cosyConfig.apiKey,
      baseUrl: cosyConfig.baseUrl,
      model: 'cosyvoice-v1',
      voice: 'longxiaochun',
    }
    this.ttsService = new TTSService(ttsConfig)
    if (this.config.speed != null) {
      this.ttsService.setSpeed(this.config.speed)
    }
    return this.ttsService
  }

  // ── 核心播放方法 ──────────────────────────────────────

  /**
   * 朗读文本
   * 双层降级：CosyVoice API → Web Speech API
   * 新调用自动中断旧播放（串行队列）
   */
  async speak(text: string, options?: SpeakOptions): Promise<void> {
    if (!this.config.enabled || !text.trim()) {
      return
    }

    // 中断旧播放
    this.stop()

    const requestId = ++this.currentRequestId
    const lang = options?.lang ?? detectLanguage(text)
    const forcedChannel = options?.channel ?? this.config.preferredChannel

    this.state = 'speaking'

    try {
      // 通道选择
      if (forcedChannel === 'webspeech') {
        await this.speakViaWebSpeech(text, lang, requestId)
      } else {
        // 先尝试 CosyVoice，失败则降级到 Web Speech
        const cosySuccess = await this.speakViaCosyVoice(text, requestId)
        if (!cosySuccess && this.currentRequestId === requestId) {
          await this.speakViaWebSpeech(text, lang, requestId)
        }
      }

      if (this.currentRequestId === requestId) {
        this.state = 'idle'
        options?.onEnd?.()
      }
    } catch (error) {
      if (this.currentRequestId === requestId) {
        this.state = 'error'
        const err = error instanceof Error ? error : new Error(String(error))
        options?.onError?.(err)
        console.warn('[ClassroomAudio] speak failed:', err.message)
      }
    }
  }

  // ── CosyVoice 通道 ──────────────────────────────────

  /**
   * 通过 CosyVoice API 播放
   * 注意：CosyVoice API（TTSService.speak）不接受 lang 参数，
   * 语言由模型自动识别，因此此处不传递 lang。
   * @returns true 如果成功播放，false 如果 CosyVoice 不可用
   */
  private async speakViaCosyVoice(text: string, requestId: number): Promise<boolean> {
    const tts = this.getTTSService()
    if (!tts) return false

    try {
      const audioBuffer = await tts.speak(text)

      // 检查是否已被新请求中断
      if (this.currentRequestId !== requestId) return false

      const ctx = await this.getAudioContext()
      const decoded = await ctx.decodeAudioData(audioBuffer)

      if (this.currentRequestId !== requestId) return false

      return new Promise<boolean>((resolve) => {
        const source = ctx.createBufferSource()
        source.buffer = decoded

        // 音量控制
        const gainNode = ctx.createGain()
        gainNode.gain.value = this.config.volume ?? 1.0
        source.connect(gainNode)
        gainNode.connect(ctx.destination)

        this.currentSource = source
        // 保存 resolve 引用，使 stop() 可以手动 resolve 此 Promise（修复 C2）
        this.cosyResolve = resolve

        source.onended = () => {
          this.currentSource = null
          this.cosyResolve = null
          resolve(true)
        }

        source.start()
      })
    } catch (error) {
      console.warn('[ClassroomAudio] CosyVoice failed, falling back to Web Speech:', error)
      return false
    }
  }

  // ── Web Speech API 降级通道 ──────────────────────────

  private async speakViaWebSpeech(text: string, lang: string, requestId: number): Promise<void> {
    // 内联检查 Web Speech API 可用性（不依赖 WebSpeechFallback 实例）
    if (typeof speechSynthesis === 'undefined') {
      throw new Error('Web Speech API not supported in this browser')
    }

    // 检查是否已被中断
    if (this.currentRequestId !== requestId) return

    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = this.config.speed ?? 0.9
      utterance.pitch = 1.1
      utterance.volume = this.config.volume ?? 1.0

      utterance.onend = () => {
        resolve()
      }

      utterance.onerror = (e) => {
        if (this.currentRequestId === requestId) {
          reject(new Error(`Web Speech TTS Error: ${e.error}`))
        } else {
          resolve()
        }
      }

      speechSynthesis.speak(utterance)
    })
  }

  // ── 播放控制 ─────────────────────────────────────────

  /** 立即停止所有播放 */
  stop(): void {
    // 中断 CosyVoice 播放
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // 可能已经停止
      }
      this.currentSource = null
    }
    // 手动 resolve 被中断的 CosyVoice Promise，防止永远 pending（修复 C2）
    if (this.cosyResolve) {
      this.cosyResolve(false)
      this.cosyResolve = null
    }

    // 中断 Web Speech 播放
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel()
    }

    this.state = 'idle'
  }

  // ── 配置与状态 ───────────────────────────────────────

  /** 更新启用状态（联动 uiStore.voiceEnabled） */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    if (!enabled) {
      this.stop()
    }
  }

  /** 是否启用 */
  get isEnabled(): boolean {
    return this.config.enabled
  }

  /** 当前播放状态 */
  get playbackState(): PlaybackState {
    return this.state
  }

  /** 是否正在播放 */
  get isSpeaking(): boolean {
    return this.state === 'speaking'
  }

  /** 更新语速 */
  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.5, Math.min(2.0, speed))
    if (this.ttsService) {
      this.ttsService.setSpeed(this.config.speed)
    }
  }

  /** 更新音量（注意：仅对下次 speak() 调用生效，不影响当前正在播放的音频） */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1.0, volume))
  }

  /** 销毁服务，释放资源 */
  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.ttsService = null
  }
}

// ── 全局单例 ────────────────────────────────────────────

let _instance: ClassroomAudioService | null = null

/** 获取全局课堂音频服务实例 */
export function getClassroomAudioService(): ClassroomAudioService {
  if (!_instance) {
    _instance = new ClassroomAudioService()
  }
  return _instance
}

/** 重置全局实例（用于测试或重新初始化） */
export function resetClassroomAudioService(): void {
  if (_instance) {
    _instance.dispose()
    _instance = null
  }
}
