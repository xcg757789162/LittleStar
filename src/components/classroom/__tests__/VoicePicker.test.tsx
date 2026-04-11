import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { VoicePicker } from '../VoicePicker'

vi.mock('@/lib/openmaic/store/settings', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => selector({
    ttsProvidersConfig: {
      'openai-tts': {
        modelId: 'gpt-4o-mini-tts',
        apiKey: 'test-key',
        baseUrl: 'https://example.com',
      },
    },
  }),
}))

vi.mock('@/lib/openmaic/audio/browser-tts-preview', () => ({
  playBrowserTTSPreview: vi.fn(() => ({
    promise: Promise.resolve(),
    cancel: vi.fn(),
  })),
}))

const providers = [
  {
    providerId: 'openai-tts',
    providerName: 'OpenAI',
    voices: [
      { id: 'voice-sunny', name: '晴朗女声' },
      { id: 'voice-story', name: '故事姐姐' },
    ],
    modelGroups: [
      {
        modelId: 'gpt-4o-mini-tts',
        modelName: 'Mini TTS',
        voices: [
          { id: 'voice-sunny', name: '晴朗女声' },
        ],
      },
      {
        modelId: 'gpt-4o-audio-preview',
        modelName: 'Audio Preview',
        voices: [
          { id: 'voice-story', name: '故事姐姐' },
        ],
      },
    ],
  },
] as const

describe('VoicePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应通过 Portal 渲染弹层而不是内联在触发器容器里', () => {
    const { container } = render(
      <VoicePicker
        label="同学音色"
        currentProviderId="openai-tts"
        currentVoiceId="voice-sunny"
        availableProviders={[...providers]}
        onSelect={vi.fn()}
        accentColor="#FF8C42"
      />,
    )

    fireEvent.click(screen.getByTestId('voice-picker-trigger'))

    expect(screen.getByTestId('voice-picker-popover-content')).toBeInTheDocument()
    expect(within(container).queryByTestId('voice-picker-popover-content')).not.toBeInTheDocument()
  })

  it('切换语音分组后点击音色项时应回传 provider、voice 和 modelId', () => {
    const onSelect = vi.fn()

    render(
      <VoicePicker
        label="教师语音"
        currentProviderId="openai-tts"
        currentVoiceId="voice-sunny"
        availableProviders={[...providers]}
        onSelect={onSelect}
        accentColor="#3B82F6"
      />,
    )

    fireEvent.click(screen.getByTestId('voice-picker-trigger'))
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('OpenAI · Audio Preview'))
    fireEvent.click(screen.getByRole('button', { name: /^故事姐姐$/ }))

    expect(onSelect).toHaveBeenCalledWith('openai-tts', 'voice-story', 'gpt-4o-audio-preview')
  })
})
