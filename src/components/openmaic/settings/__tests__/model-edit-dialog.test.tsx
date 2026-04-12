import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ModelEditDialog } from '../model-edit-dialog'

vi.mock('@/lib/openmaic/hooks/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'settings.addNewModel': '新增模型',
        'settings.editModel': '编辑模型',
        'settings.addNewModelDescription': '新增模型说明',
        'settings.editModelDescription': '编辑模型说明',
        'settings.modelId': '模型 ID',
        'settings.modelName': '模型名称',
        'settings.modelCapabilities': '模型能力',
        'settings.capabilities.vision': '视觉',
        'settings.capabilities.tools': '工具',
        'settings.capabilities.streaming': '流式输出',
        'settings.advancedSettings': '高级设置',
        'settings.contextWindowLabel': '上下文窗口',
        'settings.outputWindowLabel': '输出窗口',
        'settings.testModel': '测试模型',
        'settings.testConnection': '测试连接',
        'settings.cancelEdit': '取消',
        'settings.saveModel': '保存模型',
      }
      return messages[key] ?? key
    },
  }),
}))

describe('ModelEditDialog', () => {
  it('应提升模型编辑弹窗层级，避免被父级设置弹窗遮住', () => {
    render(
      <ModelEditDialog
        open={true}
        onOpenChange={vi.fn()}
        editingModel={{
          providerId: 'openai',
          modelIndex: 0,
          model: {
            id: 'gpt-4.1',
            name: 'GPT-4.1',
            capabilities: {
              vision: true,
              tools: true,
              streaming: true,
            },
          },
        }}
        setEditingModel={vi.fn()}
        onSave={vi.fn()}
        onAutoSave={vi.fn()}
        providerId={'openai'}
        apiKey={'sk-test'}
        baseUrl={'https://api.openai.com/v1'}
        providerType={'openai'}
        requiresApiKey={true}
        isServerConfigured={false}
      />,
    )

    const dialogContent = document.querySelector('[data-slot="dialog-content"]')
    expect(dialogContent).toHaveClass('z-[1201]')
  })
})
