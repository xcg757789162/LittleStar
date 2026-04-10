/**
 * useLearningFlow Hook
 * 学习主循环核心编排：
 * - OpenMAIC 流程：教导处选课 → 缓存加载 → ClassroomIframe 渲染 → 答题回写 → 动态调整
 * - 缓存为空时显示"课程准备中"提示
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
import { ClassroomCache, type CacheListItem } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { DynamicAdjuster } from '@/services/lesson-planner'
import { useLearningStore } from '@/stores/learningStore'
import { useChildStore } from '@/stores/childStore'
import { apiClient } from '@/services/api'
import { fetchRandomActivity } from '@/hooks/queries/useParentActivities'
import { fetchRandomTPR } from '@/hooks/queries/useTPRInstructions'
import type { ParentActivity, TPRCommand } from '@/services/api/types'
import type { FeedbackType } from '@/components/feedback/FeedbackAnimation'
import type { QuizAnswerData } from '@/components/classroom/QuizSlide'
import type { Subject, Question, KnowledgeNode, MasteryRecord, Achievement } from '@/types/models'
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
  /** 是否显示课程选择器 */
  showLessonPicker: boolean
  /** 缓存课程列表 */
  cachedLessons: CacheListItem[]
  /** 启动学习流程 */
  startFlow: (subject: Subject) => Promise<void>
  /** 加载缓存课程列表（展示课程选择器） */
  loadCachedLessons: (subject: Subject) => Promise<void>
  /** 从课程列表选择一节课进入课堂 */
  startLesson: (knowledgeNodeId: string, date: string) => Promise<void>
  /** 启动复习/重学流程 */
  startReview: (params: {
    mode: 'quick-review' | 'deep-relearn'
    subject: Subject
    historyId?: string
    knowledgeNodeId?: string
  }) => Promise<void>
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

  // 课程选择器状态
  const [showLessonPicker, setShowLessonPicker] = useState(false)
  const [cachedLessons, setCachedLessons] = useState<CacheListItem[]>([])

  // 引擎实例（useRef 避免重复创建）
  const reviewManagerRef = useRef(new ReviewManager())
  const ruleEngineRef = useRef(new RuleEngine())
  const achievementEngineRef = useRef(new AchievementEngine())
  const gradeUnlockEngineRef = useRef(new GradeUnlockEngine())
  const providerRef = useRef<AIProvider>(getAIProvider())
  const teacherRef = useRef(new AITeacher(providerRef.current))
  const subjectRef = useRef<Subject>('math')

  // 追踪当前课堂对应的知识点 ID 和日期（从缓存列表获取，用于完成后删除缓存）
  const currentKnowledgeNodeIdRef = useRef<string>('')
  const currentCacheDateRef = useRef<string>('')

  // 新流程：缓存和调整器实例
  // 使用 PostgresCacheStore 持久化到数据库（如果有 childId），否则 fallback 内存 Map
  const classroomCacheRef = useRef<ClassroomCache | null>(null)
  if (classroomCacheRef.current == null) {
    const child = useChildStore.getState().currentChild
    classroomCacheRef.current = child?.id
      ? new ClassroomCache(new PostgresCacheStore(Number(child.id)))
      : new ClassroomCache()
  }
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
    currentKnowledgeNodeIdRef.current = ''
    currentCacheDateRef.current = ''

    // 1. 启动 learningStore 会话
    startSession(subject)
    setIsActive(true)

    try {
      // 2. 尝试从缓存加载课堂（新流程）
      const cachedList = await classroomCacheRef.current!.listCachedClassrooms()

      if (cachedList.length > 0) {
        // 有缓存 → 加载第一个课堂
        const firstItem = cachedList[0]
        currentKnowledgeNodeIdRef.current = firstItem.knowledgeNodeId
        currentCacheDateRef.current = firstItem.date
        const classroom = await classroomCacheRef.current!.getClassroom(
          firstItem.knowledgeNodeId,
          firstItem.date,
        )

        if (classroom) {
          setCurrentClassroom(classroom)
          setIsCacheEmpty(false)
          setIsLoading(false)
          return // 新流程：课堂已加载，由 ClassroomIframe 渲染
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
   * 加载缓存课程列表（展示课程选择器）
   * 不直接进入课堂，而是展示可选课程列表
   */
  const loadCachedLessons = useCallback(async (subject: Subject) => {
    setIsLoading(true)
    setIsComplete(false)
    setSessionSummary(null)
    setCurrentInterstitial(null)
    setCurrentClassroom(null)
    setIsCacheEmpty(false)
    setClassroomAnswerCount(0)
    setShowLessonPicker(false)
    setCachedLessons([])
    subjectRef.current = subject

    try {
      const cachedList = await classroomCacheRef.current!.listCachedClassrooms(undefined, subject)

      if (cachedList.length > 0) {
        // 有缓存课程 → 展示课程选择器
        setCachedLessons(cachedList)
        setShowLessonPicker(true)
        setIsActive(true)
      } else {
        // 无缓存 → 展示课程选择器的空状态（而非走兜底路径）
        setCachedLessons([])
        setShowLessonPicker(true)
        setIsCacheEmpty(true)
        setIsActive(true)
      }
    } catch {
      setCachedLessons([])
      setShowLessonPicker(true)
      setIsCacheEmpty(true)
      setIsActive(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 防连击 guard — startLesson 进行中时拒绝重复调用
  const startLessonLockRef = useRef(false)

  /**
   * 从课程列表中选择一节课进入课堂
   * 由 LessonCard 点击触发（含快速连击防护）
   */
  const startLesson = useCallback(async (knowledgeNodeId: string, date: string) => {
    if (startLessonLockRef.current) return // 防连击
    startLessonLockRef.current = true

    setIsLoading(true)
    setShowLessonPicker(false)

    try {
      // 记录当前课堂的知识点和日期（完成后用于删除缓存）
      currentKnowledgeNodeIdRef.current = knowledgeNodeId
      currentCacheDateRef.current = date

      // 从缓存加载指定课堂
      const classroom = await classroomCacheRef.current!.getClassroom(knowledgeNodeId, date)
      if (classroom) {
        startSession(subjectRef.current)
        setCurrentClassroom(classroom)
        setIsCacheEmpty(false)
      } else {
        // 缓存已过期或被清除
        setIsCacheEmpty(true)
      }
    } catch {
      setIsCacheEmpty(true)
    } finally {
      setIsLoading(false)
      startLessonLockRef.current = false
    }
  }, [startSession])

  /**
   * 启动复习/重学流程
   * - quick-review: 从 classroom_snapshots 加载历史课堂，原样回放
   * - deep-relearn: 基于知识点重新加载缓存课堂
   */
  const startReview = useCallback(async (_params: {
    mode: 'quick-review' | 'deep-relearn'
    subject: Subject
    historyId?: string
    knowledgeNodeId?: string
  }) => {
    // TODO: 实现复习流程
    console.warn('[startReview] 复习流程尚未实现', _params)
  }, [])

  /**
   * 会话结束后的 DB 写入和引擎检查（异步，不阻塞 UI）
   */
  const onSessionEnd = useCallback(async (
    subject: Subject,
    stats: { questionsCompleted: number; correctCount: number },
    classroom?: Classroom | null,
    isCompleted: boolean = false,
  ) => {
    try {
      const child = useChildStore.getState().currentChild
      if (!child) return

      const childId = child.id ? Number(child.id) : 0
      const gradeLevel = child.gradeLevel

      // 1. 写入 DailySession（无论是否完成都记录）
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await apiClient.post('/daily_sessions', {
        childId,
        date: dateStr,
        startTime: today.toISOString(),
        questionsCompleted: stats.questionsCompleted,
        correctCount: stats.correctCount,
        subjects: [subject],
        streak: 1,
      })

      // 2. 写入 classroom_history（课堂学习历史）
      // 仅在正常完成（isCompleted=true）或有实质答题（questionsCompleted > 0）时写入
      // 中途退出且无答题 → 跳过，避免"幽灵记录"出现在复习列表中
      if (classroom && (isCompleted || stats.questionsCompleted > 0)) {
        const knowledgeNodeId = currentKnowledgeNodeIdRef.current || classroom.id || 'unknown'
        const accuracy = stats.questionsCompleted > 0
          ? Math.round((stats.correctCount / stats.questionsCompleted) * 100)
          : 0

        // 计算学习轮次
        const existingHistory = await apiClient.get<{ id: number }>('/classroom_history', {
          filters: [
            { column: 'childId', operator: 'eq', value: childId },
            { column: 'knowledgeNodeId', operator: 'eq', value: knowledgeNodeId },
          ],
          select: 'id',
        })
        const round = existingHistory.length + 1

        const historyRecord = await apiClient.post<{ id: number }>('/classroom_history', {
          childId,
          knowledgeNodeId,
          knowledgeNodeName: classroom.title ?? knowledgeNodeId,
          subject,
          classroomId: classroom.id,
          classroomTitle: classroom.title ?? '',
          date: dateStr,
          completedAt: today.toISOString(),
          round,
          isReview: false,
          questionsCompleted: stats.questionsCompleted,
          correctCount: stats.correctCount,
          accuracy,
        })

        // 写入课堂快照数据（classroom_snapshots 表，关联 classroom_history）
        if (historyRecord?.id) {
          await apiClient.post('/classroom_snapshots', {
            historyId: historyRecord.id,
            classroomData: classroom,
          })
        }

        // 3. Upsert mastery_records（更新掌握率）
        const correctRate = stats.questionsCompleted > 0
          ? stats.correctCount / stats.questionsCompleted
          : 0
        const masteryDelta = correctRate >= 0.8 ? 15 : correctRate >= 0.5 ? 5 : -5
        const baseMastery = 50 // 首次学习基线

        // 先尝试获取现有记录
        const existingMastery = await apiClient.get<MasteryRecord>('/mastery_records', {
          filters: [
            { column: 'childId', operator: 'eq', value: childId },
            { column: 'knowledgeNodeId', operator: 'eq', value: knowledgeNodeId },
          ],
        })

        const currentMastery = existingMastery.length > 0 ? existingMastery[0].masteryLevel : baseMastery
        const newMastery = Math.max(0, Math.min(100, currentMastery + masteryDelta))
        const nextReview = new Date(today.getTime() + (newMastery >= 80 ? 7 : newMastery >= 60 ? 3 : 1) * 24 * 60 * 60 * 1000)

        await apiClient.upsert('/mastery_records', {
          childId,
          knowledgeNodeId,
          masteryLevel: newMastery,
          lastPracticed: today.toISOString(),
          nextReviewDate: nextReview.toISOString(),
          consecutiveCorrect: correctRate >= 0.8 ? stats.correctCount : 0,
          totalAttempts: (existingMastery[0]?.totalAttempts ?? 0) + stats.questionsCompleted,
          totalCorrect: (existingMastery[0]?.totalCorrect ?? 0) + stats.correctCount,
        }, 'child_id,knowledge_node_id')
      }

      // 4. 加载当前掌握率（用于后续成就/年级检查）
      const masteryRecords = await apiClient.get<MasteryRecord>('/mastery_records', {
        filters: [{ column: 'childId', operator: 'eq', value: childId }],
      })

      const masteryMap = new Map<string, number>()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 5. 检查成就
      const existingAchievements = await apiClient.get<Achievement>('/achievements', {
        filters: [{ column: 'childId', operator: 'eq', value: childId }],
      })

      const subjectMasteries: Record<string, number> = {}
      for (const [, mastery] of masteryMap) {
        subjectMasteries[subject] = (subjectMasteries[subject] ?? 0) + mastery
      }

      const newAchievements = achievementEngineRef.current.checkAchievements({
        totalQuestionsCompleted: stats.questionsCompleted,
        consecutiveDays: 1,
        subjectMasteries,
        earnedAchievementIds: existingAchievements.map((a) => String(a.id ?? '')),
      })

      // 写入新成就
      for (const achievement of newAchievements) {
        await apiClient.post('/achievements', {
          childId,
          type: achievement.type,
          name: achievement.name,
          description: achievement.description,
          earnedAt: new Date().toISOString(),
          metadata: {},
        })
      }

      // 6. 检查年级解锁
      const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
        filters: [{ column: 'subject', operator: 'eq', value: subject }],
      })

      gradeUnlockEngineRef.current.checkUnlockEligibility({
        currentGrade: gradeLevel,
        subject,
        masteryMap,
        totalNodes: nodes.length,
      })

      // 7. 生成每日掌握度快照
      const nodesMastery: Record<string, number> = {}
      for (const [nodeId, mastery] of masteryMap) {
        nodesMastery[nodeId] = mastery
      }

      const snapshot = generateDailySnapshot({
        childId: String(childId),
        subject,
        gradeLevel,
        nodesMastery,
      })

      if (snapshot) {
        await apiClient.post('/mastery_snapshots', snapshot)
      }
    } catch (error) {
      // 写入失败不影响用户体验，但记录到 console 方便排查
      console.error('[onSessionEnd] DB 写入失败:', error)
    }
  }, [])

  /**
   * 停止学习流程
   * 中途退出时也传递课堂数据给 onSessionEnd，确保学习历史被记录
   * 如果当前处于课程选择器（尚未进入课堂），直接重置状态，跳过 endSession
   */
  const stopFlow = useCallback(() => {
    const subject = subjectRef.current

    // 课程选择器阶段退出：尚未调用 startSession，无需 endSession / onSessionEnd
    if (showLessonPicker) {
      setShowLessonPicker(false)
      setCachedLessons([])
      setIsActive(false)
      return
    }

    const stats = useLearningStore.getState().sessionStats
    const classroom = currentClassroom // 捕获当前课堂数据

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

    // 异步写入 DB（传递课堂数据）
    // isCompleted=false: 中途退出，若无实质答题则跳过课堂相关记录写入
    onSessionEnd(subject, {
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
    }, classroom, false)
  }, [endSession, onSessionEnd, currentClassroom, showLessonPicker])

  /**
   * 处理答题
   * 使用 getState() 直接读取最新状态，避免闭包捕获 currentQuestion 导致不必要重渲染
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

    // 异步更新复习调度 — 使用 getState() 获取最新 currentQuestion（避免 stale closure）
    const question = useLearningStore.getState().currentQuestion
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

      // 随机选择插入亲子活动或 TPR（异步获取数据）
      if (Math.random() < 0.5) {
        fetchRandomActivity().then((activity) => {
          setCurrentInterstitial({
            type: 'parent-activity',
            parentActivity: activity,
          })
        }).catch(() => {
          // 获取失败时静默跳过
        })
      } else {
        fetchRandomTPR().then((command) => {
          setCurrentInterstitial({
            type: 'tpr',
            tprCommand: command,
          })
        }).catch(() => {
          // 获取失败时静默跳过
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

    // 异步写入 DB（传递课堂数据用于写入 classroom_history 和 mastery_records）
    // 写入完成后删除已消费缓存 + 触发新一轮预生成
    // isCompleted=true: 正常完成课堂，写入所有记录
    onSessionEnd(subject, {
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
    }, currentClassroom, true).then(() => {
      // ① 删除已消费的缓存条目（避免下次 startFlow 加载同一堂课）
      const nodeId = currentKnowledgeNodeIdRef.current
      const cacheDate = currentCacheDateRef.current
      if (nodeId && cacheDate && classroomCacheRef.current) {
        classroomCacheRef.current.deleteClassroom(nodeId, cacheDate).catch((err) => {
          console.warn('[handleClassroomComplete] 删除已消费缓存失败:', err)
        })
      }

      // ② 触发新一轮后台预生成（基于最新 mastery_records 规划下一课）
      // 通过自定义事件通知 Home 页面的 usePreGeneration 重新触发
      window.dispatchEvent(new CustomEvent('classroom-completed', {
        detail: { subject, knowledgeNodeId: nodeId },
      }))
    }).catch(() => {
      // onSessionEnd 失败时仍尝试删除缓存（避免重复加载）
      const nodeId = currentKnowledgeNodeIdRef.current
      const cacheDate = currentCacheDateRef.current
      if (nodeId && cacheDate && classroomCacheRef.current) {
        classroomCacheRef.current.deleteClassroom(nodeId, cacheDate).catch(() => {})
      }
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
    showLessonPicker,
    cachedLessons,
    startFlow,
    loadCachedLessons,
    startLesson,
    startReview,
    stopFlow,
    handleAnswer,
    handleClassroomAnswer,
    handleClassroomComplete,
    dismissFeedback,
    completeInterstitial,
  }
}
