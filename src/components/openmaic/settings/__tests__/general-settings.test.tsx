import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GeneralSettings } from '../general-settings'
import type { ProvidersConfig } from '@/lib/openmaic/types/settings'

vi.mock('@/lib/openmaic/hooks/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'settings.currentModelPanelTitle': '当前使用模型',
        'settings.currentModelPanelDescription': '这里会显示课堂真正正在使用的模型，并允许你直接切换。',
        'settings.currentModelProvider': '服务商',
        'settings.currentModelId': '模型 ID',
        'settings.currentlyUsing': '当前使用',
        'settings.activeModel': '可用模型',
        'settings.activeModelDescription': '从下列模型中选择课堂要用的版本。',
        'settings.selectModel': '选择模型',
        'settings.modelSelectorHint': '点击模型卡片即可立即切换；带对勾的模型就是当前课堂真正使用的模型。',
      }
      return messages[key] ?? key
    },
  }),
}))

const providersConfig = {
  openai: {
    apiKey: 'sk-test',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
    name: 'OpenAI',
    type: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    isBuiltIn: true,
  },
} as unknown as ProvidersConfig

describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应展示当前模型信息并提供模型选择区', () => {
    render(
      <GeneralSettings
        activeProviderId="openai"
        activeModelId="gpt-4o-mini"
        currentProviderName="OpenAI"
        currentModelName="GPT-4o Mini"
        providersConfig={providersConfig}
        onModelChange={vi.fn()}
      />,
    )

    expect(screen.getByText('当前使用模型')).toBeInTheDocument()
    expect(screen.getAllByText('GPT-4o Mini').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0)
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('可用模型')).toBeInTheDocument()
  })
})
