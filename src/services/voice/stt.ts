/**
 * Paraformer STT 语音识别服务
 * 识别幼儿语音回答
 */

export interface STTConfig {
  apiKey: string
  baseUrl: string
  model?: string
}

export class STTService {
  private config: STTConfig

  constructor(config: STTConfig) {
    this.config = {
      model: 'paraformer-v2',
      ...config,
    }
  }

  async recognize(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', this.config.model!)

    const response = await fetch(`${this.config.baseUrl}/stt`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`STT API Error: ${response.status}`)
    }

    const data = (await response.json()) as { text: string }
    return data.text
  }
}
