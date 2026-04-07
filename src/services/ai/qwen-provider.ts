/**
 * 通义千问 Provider
 * 使用 OpenAI 兼容接口格式
 */

import type { AIProvider, AIProviderConfig, ChatMessage } from './provider'

export class QwenProvider implements AIProvider {
  private config: Required<AIProviderConfig>

  constructor(config: AIProviderConfig) {
    this.config = {
      maxTokens: 1024,
      temperature: 0.7,
      ...config,
    }
  }

  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    const url = `${this.config.baseUrl}/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg =
        (errorData as { error?: { message?: string } })?.error?.message ??
        `API Error: ${response.status} ${response.statusText}`
      throw new Error(errorMsg)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    return data.choices[0]?.message?.content ?? ''
  }
}
