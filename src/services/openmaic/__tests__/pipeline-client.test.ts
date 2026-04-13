/**
 * Pipeline Client 测试
 *
 * 测试 OpenMAICPipelineClient 的核心功能：
 * - SSE 流式大纲解析（generateOutlines）
 * - 子 API 调用（generateSceneContent, generateSceneActions, generateTTS）
 * - 错误重试逻辑
 * - runFullPipeline 编排
 * - 降级到旧 API
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenMAICPipelineClient } from '../pipeline-client'
import type {
  SceneOutline,
  GeneratedContent,
  SceneAction,
  PipelineProgress,
  PipelineCallbacks,
} from '../pipeline-types'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/** 创建模拟的 SSE ReadableStream */
function createMockSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const sseText = events.join('\n\n') + '\n\n'
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText))
      controller.close()
    },
  })
}

/** 创建模拟 Response */
function createMockResponse(data: unknown, ok = true, status = 200): Partial<Response> {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    headers: new Headers({ 'content-type': 'application/json' }),
  }
}

/** 创建 SSE 流式 Response */
function createSSEResponse(events: string[]): Partial<Response> {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: createMockSSEStream(events),
    headers: new Headers({ 'content-type': 'text/event-stream' }),
  }
}

describe('OpenMAICPipelineClient', () => {
  let client: OpenMAICPipelineClient
  const defaultHeaders = {
    'x-model': 'openai:gpt-4o',
    'x-api-key': 'sk-test-key',
  }

  beforeEach(() => {
    client = new OpenMAICPipelineClient({
      baseUrl: 'http://localhost:3000',
    })
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new OpenMAICPipelineClient()
      expect(defaultClient).toBeDefined()
    })

    it('should create client with custom baseUrl', () => {
      const customClient = new OpenMAICPipelineClient({
        baseUrl: 'http://custom:4000',
      })
      expect(customClient).toBeDefined()
    })

    it('should create client with custom timeout', () => {
      const customClient = new OpenMAICPipelineClient({
        baseUrl: 'http://localhost:3000',
        timeoutMs: 60000,
      })
      expect(customClient).toBeDefined()
    })
  })

  describe('generateOutlines (SSE)', () => {
    it('should parse SSE stream and return outlines', async () => {
      const sseEvents = [
        'data: {"type":"outline","data":{"index":0,"title":"Intro","description":"Introduction"},"index":0}',
        'data: {"type":"outline","data":{"index":1,"title":"Quiz","description":"Test knowledge"},"index":1}',
        'data: {"type":"done","outlines":[{"index":0,"title":"Intro","description":"Introduction"},{"index":1,"title":"Quiz","description":"Test knowledge"}]}',
      ]

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents))

      const outlines = await client.generateOutlines(
        { requirement: 'Teach colors', language: 'en' },
        defaultHeaders,
      )

      expect(outlines).toHaveLength(2)
      expect(outlines[0].title).toBe('Intro')
      expect(outlines[1].title).toBe('Quiz')
    })

    it('should call correct endpoint with headers', async () => {
      const sseEvents = [
        'data: {"type":"done","outlines":[{"index":0,"title":"Test","description":"desc"}]}',
      ]
      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents))

      await client.generateOutlines(
        { requirement: 'Teach colors', language: 'en' },
        defaultHeaders,
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate/scene-outlines-stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-model': 'openai:gpt-4o',
            'x-api-key': 'sk-test-key',
          }),
        }),
      )

      const requestBody = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
      expect(requestBody).toEqual({
        requirements: {
          requirement: 'Teach colors',
          language: 'en',
        },
      })
    })

    it('should throw on SSE error event', async () => {
      const sseEvents = [
        'data: {"type":"error","error":"LLM API quota exceeded"}',
      ]
      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents))

      await expect(
        client.generateOutlines(
          { requirement: 'Teach colors', language: 'en' },
          defaultHeaders,
        ),
      ).rejects.toThrow()
    })

    it('should throw on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        client.generateOutlines(
          { requirement: 'Teach colors', language: 'en' },
          defaultHeaders,
        ),
      ).rejects.toThrow()
    })
  })

  describe('generateSceneContent', () => {
    it('should call scene-content endpoint and return content', async () => {
      const mockContent: GeneratedContent = {
        type: 'slide',
        canvas: {
          elements: [
            { type: 'text', content: '<h1>Colors</h1>' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockContent))

      const outline: SceneOutline = {
        index: 0,
        title: 'Intro',
        description: 'Introduction to colors',
      }
      const result = await client.generateSceneContent(outline, defaultHeaders)

      expect(result.type).toBe('slide')
      expect(result.canvas?.elements).toHaveLength(1)
    })

    it('should send outline data in request body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        type: 'slide',
        canvas: { elements: [] },
      }))

      const outline: SceneOutline = {
        index: 0,
        title: 'Test Scene',
        description: 'Test description',
      }
      await client.generateSceneContent(outline, defaultHeaders)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate/scene-content',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test Scene'),
        }),
      )
    })
  })

  describe('generateSceneActions', () => {
    it('should call scene-actions endpoint and return actions', async () => {
      const mockActions: SceneAction[] = [
        { type: 'speech', text: 'Hello children!' },
        { type: 'spotlight', targetElementId: 'element-1' },
      ]

      mockFetch.mockResolvedValueOnce(createMockResponse({ actions: mockActions }))

      const outline: SceneOutline = {
        index: 0,
        title: 'Intro',
        description: 'Introduction',
      }
      const content: GeneratedContent = {
        type: 'slide',
        canvas: { elements: [] },
      }

      const result = await client.generateSceneActions(outline, content, defaultHeaders)

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('speech')
      expect(result[1].type).toBe('spotlight')
    })
  })

  describe('generateTTS', () => {
    it('should call tts endpoint and return audio data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        audio: 'base64encodedaudio',
        durationMs: 2500,
      }))

      const result = await client.generateTTS(
        'Hello children!',
        defaultHeaders,
      )

      expect(result.audioBase64).toBe('base64encodedaudio')
      expect(result.durationMs).toBe(2500)
    })

    it('should send text in request body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        audio: 'base64',
        durationMs: 1000,
      }))

      await client.generateTTS('Test speech', defaultHeaders)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate/tts',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test speech'),
        }),
      )
    })
  })

  describe('retry logic', () => {
    it('should retry on failure and succeed on second attempt', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Temporary error' },
        false,
        500,
      ))
      // Second call succeeds
      mockFetch.mockResolvedValueOnce(createMockResponse({
        type: 'slide',
        canvas: { elements: [] },
      }))

      const outline: SceneOutline = {
        index: 0,
        title: 'Test',
        description: 'Test',
      }
      const result = await client.generateSceneContent(outline, defaultHeaders)

      expect(result.type).toBe('slide')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries exceeded', async () => {
      // All calls fail
      mockFetch.mockResolvedValue(createMockResponse(
        { error: 'Persistent error' },
        false,
        500,
      ))

      const outline: SceneOutline = {
        index: 0,
        title: 'Test',
        description: 'Test',
      }

      await expect(
        client.generateSceneContent(outline, defaultHeaders),
      ).rejects.toThrow()

      // Initial call + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('runFullPipeline', () => {
    it('should orchestrate full pipeline and return classroom', async () => {
      // 1. SSE outlines
      const sseEvents = [
        'data: {"type":"done","outlines":[{"index":0,"title":"Scene 1","description":"First scene","mediaGenerations":[{"type":"image","prompt":"cartoon rainbow","elementId":"gen_img_stage_1"}]}]}',
      ]
      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents))

      // 2. scene-content for scene 0
      mockFetch.mockResolvedValueOnce(createMockResponse({
        type: 'slide',
        canvas: { elements: [{ type: 'text', content: '<h1>Hello</h1>' }] },
      }))

      // 3. scene-actions for scene 0
      mockFetch.mockResolvedValueOnce(createMockResponse({
        actions: [
          { type: 'speech', text: 'Hello children!' },
        ],
      }))

      // 4. TTS for speech action
      mockFetch.mockResolvedValueOnce(createMockResponse({
        audio: 'base64audio',
        durationMs: 2000,
      }))

      const result = await client.runFullPipeline({
        requirements: { requirement: 'Teach colors', language: 'en' },
        headers: defaultHeaders,
      })

      expect(result).toBeDefined()
      expect(result.scenes).toHaveLength(1)
      expect(result.status).toBe('completed')
      expect(result.outlines).toHaveLength(1)
      expect(result.outlines?.[0].title).toBe('Scene 1')
      expect(result.outlines?.[0].mediaGenerations).toHaveLength(1)
      expect(result.outlines?.[0].mediaGenerations?.[0]).toMatchObject({
        type: 'image',
        elementId: 'gen_img_stage_1',
      })
      expect(result.scenes[0].actions).toHaveLength(1)
      expect(result.scenes[0].actions?.[0]).toMatchObject({
        type: 'speech',
        text: 'Hello children!',
        audioBase64: 'base64audio',
        audioId: 'scene-0-speech-0',
        audioUrl: 'data:audio/mpeg;base64,base64audio',
      })
    })

    it('should invoke progress callbacks', async () => {
      const progressCalls: PipelineProgress[] = []
      const callbacks: PipelineCallbacks = {
        onProgress: (p) => progressCalls.push({ ...p }),
      }

      // SSE outlines
      mockFetch.mockResolvedValueOnce(createSSEResponse([
        'data: {"type":"done","outlines":[{"index":0,"title":"S1","description":"d1"}]}',
      ]))
      // scene-content
      mockFetch.mockResolvedValueOnce(createMockResponse({
        type: 'slide',
        canvas: { elements: [] },
      }))
      // scene-actions (no speech)
      mockFetch.mockResolvedValueOnce(createMockResponse({
        actions: [],
      }))

      await client.runFullPipeline({
        requirements: { requirement: 'Test', language: 'en' },
        headers: defaultHeaders,
        callbacks,
      })

      expect(progressCalls.length).toBeGreaterThan(0)
      // Should have outlines step and assembly step at minimum
      const steps = progressCalls.map((p) => p.step)
      expect(steps).toContain('outlines')
      expect(steps).toContain('assembly')
    })

    it('should invoke onOutlinesReady callback', async () => {
      const outlinesCallback = vi.fn()

      mockFetch.mockResolvedValueOnce(createSSEResponse([
        'data: {"type":"done","outlines":[{"index":0,"title":"S1","description":"d1"},{"index":1,"title":"S2","description":"d2"}]}',
      ]))
      // scene-content × 2
      mockFetch.mockResolvedValueOnce(createMockResponse({ type: 'slide', canvas: { elements: [] } }))
      mockFetch.mockResolvedValueOnce(createMockResponse({ type: 'slide', canvas: { elements: [] } }))
      // scene-actions × 2
      mockFetch.mockResolvedValueOnce(createMockResponse({ actions: [] }))
      mockFetch.mockResolvedValueOnce(createMockResponse({ actions: [] }))

      await client.runFullPipeline({
        requirements: { requirement: 'Test', language: 'en' },
        headers: defaultHeaders,
        callbacks: {
          onOutlinesReady: outlinesCallback,
        },
      })

      expect(outlinesCallback).toHaveBeenCalledTimes(1)
      const outlines = outlinesCallback.mock.calls[0][0] as SceneOutline[]
      expect(outlines).toHaveLength(2)
    })
  })
})
