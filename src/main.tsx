import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { App } from './App'
import './styles/global.css'

/**
 * 全局 ErrorBoundary — 捕获 React 渲染树中的未处理错误
 * 防止白屏：显示友好的错误提示 + 重试按钮
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LittleStar ErrorBoundary]', error.message, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
          fontFamily: "'Nunito', 'PingFang SC', sans-serif", gap: '16px', padding: '24px',
        }}>
          <span style={{ fontSize: '60px' }}>😢</span>
          <h2 style={{ fontSize: '22px', color: '#2D3142', fontWeight: 'bold', margin: 0 }}>
            哎呀，出了点小问题
          </h2>
          <p style={{ fontSize: '14px', color: '#5E6577', textAlign: 'center', maxWidth: '400px', margin: 0 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{
              padding: '12px 32px', borderRadius: '22px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #FF8C42, #FF6B9D)', color: '#fff',
              fontSize: '16px', fontWeight: 'bold', marginTop: '8px',
            }}
          >
            🔄 重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
