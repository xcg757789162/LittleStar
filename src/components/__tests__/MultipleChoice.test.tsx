import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultipleChoice } from '../learning/MultipleChoice'

describe('MultipleChoice', () => {
  const defaultProps = {
    question: '1 + 2 = ?',
    options: [
      { id: 'a', text: '2', isCorrect: false },
      { id: 'b', text: '3', isCorrect: true },
      { id: 'c', text: '4', isCorrect: false },
    ],
    onAnswer: vi.fn(),
  }

  it('应渲染题目文本', () => {
    render(<MultipleChoice {...defaultProps} />)
    expect(screen.getByText('1 + 2 = ?')).toBeInTheDocument()
  })

  it('应渲染所有选项', () => {
    render(<MultipleChoice {...defaultProps} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('点击选项应触发 onAnswer', () => {
    render(<MultipleChoice {...defaultProps} />)
    fireEvent.click(screen.getByText('3'))
    expect(defaultProps.onAnswer).toHaveBeenCalledWith('b', true)
  })

  it('点击错误选项应传递 isCorrect=false', () => {
    const onAnswer = vi.fn()
    render(<MultipleChoice {...defaultProps} onAnswer={onAnswer} />)
    fireEvent.click(screen.getByText('2'))
    expect(onAnswer).toHaveBeenCalledWith('a', false)
  })

  it('选中后应显示正确/错误状态', () => {
    render(<MultipleChoice {...defaultProps} selectedId="a" showResult={true} />)
    const selectedBtn = screen.getByText('2').closest('button')
    expect(selectedBtn).toHaveAttribute('data-state', 'wrong')
  })

  it('选中正确答案应显示正确状态', () => {
    render(<MultipleChoice {...defaultProps} selectedId="b" showResult={true} />)
    const selectedBtn = screen.getByText('3').closest('button')
    expect(selectedBtn).toHaveAttribute('data-state', 'correct')
  })

  it('图文选项应渲染图片', () => {
    const propsWithImage = {
      ...defaultProps,
      options: [
        { id: 'a', text: '苹果', imageUrl: '/apple.png', isCorrect: true },
        { id: 'b', text: '香蕉', imageUrl: '/banana.png', isCorrect: false },
      ],
    }
    render(<MultipleChoice {...propsWithImage} />)
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(2)
  })

  it('已回答后按钮应被禁用', () => {
    render(<MultipleChoice {...defaultProps} selectedId="b" showResult={true} disabled={true} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
