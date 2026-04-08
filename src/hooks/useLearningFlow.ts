/**
 * useLearningFlow Hook
 * 学习主循环核心编排：
 * - OpenMAIC 流程：教导处选课 → 缓存加载 → ClassroomView 渲染 → 答题回写 → 动态调整
 * - 降级路径：缓存为空时显示"课程准备中"提示
 * Phase 1: 集成亲子互动环节 + TPR 全身反应法 + 艾宾浩斯复习机制
 * Phase 3: 集成 OpenMAIC 课堂缓存流程
 */

import { useState, useCallback, useRef } from 'react'
import { AdaptiveRouter } from '@/engine/adaptive-router'
import { QwenProvider } from '@/services/ai/qwen-provider'
import { AITeacher } from '@/services/ai/teacher'
import { AchievementEngine } from '@/engine/achievement'
import { GradeUnlockEngine } from '@/engine/grade-unlock-engine'
import { generateDailySnapshot } from '@/engine/mastery-snapshot'
import { ReviewManager } from '@/engine/review-manager'
import { RuleEngine } from '@/engine/rule-engine'
import { ClassroomCache } from '@/services/openmaic/cache'
import { DynamicAdjuster } from '@/services/lesson-planner'
import { useLearningStore } from '@/stores/learningStore'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'
import { getRandomActivity } from '@/data/seed/english-parent-activities'
import { getRandomTPR } from '@/data/seed/english-tpr'
import type { ParentActivity } from '@/data/seed/english-parent-activities'
import type { TPRCommand } from '@/data/seed/english-tpr'
import type { FeedbackType } from '@/components/feedback/FeedbackAnimation'
import type { QuizAnswerData } from '@/components/classroom/QuizSlide'
import type { Subject, Question, KnowledgeNode } from '@/types/models'
import type { AIProvider } from '@/services/ai/provider'
import type { Classroom } from '@/services/openmaic/types'

/** 简单 fallback AI provider（无 API key 时使用） */
const fallbackProvider: AIProvider = {
  async chatCompletion() {
    throw new Error('No AI provider configured')
  },
}

/** 根据环境变量获取 AI Provider */
function getAIProvider(): AIProvider {
  const apiKey = import.meta.env.VITE_QWEN_API_KEY
  if (apiKey) {
    return new QwenProvider({
      apiKey,
      baseUrl: import.meta.env.VITE_QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: import.meta.env.VITE_QWEN_MODEL ?? 'qwen-turbo',
    })
  }
  return fallbackProvider
}

/** 会话总结 */
export interface SessionSummary {
  questionsCompleted: number
  correctCount: number
  accuracy: number
  subject: Subject
}

/** 学习流中的插入环节类型 */
export type InterstitialType = 'parent-activity' | 'tpr'

/** 当前插入环节 */
export interface CurrentInterstitial {
  type: InterstitialType
  parentActivity?: ParentActivity
  tprCommand?: TPRCommand
}

/** 课堂答题数据（复用 QuizSlide 的 QuizAnswerData） */
export type ClassroomAnswerData = QuizAnswerData

/** Hook 返回值 */
export interface LearningFlowState {
  /** 学习是否激活 */
  isActive: boolean
  /** 是否加载中 */
  isLoading: boolean
  /** 当前题目 */
  currentQuestion: Question | null
  /** 当前题目是否为复习内容 */
  isCurrentReview: boolean
  /** 是否显示反馈动画 */
  showFeedback: boolean
  /** 反馈类型 */
  feedbackType: FeedbackType
  /** 学习是否完成 */
  isComplete: boolean
  /** 会话总结 */
  sessionSummary: SessionSummary | null
  /** 鼓励语 */
  encouragement: string
  /** 当前插入环节（亲子互动/TPR） */
  currentInterstitial: CurrentInterstitial | null
  /** 当前课堂数据（OpenMAIC 新流程） */
  currentClassroom: Classroom | null
  /** 缓存是否为空（无课堂可加载） */
  isCacheEmpty: boolean
  /** 课堂答题计数 */
  classroomAnswerCount: number
  /** 启动学习流程 */
  startFlow: (subject: Subject) => Promise<void>
  /** 停止学习流程 */
  stopFlow: () => void
  /** 处理答题（旧流程） */
  handleAnswer: (isCorrect: boolean) => void
  /** 处理课堂答题（新流程） */
  handleClassroomAnswer: (data: ClassroomAnswerData) => void
  /** 处理课堂完成（新流程） */
  handleClassroomComplete: () => void
  /** 关闭反馈动画 */
  dismissFeedback: () => void
  /** 完成插入环节 */
  completeInterstitial: () => void
}

export function useLearningFlow(): LearningFlowState {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('correct')
  const [isComplete, setIsComplete] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [encouragement, setEncouragement] = useState('')
  const [isCurrentReview, setIsCurrentReview] = useState(false)
  const [currentInterstitial, setCurrentInterstitial] = useState<CurrentInterstitial | null>(null)

  // 新流程：课堂相关状态
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null)
  const [isCacheEmpty, setIsCacheEmpty] = useState(false)
  const [classroomAnswerCount, setClassroomAnswerCount] = useState(0)

  // 引擎实例（useRef 避免重复创建）
  const routerRef = useRef(new AdaptiveRouter())
  const reviewManagerRef = useRef(new ReviewManager())
  const ruleEngineRef = useRef(new RuleEngine())
  const achievementEngineRef = useRef(new AchievementEngine())
  const gradeUnlockEngineRef = useRef(new GradeUnlockEngine())
  const providerRef = useRef<AIProvider>(getAIProvider())
  const teacherRef = useRef(new AITeacher(providerRef.current))
  const subjectRef = useRef<Subject>('math')

  // 新流程：缓存和调整器实例
  const classroomCacheRef = useRef(new ClassroomCache())
  const dynamicAdjusterRef = useRef(new DynamicAdjuster())

  // 追踪连续正确/错误
  const consecutiveCorrectRef = useRef(0)
  const consecutiveWrongRef = useRef(0)

  // 追踪已回答的题目数（用于判断是否插入亲子活动）
  const answeredSinceInterstitialRef = useRef(0)

  // 追踪哪些题目是复习的（使用 question id Set）
  const reviewQuestionIdsRef = useRef<Set<string>>(new Set())

  // 只订阅 actions（稳定引用），避免订阅频繁变化的数据导致不必要重渲染
  const startSession = useLearningStore((s) => s.startSession)
  const endSession = useLearningStore((s) => s.endSession)
  const recordAnswer = useLearningStore((s) => s.recordAnswer)

  // 响应式订阅 currentQuestion — UI 需要随题目切换自动重渲染
  const currentQuestion = useLearningStore((s) => s.currentQuestion)

  /**
   * 启动学习流程
   * 先尝试从缓存加载 OpenMAIC 课堂
   * 缓存为空时显示"课程准备中"提示，同时后台加载题目队列
   */
  const startFlow = useCallback(async (subject: Subject) => {
    setIsLoading(true)
    setIsComplete(false)
    setSessionSummary(null)
    setCurrentInterstitial(null)
    setIsCurrentReview(false)
    setCurrentClassroom(null)
    setIsCacheEmpty(false)
    setClassroomAnswerCount(0)
    subjectRef.current = subject
    consecutiveCorrectRef.current = 0
    consecutiveWrongRef.current = 0
    answeredSinceInterstitialRef.current = 0
    reviewQuestionIdsRef.current = new Set()

    // 1. 启动 learningStore 会话
    startSession(subject)
    setIsActive(true)

    try {
      // 2. 尝试从缓存加载课堂（新流程）
      const cachedList = await classroomCacheRef.current.listCachedClassrooms()

      if (cachedList.length > 0) {
        // 有缓存 → 加载第一个课堂
        const firstItem = cachedList[0]
        const classroom = await classroomCacheRef.current.getClassroom(
          firstItem.knowledgeNodeId,
          firstItem.date,
        )

        if (classroom) {
          setCurrentClassroom(classroom)
          setIsCacheEmpty(false)
          setIsLoading(false)
          return // 新流程：课堂已加载，由 ClassroomView 渲染
        }
      }

      // 无缓存或加载失败 → 标记缓存为空
      // UI 层（LearningSession）通过 isCacheEmpty 显示"课程准备中"提示
      setIsCacheEmpty(true)
    } catch {
      // 加载失败也保持激活，让用户可以退出
    } finally {
      setIsLoading(false)
    }
  }, [startSession])

  /**
   * 会话结束后的 DB 写入和引擎检查（异步，不阻塞 UI）
   */
  const onSessionEnd = useCallback(async (subject: Subject, stats: { questionsCompleted: number; correctCount: number }) => {
    try {
      const child = useChildStore.getState().currentChild
      if (!child) return

      const childId = child.id ?? 'default'
      const gradeLevel = child.gradeLevel

      // 1. 写入 DailySession
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await db.dailySessions.add({
        childId,
        date: dateStr,
        startTime: today,
        questionsCompleted: stats.questionsCompleted,
        correctCount: stats.correctCount,
        subjects: [subject],
        streak: 1,
      })

      // 2. 加载当前掌握率
      const masteryRecords = await db.masteryRecords
        .where('childId')
        .equals(childId)
        .toArray()

      const masteryMap = new Map<string, number>()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 3. 检查成就
      const existingAchievements = await db.achievements
        .where('childId')
        .equals(childId)
        .toArray()

      const subjectMasteries: Record<string, number> = {}
      for (const [, mastery] of masteryMap) {
        subjectMasteries[subject] = (subjectMasteries[subject] ?? 0) + mastery
      }

      const newAchievements = achievementEngineRef.current.checkAchievements({
        totalQuestionsCompleted: stats.questionsCompleted,
        consecutiveDays: 1,
        subjectMasteries,
        earnedAchievementIds: existingAchievements.map((a) => a.id ?? ''),
      })

      // 写入新成就
      for (const achievement of newAchievements) {
        await db.achievements.add({
          childId,
          type: achievement.type,
          name: achievement.name,
          description: achievement.description,
          earnedAt: new Date(),
          metadata: {},
        })
      }

      // 4. 检查年级解锁
      const nodes = await db.knowledgeNodes
        .where('subject')
        .equals(subject)
        .toArray()

      gradeUnlockEngineRef.current.checkUnlockEligibility({
        currentGrade: gradeLevel,
        subject,
        masteryMap,
        totalNodes: nodes.length,
      })

      // 5. 生成每日掌握度快照
      const nodesMastery: Record<string, number> = {}
      for (const [nodeId, mastery] of masteryMap) {
        nodesMastery[nodeId] = mastery
      }

      const snapshot = generateDailySnapshot({
        childId,
        subject,
        gradeLevel,
        nodesMastery,
      })

      if (snapshot) {
        await db.masterySnapshots.add(snapshot)
      }
    } catch {
      // 写入失败不影响用户体验，静默处理
    }
  }, [])

  /**
   * 停止学习流程
   */
  const stopFlow = useCallback(() => {
    const stats = useLearningStore.getState().sessionStats
    const subject = subjectRef.current

    endSession()
    setIsActive(false)
    setShowFeedback(false)
    setIsComplete(true)
    setSessionSummary({
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
      accuracy: stats.questionsCompleted > 0
        ? Math.round((stats.correctCount / stats.questionsCompleted) * 100)
        : 0,
      subject,
    })

    // 异步写入 DB（不阻塞 UI）
    onSessionEnd(subject, {
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
    })
  }, [endSession, onSessionEnd])

  /**
   * 处理答题
   */
  const handleAnswer = useCallback((isCorrect: boolean) => {
    // 记录到 learningStore
    recordAnswer(isCorrect)

    // 更新连续计数
    if (isCorrect) {
      consecutiveCorrectRef.current++
      consecutiveWrongRef.current = 0
    } else {
      consecutiveWrongRef.current++
      consecutiveCorrectRef.current = 0
    }

    // 更新已回答计数
    answeredSinceInterstitialRef.current++

    // 异步更新复习调度
    const question = currentQuestion
    if (question) {
      const child = useChildStore.getState().currentChild
      const childId = child?.id ?? 'default'
      reviewManagerRef.current.recordReview(
        childId,
        question.knowledgeNodeId,
        isCorrect,
      ).catch(() => {
        // 静默处理调度失败
      })
    }

    // 显示反馈
    setShowFeedback(true)
    setFeedbackType(isCorrect ? 'correct' : 'wrong')

    // 异步生成鼓励语（不阻塞 UI）
    const child = useChildStore.getState().currentChild
    const childName = child?.name ?? '小朋友'
    teacherRef.current.generateEncouragement({
      childName,
      isCorrect,
      consecutiveCorrect: consecutiveCorrectRef.current,
    }).then((message) => {
      setEncouragement(message)
    }).catch(() => {
      // 鼓励语生成失败时使用默认值
      setEncouragement(isCorrect ? '你真棒！' : '加油，再试一次！')
    })
  }, [recordAnswer, currentQuestion])

  /**
   * 关闭反馈动画，检查是否应继续
   */
  const dismissFeedback = useCallback(() => {
    setShowFeedback(false)

    // 检查题目队列是否耗尽
    const state = useLearningStore.getState()
    if (state.currentQuestion === null) {
      // 队列耗尽 → 会话完成
      const subject = subjectRef.current
      endSession()
      setIsActive(false)
      setIsComplete(true)
      setSessionSummary({
        questionsCompleted: state.sessionStats.questionsCompleted,
        correctCount: state.sessionStats.correctCount,
        accuracy: state.sessionStats.questionsCompleted > 0
          ? Math.round((state.sessionStats.correctCount / state.sessionStats.questionsCompleted) * 100)
          : 0,
        subject,
      })

      // 异步写入 DB
      onSessionEnd(subject, {
        questionsCompleted: state.sessionStats.questionsCompleted,
        correctCount: state.sessionStats.correctCount,
      })
      return
    }

    // 更新当前题目的复习标记
    setIsCurrentReview(
      reviewQuestionIdsRef.current.has(state.currentQuestion?.id ?? ''),
    )

    // 每 2-3 个知识点后插入亲子互动或 TPR 环节（仅英语科目）
    if (
      subjectRef.current === 'english' &&
      answeredSinceInterstitialRef.current >= 2 + Math.floor(Math.random() * 2)
    ) {
      answeredSinceInterstitialRef.current = 0

      // 随机选择插入亲子活动或 TPR
      if (Math.random() < 0.5) {
        setCurrentInterstitial({
          type: 'parent-activity',
          parentActivity: getRandomActivity(),
        })
      } else {
        setCurrentInterstitial({
          type: 'tpr',
          tprCommand: getRandomTPR(),
        })
      }
      return
    }

    // 检查 RuleEngine 是否建议停止
    const child = useChildStore.getState().currentChild
    if (child) {
      const startTime = state.sessionStats.startTime
      const sessionMinutes = startTime
        ? (Date.now() - startTime.getTime()) / 60000
        : 0

      const evaluation = ruleEngineRef.current.evaluate({
        age: child.age,
        gradeLevel: child.gradeLevel,
        currentSubject: subjectRef.current,
        currentDifficulty: state.currentQuestion?.difficulty ?? 1,
        consecutiveCorrect: consecutiveCorrectRef.current,
        consecutiveWrong: consecutiveWrongRef.current,
        recentAccuracy: state.sessionStats.questionsCompleted > 0
          ? state.sessionStats.correctCount / state.sessionStats.questionsCompleted
          : 1,
        sessionDurationMinutes: sessionMinutes,
        questionsCompleted: state.sessionStats.questionsCompleted,
        averageResponseTimeMs: 3000,
        dailyLimitMinutes: child.settings.dailyLearningMinutes,
        totalDailyMinutes: 0,
      })

      if (!evaluation.shouldContinue) {
        stopFlow()
      }
    }
  }, [endSession, stopFlow, onSessionEnd])

  /**
   * 完成插入环节（亲子互动/TPR），继续答题
   */
  const completeInterstitial = useCallback(() => {
    setCurrentInterstitial(null)
  }, [])

  /**
   * 处理课堂答题（新流程）
   * 回写掌握率数据并更新答题计数
   */
  const handleClassroomAnswer = useCallback((data: ClassroomAnswerData) => {
    setClassroomAnswerCount((prev) => prev + 1)

    // 记录到 learningStore（兼容旧流程统计）
    recordAnswer(data.isCorrect)

    // 更新连续计数
    if (data.isCorrect) {
      consecutiveCorrectRef.current++
      consecutiveWrongRef.current = 0
    } else {
      consecutiveWrongRef.current++
      consecutiveCorrectRef.current = 0
    }

    // 显示反馈
    setShowFeedback(true)
    setFeedbackType(data.isCorrect ? 'correct' : 'wrong')
  }, [recordAnswer])

  /**
   * 处理课堂完成（新流程）
   * 触发动态调整评估，标记会话完成
   */
  const handleClassroomComplete = useCallback(() => {
    // 从 learningStore 读取最新统计数据（避免 stale closure）
    const stats = useLearningStore.getState().sessionStats
    const answerCount = stats.questionsCompleted
    const correctRate = answerCount > 0 ? stats.correctCount / answerCount : 0

    // 触发动态调整（异步，不阻塞）
    // 使用 classroom.id 作为 knowledgeNodeId（课堂粒度的调整）
    void dynamicAdjusterRef.current.evaluate({
      knowledgeNodeId: currentClassroom?.id ?? 'unknown',
      knowledgeNodeName: currentClassroom?.title ?? '',
      currentMastery: Math.round(correctRate * 100),
      sessionCorrectRate: correctRate,
      totalAttempts: answerCount,
    })

    // 标记完成
    const subject = subjectRef.current
    endSession()
    setIsActive(false)
    setIsComplete(true)
    setSessionSummary({
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
      accuracy: stats.questionsCompleted > 0
        ? Math.round((stats.correctCount / stats.questionsCompleted) * 100)
        : 0,
      subject,
    })

    // 异步写入 DB
    onSessionEnd(subject, {
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
    })
  }, [currentClassroom, endSession, onSessionEnd])

  return {
    isActive,
    isLoading,
    currentQuestion,
    isCurrentReview,
    showFeedback,
    feedbackType,
    isComplete,
    sessionSummary,
    encouragement,
    currentInterstitial,
    currentClassroom,
    isCacheEmpty,
    classroomAnswerCount,
    startFlow,
    stopFlow,
    handleAnswer,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
    completeInterstitial,
  }
}
