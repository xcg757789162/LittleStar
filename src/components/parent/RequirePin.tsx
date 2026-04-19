/**
 * 敏感家长页 PIN 门：验证通过后 sessionStorage 解锁 10 分钟。
 */

import { useState, useCallback } from 'react'
import { PinVerification } from '@/components/parent/PinVerification'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/services/api'

const STORAGE_KEY = 'littlestar_parent_pin_unlock_until'
const TTL_MS = 10 * 60 * 1000

export function isParentPinUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const until = parseInt(raw, 10)
    return Number.isFinite(until) && Date.now() < until
  } catch {
    return false
  }
}

/** 标记本设备已验证家长 PIN（与 RequirePin 内验证成功一致，供敏感按钮复用） */
export function markParentPinUnlocked(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now() + TTL_MS))
  } catch {
    /* ignore */
  }
}

export interface RequirePinProps {
  title?: string
  children: React.ReactNode
}

/**
 * 包裹需要 PIN 的页面：未解锁时展示 PinVerification；已解锁或 session 仍有效则展示子内容。
 */
export function RequirePin({ title = '家长 PIN', children }: RequirePinProps) {
  const user = useAuthStore((s) => s.user)
  const savedPin = user?.parentPin ?? ''
  const [unlocked, setUnlocked] = useState(() => isParentPinUnlocked())

  const handleVerify = useCallback((ok: boolean) => {
    if (ok) {
      markParentPinUnlocked()
      setUnlocked(true)
    }
  }, [])

  const handleSetPin = useCallback(
    async (pin: string) => {
      try {
        if (user?.id) {
          await apiClient.patch('/users', { parentPin: pin }, {
            filters: [{ column: 'id', operator: 'eq', value: user.id }],
          })
        }
        useAuthStore.setState((state) => ({
          user: state.user ? { ...state.user, parentPin: pin } : null,
        }))
      } catch {
        try {
          localStorage.setItem('littlestar_parent_pin_fallback', pin)
        } catch {
          /* ignore */
        }
      }
      markParentPinUnlocked()
      setUnlocked(true)
    },
    [user?.id],
  )

  if (unlocked) return <>{children}</>

  return (
    <div style={{ padding: '20px 16px', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16, fontWeight: 700 }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#5E6577', marginBottom: 20 }}>
        为保护孩子信息与 AI 配置，请先验证家长 PIN。验证成功后本设备约 10 分钟内无需重复输入。
      </p>
      <PinVerification
        correctPin={savedPin}
        mode={savedPin ? 'verify' : 'setup'}
        onVerify={handleVerify}
        onCancel={() => {
          window.history.back()
        }}
        onSetPin={handleSetPin}
        maxAttempts={5}
      />
    </div>
  )
}
