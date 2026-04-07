import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QwenProvider } from '../ai/qwen-provider'
import type { AIProvider, ChatMessage } from '../ai/provider'

describe('AIProvider', () => {
  describe('QwenProvider', () => {
    let provider: QwenProvider

    beforeEach(() => {
      provider = new QwenProvider({
        apiKey: 'test-api-key',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-turbo',
      })
    })

    it('应该实现 AIProvider 接口', () => {
      const p: AIProvider = provider
      expect(p.chatCompletion).toBeDefined()
      expect(typeof p.chatCompletion).toBe('function')
    })

    it('应该能创建实例', () => {
      expect(provider).toBeDefined()
      expect(provider).toBeInstanceOf(QwenProvider)
    })

    it('chatCompletion 应接受消息数组并返回字符串', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '你好！我是AI老师' } }],
          }),
      })

      const messages: ChatMessage[] = [
        { role: 'system', content: '你是一个幼儿教师' },
        { role: 'user', content: '你好' },
      ]

      const result = await provider.chatCompletion(messages)
      expect(typeof result).toBe('string')
      expect(result).toBe('你好！我是AI老师')
    })

    it('API 错误时应抛出有意义的错误', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }]
      await expect(provider.chatCompletion(messages)).rejects.toThrow()
    })

    it('网络错误时应抛出错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }]
      await expect(provider.chatCompletion(messages)).rejects.toThrow('Network Error')
    })

    it('超时应该被处理', async () => {
      global.fetch = vi.fn().mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100)),
      )

      const messages: ChatMessage[] = [{ role: 'user', content: 'test' }]
      await expect(provider.chatCompletion(messages)).rejects.toThrow()
    })

    it('应发送正确的请求格式', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      })
      global.fetch = mockFetch

      await provider.chatCompletion([{ role: 'user', content: 'hello' }])

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        }),
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('qwen-turbo')
      expect(body.messages).toEqual([{ role: 'user', content: 'hello' }])
    })
  })
})
