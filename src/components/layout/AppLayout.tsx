/**
 * 应用全局布局
 * 渲染子组件 + 条件渲染底部导航栏
 * 学习页面 (/learn) 隐藏底部导航
 */

import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/** 需要隐藏底部导航的路径前缀 */
const HIDDEN_NAV_PATHS = ['/learn']

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const hideNav = HIDDEN_NAV_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <div style={{ minHeight: '100vh', paddingBottom: hideNav ? 0 : '64px' }}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  )
}
