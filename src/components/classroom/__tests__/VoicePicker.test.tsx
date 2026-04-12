import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { VoicePicker } from '../VoicePicker'

const mockFetch = vi.fn()
const audioInstances: MockAudio[] = []

class MockAudio {
  src = ''
  pause = vi.fn()
  play = vi.fn(() => Promise.resolve())
  addEventListener = vi.fn()

  constructor(src?: string) {
    if (src) this.src = src
    audioInstances.push(this)
  }
}

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio)

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
      { id: 'voice-breeze', name: '清风少年' },
      { id: 'voice-story', name: '故事姐姐' },
    ],
    modelGroups: [
      {
        modelId: 'gpt-4o-mini-tts',
        modelName: 'Mini TTS',
        voices: [
          { id: 'voice-sunny', name: '晴朗女声' },
          { id: 'voice-breeze', name: '清风少年' },
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
    mockFetch.mockReset()
    audioInstances.length = 0
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

  it('连续试听不同音色时应保持最新按钮为播放中状态', async () => {
    let requestCount = 0
    mockFetch.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      requestCount += 1

      if (requestCount === 1) {
        return new Promise((_resolve, reject) => {
          const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
          init?.signal?.addEventListener('abort', () => reject(abortError), { once: true })
        })
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          base64: 'dGVzdA==',
          format: 'mp3',
        }),
      })
    })

    render(
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

    const sunnyPreviewButton = screen.getByLabelText('试听 晴朗女声')
    const breezePreviewButton = screen.getByLabelText('试听 清风少年')

    fireEvent.click(sunnyPreviewButton)
    fireEvent.click(breezePreviewButton)

    await waitFor(() => {
      expect(audioInstances).toHaveLength(1)
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(breezePreviewButton.querySelector('rect')).toBeTruthy()
    expect(breezePreviewButton.querySelector('polygon')).toBeFalsy()
    expect(audioInstances[0].play).toHaveBeenCalled()
  })
})
