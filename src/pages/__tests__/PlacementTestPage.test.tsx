import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlacementTestPage } from '../PlacementTestPage'
import type { QuestionBankItem } from '@/types/models'

vi.mock('@/curriculum', () => ({
  loadCurriculum: vi.fn(() =>
    Promise.resolve({
      subject: 'math',
      version: '2022-v1',
      reference: 'test',
      modules: [
        {
          id: 'mod-1',
          name: '模块1',
          description: '基础',
          order: 1,
          knowledgeNodes: [
            {
              id: 'node-1a',
              name: '测试知识点',
              description: '',
              difficulty: 2,
              contentTypes: ['quiz'],
              prerequisites: [],
              templatePrompts: [],
            },
            {
              id: 'node-1b',
              name: '测试知识点2',
              description: '',
              difficulty: 3,
              contentTypes: ['quiz'],
              prerequisites: [],
              templatePrompts: [],
            },
          ],
        },
      ],
    }),
  ),
}))

const mockBankItem: QuestionBankItem = {
  knowledgeNodeId: 'node-1a',
  stem: '1+1=?',
  options: [
    { text: '1', emoji: '1️⃣' },
    { text: '2', emoji: '2️⃣' },
    { text: '3', emoji: '3️⃣' },
    { text: '4', emoji: '4️⃣' },
  ],
  correctIndex: 1,
  difficulty: 2,
}

vi.mock('@/data/question-bank/loader', () => ({
  loadQuestionBank: vi.fn(async () => {
    const m = new Map<string, QuestionBankItem[]>()
    m.set('node-1a', [mockBankItem])
    m.set('node-1b', [{ ...mockBankItem, knowledgeNodeId: 'node-1b', correctIndex: 0 }])
    return m
  }),
  getQuestionFromBank: (
    bank: Map<string, QuestionBankItem[]>,
    nodeId: string,
    difficulty?: 'easy' | 'hard',
  ) => {
    const questions = bank.get(nodeId)
    if (!questions?.length) return null
    if (!difficulty) return questions[0]
    const sorted = [...questions].sort((a, b) => a.difficulty - b.difficulty)
    return difficulty === 'easy' ? sorted[0] : sorted[sorted.length - 1]
  },
  clearQuestionBankCache: vi.fn(),
}))

vi.mock('@/stores/childStore', () => ({
  useChildStore: Object.assign(
    vi.fn(),
    {
      getState: () => ({
        currentChild: {
          id: '1',
          name: '测测',
          age: 7,
          settings: {
            llmModel: 'openai:gpt-4o-mini',
            llmApiKey: 'test-key',
          },
        },
      }),
    },
  ),
}))

vi.mock('@/stores/openmaic/settings-reverse-sync', () => ({
  extractChildSettingsFromStore: () => ({
    llmModel: 'openai:gpt-4o-mini',
    llmApiKey: 'test-key',
  }),
}))

vi.mock('@/stores/openmaic/child-settings-compat', () => ({
  mergeChildSettingsWithLiveStore: (
    partial: Record<string, unknown> | undefined,
    live: Record<string, unknown>,
  ) => ({ ...live, ...partial }),
}))

vi.mock('@/services/api', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ id: 1 }),
    get: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/engine/ai-question-generator', () => ({
  generateQuestion: vi.fn().mockResolvedValue({
    knowledgeNodeId: 'node-1b',
    stem: '2+2=?',
    options: [
      { text: '3', emoji: '3️⃣' },
      { text: '4', emoji: '4️⃣' },
      { text: '5', emoji: '5️⃣' },
      { text: '6', emoji: '6️⃣' },
    ],
    correctIndex: 1,
    difficulty: 3,
  }),
}))

function renderWithProviders(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('PlacementTestPage', () => {
  const mockOnComplete = vi.fn()
  const mockOnExit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('开始页面', () => {
    it('应渲染测评页面容器', () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByTestId('placement-test-page')).toBeInTheDocument()
    })

    it('应显示引导文案', async () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      await waitFor(() => {
        expect(screen.getByText('小星老师要了解一下你哦！')).toBeInTheDocument()
      }, { timeout: 4000 })
    })

    it('应显示开始测评按钮', async () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      await waitFor(() => {
        expect(screen.getByTestId('start-test-btn')).toBeInTheDocument()
      }, { timeout: 4000 })
    })

    it('应显示科目名称', async () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      await waitFor(() => {
        expect(screen.getByText('数学')).toBeInTheDocument()
      }, { timeout: 4000 })
    })
  })

  describe('答题界面', () => {
    it('点击开始后应进入答题界面', async () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      const startBtn = await waitFor(() => screen.getByTestId('start-test-btn'), { timeout: 4000 })
      fireEvent.click(startBtn)
      await waitFor(() => {
        expect(screen.getByTestId('test-question-area')).toBeInTheDocument()
      }, { timeout: 15_000 })
    })

    it('应显示星星进度', async () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      const startBtn = await waitFor(() => screen.getByTestId('start-test-btn'), { timeout: 4000 })
      fireEvent.click(startBtn)
      await waitFor(() => {
        expect(screen.getByTestId('star-progress')).toBeInTheDocument()
      }, { timeout: 15_000 })
    })
  })

  describe('退出功能', () => {
    it('应有退出按钮', () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      expect(screen.getByTestId('exit-test-btn')).toBeInTheDocument()
    })

    it('点击退出应调用 onExit', () => {
      renderWithProviders(
        <PlacementTestPage
          subject="math"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />,
      )
      fireEvent.click(screen.getByTestId('exit-test-btn'))
      expect(mockOnExit).toHaveBeenCalledOnce()
    })
  })
})
