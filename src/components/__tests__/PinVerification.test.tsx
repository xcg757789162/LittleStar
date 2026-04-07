import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PinVerification } from '../parent/PinVerification'

describe('PinVerification', () => {
  const defaultProps = {
    onVerify: vi.fn(),
    onCancel: vi.fn(),
    correctPin: '1234',
  }

  it('应渲染 PIN 输入界面', () => {
    render(<PinVerification {...defaultProps} />)
    expect(screen.getByTestId('pin-container')).toBeInTheDocument()
  })

  it('应显示 4 个输入位', () => {
    render(<PinVerification {...defaultProps} />)
    const dots = screen.getAllByTestId('pin-dot')
    expect(dots.length).toBe(4)
  })

  it('应有数字键盘', () => {
    render(<PinVerification {...defaultProps} />)
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('输入正确 PIN 应触发 onVerify(true)', () => {
    const onVerify = vi.fn()
    render(<PinVerification {...defaultProps} onVerify={onVerify} />)
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    expect(onVerify).toHaveBeenCalledWith(true)
  })

  it('输入错误 PIN 应触发 onVerify(false)', () => {
    const onVerify = vi.fn()
    render(<PinVerification {...defaultProps} onVerify={onVerify} />)
    '0000'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    expect(onVerify).toHaveBeenCalledWith(false)
  })

  it('应有取消按钮', () => {
    render(<PinVerification {...defaultProps} />)
    const cancelBtn = screen.getByText(/取消|返回/)
    expect(cancelBtn).toBeInTheDocument()
  })
})
