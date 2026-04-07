/**
 * PIN 码验证组件
 * 4 位数字 PIN，区分家长和孩子操作
 */

import { useState, useCallback } from 'react'

export interface PinVerificationProps {
  onVerify: (isCorrect: boolean) => void
  onCancel: () => void
  correctPin: string
}

export function PinVerification({ onVerify, onCancel, correctPin }: PinVerificationProps) {
  const [digits, setDigits] = useState<string[]>([])

  const handleDigit = useCallback(
    (digit: string) => {
      const newDigits = [...digits, digit]
      setDigits(newDigits)

      if (newDigits.length === 4) {
        const pin = newDigits.join('')
        onVerify(pin === correctPin)
        setDigits([])
      }
    },
    [digits, correctPin, onVerify],
  )

  const handleDelete = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1))
  }, [])

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
      <h2 style={{ fontSize: '22px', color: '#333' }}>请输入家长密码</h2>

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
