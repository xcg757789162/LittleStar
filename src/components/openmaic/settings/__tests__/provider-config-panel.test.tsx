import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProviderConfigPanel } from '../provider-config-panel'
import type { ProvidersConfig } from '@/lib/openmaic/types/settings'

vi.mock('@/lib/openmaic/hooks/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'settings.apiSecret': 'API 密钥',
        'settings.optionalOverride': '可选覆盖',
        'settings.testConnection': '测试连接',
        'settings.requiresApiKey': '需要 API Key',
        'settings.apiHost': 'API 地址',
        'settings.requestUrl': '请求地址',
        'settings.models': '模型列表',
        'settings.reset': '重置',
        'settings.addNewModel': '新建模型',
        'settings.modelsManagementDescription': '管理当前提供商的模型列表。',
        'settings.editModel': '编辑模型',
        'settings.deleteModel': '删除模型',
        'settings.capabilities.vision': '视觉',
        'settings.capabilities.tools': '工具',
        'settings.capabilities.streaming': '流式输出',
        'settings.setAsActiveModel': '设为当前模型',
        'settings.currentlyUsing': '当前使用',
      }
      return messages[key] ?? key
    },
  }),
}))

describe('ProviderConfigPanel', () => {
  const provider = {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
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
  }

  const providersConfig = {
    openai: {
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      models: provider.models,
      name: 'OpenAI',
      type: 'openai',
      defaultBaseUrl: 'https://api.openai.com/v1',
      requiresApiKey: true,
      isBuiltIn: true,
    },
  } as unknown as ProvidersConfig

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应允许把列表中的模型设为当前使用模型', async () => {
    const user = userEvent.setup()
    const onSetActiveModel = vi.fn()

    render(
      <ProviderConfigPanel
        provider={provider}
        initialApiKey="sk-test"
        initialBaseUrl="https://api.openai.com/v1"
        initialRequiresApiKey={true}
        providersConfig={providersConfig}
        activeProviderId="openai"
        activeModelId="gpt-4o-mini"
        onSetActiveModel={onSetActiveModel}
        onConfigChange={vi.fn()}
        onSave={vi.fn()}
        onEditModel={vi.fn()}
        onDeleteModel={vi.fn()}
        onAddModel={vi.fn()}
        isBuiltIn={true}
      />,
    )

    expect(screen.getByText('当前使用')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '设为当前模型' }))
    expect(onSetActiveModel).toHaveBeenCalledWith('gpt-4.1')
  })
})
