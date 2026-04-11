/**
 * 应用全局布局
 * 渲染子组件 + 条件渲染底部导航栏
 * 课堂页面 (/classroom)、预览页面 (/preview) 隐藏底部导航
 */

import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/** 需要隐藏底部导航的路径（精确匹配或路径段前缀匹配） */
const HIDDEN_NAV_PATHS = ['/classroom', '/preview']

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  // 使用精确匹配或路径段前缀匹配（/classroom 匹配 /classroom 和 /classroom/xxx，但不匹配 /classroom-settings）
  const hideNav = HIDDEN_NAV_PATHS.some((p) =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: hideNav ? 0 : '64px' }}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  )
}
