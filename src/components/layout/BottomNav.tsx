/**
 * 底部导航栏
 * 三个导航项：首页、星空、家长
 * 高亮当前路由，固定在底部
 */

import { useNavigate, useLocation } from 'react-router-dom'

interface NavItem {
  key: string
  label: string
  icon: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', icon: '🏠', path: '/' },
  { key: 'starmap', label: '星空', icon: '⭐', path: '/starmap' },
  { key: 'parent', label: '家长', icon: '👨‍👩‍👧', path: '/parent' },
]

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
        height: '56px',
        backgroundColor: '#fff',
        borderTop: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path
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
              gap: '2px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: '4px 0',
              color: isActive ? '#5C6BC0' : '#999',
              fontWeight: isActive ? 'bold' : 'normal',
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
