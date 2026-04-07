/**
 * 应用根组件
 */

import { AppRoutes } from '@/router'

export function App() {
  return (
    <div data-testid="app-root" style={{ minHeight: '100vh' }}>
      <AppRoutes />
    </div>
  )
}
