/**
 * 主题配置 — Sunny Playground 🌤️ 星辰乐园风格
 *
 * 暖色调设计系统：sunOrange 为主色，candyPink 为辅色
 * 配色灵感来自温暖阳光游乐场，适合 2-8 岁幼儿
 */

export const theme = {
  colors: {
    /** 主色 — 暖橙（原 #7C4DFF 紫色） */
    primary: '#FF8C42',
    primaryLight: '#FFB074',
    primaryDark: '#E07030',
    /** 辅助色 */
    candyPink: '#FF6B8A',
    grassGreen: '#2EC4B6',
    skyBlue: '#5BC0EB',
    starGold: '#FFD166',
    /** 科目配色 */
    math: '#FF8C42',
    chinese: '#2EC4B6',
    english: '#5BC0EB',
    /** 状态色 */
    success: '#2EC4B6',
    warning: '#FFD166',
    error: '#FF6B8A',
    /** 背景 */
    background: '#FFF8E7',
    backgroundGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
    card: 'rgba(255, 255, 255, 0.85)',
    cardSolid: '#FFFFFF',
    /** 文字 */
    text: '#5A4A3A',
    textSecondary: '#8B7B6B',
    textHint: '#B8A088',
    textWhite: '#FFFFFF',
  },
  fonts: {
    display: "'Baloo 2', 'Nunito', sans-serif",
    body: "'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
} as const

export type Theme = typeof theme
