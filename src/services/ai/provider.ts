/**
 * AI Provider 抽象层
 * 定义统一的 AI 服务接口
 */

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** AI Provider 配置 */
export interface AIProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
  maxTokens?: number
  temperature?: number
}

/** AI Provider 抽象接口 */
export interface AIProvider {
  /** 对话补全 */
  chatCompletion(messages: ChatMessage[]): Promise<string>
}
