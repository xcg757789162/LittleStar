import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ClassroomSettings } from '../ClassroomSettings'
import { useChildStore } from '@/stores/childStore'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { useUserProfileStore, AVATAR_OPTIONS } from '@/lib/openmaic/store/user-profile'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import { DEFAULT_ADVANCED_SETTINGS, type Child, type ChildSettings } from '@/types/models'

const mockPatch = vi.fn()

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: unknown }) => children,
}))

vi.mock('@/components/classroom/VoicePicker', () => ({
  VoicePicker: ({ label }: { label: string }) => <button type="button">{label}</button>,
}))

vi.mock('@/services/api', () => ({
  apiClient: {
    patch: mockPatch,
  },
}))

vi.mock('@/lib/openmaic/audio/voice-resolver', () => ({
  resolveAgentVoice: (agent: { voiceConfig?: { providerId?: string; voiceId?: string } }) => ({
    providerId: agent.voiceConfig?.providerId || 'openai-tts',
    voiceId: agent.voiceConfig?.voiceId || 'alloy',
  }),
  getAvailableProvidersWithVoices: () => [{ providerId: 'openai-tts', providerName: 'OpenAI', voices: [{ id: 'alloy', name: 'Alloy' }] }],
  getCurrentProviderVoices: () => ({ providerId: 'openai-tts', providerName: 'OpenAI', voices: [{ id: 'alloy', name: 'Alloy' }] }),
}))

function createChild(id: string, name: string, settingsOverrides: Partial<ChildSettings> = {}): Child {
  return {
    id,
    userId: `user-${id}`,
    name,
    avatar: AVATAR_OPTIONS[0],
    age: 5,
    gradeLevel: 'senior-kindergarten',
    createdAt: new Date(),
    settings: {
      dailyLearningMinutes: 15,
      preferredSubjects: ['english'],
      difficultyAdjustment: 0,
      voiceEnabled: true,
      soundEffectsEnabled: true,
      ...DEFAULT_ADVANCED_SETTINGS,
      ...settingsOverrides,
    } as ChildSettings,
  }
}

describe('ClassroomSettings persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()

    const child1 = createChild('1', '小明', {
      selfIntroduction: '旧简介',
      selectedAgents: ['assistant'],
      maxDiscussionRounds: 3,
      teacherVoice: '',
    })
    const child2 = createChild('2', '小红', {
      selfIntroduction: '第二个孩子简介',
      selectedAgents: ['curious'],
      maxDiscussionRounds: 2,
      teacherVoice: '',
    })

    useChildStore.setState({
      currentChild: child1,
      children: [child1, child2],
    })

    useUserProfileStore.setState({
      avatar: AVATAR_OPTIONS[0],
      nickname: child1.name,
      bio: child1.settings.selfIntroduction,
    })

    useSettingsStore.setState({
      providerId: 'openai',
      modelId: 'gpt-4o',
      providersConfig: {},
      selectedAgentIds: ['default-1', 'default-2'],
      maxTurns: '3',
      agentMode: 'preset',
      ttsProviderId: 'openai-tts',
      ttsVoice: 'alloy',
      ttsSpeed: 1,
      ttsEnabled: true,
      imageGenerationEnabled: false,
      videoGenerationEnabled: false,
    })

    const registry = useAgentRegistry.getState()
    registry.updateAgent('default-1', { voiceConfig: undefined })
    registry.updateAgent('default-2', { voiceConfig: undefined })
    registry.updateAgent('default-3', { voiceConfig: undefined })
    registry.updateAgent('default-4', { voiceConfig: undefined })
    registry.updateAgent('default-5', { voiceConfig: undefined })
    registry.updateAgent('default-6', { voiceConfig: undefined })
  })

  it('debounced selfIntroduction 应写回原孩子，而不是切换后的当前孩子', async () => {
    render(<ClassroomSettings />)

    fireEvent.change(screen.getByPlaceholderText('告诉 AI 老师关于你的情况，课堂内容会更贴合…'), {
      target: { value: '我喜欢火箭和拼图' },
    })

    act(() => {
      useChildStore.getState().setCurrentChild(useChildStore.getState().children[1])
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalled()
    })

    const [path, payload, options] = mockPatch.mock.calls.at(-1) as [string, Record<string, unknown>, { filters: Array<{ value: number }> }]
    expect(path).toBe('/children')
    expect(payload).toMatchObject({
      settings: expect.objectContaining({
        selfIntroduction: '我喜欢火箭和拼图',
      }),
    })
    expect(options.filters[0].value).toBe(1)
  })

  it('角色、音色和讨论轮数变化后应持久化到数据库并回写 childStore', async () => {
    render(<ClassroomSettings />)
    mockPatch.mockClear()

    act(() => {
      useSettingsStore.getState().setAgentMode('auto')
      useSettingsStore.getState().setMaxTurns('5')
      useSettingsStore.getState().setTTSVoice('teacher-voice')
      useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-4'])
      useAgentRegistry.getState().updateAgent('default-2', {
        voiceConfig: { providerId: 'openai-tts', voiceId: 'assistant-voice' },
      })
    })

    await act(async () => {
      vi.advanceTimersByTime(250)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1)
    })

    const [, payload, options] = mockPatch.mock.calls.at(-1) as [string, Record<string, unknown>, { filters: Array<{ value: number }> }]
    expect(options.filters[0].value).toBe(1)
    expect(payload).toMatchObject({
      settings: expect.objectContaining({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'curious'],
        teacherVoice: 'teacher-voice',
        maxDiscussionRounds: 5,
        agentVoiceMap: expect.objectContaining({
          assistant: 'assistant-voice',
        }),
      }),
    })

    await waitFor(() => {
      expect(useChildStore.getState().children[0].settings).toMatchObject({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'curious'],
        teacherVoice: 'teacher-voice',
        maxDiscussionRounds: 5,
        agentVoiceMap: expect.objectContaining({
          assistant: 'assistant-voice',
        }),
      })
    })
  })

  it('课堂字段快速连续编辑时只落库最后一次快照并回写 childStore', async () => {
    render(<ClassroomSettings />)
    mockPatch.mockClear()

    act(() => {
      useSettingsStore.getState().setAgentMode('auto')
      useSettingsStore.getState().setMaxTurns('4')
      useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2'])
    })

    await act(async () => {
      vi.advanceTimersByTime(200)
      await Promise.resolve()
    })

    act(() => {
      useSettingsStore.getState().setMaxTurns('7')
      useSettingsStore.getState().setTTSVoice('teacher-voice')
      useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-5'])
      useAgentRegistry.getState().updateAgent('default-2', {
        voiceConfig: { providerId: 'openai-tts', voiceId: 'assistant-voice-2' },
      })
    })

    await act(async () => {
      vi.advanceTimersByTime(249)
      await Promise.resolve()
    })
    expect(mockPatch).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1)
    })

    const [, payload, options] = mockPatch.mock.calls.at(-1) as [string, Record<string, unknown>, { filters: Array<{ value: number }> }]
    expect(options.filters[0].value).toBe(1)
    expect(payload).toMatchObject({
      settings: expect.objectContaining({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'notetaker'],
        teacherVoice: 'teacher-voice',
        maxDiscussionRounds: 7,
        agentVoiceMap: expect.objectContaining({
          assistant: 'assistant-voice-2',
        }),
      }),
    })

    await waitFor(() => {
      expect(useChildStore.getState().children[0].settings).toMatchObject({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'notetaker'],
        teacherVoice: 'teacher-voice',
        maxDiscussionRounds: 7,
        agentVoiceMap: expect.objectContaining({
          assistant: 'assistant-voice-2',
        }),
      })
    })
  })

  it('课堂字段在 debounce 窗口内切孩子后仍应写回原孩子', async () => {
    render(<ClassroomSettings />)
    mockPatch.mockClear()

    act(() => {
      useSettingsStore.getState().setAgentMode('auto')
      useSettingsStore.getState().setMaxTurns('5')
      useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-4'])
    })

    act(() => {
      useChildStore.getState().setCurrentChild(useChildStore.getState().children[1])
    })

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1)
    })

    const originalChildCall = mockPatch.mock.calls.find(([, , options]) => options.filters[0].value === 1)
    expect(originalChildCall).toBeTruthy()
    expect(originalChildCall?.[1]).toMatchObject({
      settings: expect.objectContaining({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'curious'],
        maxDiscussionRounds: 5,
      }),
    })

    await waitFor(() => {
      expect(useChildStore.getState().children[0].settings).toMatchObject({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'curious'],
        maxDiscussionRounds: 5,
      })
      expect(useChildStore.getState().children[1].settings).toMatchObject({
        classroomAgentMode: 'preset',
        selectedAgents: ['curious'],
        maxDiscussionRounds: 2,
      })
    })
  })

  it('课堂字段在离开页面时应立即 flush 未落库的 debounce', async () => {
    const view = render(<ClassroomSettings />)
    mockPatch.mockClear()

    act(() => {
      useSettingsStore.getState().setAgentMode('auto')
      useSettingsStore.getState().setMaxTurns('6')
      useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-5'])
    })

    act(() => {
      view.unmount()
    })

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1)
    })

    const originalChildCall = mockPatch.mock.calls.find(([, , options]) => options.filters[0].value === 1)
    expect(originalChildCall).toBeTruthy()
    expect(originalChildCall?.[1]).toMatchObject({
      settings: expect.objectContaining({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'notetaker'],
        maxDiscussionRounds: 6,
      }),
    })

    await waitFor(() => {
      expect(useChildStore.getState().children[0].settings).toMatchObject({
        classroomAgentMode: 'auto',
        selectedAgents: ['assistant', 'notetaker'],
        maxDiscussionRounds: 6,
      })
    })
  })
})
