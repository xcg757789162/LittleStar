import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
        'settings.selectModel': '选择模型',
        'settings.manualAddModel': '手动添加模型',
        'settings.manageProviders': '管理服务商',
        'settings.dangerZone': '危险操作',
        'settings.clearCache': '清除缓存',
        'settings.clearCacheDescription': '清除本地缓存并重新加载页面。',
        'settings.clearCacheConfirmPhrase': '确认清除',
        'settings.clearCacheConfirmItems': '缓存、会话',
        'settings.clearCacheConfirmTitle': '确认清除缓存',
        'settings.clearCacheConfirmDescription': '此操作将移除本地数据。',
        'settings.clearCacheConfirmInput': '请输入确认短语',
        'settings.clearCacheButton': '确认清除',
        'common.cancel': '取消',
        'settings.configureProvidersFirst': '请先配置提供商',
        'settings.modelCount': '个模型',
        'settings.modelSingular': '个模型',
        'settings.searchModels': '搜索模型',
        'settings.noModelsFound': '未找到匹配模型',
        'settings.noModelsAvailable': '暂无可用模型',
        'settings.connectionSuccess': '连接成功',
        'settings.connectionFailed': '连接失败',
        'settings.apiKeyRequired': '请先配置 API Key',
        'settings.serverConfigured': '服务端',
      }
      return messages[key] ?? key
    },
  }),
}))

vi.mock('@/lib/openmaic/utils/database', () => ({
  clearDatabase: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

  it('应展示当前模型信息并提供手动添加入口', async () => {
    const user = userEvent.setup()
    const onManualAddModel = vi.fn()
    const onOpenProviderManager = vi.fn()

    render(
      <GeneralSettings
        activeProviderId="openai"
        activeModelId="gpt-4o-mini"
        currentProviderName="OpenAI"
        currentModelName="GPT-4o Mini"
        providersConfig={providersConfig}
        onModelChange={vi.fn()}
        onManualAddModel={onManualAddModel}
        onOpenProviderManager={onOpenProviderManager}
      />,
    )

    expect(screen.getByText('当前使用模型')).toBeInTheDocument()
    expect(screen.getAllByText('GPT-4o Mini').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0)
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '手动添加模型' }))
    expect(onManualAddModel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '管理服务商' }))
    expect(onOpenProviderManager).toHaveBeenCalledTimes(1)
  })
})
