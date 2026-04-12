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
        'settings.currentActiveSummary': '当前课堂使用',
        'settings.activeProviderStatus': '当前生效',
        'settings.viewingProvider': '正在查看',
        'settings.activeProviderManaged': '你正在管理当前生效的服务商，绿色标签代表课堂现在真正使用的模型。',
        'settings.providerSwitchHelper': '你正在查看这个服务商，但课堂当前仍在使用 {{provider}} / {{model}}。点击“设为当前模型”后才会切换。',
        'settings.selectModel': '选择模型',
        'settings.modelSelectorHint': '点击模型卡片即可立即切换；带对勾的模型就是当前课堂真正使用的模型。',
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

    expect(screen.getByText('当前使用')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '设为当前模型' }))
    expect(onSetActiveModel).toHaveBeenCalledWith('gpt-4.1')
  })

  it('应在配置面板顶部明确展示当前真正生效的模型状态', () => {
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

    expect(screen.getByText('当前课堂使用')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.7 Sonnet')).toBeInTheDocument()
    expect(screen.getByText('正在查看')).toBeInTheDocument()
    expect(screen.getByText('你正在查看这个服务商，但课堂当前仍在使用 Claude / Claude 3.7 Sonnet。点击“设为当前模型”后才会切换。')).toBeInTheDocument()
  })

  it('应提升重置确认框层级，避免被父级设置弹窗遮住', async () => {
    const user = userEvent.setup()

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
        onSetActiveModel={vi.fn()}
        onConfigChange={vi.fn()}
        onSave={vi.fn()}
        onEditModel={vi.fn()}
        onDeleteModel={vi.fn()}
        onAddModel={vi.fn()}
        onResetToDefault={vi.fn()}
        isBuiltIn={true}
      />,
    )

    await user.click(screen.getByRole('button', { name: '重置' }))

    const resetDialog = document.querySelector('[data-slot="alert-dialog-content"]')
    expect(resetDialog).toHaveClass('z-[1201]')
  })
})
