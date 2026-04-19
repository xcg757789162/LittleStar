/**
 * CourseInitWatcher
 *
 * 全局监听：当前用户的课程列表中，只要有 status='initializing' 的课程，
 * 就用较短的 refetch 间隔轮询；检测到 initializing → ready / failed 的过渡时，
 * 在屏幕右下角弹出一个 toast 通知家长。
 *
 * 挂载在 AppLayout 里，始终活动（即使用户不在 /knowledge 页）。
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourses } from '@/hooks/queries/useCourses'
import type { Course } from '@/types/course'

type ToastKind = 'initializing' | 'ready' | 'failed'

interface ToastItem {
  id: string
  kind: ToastKind
  course: Course
  appearedAt: number
}

const TOAST_DURATION = 8000

export function CourseInitWatcher() {
  const navigate = useNavigate()
  const { data: courses } = useCourses({ includeDraft: false })
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const previousStatusRef = useRef<Map<number, Course['status']>>(new Map())

  // 检测状态转变。此处是「订阅外部系统（React Query 缓存）并据此派生 toast」
  // 的合法 effect 用法 —— lint 规则对批量 setState 的告警在此可忽略。
  useEffect(() => {
    if (!courses) return
    const prev = previousStatusRef.current
    const now = Date.now()
    const isFirstLoad = prev.size === 0
    const pending: ToastItem[] = []

    for (const c of courses) {
      const before = prev.get(c.id)
      prev.set(c.id, c.status)

      // 只关心这三种状态 —— 对应"开始烧制 / 烧好了 / 烧废了"三种 toast
      if (c.status !== 'ready' && c.status !== 'failed' && c.status !== 'initializing') continue
      if (c.isSystem) continue // 系统课不弹 toast

      let shouldToast = false
      if (isFirstLoad) {
        // 首次加载时若 updatedAt 在最近 90s 内才报（避免重启服务后对陈旧状态误报）
        // initializing 状态首次加载不重复报（用户正盯着进度条看，不需要再弹一次）
        const updated = new Date(c.updatedAt).getTime()
        shouldToast =
          c.status !== 'initializing' &&
          Number.isFinite(updated) &&
          now - updated <= 90_000
      } else if (c.status === 'initializing' && before !== 'initializing') {
        // draft / 未出现 / failed → initializing 都算"开始烧制"
        shouldToast = true
      } else if (
        (c.status === 'ready' || c.status === 'failed') &&
        before === 'initializing'
      ) {
        shouldToast = true
      }

      if (shouldToast) {
        pending.push({ id: `${c.id}-${c.status}-${c.updatedAt}`, kind: c.status as ToastKind, course: c, appearedAt: now })
      }
    }

    if (pending.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToasts((xs) => {
        const existingIds = new Set(xs.map((t) => t.id))
        const fresh = pending.filter((p) => !existingIds.has(p.id))
        return fresh.length > 0 ? [...xs, ...fresh] : xs
      })
    }
  }, [courses])

  // 自动消失
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((xs) => xs.filter((x) => x.id !== t.id))
      }, TOAST_DURATION - (Date.now() - t.appearedAt)),
    )
    return () => { timers.forEach(clearTimeout) }
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 84, // 给 BottomNav 留位
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 340,
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes ks-toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {toasts.map((t) => (
        <ToastCard
          key={t.id}
          toast={t}
          onDismiss={() => setToasts((xs) => xs.filter((x) => x.id !== t.id))}
          onOpen={() => {
            setToasts((xs) => xs.filter((x) => x.id !== t.id))
            // ready → 去首页开评测；initializing → 去知识页看进度条
            navigate(t.kind === 'initializing' ? '/knowledge' : '/')
          }}
        />
      ))}
    </div>
  )
}

function ToastCard({
  toast,
  onDismiss,
  onOpen,
}: {
  toast: ToastItem
  onDismiss: () => void
  onOpen: () => void
}) {
  // 三种状态对应三套调色板：
  //   initializing — 冷色 / 蓝紫渐变，带旋转小火苗，暗示"正在进行中"
  //   ready        — 暖色 / 琥珀金黄，胜利感
  //   failed       — 珊瑚粉红，警示但不刺眼
  const palette = (() => {
    switch (toast.kind) {
      case 'initializing':
        return {
          bg: 'linear-gradient(135deg, #EEF3FF 0%, #D6E2FF 100%)',
          border: '#7A8DE0',
          accent: '#4A5BB0',
          icon: '🔥',
          iconAnim: 'ks-toast-pulse 1.8s ease-in-out infinite',
          title: '开始烧制新课程',
          body: '大概 2-5 分钟，你可以去忙别的，烧好我会再喊你。',
          showOpenBtn: true,
          openLabel: '看看进度 →',
        }
      case 'ready':
        return {
          bg: 'linear-gradient(135deg, #FFF8E7 0%, #FFE7A8 100%)',
          border: '#F4C054',
          accent: '#C68E2C',
          icon: '✨',
          iconAnim: 'ks-toast-sparkle 1.6s ease-in-out infinite',
          title: '课程已准备好',
          body: '大纲和入学测评题已烧制完毕，快去首页开始评测吧。',
          showOpenBtn: true,
          openLabel: '去首页 →',
        }
      case 'failed':
      default:
        return {
          bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFD3D9 100%)',
          border: '#E27D89',
          accent: '#C44D4D',
          icon: '⚠️',
          iconAnim: '',
          title: '课程初始化失败',
          body: (toast.course.initError || '请前往知识页重试').slice(0, 100),
          showOpenBtn: false,
          openLabel: '',
        }
    }
  })()

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 14px 14px 16px',
        borderRadius: 14,
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
        animation: 'ks-toast-in 0.35s ease both',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <style>{`
        @keyframes ks-toast-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%      { transform: scale(1.12); opacity: 1; }
        }
        @keyframes ks-toast-sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50%      { transform: rotate(12deg) scale(1.08); }
        }
      `}</style>
      <div style={{
        fontSize: 26, lineHeight: 1, flexShrink: 0,
        marginTop: 2,
        animation: palette.iconAnim || undefined,
        transformOrigin: 'center',
      }}>
        {palette.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 800,
          color: palette.accent,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          {palette.title}
        </div>
        <div style={{
          marginTop: 4,
          fontSize: 15,
          fontWeight: 700,
          color: '#2a1b3d',
          wordBreak: 'break-word',
          lineHeight: 1.4,
        }}>
          《{toast.course.name}》
        </div>
        <div style={{
          marginTop: 4,
          fontSize: 13,
          color: '#5a4a73',
          lineHeight: 1.5,
        }}>
          {palette.body}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {palette.showOpenBtn && (
            <button
              onClick={onOpen}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: palette.accent,
                color: '#FFF8E7',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {palette.openLabel}
            </button>
          )}
          <button
            onClick={onDismiss}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              background: 'transparent',
              color: palette.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
