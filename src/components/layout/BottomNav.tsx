/**
 * 底部导航栏
 *
 * 4 个普通 Tab + 中央凸起的"知识"按钮（无文字，深夜星空粒子光环）：
 *   首页 · 复习 · [ ] · 课堂 · 家长
 *
 * 🎨 Sunny Playground 暖色 dock + 中央"知识星云"（深夜星空 · 旋转星环 · 闪烁星辰）
 * 原先的"星空"入口（/starmap）已下线 —— 首页已完整承担学科掌握度展示，
 * 星空页只能展示写死的三门课，与热拔插课程体系冲突。
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

/**
 * 知识星云 — 深夜星空图标
 * ─────────────────────────────────────────────
 *  深靛蓝 → 午夜紫 → 墨黑 的球面渐变 ·
 *  两条倾斜的银河星环（带流动的星辰粒子）·
 *  中心一颗白炽超新星 + 蓝紫光晕 ·
 *  背景散落的闪烁小星（不同节律）
 *
 *  active 态（正停留在 /knowledge）会略亮一档，
 *  给中央脉冲增加紫白冷光。
 */
function KnowledgeOrbIcon({ size = 32, active = false }: { size?: number; active?: boolean }) {
  const starBright = active ? '#FFFFFF' : '#F4EEFF'
  const starDim = active ? '#E9D7FF' : '#BBA9E8'
  const ringColor = active ? 'rgba(200, 180, 255, 0.85)' : 'rgba(170, 150, 230, 0.65)'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 深夜球面：中心略亮，边缘沉入墨黑 */}
        <radialGradient id="ls-night-sphere" cx="42%" cy="38%" r="70%">
          <stop offset="0%"  stopColor="#3B2C7A" />
          <stop offset="45%" stopColor="#1E1B48" />
          <stop offset="100%" stopColor="#0A0720" />
        </radialGradient>
        {/* 超新星白炽芯 */}
        <radialGradient id="ls-supernova" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="35%" stopColor="#E0D4FF" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#7C6CE8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7C6CE8" stopOpacity="0" />
        </radialGradient>
        {/* 外层紫蓝光晕 */}
        <radialGradient id="ls-night-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#9B8BFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#9B8BFF" stopOpacity="0" />
        </radialGradient>
        <filter id="ls-star-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>

      {/* 深夜球面底 + 紫蓝光晕 */}
      <circle cx="24" cy="24" r="22" fill="url(#ls-night-halo)" />
      <circle cx="24" cy="24" r="20" fill="url(#ls-night-sphere)" />

      {/* 背景散落的星辰 —— 不同节律闪烁，营造"深夜凝视"感 */}
      <g filter="url(#ls-star-blur)">
        <circle cx="11" cy="15" r="0.7" fill={starBright}>
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="37" cy="13" r="0.55" fill={starDim}>
          <animate attributeName="opacity" values="1;0.25;1" dur="2.0s" repeatCount="indefinite" />
        </circle>
        <circle cx="14" cy="33" r="0.5" fill={starBright}>
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3.1s" repeatCount="indefinite" />
        </circle>
        <circle cx="36" cy="35" r="0.65" fill={starBright}>
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.7s" repeatCount="indefinite" />
        </circle>
        <circle cx="32" cy="10" r="0.45" fill={starDim}>
          <animate attributeName="opacity" values="0.2;0.75;0.2" dur="2.3s" repeatCount="indefinite" />
        </circle>
        <circle cx="8"  cy="24" r="0.5" fill={starDim}>
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.9s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* 银河星环 #1（顺时针慢转，环上有一颗游动亮星） */}
      <g style={{ transformOrigin: '24px 24px', animation: 'ls-orb-spin 9s linear infinite' }}>
        <ellipse
          cx="24" cy="24" rx="17.5" ry="6.5"
          stroke={ringColor} strokeWidth="1.1"
          fill="none"
          transform="rotate(22 24 24)"
          opacity="0.9"
          strokeDasharray="1.2 2.5"
        />
        <circle cx="41.5" cy="24" r="1.6" fill={starBright} transform="rotate(22 24 24)">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* 银河星环 #2（反向慢转 + 另一颗游动亮星） */}
      <g style={{ transformOrigin: '24px 24px', animation: 'ls-orb-spin-rev 7s linear infinite' }}>
        <ellipse
          cx="24" cy="24" rx="17.5" ry="6.5"
          stroke={ringColor} strokeWidth="1.1"
          fill="none"
          transform="rotate(-28 24 24)"
          opacity="0.78"
          strokeDasharray="0.8 2.2"
        />
        <circle cx="6.5" cy="24" r="1.4" fill={starBright} transform="rotate(-28 24 24)">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.35s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* 中央超新星（外扩 halo + 白炽芯 + 十字光辉） */}
      <circle cx="24" cy="24" r="8.5" fill="url(#ls-supernova)" opacity="0.95" />
      <circle cx="24" cy="24" r="2.4" fill="#FFFFFF">
        <animate attributeName="r" values="2.2;2.8;2.2" dur="2.6s" repeatCount="indefinite" />
      </circle>
      {/* 十字星芒（缓慢呼吸） */}
      <g opacity="0.9" style={{ transformOrigin: '24px 24px', animation: 'ls-orb-twinkle 3s ease-in-out infinite' }}>
        <path d="M24 16 L24 32" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" opacity="0.8" />
        <path d="M16 24 L32 24" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" opacity="0.8" />
      </g>
    </svg>
  )
}

function ClassroomIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
    </svg>
  )
}

/* ====== 导航项配置 ====== */

interface NavItem {
  key: string
  label: string
  icon: (size: number, color: string) => React.JSX.Element
  path: string
}

const LEFT_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', icon: (s, c) => <HomeIcon size={s} color={c} />, path: '/' },
  { key: 'history', label: '复习', icon: (s, c) => <BookOpenIcon size={s} color={c} />, path: '/history' },
]

const RIGHT_ITEMS: NavItem[] = [
  { key: 'classroom-settings', label: '课堂', icon: (s, c) => <ClassroomIcon size={s} color={c} />, path: '/classroom-settings' },
  { key: 'parent', label: '家长', icon: (s, c) => <UsersIcon size={s} color={c} />, path: '/parent' },
]

const KNOWLEDGE_PATH = '/knowledge'

/* ====== 设计 Token ====== */
const COLORS = {
  active: '#FF8C42',
  activeBg: 'rgba(255, 140, 66, 0.12)',
  inactive: '#B8A088',
  bg: 'rgba(255, 252, 245, 0.88)',
  border: 'rgba(255, 200, 150, 0.3)',
  // 中央"深夜星空"配色 —— 与暖色 dock 形成冷/暖对比
  // 深靛蓝 → 午夜紫 → 墨黑 → 再压一层紫罗兰的球面感
  centerBg: 'radial-gradient(circle at 35% 30%, #4A3B9A 0%, #241C5E 40%, #0E0A28 100%)',
  centerGlow: 'rgba(139, 120, 255, 0.55)',
  centerActiveGlow: 'rgba(186, 160, 255, 0.75)',
  centerBorder: 'rgba(255, 252, 245, 0.92)',
}

function TabButton({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      data-testid={`nav-item-${item.key}`}
      data-active={isActive ? 'true' : 'false'}
      onClick={onClick}
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
        minWidth: '48px',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
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
      }}>
        {item.label}
      </span>
    </button>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const isKnowledgeActive = isActive(KNOWLEDGE_PATH)

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
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* 星环旋转 + 中央十字星芒呼吸 + 深夜脉冲光环 */}
      <style>{`
        @keyframes ls-orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ls-orb-spin-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes ls-orb-twinkle {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @keyframes ls-orb-pulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 6px 20px ${COLORS.centerGlow}, 0 0 0 0 ${COLORS.centerGlow}; }
          50%      { transform: scale(1.05); box-shadow: 0 10px 28px ${COLORS.centerGlow}, 0 0 0 12px rgba(139,120,255,0); }
        }
        @keyframes ls-orb-pulse-active {
          0%, 100% { transform: scale(1.05); box-shadow: 0 10px 26px ${COLORS.centerActiveGlow}, 0 0 0 0 ${COLORS.centerActiveGlow}; }
          50%      { transform: scale(1.12); box-shadow: 0 14px 34px ${COLORS.centerActiveGlow}, 0 0 0 16px rgba(186,160,255,0); }
        }
      `}</style>

      {/* 左 2 */}
      {LEFT_ITEMS.map((item) => (
        <TabButton
          key={item.key}
          item={item}
          isActive={isActive(item.path)}
          onClick={() => navigate(item.path)}
        />
      ))}

      {/* 中央凸起：知识星核（无文字，科幻粒子光环） */}
      <button
        data-testid="nav-item-knowledge"
        data-active={isKnowledgeActive ? 'true' : 'false'}
        onClick={() => navigate(KNOWLEDGE_PATH)}
        aria-label="知识 — 创建新课程"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          position: 'relative',
          height: '64px',
          minWidth: '60px',
        }}
      >
        {/* 凸起圆形按钮，上浮 18px */}
        <div
          style={{
            position: 'absolute',
            top: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: COLORS.centerBg,
            border: `4px solid ${COLORS.centerBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isKnowledgeActive
              ? 'ls-orb-pulse-active 2.2s ease-in-out infinite'
              : 'ls-orb-pulse 3s ease-in-out infinite',
            willChange: 'transform, box-shadow',
          }}
        >
          <KnowledgeOrbIcon size={34} active={isKnowledgeActive} />
        </div>
      </button>

      {/* 右 2 */}
      {RIGHT_ITEMS.map((item) => (
        <TabButton
          key={item.key}
          item={item}
          isActive={isActive(item.path)}
          onClick={() => navigate(item.path)}
        />
      ))}
    </nav>
  )
}
