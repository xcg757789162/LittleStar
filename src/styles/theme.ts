/**
 * 主题配置
 */

export const theme = {
  colors: {
    primary: '#7C4DFF',
    primaryLight: '#B47CFF',
    primaryDark: '#5C35CC',
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
    background: '#F3E5F5',
    card: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    textHint: '#999999',
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
