import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyllableHighlight } from '../voice/SyllableHighlight'

describe('SyllableHighlight', () => {
  it('应渲染所有音节', () => {
    render(
      <SyllableHighlight
        syllables={['ap', 'ple']}
        currentIndex={0}
      />,
    )
    const container = screen.getByTestId('syllable-highlight')
    expect(container).toBeInTheDocument()
    expect(screen.getByText('ap')).toBeInTheDocument()
    expect(screen.getByText('ple')).toBeInTheDocument()
  })

  it('当前音节应高亮显示', () => {
    render(
      <SyllableHighlight
        syllables={['el', 'e', 'phant']}
        currentIndex={1}
      />,
    )
    const current = screen.getByTestId('syllable-current')
    expect(current).toBeInTheDocument()
    expect(current.textContent).toBe('e')
  })

  it('已完成音节应显示已完成状态', () => {
    render(
      <SyllableHighlight
        syllables={['el', 'e', 'phant']}
        currentIndex={2}
      />,
    )
    const completed = screen.getAllByTestId('syllable-completed')
    expect(completed.length).toBe(2) // el 和 e 已完成
  })

  it('待完成音节应显示待定状态', () => {
    render(
      <SyllableHighlight
        syllables={['el', 'e', 'phant']}
        currentIndex={0}
      />,
    )
    const pending = screen.getAllByTestId('syllable-pending')
    expect(pending.length).toBe(2) // e 和 phant 待完成
  })

  it('三音节从左到右推进：index=0', () => {
    render(
      <SyllableHighlight
        syllables={['el', 'e', 'phant']}
        currentIndex={0}
      />,
    )
    expect(screen.getByTestId('syllable-current').textContent).toBe('el')
    expect(screen.getAllByTestId('syllable-pending').length).toBe(2)
    expect(screen.queryAllByTestId('syllable-completed').length).toBe(0)
  })

  it('单音节词应只有一个当前高亮', () => {
    render(
      <SyllableHighlight
        syllables={['cat']}
        currentIndex={0}
      />,
    )
    expect(screen.getByTestId('syllable-current').textContent).toBe('cat')
    expect(screen.queryAllByTestId('syllable-completed').length).toBe(0)
    expect(screen.queryAllByTestId('syllable-pending').length).toBe(0)
  })
})
