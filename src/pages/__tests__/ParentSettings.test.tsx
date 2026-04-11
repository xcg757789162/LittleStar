import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParentSettings } from '../ParentSettings'
import { useChildStore } from '@/stores/childStore'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'

vi.mock('@/stores/gradeUnlockStore', () => ({
  useGradeUnlockStore: vi.fn().mockReturnValue({
    unlockConfig: { masteryThreshold: 80, minMasteredRatio: 0.8 },
    updateUnlockConfig: vi.fn(),
  }),
}))

describe('ParentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChildStore.getState().reset()
    // 设置默认孩子
    useChildStore.getState().addChild({
      id: 'child-1',
      userId: 'user-1',
      name: '小星星',
      avatar: '⭐',
      age: 5,
      gradeLevel: 'middle-kindergarten',
      createdAt: new Date(),
      settings: {
        dailyLearningMinutes: 20,
        preferredSubjects: ['math', 'chinese'],
        difficultyAdjustment: 0,
        voiceEnabled: true,
        soundEffectsEnabled: true,
        ...DEFAULT_ADVANCED_SETTINGS,
      },
    })
  })

  it('应渲染设置容器', () => {
    render(<ParentSettings />)
    expect(screen.getByTestId('parent-settings')).toBeInTheDocument()
  })

  it('应显示每日学习时长设置', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/学习时长/)).toBeInTheDocument()
  })

  it('应显示科目偏好设置', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/科目/)).toBeInTheDocument()
  })

  it('应显示孩子信息', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/孩子信息|基本信息/)).toBeInTheDocument()
  })

  it('孩子名字应从 childStore 读取', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/小星星/)).toBeInTheDocument()
  })

  it('学习时长应显示 childStore 中的值', () => {
    render(<ParentSettings />)
    expect(screen.getByText(/20 分钟/)).toBeInTheDocument()
  })

  it('科目偏好应从 childStore 读取', () => {
    render(<ParentSettings />)
    // 只有 math 和 chinese 被偏好
    expect(screen.getByText(/数学/)).toBeInTheDocument()
    expect(screen.getByText(/语文/)).toBeInTheDocument()
  })
})
