/**
 * useLearningFlow Hook
 * 学习主循环核心编排：
 * OpenMAIC 流程：教导处选课 → 缓存加载/实时生成 → ClassroomView 渲染 → 答题回写 → 动态调整
 * Phase 1: 集成亲子互动环节 + TPR 全身反应法 + 艾宾浩斯复习机制
 * Phase 3: 集成 OpenMAIC 课堂缓存流程
 */

import { useState, useCallback, useRef } from 'react'
import { QwenProvider } from '@/services/ai/qwen-provider'
import { AITeacher } from '@/services/ai/teacher'
import { AchievementEngine } from '@/engine/achievement'
import { GradeUnlockEngine } from '@/engine/grade-unlock-engine'
import { generateDailySnapshot } from '@/engine/mastery-snapshot'
import { ReviewManager } from '@/engine/review-manager'
import { RuleEngine } from '@/engine/rule-engine'
import { ClassroomCache } from '@/services/openmaic/cache'
import { OpenMAICClient, type GenerationProgress } from '@/services/openmaic/client'
import { DynamicAdjuster, RequirementGenerator, LessonPlanner } from '@/services/lesson-planner'
import { useLearningStore } from '@/stores/learningStore'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'
import { getRandomActivity } from '@/data/seed/english-parent-activities'
import { getRandomTPR } from '@/data/seed/english-tpr'
import type { ParentActivity } from '@/data/seed/english-parent-activities'
import type { TPRCommand } from '@/data/seed/english-tpr'
import type { FeedbackType } from '@/components/feedback/FeedbackAnimation'
import type { QuizAnswerData } from '@/components/classroom/QuizSlide'
import type { Subject, Question } from '@/types/models'
import type { AIProvider } from '@/services/ai/provider'
import type { Classroom } from '@/services/openmaic/types'
import { ReviewLearningService, type ReLearnMode } from '@/services/review-learning'

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
  /** 正在实时生成课堂中 */
  isGenerating: boolean
  /** 课堂生成详细进度 */
  generationProgress: GenerationProgress | null
  /** 课堂生成错误信息 */
  generationError: string | null
  /** 课堂答题计数 */
  classroomAnswerCount: number
  /** 当前是否为重学/复习模式 */
  isReviewMode: boolean
  /** 当前重学模式 */
  reLearnMode: ReLearnMode | null
  /** 启动学习流程 */
  startFlow: (subject: Subject) => Promise<void>
  /** 启动重新学习流程（快速复习/智能重学） */
  startReview: (params: StartReviewParams) => Promise<void>
  /** 停止学习流程 */
  stopFlow: () => void
  /** 处理答题 */
  handleAnswer: (isCorrect: boolean) => void
  /** 处理课堂答题 */
  handleClassroomAnswer: (data: ClassroomAnswerData) => void
  /** 处理课堂完成 */
  handleClassroomComplete: () => void
  /** 关闭反馈动画 */
  dismissFeedback: () => void
  /** 完成插入环节 */
  completeInterstitial: () => void
}

/** 启动重新学习的参数 */
export interface StartReviewParams {
  /** 知识点 ID */
  knowledgeNodeId: string
  /** 知识点名称 */
  knowledgeNodeName: string
  /** 科目 */
  subject: Subject
  /** 重学模式：quick-review（原样回放）/ deep-relearn（AI 重新生成） */
  mode: ReLearnMode
  /** 历史记录 ID（快速复习模式时用于加载历史课堂） */
  historyId?: string
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [classroomAnswerCount, setClassroomAnswerCount] = useState(0)

  // 重学/复习模式状态
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [reLearnMode, setReLearnMode] = useState<ReLearnMode | null>(null)

  // 引擎实例（useRef 避免重复创建）
  const reviewManagerRef = useRef(new ReviewManager())
  const ruleEngineRef = useRef(new RuleEngine())
  const achievementEngineRef = useRef(new AchievementEngine())
  const gradeUnlockEngineRef = useRef(new GradeUnlockEngine())
  const providerRef = useRef<AIProvider>(getAIProvider())
  const teacherRef = useRef(new AITeacher(providerRef.current))
  const subjectRef = useRef<Subject>('math')

  // 新流程：缓存、客户端、教导处实例
  const classroomCacheRef = useRef(new ClassroomCache())
  const openmaicClientRef = useRef(new OpenMAICClient())
  const requirementGeneratorRef = useRef(new RequirementGenerator())
  const lessonPlannerRef = useRef(new LessonPlanner())
  const dynamicAdjusterRef = useRef(new DynamicAdjuster())

  // 重学服务实例
  const reviewLearningServiceRef = useRef(new ReviewLearningService())
  // 重学时追踪当前知识点信息
  const reviewKnowledgeNodeIdRef = useRef<string>('')
  const reviewKnowledgeNodeNameRef = useRef<string>('')

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
   * 缓存未命中时调用 OpenMAIC 实时生成课堂
   */
  const startFlow = useCallback(async (subject: Subject) => {
    setIsLoading(true)
    setIsComplete(false)
    setSessionSummary(null)
    setCurrentInterstitial(null)
    setIsCurrentReview(false)
    setCurrentClassroom(null)
    setIsGenerating(false)
    setGenerationProgress(null)
    setGenerationError(null)
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
      // 2. 尝试从缓存加载课堂
      const cachedList = await classroomCacheRef.current.listCachedClassrooms()

      if (cachedList.length > 0) {
        const firstItem = cachedList[0]
        const classroom = await classroomCacheRef.current.getClassroom(
          firstItem.knowledgeNodeId,
          firstItem.date,
        )

        if (classroom) {
          setCurrentClassroom(classroom)
          setIsLoading(false)
          return // 课堂已加载，由 ClassroomView 渲染
        }
      }

      // 3. 缓存未命中 → 调用 OpenMAIC 实时生成课堂
      setIsGenerating(true)
      setIsLoading(false)

      const child = useChildStore.getState().currentChild
      const childAge = child?.age ?? 5
      const gradeLevel = child?.gradeLevel ?? 'middle-kindergarten'

      // 使用教导处规划课程并生成 requirement
      const masteryMap = new Map<string, number>()
      const nodes = await db.knowledgeNodes
        .where('subject')
        .equals(subject)
        .toArray()

      // 加载掌握率（路由守卫保证 child 一定存在）
      const childId = child?.id
      if (!childId) throw new Error('No active child')
      const masteryRecords = await db.masteryRecords
        .where('childId')
        .equals(childId)
        .toArray()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 选择第一个知识点（教导处规划）
      const plans = lessonPlannerRef.current.planLessons({
        nodes,
        masteryMap,
        subject,
        reviewQueue: [],
      })

      const day1Plans = plans[0]?.items
      const firstPlan = day1Plans?.[0]
      if (!firstPlan) {
        throw new Error('No lesson plan available')
      }

      const targetNode = nodes.find((n) => n.id === firstPlan.nodeId)
      const mastery = masteryMap.get(firstPlan.nodeId) ?? 0

      // 生成 requirement
      const requirement = requirementGeneratorRef.current.generate({
        knowledgeNode: {
          id: firstPlan.nodeId,
          name: targetNode?.name ?? firstPlan.nodeId,
          description: targetNode?.description ?? '',
          difficulty: targetNode?.difficulty ?? 1,
          prerequisites: targetNode?.prerequisites ?? [],
          templatePrompts: [],
        },
        child: { age: childAge, gradeLevel },
        masteryLevel: mastery,
        mode: mastery === 0 ? 'new-teaching' : 'reinforcement',
      })

      // 提交生成请求
      const { classroomId } = await openmaicClientRef.current.generateClassroom({
        requirement,
      })

      // 更新进度：已提交
      setGenerationProgress({
        percent: 10,
        stage: '已提交生成请求，等待 AI 老师响应...',
        stageKey: 'submitting',
        attempt: 0,
        maxAttempts: 180,
        elapsedSeconds: 0,
      })

      // 轮询等待生成完成（最大 15 分钟）
      const classroom = await openmaicClientRef.current.pollUntilComplete(
        classroomId,
        {
          intervalMs: 5000,
          maxAttempts: 180,
          onDetailedProgress: (progress) => {
            setGenerationProgress(progress)
          },
        },
      )

      // 缓存生成结果
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await classroomCacheRef.current.saveClassroom(
        firstPlan.nodeId,
        dateStr,
        classroom,
      )

      setCurrentClassroom(classroom)
      setIsGenerating(false)
    } catch (error) {
      // 生成失败保持激活状态，让用户可以退出
      setIsGenerating(false)
      const errorMsg = error instanceof Error ? error.message : '课堂生成失败，请检查网络连接'
      setGenerationError(errorMsg)
      console.error('Failed to load/generate classroom:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startSession])

  /**
   * 启动重新学习流程
   * - quick-review：从历史记录加载原样课堂回放
   * - deep-relearn：AI 重新生成课堂（调整难度和题目）
   */
  const startReview = useCallback(async (params: StartReviewParams) => {
    const { knowledgeNodeId, knowledgeNodeName, subject, mode, historyId } = params

    setIsLoading(true)
    setIsComplete(false)
    setSessionSummary(null)
    setCurrentInterstitial(null)
    setIsCurrentReview(false)
    setCurrentClassroom(null)
    setIsGenerating(false)
    setGenerationProgress(null)
    setGenerationError(null)
    setClassroomAnswerCount(0)
    setIsReviewMode(true)
    setReLearnMode(mode)
    subjectRef.current = subject
    consecutiveCorrectRef.current = 0
    consecutiveWrongRef.current = 0
    answeredSinceInterstitialRef.current = 0
    reviewQuestionIdsRef.current = new Set()
    reviewKnowledgeNodeIdRef.current = knowledgeNodeId
    reviewKnowledgeNodeNameRef.current = knowledgeNodeName

    // 启动 learningStore 会话
    startSession(subject)
    setIsActive(true)

    try {
      if (mode === 'quick-review') {
        // 快速复习：从历史记录加载课堂数据
        let classroom: Classroom | null = null

        if (historyId) {
          classroom = await reviewLearningServiceRef.current.loadClassroomFromHistory(historyId)
        }

        if (!classroom) {
          // 没有指定 historyId 或加载失败，尝试加载最新的课堂
          const child = useChildStore.getState().currentChild
          if (!child?.id) return
          const childId = child.id
          classroom = await reviewLearningServiceRef.current.getLatestClassroom(childId, knowledgeNodeId)
        }

        if (classroom) {
          setCurrentClassroom(classroom)
          setIsLoading(false)
          return
        }

        // 如果没有历史课堂可用，降级为 deep-relearn
        console.warn('No history classroom found, falling back to deep-relearn mode')
      }

      // deep-relearn 或 quick-review 降级：AI 重新生成课堂
      setIsGenerating(true)
      setIsLoading(false)

      const child = useChildStore.getState().currentChild
      const childAge = child?.age ?? 5
      const gradeLevel = child?.gradeLevel ?? 'middle-kindergarten'
      if (!child?.id) return
      const childId = child.id

      // 加载该知识点当前掌握率
      const masteryRecords = await db.masteryRecords
        .where('[childId+knowledgeNodeId]')
        .equals([childId, knowledgeNodeId])
        .toArray()

      const mastery = masteryRecords.length > 0 ? masteryRecords[0].masteryLevel : 0

      // 加载知识点详情
      const targetNode = await db.knowledgeNodes.get(knowledgeNodeId)

      // 使用 reinforcement 模式生成 requirement（重学专用）
      const requirement = requirementGeneratorRef.current.generate({
        knowledgeNode: {
          id: knowledgeNodeId,
          name: knowledgeNodeName,
          description: targetNode?.description ?? '',
          difficulty: targetNode?.difficulty ?? 1,
          prerequisites: targetNode?.prerequisites ?? [],
          templatePrompts: [],
        },
        child: { age: childAge, gradeLevel },
        masteryLevel: mastery,
        mode: 'reinforcement',
      })

      // 提交生成请求
      const { classroomId } = await openmaicClientRef.current.generateClassroom({
        requirement,
      })

      // 更新进度：已提交
      setGenerationProgress({
        percent: 10,
        stage: '已提交重学请求，等待 AI 老师响应...',
        stageKey: 'submitting',
        attempt: 0,
        maxAttempts: 180,
        elapsedSeconds: 0,
      })

      // 轮询等待生成完成（最大 15 分钟）
      const classroom = await openmaicClientRef.current.pollUntilComplete(
        classroomId,
        {
          intervalMs: 5000,
          maxAttempts: 180,
          onDetailedProgress: (progress) => {
            setGenerationProgress(progress)
          },
        },
      )

      setCurrentClassroom(classroom)
      setIsGenerating(false)
    } catch (error) {
      setIsGenerating(false)
      const errorMsg = error instanceof Error ? error.message : '重学课堂生成失败'
      setGenerationError(errorMsg)
      console.error('Failed to start review learning:', error)
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

      const childId = child.id
      if (!childId) return
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
      if (!child?.id) return
      const childId = child.id
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

    // 课堂模式下不由 dismissFeedback 控制会话结束
    // 课堂的完成由 ClassroomView.onComplete → handleClassroomComplete 控制
    if (currentClassroom) {
      return
    }

    // 检查题目队列是否耗尽（仅旧的独立题目模式使用）
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
  }, [currentClassroom, endSession, stopFlow, onSessionEnd])

  /**
   * 完成插入环节（亲子互动/TPR），继续答题
   */
  const completeInterstitial = useCallback(() => {
    setCurrentInterstitial(null)
  }, [])

  /**
   * 处理课堂答题（新流程）
   * 回写掌握率数据并更新答题计数
   * 注意：课堂模式下 QuizSlide 内部已有反馈动画，不在 LearningSession 层重复显示
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

    // 课堂模式下不设置 showFeedback — QuizSlide 内部已有反馈动画
    // 如果设置了 showFeedback，会触发 LearningSession 层的 FeedbackAnimation → dismissFeedback，
    // 导致课堂模式下提前结束会话
  }, [recordAnswer])

  /**
   * 处理课堂完成（新流程）
   * 触发动态调整评估，保存学习历史，标记会话完成
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

    // 异步保存课堂到学习历史（不阻塞 UI）
    if (currentClassroom) {
      const child = useChildStore.getState().currentChild
      const childId = child?.id
      if (!childId) return

      // 确定知识点信息：重学模式使用 ref 中的值，正常模式使用课堂信息
      const nodeId = isReviewMode
        ? reviewKnowledgeNodeIdRef.current
        : (currentClassroom.id ?? 'unknown')
      const nodeName = isReviewMode
        ? reviewKnowledgeNodeNameRef.current
        : (currentClassroom.title ?? '')

      void reviewLearningServiceRef.current.saveClassroomHistory({
        childId,
        knowledgeNodeId: nodeId,
        knowledgeNodeName: nodeName,
        subject: subjectRef.current,
        classroom: currentClassroom,
        questionsCompleted: stats.questionsCompleted,
        correctCount: stats.correctCount,
        isReview: isReviewMode,
      }).catch((err) => {
        console.error('Failed to save classroom history:', err)
      })
    }

    // 标记完成
    const subject = subjectRef.current
    endSession()
    setIsActive(false)
    setIsComplete(true)
    setIsReviewMode(false)
    setReLearnMode(null)
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
  }, [currentClassroom, endSession, onSessionEnd, isReviewMode])

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
    isGenerating,
    generationProgress,
    generationError,
    classroomAnswerCount,
    isReviewMode,
    reLearnMode,
    startFlow,
    startReview,
    stopFlow,
    handleAnswer,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
    completeInterstitial,
  }
}
