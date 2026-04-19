import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderList } from '../provider-list'

vi.mock('@/lib/openmaic/hooks/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'settings.providerNames.openai': 'OpenAI',
        'settings.providerNames.anthropic': 'Claude',
        'settings.activeProviderStatus': '当前生效',
        'settings.viewingProvider': '正在查看',
        'settings.serverConfigured': '服务端',
        'settings.addProviderButton': '添加',
      }
      return messages[key] ?? key
    },
  }),
}))

describe('ProviderList', () => {
  it('应同时区分当前生效服务商和正在查看的服务商', () => {
    render(
      <ProviderList
        providers={[
          {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            requiresApiKey: true,
            models: [],
          },
          {
            id: 'anthropic',
            name: 'Claude',
            type: 'anthropic',
            requiresApiKey: true,
            models: [],
          },
        ]}
        selectedProviderId="openai"
        activeProviderId="anthropic"
        activeProviderName="Claude"
        activeModelName="Claude 3.7 Sonnet"
        onSelect={vi.fn()}
        onAddProvider={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Claude').length).toBeGreaterThan(0)
    expect(screen.getByText('当前生效')).toBeInTheDocument()
    expect(screen.getByText('正在查看')).toBeInTheDocument()
    expect(screen.getByText('添加')).toBeInTheDocument()
  })
})
