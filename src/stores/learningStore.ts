import { create } from 'zustand'
import type { Question, Subject } from '@/types/models'

/** 会话统计 */
export interface SessionStats {
  /** 已完成题目数 */
  questionsCompleted: number
  /** 正确数 */
  correctCount: number
  /** 开始时间 */
  startTime: Date | null
}

/** learningStore 状态接口 */
export interface LearningState {
  /** 会话是否活跃 */
  isSessionActive: boolean
  /** 当前科目 */
  currentSubject: Subject | null
  /** 当前题目 */
  currentQuestion: Question | null
  /** 题目队列 */
  questionQueue: Question[]
  /** 当前题目在队列中的索引 */
  currentIndex: number
  /** 会话统计 */
  sessionStats: SessionStats
}

/** learningStore 操作接口 */
export interface LearningActions {
  /** 开始学习会话 */
  startSession: (subject: Subject) => void
  /** 结束学习会话 */
  endSession: () => void
  /** 设置题目队列（重置当前索引到第一题） */
  setQuestionQueue: (questions: Question[]) => void
  /** 追加题目到队列尾部 */
  appendQuestions: (questions: Question[]) => void
  /** 记录答题结果并前进到下一题 */
  recordAnswer: (isCorrect: boolean) => void
  /** 重置到初始状态 */
  reset: () => void
}

/** 初始会话统计 */
const initialStats: SessionStats = {
  questionsCompleted: 0,
  correctCount: 0,
  startTime: null,
}

/** 初始状态 */
const initialState: LearningState = {
  isSessionActive: false,
  currentSubject: null,
  currentQuestion: null,
  questionQueue: [],
  currentIndex: 0,
  sessionStats: { ...initialStats },
}

/**
 * 学习会话 Store
 * 管理当前学习会话状态、题目队列、答题进度
 */
export const useLearningStore = create<LearningState & LearningActions>()(
  (set) => ({
    ...initialState,

    startSession: (subject) =>
      set({
        isSessionActive: true,
        currentSubject: subject,
        currentQuestion: null,
        questionQueue: [],
        currentIndex: 0,
        sessionStats: {
          questionsCompleted: 0,
          correctCount: 0,
          startTime: new Date(),
        },
      }),

    endSession: () =>
      set((state) => ({
        isSessionActive: false,
        currentQuestion: null,
        currentSubject: null,
        // 保留 stats，让上层可以读取最终结果
        sessionStats: {
          ...state.sessionStats,
        },
      })),

    setQuestionQueue: (questions) =>
      set({
        questionQueue: questions,
        currentIndex: 0,
        currentQuestion: questions.length > 0 ? questions[0] : null,
      }),

    appendQuestions: (questions) =>
      set((state) => ({
        questionQueue: [...state.questionQueue, ...questions],
      })),

    recordAnswer: (isCorrect) =>
      set((state) => {
        const nextIndex = state.currentIndex + 1
        const nextQuestion =
          nextIndex < state.questionQueue.length
            ? state.questionQueue[nextIndex]
            : null

        return {
          currentIndex: nextIndex,
          currentQuestion: nextQuestion,
          sessionStats: {
            ...state.sessionStats,
            questionsCompleted: state.sessionStats.questionsCompleted + 1,
            correctCount:
              state.sessionStats.correctCount + (isCorrect ? 1 : 0),
          },
        }
      }),

    reset: () => set({ ...initialState, sessionStats: { ...initialStats } }),
  }),
)
