/**
 * useLearningFlow Hook
 * 学习主循环核心编排：AdaptiveRouter → QuestionGenerator → 答题 → 反馈 → 掌握率更新
 */

import { useState, useCallback, useRef } from 'react'
import { AdaptiveRouter } from '@/engine/adaptive-router'
import { QuestionGenerator } from '@/services/ai/question-generator'
import { QwenProvider } from '@/services/ai/qwen-provider'
import { AITeacher } from '@/services/ai/teacher'
import { AchievementEngine } from '@/engine/achievement'
import { GradeUnlockEngine } from '@/engine/grade-unlock-engine'
import { generateDailySnapshot } from '@/engine/mastery-snapshot'
import { MasteryCalculator } from '@/engine/mastery'
import { RuleEngine } from '@/engine/rule-engine'
import { useLearningStore } from '@/stores/learningStore'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'
import type { FeedbackType } from '@/components/feedback/FeedbackAnimation'
import type { Subject, Question, KnowledgeNode } from '@/types/models'
import type { AIProvider } from '@/services/ai/provider'

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

/** Hook 返回值 */
export interface LearningFlowState {
  /** 学习是否激活 */
  isActive: boolean
  /** 是否加载中 */
  isLoading: boolean
  /** 当前题目 */
  currentQuestion: Question | null
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
  /** 启动学习流程 */
  startFlow: (subject: Subject) => Promise<void>
  /** 停止学习流程 */
  stopFlow: () => void
  /** 处理答题 */
  handleAnswer: (isCorrect: boolean) => void
  /** 关闭反馈动画 */
  dismissFeedback: () => void
}

export function useLearningFlow(): LearningFlowState {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('correct')
  const [isComplete, setIsComplete] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [encouragement, setEncouragement] = useState('')

  // 引擎实例（useRef 避免重复创建）
  const routerRef = useRef(new AdaptiveRouter())
  const masteryCalcRef = useRef(new MasteryCalculator())
  const ruleEngineRef = useRef(new RuleEngine())
  const achievementEngineRef = useRef(new AchievementEngine())
  const gradeUnlockEngineRef = useRef(new GradeUnlockEngine())
  const providerRef = useRef<AIProvider>(getAIProvider())
  const generatorRef = useRef(new QuestionGenerator(providerRef.current))
  const teacherRef = useRef(new AITeacher(providerRef.current))
  const subjectRef = useRef<Subject>('math')

  // 追踪连续正确/错误
  const consecutiveCorrectRef = useRef(0)
  const consecutiveWrongRef = useRef(0)

  // 只订阅 actions（稳定引用），避免订阅频繁变化的数据导致不必要重渲染
  const startSession = useLearningStore((s) => s.startSession)
  const endSession = useLearningStore((s) => s.endSession)
  const setQuestionQueue = useLearningStore((s) => s.setQuestionQueue)
  const recordAnswer = useLearningStore((s) => s.recordAnswer)

  // 响应式订阅 currentQuestion — UI 需要随题目切换自动重渲染
  const currentQuestion = useLearningStore((s) => s.currentQuestion)

  /**
   * 启动学习流程
   */
  const startFlow = useCallback(async (subject: Subject) => {
    setIsLoading(true)
    setIsComplete(false)
    setSessionSummary(null)
    subjectRef.current = subject
    consecutiveCorrectRef.current = 0
    consecutiveWrongRef.current = 0

    // 1. 启动 learningStore 会话
    startSession(subject)
    setIsActive(true)

    try {
      // 2. 获取孩子信息
      const child = useChildStore.getState().currentChild
      const childId = child?.id ?? 'default'
      const gradeLevel = child?.gradeLevel ?? 'middle-kindergarten'

      // 3. 从 DB 加载知识点
      const nodes = await db.knowledgeNodes
        .where('subject')
        .equals(subject)
        .toArray()

      // 4. 从 DB 加载掌握率
      const masteryRecords = await db.masteryRecords
        .where('childId')
        .equals(childId)
        .toArray()

      const masteryMap = new Map<string, number>()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 5. AdaptiveRouter 推荐知识点
      const recommendedNodes = routerRef.current.getRecommendations({
        nodes: nodes as KnowledgeNode[],
        masteryMap,
        currentSubject: subject,
        count: ruleEngineRef.current.getRecommendedQuestionsPerSession(gradeLevel),
      })

      // 6. QuestionGenerator 为每个推荐知识点生成题目
      const questions: Question[] = []
      for (const node of recommendedNodes) {
        try {
          const generated = await generatorRef.current.generate({
            subject,
            knowledgeNodeId: node.id!,
            difficulty: node.difficulty,
            type: node.contentType === 'quiz' ? 'multiple-choice' : 'flashcard',
          })

          questions.push({
            id: `q-${node.id}-${Date.now()}`,
            knowledgeNodeId: node.id!,
            type: generated.options ? 'multiple-choice' : 'flashcard',
            content: {
              text: generated.question,
              options: generated.options?.map((opt) => ({
                id: opt.id,
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
            answer: generated.answer,
            difficulty: generated.difficulty,
            isAIGenerated: !generated.isFallback,
          })
        } catch {
          // 单题生成失败跳过
        }
      }

      // 7. 设置题目队列
      if (questions.length > 0) {
        setQuestionQueue(questions)
      }
    } catch {
      // 加载失败也保持激活，让用户可以退出
    } finally {
      setIsLoading(false)
    }
  }, [startSession, setQuestionQueue])

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
  }, [recordAnswer])

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

  return {
    isActive,
    isLoading,
    currentQuestion,
    showFeedback,
    feedbackType,
    isComplete,
    sessionSummary,
    encouragement,
    startFlow,
    stopFlow,
    handleAnswer,
    dismissFeedback,
  }
}
