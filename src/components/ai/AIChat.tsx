/**
 * AI 对话界面组件
 * 气泡式对话，AI 老师头像，幼儿友好 UI
 */

import { motion } from 'framer-motion'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface AIChatProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isLoading: boolean
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === 'assistant'

  return (
    <div
      data-role={message.role}
      style={{
        display: 'flex',
        flexDirection: isAI ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '12px',
      }}
    >
      {isAI && (
        <div
          data-testid="ai-avatar"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#FFD54F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          ⭐
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '75%',
          padding: '12px 16px',
          borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          backgroundColor: isAI ? '#FFF8E1' : '#E3F2FD',
          color: '#333',
          fontSize: '16px',
          lineHeight: 1.5,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        {message.content}
      </motion.div>
    </div>
  )
}

export function AIChat({ messages, isLoading }: AIChatProps) {
  return (
    <div
      data-testid="chat-container"
      style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        padding: '16px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}
    >
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div
          data-testid="chat-loading"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
          }}
        >
          <div
            data-testid="ai-avatar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FFD54F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ⭐
          </div>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              padding: '12px 16px',
              borderRadius: '4px 16px 16px 16px',
              backgroundColor: '#FFF8E1',
              fontSize: '16px',
              color: '#999',
            }}
          >
            小星老师正在想...
          </motion.div>
        </div>
      )}
    </div>
  )
}
