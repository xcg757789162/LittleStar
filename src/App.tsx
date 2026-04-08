/**
 * 应用根组件
 */

import { AppRoutes } from '@/router'
import { useInitializeApp } from '@/hooks/useInitializeApp'

export function App() {
  const { isInitialized } = useInitializeApp()

  if (!isInitialized) {
    return (
      <div
        data-testid="app-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
          gap: '16px',
        }}
      >
        <span style={{ fontSize: '60px' }}>⭐</span>
        <p style={{ fontSize: '20px', color: '#666', fontWeight: 'bold' }}>
          小星辰正在准备...
        </p>
      </div>
    )
  }

  return (
    <div data-testid="app-root" style={{ minHeight: '100vh' }}>
      <AppRoutes />
    </div>
  )
}
