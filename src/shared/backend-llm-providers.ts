export interface BackendProviderDef {
  id: string
  label: string
  /** OpenMAIC 格式的 provider:model 前缀（如 'openai:' → 'openai:gpt-4o'） */
  providerPrefix: string
  /** 推荐的默认模型名称 */
  defaultModel: string
  /** 默认 Base URL（为空时使用 OpenMAIC 内置默认） */
  defaultBaseUrl: string
  /** 说明文字 */
  description?: string
}

/**
 * 供前端设置页与预生成服务端共用的后端 LLM 提供商注册表。
 *
 * 保持在独立共享模块中，避免服务端构建时拉入 `src/services/config.ts`
 * 里的浏览器专属实现（如 `localStorage` / `import.meta.env`）。
 */
export const BACKEND_LLM_PROVIDERS: BackendProviderDef[] = [
  {
    id: 'backend-qwen',
    label: '通义千问（Qwen）',
    providerPrefix: 'openai',
    defaultModel: 'qwen-plus',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: '阿里云 DashScope，通过 OpenAI 兼容接口调用',
  },
  {
    id: 'backend-openai',
    label: 'OpenAI',
    providerPrefix: 'openai',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'backend-deepseek',
    label: 'DeepSeek',
    providerPrefix: 'openai',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'backend-gemini',
    label: 'Google Gemini',
    providerPrefix: 'google',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: '',
    description: 'Google AI Studio，需填写 Google API Key',
  },
  {
    id: 'backend-doubao',
    label: '豆包（字节跳动）',
    providerPrefix: 'openai',
    defaultModel: 'doubao-pro-32k',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    description: '火山方舟 API，需使用 OpenAI 兼容格式',
  },
  {
    id: 'backend-custom',
    label: '自定义',
    providerPrefix: '',
    defaultModel: '',
    defaultBaseUrl: '',
    description: '手动输入 provider:model 格式的模型标识',
  },
]
