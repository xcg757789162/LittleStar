import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProviderConfigPanel } from '../provider-config-panel'
import type { ProvidersConfig } from '@/lib/openmaic/types/settings'

vi.mock('@/lib/openmaic/hooks/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
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
        'settings.modelSelectorHint': '点击模型卡片即可立即切换；带对勾的模型就是当前课堂真正使用的模型。',
        'settings.noModelsAvailable': '暂无可用模型',
        'settings.connectionSuccess': '连接成功',
        'settings.connectionFailed': '连接失败',
        'settings.serverConfiguredNotice': '服务端已配置',
      }
      return (messages[key] ?? key)
        .replace('{{provider}}', String(options?.provider ?? ''))
        .replace('{{model}}', String(options?.model ?? ''))
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch
  })

  it('应允许点击未激活模型卡片以切换当前模型', async () => {
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
        activeProviderName="OpenAI"
        activeModelName="GPT-4o Mini"
        onSetActiveModel={onSetActiveModel}
        onConfigChange={vi.fn()}
        onSave={vi.fn()}
        onEditModel={vi.fn()}
        onDeleteModel={vi.fn()}
        onAddModel={vi.fn()}
        isBuiltIn={true}
      />,
    )

    expect(screen.getByText(/当前使用/)).toBeInTheDocument()

    await user.click(screen.getByText('GPT-4.1'))
    expect(onSetActiveModel).toHaveBeenCalledWith('gpt-4.1')
  })

  it('应在非当前服务商视角下仍展示模型列表', () => {
    render(
      <ProviderConfigPanel
        provider={provider}
        initialApiKey="sk-test"
        initialBaseUrl="https://api.openai.com/v1"
        initialRequiresApiKey={true}
        providersConfig={providersConfig}
        activeProviderId="anthropic"
        activeModelId="claude-3-7-sonnet"
        activeProviderName="Claude"
        activeModelName="Claude 3.7 Sonnet"
        onSetActiveModel={vi.fn()}
        onConfigChange={vi.fn()}
        onSave={vi.fn()}
        onEditModel={vi.fn()}
        onDeleteModel={vi.fn()}
        onAddModel={vi.fn()}
        isBuiltIn={true}
      />,
    )

    expect(screen.getByText('GPT-4o Mini')).toBeInTheDocument()
    expect(screen.getByText('模型列表')).toBeInTheDocument()
  })
})
