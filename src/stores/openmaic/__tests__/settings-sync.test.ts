import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { AVATAR_OPTIONS, useUserProfileStore } from '@/lib/openmaic/store/user-profile'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import type { Child, ChildSettings } from '@/types/models'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'
import {
  getSelfIntroductionFromSettings,
  mergeChildSettingsWithLiveStore,
  stripLegacyBioField,
} from '../child-settings-compat'
import { syncChildToOpenMAIC } from '../child-openmaic-sync'
import { extractChildSettingsFromStore } from '../settings-reverse-sync'

function createTestChild(
  settingsOverrides: Partial<ChildSettings> & { bio?: string } = {},
  childOverrides: Partial<Child> = {},
): Child {
  return {
    id: 'child-1',
    userId: 'user-1',
    name: '小明',
    avatar: '/avatars/user.png',
    age: 5,
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
    ...childOverrides,
  }
}

const DEFAULT_AGENT_IDS = ['default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6']

function resetRegistryVoices() {
  const registry = useAgentRegistry.getState()
  for (const id of DEFAULT_AGENT_IDS) {
    registry.updateAgent(id, { voiceConfig: undefined })
  }
}

describe('OpenMAIC settings sync compatibility', () => {
  beforeEach(() => {
    localStorage.clear()

    useUserProfileStore.setState({
      avatar: AVATAR_OPTIONS[0],
      nickname: '',
      bio: '',
    })

    useSettingsStore.setState({
      providerId: 'openai',
      modelId: '',
      selectedAgentIds: ['default-1', 'default-2', 'default-3'],
      maxTurns: '10',
      agentMode: 'auto',
      ttsProviderId: 'openai-tts',
      ttsVoice: '',
      ttsSpeed: 1,
      ttsEnabled: true,
      imageGenerationEnabled: false,
      videoGenerationEnabled: false,
    })

    resetRegistryVoices()
  })

  it('优先读取 selfIntroduction，缺失时回退 legacy bio', () => {
    expect(getSelfIntroductionFromSettings({
      selfIntroduction: '我喜欢科学实验',
      bio: '旧简介',
    })).toBe('我喜欢科学实验')

    expect(getSelfIntroductionFromSettings({
      bio: '我是旧字段里的自我介绍',
    })).toBe('我是旧字段里的自我介绍')

    expect(getSelfIntroductionFromSettings(undefined)).toBe('')
  })

  it('写回数据库前会剔除 legacy bio 字段', () => {
    expect(stripLegacyBioField({
      bio: '旧字段',
      selfIntroduction: '新字段',
      llmModel: 'openai:gpt-4o-mini',
    })).toEqual({
      selfIntroduction: '新字段',
      llmModel: 'openai:gpt-4o-mini',
    })
  })

  it('应将孩子设置同步到 OpenMAIC settings / profile / agent registry', () => {
    const child = createTestChild({
      classroomAgentMode: 'preset',
      selectedAgents: ['assistant', 'curious'],
      maxDiscussionRounds: 5,
      teacherVoice: 'female-yujie',
      agentVoiceMap: {
        assistant: 'male-qn-daxuesheng',
        curious: 'lovely_girl',
      },
      selfIntroduction: '我喜欢火箭和画画',
      ttsProviderId: 'minimax',
      ttsApiKey: 'tts-key',
      ttsVoice: 'female-tianmei',
    })

    syncChildToOpenMAIC(child)

    const settingsStore = useSettingsStore.getState()
    expect(settingsStore.agentMode).toBe('preset')
    expect(settingsStore.selectedAgentIds).toEqual(['default-1', 'default-2', 'default-4'])
    expect(settingsStore.maxTurns).toBe('5')
    expect(settingsStore.ttsProviderId).toBe('minimax-tts')
    expect(settingsStore.ttsVoice).toBe('female-yujie')

    const profileStore = useUserProfileStore.getState()
    expect(profileStore.nickname).toBe('小明')
    expect(profileStore.bio).toBe('我喜欢火箭和画画')
    expect(profileStore.avatar).toBe('/avatars/user.png')

    const registry = useAgentRegistry.getState()
    expect(registry.getAgent('default-1')?.voiceConfig).toMatchObject({
      providerId: 'minimax-tts',
      voiceId: 'female-yujie',
    })
    expect(registry.getAgent('default-2')?.voiceConfig).toMatchObject({
      providerId: 'minimax-tts',
      voiceId: 'male-qn-daxuesheng',
    })
    expect(registry.getAgent('default-4')?.voiceConfig).toMatchObject({
      providerId: 'minimax-tts',
      voiceId: 'lovely_girl',
    })
  })

  it('应从 OpenMAIC store 反向提取课堂设置并收口到 selfIntroduction', () => {
    useSettingsStore.setState({
      agentMode: 'preset',
      selectedAgentIds: ['default-1', 'default-3', 'default-4'],
      maxTurns: '6',
      ttsVoice: 'female-yujie',
      ttsProviderId: 'openai-tts',
    })
    useUserProfileStore.getState().setBio('我喜欢拼图和小动物')

    const registry = useAgentRegistry.getState()
    registry.updateAgent('default-3', {
      voiceConfig: { providerId: 'openai-tts', voiceId: 'clever_boy' },
    })
    registry.updateAgent('default-4', {
      voiceConfig: { providerId: 'openai-tts', voiceId: 'lovely_girl' },
    })

    const extracted = extractChildSettingsFromStore()

    expect(extracted.classroomAgentMode).toBe('preset')
    expect(extracted.selectedAgents).toEqual(['showoff', 'curious'])
    expect(extracted.maxDiscussionRounds).toBe(6)
    expect(extracted.teacherVoice).toBe('female-yujie')
    expect(extracted.agentVoiceMap).toEqual({
      showoff: 'clever_boy',
      curious: 'lovely_girl',
    })
    expect(extracted.selfIntroduction).toBe('我喜欢拼图和小动物')
  })

  it('应优先使用 live store 中的 LLM 配置补齐运行时设置', () => {
    const store = useSettingsStore.getState()
    useSettingsStore.setState({
      providerId: 'backend-doubao',
      modelId: 'doubao-pro-32k',
      providersConfig: {
        ...store.providersConfig,
        'backend-doubao': {
          ...store.providersConfig['backend-doubao'],
          apiKey: 'live-key',
          baseUrl: 'https://ark.example.com/v3',
        },
      },
    })

    const merged = mergeChildSettingsWithLiveStore(
      createTestChild({
        llmProviderId: '',
        llmModel: '',
        llmApiKey: '',
        llmBaseUrl: '',
      }).settings,
      extractChildSettingsFromStore(),
    )

    expect(merged?.llmProviderId).toBe('backend-doubao')
    expect(merged?.llmModel).toBe('backend-doubao:doubao-pro-32k')
    expect(merged?.llmApiKey).toBe('live-key')
    expect(merged?.llmBaseUrl).toBe('https://ark.example.com/v3')
  })

  it('不应让 live store 的空值覆盖数据库里已有的 LLM 配置', () => {
    const merged = mergeChildSettingsWithLiveStore(
      createTestChild({
        llmProviderId: 'backend-openai',
        llmModel: 'backend-openai:gpt-4o',
        llmApiKey: 'db-key',
        llmBaseUrl: 'https://api.openai.com/v1',
      }).settings,
      extractChildSettingsFromStore(),
    )

    expect(merged?.llmProviderId).toBe('backend-openai')
    expect(merged?.llmModel).toBe('backend-openai:gpt-4o')
    expect(merged?.llmApiKey).toBe('db-key')
    expect(merged?.llmBaseUrl).toBe('https://api.openai.com/v1')
  })
})
