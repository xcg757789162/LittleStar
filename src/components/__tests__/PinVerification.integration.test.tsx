/**
 * PinVerification 集成测试
 *
 * 测试 PIN 设置流程、验证流程、错误处理、重试限制、错误提示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PinVerification } from '../parent/PinVerification'

describe('PinVerification 集成测试', () => {
  let onVerify: ReturnType<typeof vi.fn> & ((isCorrect: boolean) => void)
  let onCancel: ReturnType<typeof vi.fn> & (() => void)

  beforeEach(() => {
    vi.clearAllMocks()
    onVerify = vi.fn() as ReturnType<typeof vi.fn> & ((isCorrect: boolean) => void)
    onCancel = vi.fn() as ReturnType<typeof vi.fn> & (() => void)
  })

  it('应支持 PIN 设置模式（首次使用，无 correctPin）', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin=""
        mode="setup"
      />,
    )

    // 设置模式应显示"设置密码"提示
    expect(screen.getByText(/设置.*密码|创建.*密码|请设置/)).toBeTruthy()
  })

  it('PIN 设置模式需要二次确认', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin=""
        mode="setup"
      />,
    )

    // 输入第一次 PIN
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应提示"请再次输入"
    expect(screen.getByText(/再次输入|确认密码/)).toBeTruthy()

    // 输入第二次 PIN（相同）
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应触发 onVerify，并传递新 PIN
    expect(onVerify).toHaveBeenCalledWith(true)
  })

  it('PIN 设置模式应回调 onSetPin', () => {
    const onSetPin = vi.fn()
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin=""
        mode="setup"
        onSetPin={onSetPin}
      />,
    )

    // 输入第一次 PIN
    '5678'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    // 输入第二次 PIN（相同）
    '5678'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    expect(onSetPin).toHaveBeenCalledWith('5678')
    expect(onVerify).toHaveBeenCalledWith(true)
  })

  it('PIN 设置模式二次输入不一致应报错', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin=""
        mode="setup"
      />,
    )

    // 输入第一次 PIN
    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 输入第二次 PIN（不一致）
    '5678'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))

    // 应显示错误提示
    expect(screen.getByText(/不一致|不匹配/)).toBeTruthy()
    expect(onVerify).not.toHaveBeenCalled()
  })

  it('验证模式超过 3 次错误应显示锁定提示', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin="1234"
        maxAttempts={3}
      />,
    )

    // 连续 3 次错误输入
    for (let i = 0; i < 3; i++) {
      '0000'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    }

    // 应显示锁定提示
    expect(screen.getByTestId('pin-locked')).toBeTruthy()
  })

  it('验证成功后应回调 onVerify(true)', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin="1234"
      />,
    )

    '1234'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    expect(onVerify).toHaveBeenCalledWith(true)
  })

  it('验证失败应显示错误提示', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin="1234"
      />,
    )

    '0000'.split('').forEach((d) => fireEvent.click(screen.getByText(d)))
    expect(onVerify).toHaveBeenCalledWith(false)
    // 应显示错误提示
    expect(screen.getByTestId('pin-error')).toBeTruthy()
    expect(screen.getByText(/密码错误/)).toBeTruthy()
  })

  it('取消按钮应回调 onCancel', () => {
    render(
      <PinVerification
        onVerify={onVerify}
        onCancel={onCancel}
        correctPin="1234"
      />,
    )

    fireEvent.click(screen.getByText(/取消/))
    expect(onCancel).toHaveBeenCalled()
  })
})
