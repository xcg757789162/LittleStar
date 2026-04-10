/**
 * 底部导航栏
 * 四个导航项：首页、复习、星空、家长
 * 高亮当前路由，固定在底部
 *
 * 设计：Clay 风格 — 毛玻璃背景、SVG 图标、圆润高亮指示器
 */

import { useNavigate, useLocation } from 'react-router-dom'

/* ====== SVG 图标组件 ====== */

function HomeIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BookOpenIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function StarIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function UsersIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

/* ====== 导航项配置 ====== */

interface NavItem {
  key: string
  label: string
  icon: (size: number, color: string) => JSX.Element
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', icon: (s, c) => <HomeIcon size={s} color={c} />, path: '/' },
  { key: 'history', label: '复习', icon: (s, c) => <BookOpenIcon size={s} color={c} />, path: '/history' },
  { key: 'starmap', label: '星空', icon: (s, c) => <StarIcon size={s} color={c} />, path: '/starmap' },
  { key: 'parent', label: '家长', icon: (s, c) => <UsersIcon size={s} color={c} />, path: '/parent' },
]

/* ====== 设计 Token ====== */
const COLORS = {
  active: '#6C5CE7',
  activeBg: 'rgba(108, 92, 231, 0.1)',
  inactive: '#94A3B8',
  bg: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(226, 232, 240, 0.6)',
}

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      data-testid="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: COLORS.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
        padding: '0 8px',
        /* safe area for iOS */
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)

        return (
          <button
            key={item.key}
            data-testid={`nav-item-${item.key}`}
            data-active={isActive ? 'true' : 'false'}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              transition: 'color 0.2s ease',
              color: isActive ? COLORS.active : COLORS.inactive,
              minHeight: '48px',
              /* 最小触摸目标 44px */
              minWidth: '48px',
            }}
          >
            {/* 活跃状态背景指示器 */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: '4px',
                width: '48px',
                height: '32px',
                borderRadius: '12px',
                backgroundColor: COLORS.activeBg,
                transition: 'all 0.2s ease',
              }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
              {item.icon(22, isActive ? COLORS.active : COLORS.inactive)}
            </div>
            <span style={{
              position: 'relative',
              zIndex: 1,
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
              transition: 'font-weight 0.2s ease',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
