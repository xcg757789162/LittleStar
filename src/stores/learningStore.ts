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

/** 会话结束回调参数 */
export interface SessionEndInfo {
  subject: Subject
  questionsCompleted: number
  correctCount: number
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
  /** 注册会话结束回调 */
  setOnSessionEnd: (callback: (info: SessionEndInfo) => void) => void
  /** 清除会话结束回调 */
  clearOnSessionEnd: () => void
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

/** 外部回调存储（不放入 zustand 状态以避免序列化问题） */
let _onSessionEndCallback: ((info: SessionEndInfo) => void) | null = null

/**
 * 学习会话 Store
 * 管理当前学习会话状态、题目队列、答题进度
 */
export const useLearningStore = create<LearningState & LearningActions>()(
  (set, get) => ({
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

    endSession: () => {
      const state = get()
      const subject = state.currentSubject
      const { questionsCompleted, correctCount } = state.sessionStats

      set({
        isSessionActive: false,
        currentQuestion: null,
        currentSubject: null,
        sessionStats: {
          ...state.sessionStats,
        },
      })

      // 触发回调
      if (_onSessionEndCallback && subject) {
        _onSessionEndCallback({ subject, questionsCompleted, correctCount })
      }
    },

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

    setOnSessionEnd: (callback) => {
      _onSessionEndCallback = callback
    },

    clearOnSessionEnd: () => {
      _onSessionEndCallback = null
    },

    reset: () => {
      _onSessionEndCallback = null
      set({ ...initialState, sessionStats: { ...initialStats } })
    },
  }),
)
