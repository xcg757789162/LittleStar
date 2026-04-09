/**
 * 应用根组件
 *
 * 认证流程：
 * 1. 初始化中 → 显示 loading
 * 2. 未登录 → 显示登录页（AuthPage）
 * 3. 已登录但无孩子 → 显示创建孩子页（CreateChildPage）
 * 4. 已登录且有孩子 → 正常路由（AppRoutes）
 */

import { AppRoutes } from '@/router'
import { useInitializeApp } from '@/hooks/useInitializeApp'
import { useAuthStore } from '@/stores/authStore'
import { useChildStore } from '@/stores/childStore'
import { AuthPage } from '@/pages/AuthPage'
import { CreateChildPage } from '@/pages/CreateChildPage'

export function App() {
  const { isInitialized } = useInitializeApp()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentChild = useChildStore((s) => s.currentChild)
  const children = useChildStore((s) => s.children)

  // 步骤 1：初始化中，显示 loading
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

  // 步骤 2：未登录，显示登录页
  if (!isAuthenticated) {
    return <AuthPage />
  }

  // 步骤 3：已登录但没有孩子，显示创建孩子引导页
  if (!currentChild && children.length === 0) {
    return <CreateChildPage />
  }

  // 步骤 4：正常渲染应用路由
  return (
    <div data-testid="app-root" style={{ minHeight: '100vh' }}>
      <AppRoutes />
    </div>
  )
}
