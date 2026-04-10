/**
 * 测试 Pipeline Client agent-profiles API 调用
 * TDD 步骤 4.1.1：先写测试，此时方法尚未实现，测试应失败
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenMAICPipelineClient } from '../pipeline-client'
import type { UserRequirements } from '../pipeline-types'

describe('OpenMAICPipelineClient — generateAgentProfiles', () => {
  let client: OpenMAICPipelineClient

  const testRequirements: UserRequirements = {
    requirement: '教小朋友认识颜色 red, blue, green',
    language: 'en',
    userNickname: '小明',
  }

  const testHeaders: Record<string, string> = {
    'x-model': 'openai:gpt-4o',
    'x-api-key': 'sk-test',
    'x-agent-mode': 'auto',
  }

  const mockAgentProfiles = [
    { id: 'teacher', name: 'Miss Color', emoji: '🎨', description: '色彩教师', voiceId: 'female-tianmei' },
    { id: 'student1', name: '小画家', emoji: '🖌️', description: '爱画画', voiceId: 'clever_boy' },
  ]

  beforeEach(() => {
    client = new OpenMAICPipelineClient({ baseUrl: 'http://test-server' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应调用 /api/generate/agent-profiles 端点', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockAgentProfiles), { status: 200 }),
    )

    await client.generateAgentProfiles(testRequirements, testHeaders)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/generate/agent-profiles')
  })

  it('应发送 POST 请求并传入 requirements 和 headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockAgentProfiles), { status: 200 }),
    )

    await client.generateAgentProfiles(testRequirements, testHeaders)

    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit
    expect(calledInit.method).toBe('POST')
    expect(calledInit.headers).toBeDefined()
    // 应包含自定义 headers
    const sentHeaders = calledInit.headers as Record<string, string>
    expect(sentHeaders['x-model']).toBe('openai:gpt-4o')
    expect(sentHeaders['x-api-key']).toBe('sk-test')
  })

  it('应正确解析返回的 AgentInfo[] 数组', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockAgentProfiles), { status: 200 }),
    )

    const result = await client.generateAgentProfiles(testRequirements, testHeaders)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Miss Color')
    expect(result[0].voiceId).toBe('female-tianmei')
    expect(result[1].id).toBe('student1')
  })

  it('HTTP 错误应抛出异常', async () => {
    // 需要 mock 3 次 500 响应（1 次原始 + 2 次重试 = maxRetries 默认 2）
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

    await expect(
      client.generateAgentProfiles(testRequirements, testHeaders),
    ).rejects.toThrow()
  })

  it('应在失败后重试', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAgentProfiles), { status: 200 }),
      )

    const result = await client.generateAgentProfiles(testRequirements, testHeaders)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(2)
  })
})
