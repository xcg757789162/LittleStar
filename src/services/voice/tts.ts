/**
 * CosyVoice TTS 语音合成服务
 * AI 老师声音，温暖友好的音色
 */

export interface TTSConfig {
  apiKey: string
  baseUrl: string
  model?: string
  voice?: string
}

export class TTSService {
  private config: TTSConfig
  private speed: number = 1.0
  private volume: number = 1.0

  constructor(config: TTSConfig) {
    this.config = {
      model: 'cosyvoice-v1',
      voice: 'longxiaochun',
      ...config,
    }
  }

  async speak(text: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.config.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
        voice: this.config.voice,
        speed: this.speed,
        volume: this.volume,
      }),
    })

    if (!response.ok) {
      throw new Error(`TTS API Error: ${response.status}`)
    }

    return response.arrayBuffer()
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, speed))
  }

  getSpeed(): number {
    return this.speed
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1.0, volume))
  }

  getVolume(): number {
    return this.volume
  }
}
