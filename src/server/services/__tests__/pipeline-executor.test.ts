import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PipelineExecutor } from '../pipeline-executor'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

function createMockResponse(data: unknown, ok = true, status = 200): Partial<Response> {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    headers: new Headers({ 'content-type': 'application/json' }),
  }
}

function createSSEResponse(events: string[]): Partial<Response> {
  const sseText = events.join('\n\n') + '\n\n'

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: createMockSSEStream(events),
    text: async () => sseText,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
  }
}

describe('PipelineExecutor', () => {
  let executor: PipelineExecutor

  beforeEach(() => {
    executor = new PipelineExecutor()
    mockFetch.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(1710000000000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the current upstream request and response contract across pipeline steps', async () => {
    const outline = {
      id: 'outline-1',
      index: 0,
      order: 1,
      title: '颜色课堂',
      description: '学习红黄蓝三种颜色',
      type: 'slide',
      language: 'zh-CN',
      mediaGenerations: [
        {
          type: 'image',
          prompt: 'cartoon red yellow blue balloons',
          elementId: 'gen_img_color_1',
        },
      ],
    }

    mockFetch
      .mockResolvedValueOnce(createSSEResponse([
        `data: ${JSON.stringify({ type: 'done', outlines: [outline] })}`,
      ]))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        content: {
          type: 'slide',
          canvas: {
            elements: [{ type: 'text', content: '<p>红黄蓝</p>' }],
          },
        },
        effectiveOutline: outline,
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        scene: {
          id: 'scene-1',
          title: '颜色课堂',
          type: 'slide',
          order: 0,
          content: {
            type: 'slide',
            canvas: {
              elements: [{ type: 'text', content: '<p>红黄蓝</p>' }],
            },
          },
          actions: [{ type: 'speech', text: '大家一起来认识颜色' }],
        },
        previousSpeeches: ['大家一起来认识颜色'],
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        audioId: 'scene-0-speech-0',
        base64: 'base64-audio',
        format: 'mp3',
      }))

    const headers = {
      'x-model': 'openai:gpt-4o',
      'x-api-key': 'sk-test',
      'x-tts-enabled': 'true',
      'x-tts-provider': 'openai-tts',
      'x-tts-voice': 'alloy',
      'x-tts-speed': '1.2',
      'x-agent-profiles': Buffer.from(
        JSON.stringify([{ id: 'teacher', name: '小明老师', voiceId: 'alloy' }]),
        'utf-8',
      ).toString('base64'),
      'x-agent-profiles-encoding': 'base64',
    }

    const classroom = await executor.runFullPipeline({
      requirements: {
        requirement: '给幼儿讲红黄蓝三种颜色',
        language: 'zh-CN',
        userNickname: '小明',
        userBio: '我喜欢恐龙和拼图',
      },
      headers,
    })

    expect(classroom.status).toBe('completed')
    expect(classroom.scenes).toHaveLength(1)
    expect(classroom.scenes[0].title).toBe('颜色课堂')
    expect(classroom.outlines).toEqual([
      expect.objectContaining({
        id: 'outline-1',
        mediaGenerations: [
          expect.objectContaining({
            type: 'image',
            elementId: 'gen_img_color_1',
          }),
        ],
      }),
    ])
    expect(classroom.scenes[0].actions[0]).toMatchObject({
      type: 'speech',
      text: '大家一起来认识颜色',
      audioBase64: 'base64-audio',
      audioId: 'scene-0-speech-0',
      audioUrl: 'data:audio/mpeg;base64,base64-audio',
    })

    const outlinesBody = JSON.parse(String(mockFetch.mock.calls[0][1]?.body)) as Record<string, unknown>
    expect(outlinesBody).toMatchObject({
      requirements: {
        requirement: '给幼儿讲红黄蓝三种颜色',
        language: 'zh-CN',
        userNickname: '小明',
        userBio: '我喜欢恐龙和拼图',
      },
      agents: [{ id: 'teacher', name: '小明老师', voiceId: 'alloy' }],
    })

    const contentBody = JSON.parse(String(mockFetch.mock.calls[1][1]?.body)) as Record<string, unknown>
    expect(contentBody).toMatchObject({
      outline: expect.objectContaining({ title: '颜色课堂' }),
      allOutlines: [expect.objectContaining({ title: '颜色课堂' })],
      stageInfo: expect.objectContaining({
        name: '颜色课堂',
        language: 'zh-CN',
      }),
      stageId: expect.any(String),
      agents: [{ id: 'teacher', name: '小明老师', voiceId: 'alloy' }],
    })

    const actionsBody = JSON.parse(String(mockFetch.mock.calls[2][1]?.body)) as Record<string, unknown>
    expect(actionsBody).toMatchObject({
      outline: expect.objectContaining({ title: '颜色课堂' }),
      allOutlines: [expect.objectContaining({ title: '颜色课堂' })],
      stageId: contentBody.stageId,
      previousSpeeches: [],
      agents: [{ id: 'teacher', name: '小明老师', voiceId: 'alloy' }],
    })

    const ttsBody = JSON.parse(String(mockFetch.mock.calls[3][1]?.body)) as Record<string, unknown>
    expect(ttsBody).toMatchObject({
      text: '大家一起来认识颜色',
      audioId: 'scene-0-speech-0',
      ttsProviderId: 'openai-tts',
      ttsVoice: 'alloy',
      ttsSpeed: 1.2,
    })
  })

  it('passes previous speeches into later scene-actions requests', async () => {
    const outlines = [
      {
        id: 'outline-1',
        index: 0,
        order: 1,
        title: '第一幕',
        description: '老师开场',
        type: 'slide',
      },
      {
        id: 'outline-2',
        index: 1,
        order: 2,
        title: '第二幕',
        description: '学生互动',
        type: 'slide',
      },
    ]

    mockFetch
      .mockResolvedValueOnce(createSSEResponse([
        `data: ${JSON.stringify({ type: 'done', outlines })}`,
      ]))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        content: { type: 'slide', canvas: { elements: [] } },
        effectiveOutline: outlines[0],
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        scene: {
          id: 'scene-1',
          title: '第一幕',
          type: 'slide',
          order: 0,
          content: { type: 'slide', canvas: { elements: [] } },
          actions: [{ type: 'speech', text: '大家好' }],
        },
        previousSpeeches: ['大家好'],
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        audioId: 'scene-0-speech-0',
        base64: 'audio-1',
        format: 'mp3',
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        content: { type: 'slide', canvas: { elements: [] } },
        effectiveOutline: outlines[1],
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        scene: {
          id: 'scene-2',
          title: '第二幕',
          type: 'slide',
          order: 1,
          content: { type: 'slide', canvas: { elements: [] } },
          actions: [],
        },
        previousSpeeches: ['大家好', '我们继续学习'],
      }))

    await executor.runFullPipeline({
      requirements: {
        requirement: '两幕课堂',
        language: 'zh-CN',
      },
      headers: {
        'x-model': 'openai:gpt-4o',
        'x-api-key': 'sk-test',
        'x-tts-enabled': 'true',
        'x-tts-provider': 'openai-tts',
        'x-tts-voice': 'alloy',
      },
    })

    const secondActionsBody = JSON.parse(String(mockFetch.mock.calls[5][1]?.body)) as Record<string, unknown>
    expect(secondActionsBody).toMatchObject({
      previousSpeeches: ['大家好'],
    })
  })

  it('accepts upstream outlines that only provide order and still builds scenes', async () => {
    const outline = {
      id: 'outline-order-only',
      order: 0,
      title: '数字课堂',
      description: '认识 1 到 5',
      type: 'slide',
      keyPoints: ['1', '2', '3'],
    }

    mockFetch
      .mockResolvedValueOnce(createSSEResponse([
        `data: ${JSON.stringify({ type: 'done', outlines: [outline] })}`,
      ]))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        content: {
          type: 'slide',
          canvas: {
            elements: [{ type: 'text', content: '<p>1 2 3 4 5</p>' }],
          },
        },
        effectiveOutline: outline,
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        scene: {
          id: 'scene-order-only',
          title: '数字课堂',
          type: 'slide',
          order: 0,
          content: {
            type: 'slide',
            canvas: {
              elements: [{ type: 'text', content: '<p>1 2 3 4 5</p>' }],
            },
          },
          actions: [],
        },
        previousSpeeches: [],
      }))

    const classroom = await executor.runFullPipeline({
      requirements: {
        requirement: '给幼儿讲 1 到 5',
        language: 'zh-CN',
      },
      headers: {
        'x-model': 'openai:gpt-4o',
        'x-api-key': 'sk-test',
        'x-tts-enabled': 'false',
      },
    })

    expect(classroom.title).toBe('数字课堂')
    expect(classroom.scenes).toHaveLength(1)
    expect(classroom.scenes[0].title).toBe('数字课堂')
  })

  it('accepts upstream scene-content payloads that omit the legacy type wrapper', async () => {
    const outline = {
      id: 'outline-slide-1',
      order: 0,
      title: '形状课堂',
      description: '认识正方形',
      type: 'slide',
    }

    mockFetch
      .mockResolvedValueOnce(createSSEResponse([
        `data: ${JSON.stringify({ type: 'done', outlines: [outline] })}`,
      ]))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        content: {
          elements: [{ type: 'text', content: '<p>这是正方形</p>' }],
          background: { type: 'solid', color: '#fff7ed' },
        },
        effectiveOutline: outline,
      }))
      .mockResolvedValueOnce(createMockResponse({
        success: true,
        scene: {
          id: 'scene-shape-1',
          title: '形状课堂',
          type: 'slide',
          order: 0,
          content: {
            type: 'slide',
            canvas: {
              elements: [{ type: 'text', content: '<p>这是正方形</p>' }],
              background: { type: 'solid', color: '#fff7ed' },
            },
          },
          actions: [],
        },
        previousSpeeches: [],
      }))

    const classroom = await executor.runFullPipeline({
      requirements: {
        requirement: '给幼儿讲正方形',
        language: 'zh-CN',
      },
      headers: {
        'x-model': 'openai:gpt-4o',
        'x-api-key': 'sk-test',
        'x-tts-enabled': 'false',
      },
    })

    expect(classroom.scenes).toHaveLength(1)
    const actionsBody = JSON.parse(String(mockFetch.mock.calls[2][1]?.body)) as Record<string, unknown>
    expect(actionsBody).toMatchObject({
      content: {
        elements: [{ type: 'text', content: '<p>这是正方形</p>' }],
      },
    })
  })

  it('throws instead of returning a completed empty classroom when outlines are empty', async () => {
    mockFetch.mockResolvedValueOnce(createSSEResponse([
      `data: ${JSON.stringify({ type: 'done', outlines: [] })}`,
    ]))

    await expect(executor.runFullPipeline({
      requirements: {
        requirement: '空大纲课堂',
        language: 'zh-CN',
      },
      headers: {
        'x-model': 'openai:gpt-4o',
        'x-api-key': 'sk-test',
        'x-tts-enabled': 'false',
      },
    })).rejects.toThrow(/No scene outlines generated/)
  })
})
