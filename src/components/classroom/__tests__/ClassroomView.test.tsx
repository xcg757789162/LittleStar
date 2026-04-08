/**
 * ClassroomView 主容器测试
 *
 * 测试场景分发渲染、进度条(场景级)、导航、自动播放、课堂完成回调、
 * 空课堂边界、学科配色
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ClassroomView } from '../ClassroomView'
import type { Classroom } from '@/services/openmaic/types'

const mockClassroom: Classroom = {
  id: 'classroom-001',
  title: '认识数字 1-5',
  status: 'completed',
  scenes: [
    {
      id: 'scene-1',
      title: '学习数字',
      type: 'teaching',
      slides: [
        { type: 'title', title: '数字王国', content: '欢迎来到数字王国！' },
        { type: 'content', title: '数字 1', content: '1 像铅笔', imageUrl: '/img/1.png' },
      ],
    },
    {
      id: 'scene-2',
      title: '小测验',
      type: 'quiz',
      slides: [
        {
          type: 'quiz',
          title: '测一测',
          quiz: {
            question: '1 + 1 = ?',
            options: ['1', '2', '3'],
            correctAnswer: 1,
          },
        },
      ],
    },
    {
      id: 'scene-3',
      title: '动起来',
      type: 'interactive',
      slides: [
        { type: 'tpr', title: '跟我做', tprInstruction: '伸出一根手指！' },
      ],
    },
  ],
}

describe('ClassroomView', () => {
  const defaultProps = {
    classroom: mockClassroom,
    onComplete: vi.fn(),
    onAnswer: vi.fn(),
    onAudioPlay: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应渲染 classroom-view 容器', () => {
    render(<ClassroomView {...defaultProps} />)
    expect(screen.getByTestId('classroom-view')).toBeInTheDocument()
  })

  it('应渲染课堂标题', () => {
    render(<ClassroomView {...defaultProps} />)
    expect(screen.getByText('认识数字 1-5')).toBeInTheDocument()
  })

  it('应渲染进度条', () => {
    render(<ClassroomView {...defaultProps} />)
    expect(screen.getByTestId('classroom-progress')).toBeInTheDocument()
  })

  it('应显示场景级进度信息（I4 修复）', () => {
    render(<ClassroomView {...defaultProps} />)
    // 初始在场景 1，共 3 个场景
    expect(screen.getByTestId('progress-text')).toHaveTextContent('1 / 3')
  })

  it('初始应渲染第一个场景的第一张幻灯片', () => {
    render(<ClassroomView {...defaultProps} />)
    // 第一张是 title 类型，用 TeachingSlide 渲染
    expect(screen.getByText('数字王国')).toBeInTheDocument()
    expect(screen.getByText('欢迎来到数字王国！')).toBeInTheDocument()
  })

  it('点击"下一张"应切换到下一张幻灯片', () => {
    render(<ClassroomView {...defaultProps} />)

    const nextBtn = screen.getByTestId('nav-next')
    fireEvent.click(nextBtn)

    // 第二张是 content 类型
    expect(screen.getByText('数字 1')).toBeInTheDocument()
    expect(screen.getByText('1 像铅笔')).toBeInTheDocument()
  })

  it('点击"上一张"应切换到上一张幻灯片', () => {
    render(<ClassroomView {...defaultProps} />)

    // 先前进到第二张
    fireEvent.click(screen.getByTestId('nav-next'))
    // 再返回第一张
    fireEvent.click(screen.getByTestId('nav-prev'))

    expect(screen.getByText('数字王国')).toBeInTheDocument()
  })

  it('第一张时"上一张"按钮应禁用', () => {
    render(<ClassroomView {...defaultProps} />)
    expect(screen.getByTestId('nav-prev')).toBeDisabled()
  })

  it('跨场景导航应正确切换', () => {
    render(<ClassroomView {...defaultProps} />)

    // 前进 2 次到第 3 张（scene-2 的 quiz）
    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('nav-next'))

    // 应渲染 quiz 类型
    expect(screen.getByText('1 + 1 = ?')).toBeInTheDocument()
  })

  it('最后一张时点击下一张应触发 onComplete', () => {
    const onComplete = vi.fn()
    render(<ClassroomView {...defaultProps} onComplete={onComplete} />)

    // 前进到最后一张（共 4 张）
    fireEvent.click(screen.getByTestId('nav-next')) // → slide 2
    fireEvent.click(screen.getByTestId('nav-next')) // → slide 3 (quiz)
    fireEvent.click(screen.getByTestId('nav-next')) // → slide 4 (tpr)
    fireEvent.click(screen.getByTestId('nav-next')) // → 完成

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('进度条应随导航在场景切换时更新', () => {
    render(<ClassroomView {...defaultProps} />)

    // 场景 1 有 2 张幻灯片，初始在场景 1
    expect(screen.getByTestId('progress-text')).toHaveTextContent('1 / 3')

    // 在场景 1 内部导航，进度不变
    fireEvent.click(screen.getByTestId('nav-next'))
    expect(screen.getByTestId('progress-text')).toHaveTextContent('1 / 3')

    // 跳到场景 2
    fireEvent.click(screen.getByTestId('nav-next'))
    expect(screen.getByTestId('progress-text')).toHaveTextContent('2 / 3')
  })

  it('Quiz 答题应传递 onAnswer 回调', () => {
    const onAnswer = vi.fn()
    render(<ClassroomView {...defaultProps} onAnswer={onAnswer} />)

    // 导航到 quiz（第 3 张）
    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('nav-next'))

    // 选择答案
    fireEvent.click(screen.getByText('2'))

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true }),
    )
  })

  it('TPR 幻灯片应正确渲染', () => {
    render(<ClassroomView {...defaultProps} />)

    // 导航到 TPR（第 4 张）
    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('nav-next'))
    fireEvent.click(screen.getByTestId('nav-next'))

    expect(screen.getByText(/伸出一根手指/)).toBeInTheDocument()
  })

  // === C2 修复：空课堂边界 ===

  it('空课堂应显示"暂无课堂内容"', () => {
    const emptyClassroom: Classroom = {
      id: 'empty-001',
      title: '空课堂',
      status: 'completed',
      scenes: [],
    }
    render(<ClassroomView {...defaultProps} classroom={emptyClassroom} />)
    expect(screen.getByTestId('empty-classroom')).toHaveTextContent('暂无课堂内容')
    expect(screen.getByText('空课堂')).toBeInTheDocument()
  })

  it('场景有但无幻灯片时应显示空课堂提示', () => {
    const emptySlideClassroom: Classroom = {
      id: 'empty-002',
      title: '空幻灯片课堂',
      status: 'completed',
      scenes: [{ id: 's1', title: '场景 1', type: 'teaching', slides: [] }],
    }
    render(<ClassroomView {...defaultProps} classroom={emptySlideClassroom} />)
    expect(screen.getByTestId('empty-classroom')).toBeInTheDocument()
  })

  // === I2 修复：自动播放 ===

  it('应渲染自动播放按钮', () => {
    render(<ClassroomView {...defaultProps} />)
    expect(screen.getByTestId('nav-autoplay')).toBeInTheDocument()
  })

  it('点击自动播放按钮后应自动前进', () => {
    render(<ClassroomView {...defaultProps} />)

    // 初始第 1 张
    expect(screen.getByText('数字王国')).toBeInTheDocument()

    // 开启自动播放
    fireEvent.click(screen.getByTestId('nav-autoplay'))

    // 等待自动播放间隔
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // 应前进到第 2 张
    expect(screen.getByText('数字 1')).toBeInTheDocument()
  })

  it('自动播放在 quiz 类型幻灯片时应暂停', () => {
    render(<ClassroomView {...defaultProps} />)

    // 开启自动播放
    fireEvent.click(screen.getByTestId('nav-autoplay'))

    // 前进到 quiz（第 3 张）
    act(() => {
      vi.advanceTimersByTime(5000) // → slide 2
    })
    act(() => {
      vi.advanceTimersByTime(5000) // → slide 3 (quiz)
    })

    expect(screen.getByText('1 + 1 = ?')).toBeInTheDocument()

    // 继续等待，不应前进（quiz 需等待用户交互）
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // 仍在 quiz
    expect(screen.getByText('1 + 1 = ?')).toBeInTheDocument()
  })

  // === I3 修复：学科配色 ===

  it('math 学科应使用蓝色渐变', () => {
    render(<ClassroomView {...defaultProps} subject="math" />)
    const view = screen.getByTestId('classroom-view')
    // JSDOM 将 hex 规范化为 rgb
    expect(view.style.background).toContain('rgb(102, 126, 234)')
  })

  it('chinese 学科应使用红色渐变', () => {
    render(<ClassroomView {...defaultProps} subject="chinese" />)
    const view = screen.getByTestId('classroom-view')
    expect(view.style.background).toContain('rgb(245, 87, 108)')
  })

  it('english 学科应使用绿色渐变', () => {
    render(<ClassroomView {...defaultProps} subject="english" />)
    const view = screen.getByTestId('classroom-view')
    expect(view.style.background).toContain('rgb(67, 233, 123)')
  })
})
