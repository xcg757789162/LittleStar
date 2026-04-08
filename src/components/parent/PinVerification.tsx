/**
 * PIN 码验证组件
 * 4 位数字 PIN，区分家长和孩子操作
 * 支持验证模式和设置模式（首次使用时二次确认）
 */

import { useReducer, useCallback, useEffect } from 'react'

export interface PinVerificationProps {
  onVerify: (isCorrect: boolean) => void
  onCancel: () => void
  correctPin: string
  /** 模式：verify（验证已有 PIN）或 setup（首次设置 PIN） */
  mode?: 'verify' | 'setup'
  /** 最大尝试次数（超过后锁定） */
  maxAttempts?: number
  /** 设置完成时回传新 PIN */
  onSetPin?: (pin: string) => void
}

/** PinVerification 内部状态 */
interface PinState {
  digits: string[]
  attempts: number
  isLocked: boolean
  error: string
  setupPhase: 'first' | 'confirm'
  firstPin: string
}

type PinAction =
  | { type: 'ADD_DIGIT'; digit: string }
  | { type: 'DELETE_DIGIT' }
  | { type: 'SETUP_FIRST_DONE'; pin: string }
  | { type: 'SETUP_MISMATCH' }
  | { type: 'VERIFY_FAIL'; locked: boolean }
  | { type: 'RESET_DIGITS' }
  | { type: 'UNLOCK' }

const initialState: PinState = {
  digits: [],
  attempts: 0,
  isLocked: false,
  error: '',
  setupPhase: 'first',
  firstPin: '',
}

function pinReducer(state: PinState, action: PinAction): PinState {
  switch (action.type) {
    case 'ADD_DIGIT':
      if (state.isLocked) return state
      return { ...state, digits: [...state.digits, action.digit], error: '' }
    case 'DELETE_DIGIT':
      if (state.isLocked) return state
      return { ...state, digits: state.digits.slice(0, -1) }
    case 'SETUP_FIRST_DONE':
      return { ...state, firstPin: action.pin, setupPhase: 'confirm', digits: [] }
    case 'SETUP_MISMATCH':
      return {
        ...state,
        error: '两次输入不一致，请重新设置',
        setupPhase: 'first',
        firstPin: '',
        digits: [],
      }
    case 'VERIFY_FAIL':
      return {
        ...state,
        attempts: state.attempts + 1,
        isLocked: action.locked,
        error: action.locked ? '' : '密码错误，请重试',
        digits: [],
      }
    case 'RESET_DIGITS':
      return { ...state, digits: [] }
    case 'UNLOCK':
      return { ...state, isLocked: false, attempts: 0, error: '', digits: [] }
    default:
      return state
  }
}

/** 根据模式和状态获取标题文字 */
function getTitle(mode: 'verify' | 'setup', isLocked: boolean, setupPhase: 'first' | 'confirm'): string {
  if (isLocked) return '已锁定，请稍后再试'
  if (mode === 'setup') {
    return setupPhase === 'first' ? '请设置家长密码' : '请再次输入确认密码'
  }
  return '请输入家长密码'
}

export function PinVerification({
  onVerify,
  onCancel,
  correctPin,
  mode = 'verify',
  maxAttempts,
  onSetPin,
}: PinVerificationProps) {
  const [state, dispatch] = useReducer(pinReducer, initialState)
  const { digits, isLocked, error, setupPhase } = state

  // M3: 锁定后 30 秒自动解锁
  useEffect(() => {
    if (!isLocked) return
    const timer = setTimeout(() => dispatch({ type: 'UNLOCK' }), 30000)
    return () => clearTimeout(timer)
  }, [isLocked])

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLocked) return

      const newDigits = [...digits, digit]
      dispatch({ type: 'ADD_DIGIT', digit })

      if (newDigits.length === 4) {
        const pin = newDigits.join('')

        if (mode === 'setup') {
          if (setupPhase === 'first') {
            dispatch({ type: 'SETUP_FIRST_DONE', pin })
          } else {
            if (pin === state.firstPin) {
              onSetPin?.(pin)
              onVerify(true)
            } else {
              dispatch({ type: 'SETUP_MISMATCH' })
            }
          }
        } else {
          // 验证模式
          const isCorrect = pin === correctPin
          if (isCorrect) {
            onVerify(true)
            dispatch({ type: 'RESET_DIGITS' })
          } else {
            const newAttempts = state.attempts + 1
            const shouldLock = !!maxAttempts && newAttempts >= maxAttempts
            dispatch({ type: 'VERIFY_FAIL', locked: shouldLock })
            onVerify(false)
          }
        }
      }
    },
    [digits, correctPin, onVerify, mode, setupPhase, state.firstPin, state.attempts, maxAttempts, isLocked, onSetPin],
  )

  const handleDelete = useCallback(() => {
    dispatch({ type: 'DELETE_DIGIT' })
  }, [])

  const title = getTitle(mode, isLocked, setupPhase)

  return (
    <div
      data-testid="pin-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px',
        gap: '24px',
      }}
    >
      <h2 style={{ fontSize: '22px', color: '#333' }}>{title}</h2>

      {/* 错误提示 */}
      {error && (
        <p
          data-testid="pin-error"
          style={{ fontSize: '14px', color: '#F44336', margin: 0 }}
        >
          {error}
        </p>
      )}

      {/* 锁定提示 */}
      {isLocked && (
        <div
          data-testid="pin-locked"
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFEBEE',
            color: '#D32F2F',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          密码输入错误次数过多，已锁定
        </div>
      )}

      {/* PIN 显示 */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid="pin-dot"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              border: '2px solid #BDBDBD',
              backgroundColor: digits[i] ? '#7C4DFF' : '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {digits[i] && (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 数字键盘 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          maxWidth: '240px',
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#F5F5F5',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={handleDelete}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#FFF3E0',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ⌫
        </button>
        <button
          onClick={() => handleDigit('0')}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#F5F5F5',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          0
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#FFCDD2',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
