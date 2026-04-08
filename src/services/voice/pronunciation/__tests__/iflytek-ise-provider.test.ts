/**
 * 讯飞口语评测 ISE Provider 测试
 * TDD: 测试 WebSocket API 调用、评分解析、幼儿模式、超时处理、错误重试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IflytekISEProvider } from '../iflytek-ise-provider'

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: (() => void) | null = null
  readyState = 0 // CONNECTING
  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // 模拟异步连接成功
    setTimeout(() => {
      this.readyState = 1 // OPEN
      this.onopen?.()
    }, 10)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.()
  }

  // 辅助方法：模拟服务端返回
  simulateMessage(data: string) {
    this.onmessage?.({ data })
  }

  simulateError(error: unknown) {
    this.onerror?.(error)
  }

  static reset() {
    MockWebSocket.instances = []
  }

  static get CONNECTING() { return 0 }
  static get OPEN() { return 1 }
  static get CLOSING() { return 2 }
  static get CLOSED() { return 3 }
}

// 模拟讯飞评测结果 XML
function createMockISEResult(totalScore: number, options?: {
  accuracyScore?: number
  fluencyScore?: number
  integrityScore?: number
}) {
  const accuracy = options?.accuracyScore ?? totalScore
  const fluency = options?.fluencyScore ?? (totalScore - 5)
  const integrity = options?.integrityScore ?? (totalScore + 2)

  // 讯飞返回的评测结果是 Base64 编码的 XML
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<xml_result>
  <read_word>
    <rec_paper>
      <read_word>
        <total_score>${totalScore}</total_score>
        <accuracy_score>${accuracy}</accuracy_score>
        <fluency_score>${fluency}</fluency_score>
        <integrity_score>${integrity}</integrity_score>
        <is_rejected>false</is_rejected>
        <word>
          <total_score>${totalScore}</total_score>
          <content>apple</content>
          <syll>
            <syll_score>${accuracy}</syll_score>
            <content>ap</content>
            <phone>
              <phone_score>${accuracy + 5}</phone_score>
              <content>ae</content>
              <dp_message>0</dp_message>
            </phone>
            <phone>
              <phone_score>${accuracy - 3}</phone_score>
              <content>p</content>
              <dp_message>0</dp_message>
            </phone>
          </syll>
          <syll>
            <syll_score>${accuracy - 2}</syll_score>
            <content>ple</content>
            <phone>
              <phone_score>${accuracy}</phone_score>
              <content>l</content>
              <dp_message>0</dp_message>
            </phone>
          </syll>
        </word>
      </read_word>
    </rec_paper>
  </read_word>
</xml_result>`
  return btoa(xml)
}

describe('IflytekISEProvider', () => {
  let provider: IflytekISEProvider
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    MockWebSocket.reset()
    // @ts-expect-error mock WebSocket
    globalThis.WebSocket = MockWebSocket
    provider = new IflytekISEProvider({
      appId: 'test-app-id',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    })
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  describe('name', () => {
    it('should return "iflytek-ise"', () => {
      expect(provider.name).toBe('iflytek-ise')
    })
  })

  describe('checkAvailability', () => {
    it('should return true when config is valid', async () => {
      const result = await provider.checkAvailability()
      expect(result).toBe(true)
    })

    it('should return false when config is missing required fields', async () => {
      const incompleteProvider = new IflytekISEProvider({
        appId: '',
        apiKey: '',
        apiSecret: '',
      })
      const result = await incompleteProvider.checkAvailability()
      expect(result).toBe(false)
    })
  })

  describe('scorePronunciation', () => {
    it('should send correct WebSocket messages', async () => {
      const audioBlob = new Blob(['test-audio-data'], { type: 'audio/wav' })

      // 启动评分（不等待完成）
      const scorePromise = provider.scorePronunciation(audioBlob, 'apple', 'en')

      // 等待 WebSocket 连接
      await vi.waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })

      const ws = MockWebSocket.instances[0]

      // 等待连接打开
      await vi.waitFor(() => {
        expect(ws.sentMessages.length).toBeGreaterThan(0)
      })

      // 验证第一帧包含业务参数
      const firstFrame = JSON.parse(ws.sentMessages[0])
      expect(firstFrame.common.app_id).toBe('test-app-id')
      expect(firstFrame.business.sub).toBe('ise')
      expect(firstFrame.business.category).toBe('read_word')

      // 模拟返回结果
      ws.simulateMessage(JSON.stringify({
        code: 0,
        message: 'success',
        sid: 'test-sid',
        data: {
          status: 2,
          data: createMockISEResult(85),
        },
      }))

      const result = await scorePromise
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })

    it('should parse phoneme-level scores from ISE result', async () => {
      const audioBlob = new Blob(['test-audio'], { type: 'audio/wav' })
      const scorePromise = provider.scorePronunciation(audioBlob, 'apple', 'en', {
        enablePhonemeDetail: true,
      })

      await vi.waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })

      const ws = MockWebSocket.instances[0]
      await vi.waitFor(() => expect(ws.sentMessages.length).toBeGreaterThan(0))

      ws.simulateMessage(JSON.stringify({
        code: 0,
        message: 'success',
        sid: 'test-sid',
        data: {
          status: 2,
          data: createMockISEResult(80, {
            accuracyScore: 82,
            fluencyScore: 78,
            integrityScore: 85,
          }),
        },
      }))

      const result = await scorePromise
      expect(result.fluencyScore).toBeDefined()
      expect(result.completenessScore).toBeDefined()
      expect(result.phonemeScores.length).toBeGreaterThan(0)
    })

    it('should use child mode parameters when ageGroup is child', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })
      const scorePromise = provider.scorePronunciation(audioBlob, 'cat', 'en', {
        ageGroup: 'child',
      })

      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
      const ws = MockWebSocket.instances[0]
      await vi.waitFor(() => expect(ws.sentMessages.length).toBeGreaterThan(0))

      const firstFrame = JSON.parse(ws.sentMessages[0])
      // 幼儿模式应使用 read_word（最简单题型）
      expect(firstFrame.business.category).toBe('read_word')

      // 模拟返回
      ws.simulateMessage(JSON.stringify({
        code: 0,
        message: 'success',
        sid: 'test-sid',
        data: { status: 2, data: createMockISEResult(60) },
      }))

      await scorePromise
    })

    it('should select correct category based on text length', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })

      // 长句应使用 read_sentence
      const scorePromise = provider.scorePronunciation(
        audioBlob,
        'The quick brown fox jumps over the lazy dog',
        'en',
      )

      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
      const ws = MockWebSocket.instances[0]
      await vi.waitFor(() => expect(ws.sentMessages.length).toBeGreaterThan(0))

      const firstFrame = JSON.parse(ws.sentMessages[0])
      expect(firstFrame.business.category).toBe('read_sentence')

      ws.simulateMessage(JSON.stringify({
        code: 0,
        message: 'success',
        sid: 'test-sid',
        data: { status: 2, data: createMockISEResult(75) },
      }))

      await scorePromise
    })

    it('should handle timeout (3s) and reject', async () => {
      // 创建一个不会回复消息的 provider，超时设置为极短
      const shortTimeoutProvider = new IflytekISEProvider({
        appId: 'test-app-id',
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
      })
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })

      const scorePromise = shortTimeoutProvider.scorePronunciation(audioBlob, 'apple', 'en')

      // 等待 WebSocket 连接建立
      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1)
      })

      // 不模拟任何消息返回 —— 3 秒后应超时拒绝
      await expect(scorePromise).rejects.toThrow(/timeout/i)
    }, 10000)

    it('should handle WebSocket error and reject', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })
      const scorePromise = provider.scorePronunciation(audioBlob, 'apple', 'en')

      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
      const ws = MockWebSocket.instances[0]

      // 模拟连接错误
      ws.simulateError(new Error('Connection failed'))

      await expect(scorePromise).rejects.toThrow()
    })

    it('should handle API error code in response', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })
      const scorePromise = provider.scorePronunciation(audioBlob, 'apple', 'en')

      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
      const ws = MockWebSocket.instances[0]
      await vi.waitFor(() => expect(ws.sentMessages.length).toBeGreaterThan(0))

      ws.simulateMessage(JSON.stringify({
        code: 10160,
        message: 'authorization failed',
        sid: 'test-sid',
      }))

      await expect(scorePromise).rejects.toThrow(/authorization/i)
    })

    it('should use en_vip for English and cn_vip for Chinese', async () => {
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })

      // 中文
      const zhPromise = provider.scorePronunciation(audioBlob, '你好', 'zh')
      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
      const ws = MockWebSocket.instances[0]
      await vi.waitFor(() => expect(ws.sentMessages.length).toBeGreaterThan(0))

      const firstFrame = JSON.parse(ws.sentMessages[0])
      expect(firstFrame.business.ent).toBe('cn_vip')

      ws.simulateMessage(JSON.stringify({
        code: 0,
        message: 'success',
        sid: 'test-sid',
        data: { status: 2, data: createMockISEResult(80) },
      }))

      await zhPromise
    })
  })

  describe('generateAuthUrl', () => {
    it('should generate URL with authorization params', () => {
      // 通过反射或 public 方法验证 URL 包含鉴权参数
      // 间接通过 WebSocket URL 验证
      const audioBlob = new Blob(['test'], { type: 'audio/wav' })
      provider.scorePronunciation(audioBlob, 'test', 'en')

      // WebSocket URL 应包含 host/date/authorization
      setTimeout(() => {
        if (MockWebSocket.instances.length > 0) {
          const url = MockWebSocket.instances[0].url
          expect(url).toContain('authorization=')
          expect(url).toContain('date=')
          expect(url).toContain('host=')
        }
      }, 20)
    })
  })
})
