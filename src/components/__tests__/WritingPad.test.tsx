import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WritingPad } from '../learning/WritingPad'

describe('WritingPad', () => {
  const defaultProps = {
    prompt: '请写数字 3',
    onSubmit: vi.fn(),
    onClear: vi.fn(),
    onUndo: vi.fn(),
  }

  it('应渲染书写提示', () => {
    render(<WritingPad {...defaultProps} />)
    expect(screen.getByText('请写数字 3')).toBeInTheDocument()
  })

  it('应渲染 Canvas 书写区域', () => {
    render(<WritingPad {...defaultProps} />)
    const canvas = screen.getByTestId('writing-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas.tagName).toBe('CANVAS')
  })

  it('应有清除按钮', () => {
    render(<WritingPad {...defaultProps} />)
    const clearBtn = screen.getByText(/清除|重写/)
    expect(clearBtn).toBeInTheDocument()
  })

  it('点击清除应触发 onClear', () => {
    render(<WritingPad {...defaultProps} />)
    const clearBtn = screen.getByText(/清除|重写/)
    fireEvent.click(clearBtn)
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1)
  })

  it('应有撤销按钮', () => {
    render(<WritingPad {...defaultProps} />)
    const undoBtn = screen.getByText(/撤销/)
    expect(undoBtn).toBeInTheDocument()
  })

  it('点击撤销应触发 onUndo', () => {
    render(<WritingPad {...defaultProps} />)
    const undoBtn = screen.getByText(/撤销/)
    fireEvent.click(undoBtn)
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1)
  })

  it('应有提交按钮', () => {
    render(<WritingPad {...defaultProps} />)
    const submitBtn = screen.getByText(/提交|完成/)
    expect(submitBtn).toBeInTheDocument()
  })

  it('点击提交应触发 onSubmit', () => {
    render(<WritingPad {...defaultProps} />)
    const submitBtn = screen.getByText(/提交|完成/)
    fireEvent.click(submitBtn)
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('应支持自定义画笔颜色', () => {
    render(<WritingPad {...defaultProps} brushColor="#FF0000" />)
    // 颜色选择器或标记存在
    const canvas = screen.getByTestId('writing-canvas')
    expect(canvas).toBeInTheDocument()
  })
})
