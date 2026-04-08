/**
 * 音效管理服务
 * 使用 Web Audio API 生成程序化音效（无需外部文件）
 */

/** 音效类型 */
export type SoundEffectType =
  | 'correct'
  | 'wrong'
  | 'celebration'
  | 'star'
  | 'levelUp'

/** 音效服务配置 */
export interface SoundEffectsConfig {
  /** 是否启用 */
  enabled: boolean
  /** 音量 0-1 */
  volume: number
}

/** 默认配置 */
const DEFAULT_CONFIG: SoundEffectsConfig = {
  enabled: true,
  volume: 0.6,
}

/**
 * 音效管理服务
 * 使用 AudioContext 生成程序化音效
 */
export class SoundEffectsService {
  private audioContext: AudioContext | null = null
  private config: SoundEffectsConfig

  constructor(config?: Partial<SoundEffectsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** 确保 AudioContext 已初始化 */
  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    // 恢复被自动暂停的 context（浏览器策略）
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    return this.audioContext
  }

  /** 更新配置 */
  updateConfig(config: Partial<SoundEffectsConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /** 设置启用状态 */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /** 是否启用 */
  get isEnabled(): boolean {
    return this.config.enabled
  }

  /** 播放音效 */
  play(type: SoundEffectType): void {
    if (!this.config.enabled) return

    try {
      switch (type) {
        case 'correct':
          this.playCorrectSound()
          break
        case 'wrong':
          this.playWrongSound()
          break
        case 'celebration':
          this.playCelebrationSound()
          break
        case 'star':
          this.playStarSound()
          break
        case 'levelUp':
          this.playLevelUpSound()
          break
      }
    } catch {
      // 音效播放失败静默处理
    }
  }

  /** 答对叮咚声 — 上行两音 C5→E5 */
  private playCorrectSound(): void {
    const ctx = this.getContext()
    const now = ctx.currentTime
    const vol = this.config.volume

    // 音符 1: C5 (523 Hz)
    this.playTone(ctx, 523.25, now, 0.15, vol * 0.7, 'sine')
    // 音符 2: E5 (659 Hz)
    this.playTone(ctx, 659.25, now + 0.12, 0.2, vol * 0.8, 'sine')
  }

  /** 答错柔和提示音 — 下行两音 E4→C4，柔和 */
  private playWrongSound(): void {
    const ctx = this.getContext()
    const now = ctx.currentTime
    const vol = this.config.volume * 0.5 // 柔和

    // 柔和下行
    this.playTone(ctx, 329.63, now, 0.2, vol, 'sine')
    this.playTone(ctx, 261.63, now + 0.15, 0.25, vol * 0.7, 'sine')
  }

  /** 欢呼庆祝声 — 上行琶音 C5→E5→G5→C6 */
  private playCelebrationSound(): void {
    const ctx = this.getContext()
    const now = ctx.currentTime
    const vol = this.config.volume

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this.playTone(ctx, freq, now + i * 0.1, 0.25, vol * (0.6 + i * 0.1), 'sine')
    })

    // 额外的和弦持续音
    setTimeout(() => {
      const ctx2 = this.getContext()
      const t = ctx2.currentTime
      this.playTone(ctx2, 523.25, t, 0.5, vol * 0.3, 'triangle')
      this.playTone(ctx2, 659.25, t, 0.5, vol * 0.3, 'triangle')
      this.playTone(ctx2, 783.99, t, 0.5, vol * 0.3, 'triangle')
    }, 400)
  }

  /** 星星获得音效 — 闪亮短促上行 */
  private playStarSound(): void {
    const ctx = this.getContext()
    const now = ctx.currentTime
    const vol = this.config.volume * 0.7

    // 闪亮效果：快速上行
    this.playTone(ctx, 880, now, 0.08, vol * 0.5, 'sine')
    this.playTone(ctx, 1108.73, now + 0.06, 0.08, vol * 0.6, 'sine')
    this.playTone(ctx, 1318.51, now + 0.12, 0.15, vol * 0.8, 'sine')
    // 泛音
    this.playTone(ctx, 2637.02, now + 0.12, 0.2, vol * 0.2, 'sine')
  }

  /** 升级音效 — 华丽的上行音阶 + 和弦 */
  private playLevelUpSound(): void {
    const ctx = this.getContext()
    const now = ctx.currentTime
    const vol = this.config.volume

    // 快速上行音阶
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5]
    scale.forEach((freq, i) => {
      this.playTone(ctx, freq, now + i * 0.08, 0.15, vol * (0.4 + i * 0.07), 'sine')
    })

    // 结束和弦
    setTimeout(() => {
      const ctx2 = this.getContext()
      const t = ctx2.currentTime
      this.playTone(ctx2, 1046.5, t, 0.6, vol * 0.5, 'sine')
      this.playTone(ctx2, 1318.51, t, 0.6, vol * 0.4, 'sine')
      this.playTone(ctx2, 1567.98, t, 0.6, vol * 0.3, 'sine')
    }, 700)
  }

  /** 生成并播放单个音调 */
  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    waveType: OscillatorType,
  ): void {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = waveType
    oscillator.frequency.setValueAtTime(frequency, startTime)

    // 音量包络（避免爆音）
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)
    gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7)
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  /** 销毁 AudioContext */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

/** 全局单例 */
let _instance: SoundEffectsService | null = null

/** 获取全局音效服务实例 */
export function getSoundEffectsService(): SoundEffectsService {
  if (!_instance) {
    _instance = new SoundEffectsService()
  }
  return _instance
}
