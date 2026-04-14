/**
 * usePlacementTest Hook
 *
 * 封装入学测评引擎调用、两阶段状态管理、结果写入 DB。
 *
 * 状态机流程（两阶段模式）：
 * intro → welcome → phase1_testing → phase1_analyzing →
 *   phase2_loading → phase2_testing → completing → result
 *
 * 核心原则：阶段二永远触发！评测的目的是精准定位孩子的真实水平。
 * - 阶段一表现差（<60%）→ verify 验证模式（确认薄弱点）
 * - 阶段一表现一般（60-80%）→ mixed 混合模式（验证+挑战）
 * - 阶段一表现好（>=80%）→ challenge 挑战模式（出更难的题找上限）
 *
 * 旧版兼容：仍支持 'testing' 阶段（单阶段模式，由路由参数控制）
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  PlacementTestEngine,
  type TwoPhaseTestSession,
  type ChoiceQuestion,
  type ChoiceSubmitResult,
  type AnswerRecord,
} from '@/engine/placement-test-engine'
import { loadCurriculum } from '@/curriculum'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import { mergeChildSettingsWithLiveStore } from '@/stores/openmaic/child-settings-compat'
import { extractChildSettingsFromStore } from '@/stores/openmaic/settings-reverse-sync'
import { placementTestKeys } from '@/hooks/queries/usePlacementTests'
import type {
  GradeLevel,
  Subject,
  PlacementResult,
  Phase1Analysis,
  Phase2Mode,
} from '@/types/models'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('PlacementTest')

// ===== 类型定义 =====

/** 测评阶段（两阶段状态机） */
export type PlacementUIPhase =
  | 'intro'              // 引导页
  | 'welcome'            // 欢迎页
  | 'phase1_testing'     // 阶段一答题中
  | 'phase1_analyzing'   // 阶段一分析中
  | 'phase2_loading'     // 阶段二题目加载中
  | 'phase2_testing'     // 阶段二答题中
  | 'completing'         // 评测完成处理中
  | 'result'             // 结果页
  | 'error'              // 错误页

/** 答题反馈状态 */
export interface ChoiceAnswerFeedback {
  /** 是否正确 */
  isCorrect: boolean
  /** 正确选项索引 */
  correctIndex: number
  /** 用户选择的索引 */
  selectedIndex: number
  /** 是否超时 */
  timedOut: boolean
  /** 连续答对次数 */
  consecutiveCorrect: number
}

/** Hook 返回值 */
export interface PlacementTestState {
  /** 当前 UI 阶段 */
  phase: PlacementUIPhase
  /** 当前选择题 */
  currentQuestion: ChoiceQuestion | null
  /** 答题进度 (0-1) */
  progress: number
  /** 当前阶段总题目数 */
  totalQuestions: number
  /** 当前阶段已答题数 */
  answeredCount: number
  /** 最近一次答题反馈 */
  lastFeedback: ChoiceAnswerFeedback | null
  /** 测评结果 */
  result: PlacementResult | null
  /** 阶段一分析结果 */
  phase1Analysis: Phase1Analysis | null
  /** 推荐的起始级别（1-5 星） */
  recommendedLevel: number
  /** 连续答对次数 */
  consecutiveCorrect: number
  /** 是否加载中 */
  isLoading: boolean
  /** 错误信息 */
  errorMessage: string | null
  /** 当前题目倒计时剩余秒数 (0-30) */
  countdown: number
  /** 当前测评阶段标识 ('phase1' | 'phase2') */
  currentPhaseLabel: 'phase1' | 'phase2' | null
  /** 阶段二模式：verify=验证薄弱 / challenge=挑战上限 / mixed=混合 */
  phase2Mode: Phase2Mode | null

  // 操作方法
  /** 开始引导 */
  startIntro: () => void
  /** 开始两阶段测评 */
  startTest: () => Promise<void>
  /** 提交选择题答案（selectedIndex: 0-3） */
  submitAnswer: (selectedIndex: number) => void
  /** 关闭反馈，进入下一题 */
  dismissFeedback: () => void
  /** 完成结果页，跳转 */
  finishAndNavigate: () => void
}

// ===== 常量 =====

const COUNTDOWN_SECONDS = 30
const COUNTDOWN_INTERVAL_MS = 1000

// ===== Hook 实现 =====

export function usePlacementTest(
  subject: Subject,
  gradeLevel: GradeLevel,
  onComplete: (result: PlacementResult) => void,
): PlacementTestState {
  const queryClient = useQueryClient()

  // UI 状态
  const [phase, setPhase] = useState<PlacementUIPhase>('intro')
  const [currentQuestion, setCurrentQuestion] = useState<ChoiceQuestion | null>(null)
  const [progress, setProgress] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<ChoiceAnswerFeedback | null>(null)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [phase1Analysis, setPhase1Analysis] = useState<Phase1Analysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState<'phase1' | 'phase2' | null>(null)
  const [phase2Mode, setPhase2Mode] = useState<Phase2Mode | null>(null)

  // Refs
  const engine = useMemo(() => new PlacementTestEngine(), [])
  const consecutiveRef = useRef(0)
  const phase1SessionRef = useRef<TwoPhaseTestSession | null>(null)
  const phase2SessionRef = useRef<TwoPhaseTestSession | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionStartTimeRef = useRef<number>(0)

  // ===== 倒计时管理 =====

  /** 启动倒计时 */
  const startCountdown = useCallback(() => {
    // 清除旧的
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(COUNTDOWN_SECONDS)
    questionStartTimeRef.current = Date.now()

    countdownRef.current = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // 超时
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, COUNTDOWN_INTERVAL_MS)
  }, [])

  /** 停止倒计时 */
  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  // 清理计时器
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // 倒计时归零时自动提交超时
  useEffect(() => {
    if (countdown !== 0) return
    if (phase !== 'phase1_testing' && phase !== 'phase2_testing') return
    if (lastFeedback) return // 已有反馈时不处理

    const activeSession = phase === 'phase1_testing'
      ? phase1SessionRef.current
      : phase2SessionRef.current

    if (!activeSession) return

    // 超时提交
    const submitResult = engine.submitTimeout(activeSession)
    consecutiveRef.current = 0
    setConsecutiveCorrect(0)

    setLastFeedback({
      isCorrect: false,
      correctIndex: submitResult.correctIndex,
      selectedIndex: -1,
      timedOut: true,
      consecutiveCorrect: 0,
    })
  }, [countdown, phase, lastFeedback, engine])

  // ===== 辅助函数 =====

  /** 获取当前活跃会话 */
  const getActiveSession = useCallback((): TwoPhaseTestSession | null => {
    if (phase === 'phase1_testing') return phase1SessionRef.current
    if (phase === 'phase2_testing') return phase2SessionRef.current
    return null
  }, [phase])

  /** 更新当前题目显示 */
  const updateCurrentQuestion = useCallback((session: TwoPhaseTestSession) => {
    const q = engine.getCurrentChoiceQuestion(session)
    setCurrentQuestion(q)
    if (q) {
      startCountdown()
    }
  }, [engine, startCountdown])

  /** 推荐级别计算 */
  const recommendedLevel = useMemo(() => {
    if (!result) return 0
    const score = result.overallScore
    if (score >= 90) return 5
    if (score >= 70) return 4
    if (score >= 50) return 3
    if (score >= 30) return 2
    return 1
  }, [result])

  // ===== 操作方法 =====

  /** 开始引导动画 */
  const startIntro = useCallback(() => {
    setPhase('intro')
  }, [])

  /** 开始两阶段测评 */
  const startTest = useCallback(async () => {
    log.info('开始两阶段测评, subject:', subject, 'gradeLevel:', gradeLevel)
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const curriculum = await loadCurriculum(gradeLevel, subject)
      if (!curriculum) {
        log.error('课程数据加载失败')
        setErrorMessage('后端服务连接失败或未找到课程数据，请检查服务是否正常运行后重试')
        setPhase('error')
        setIsLoading(false)
        return
      }

      // 生成阶段一计划
      const phase1Plan = await engine.generatePhase1Plan(
        curriculum.modules,
        subject,
        gradeLevel,
      )
      log.info('阶段一计划生成完成, 题目数:', phase1Plan.length)

      if (phase1Plan.length === 0) {
        log.warn('该科目暂无测评题目')
        setErrorMessage('该科目暂无测评题目')
        setPhase('error')
        setIsLoading(false)
        return
      }

      // 创建阶段一会话
      const session = engine.createTwoPhaseSession(phase1Plan, 'phase1')
      phase1SessionRef.current = session
      setTotalQuestions(phase1Plan.length)
      setAnsweredCount(0)
      setProgress(0)
      setCurrentPhaseLabel('phase1')
      updateCurrentQuestion(session)
      setPhase('phase1_testing')
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      log.error('加载课程数据失败:', message)
      setErrorMessage(`加载课程数据失败：${message}`)
      setPhase('error')
    } finally {
      setIsLoading(false)
    }
  }, [engine, gradeLevel, subject, updateCurrentQuestion])

  /** 提交选择题答案 */
  const submitAnswer = useCallback(
    (selectedIndex: number) => {
      const activeSession = getActiveSession()
      if (!activeSession) return
      if (lastFeedback) return // 防止重复提交

      stopCountdown()

      const timeSpent = Date.now() - questionStartTimeRef.current
      const submitResult: ChoiceSubmitResult = engine.submitChoiceAnswer(
        activeSession,
        selectedIndex,
        timeSpent,
      )

      // 更新连续答对
      if (submitResult.isCorrect) {
        consecutiveRef.current++
      } else {
        consecutiveRef.current = 0
      }
      setConsecutiveCorrect(consecutiveRef.current)

      setLastFeedback({
        isCorrect: submitResult.isCorrect,
        correctIndex: submitResult.correctIndex,
        selectedIndex,
        timedOut: false,
        consecutiveCorrect: consecutiveRef.current,
      })
    },
    [getActiveSession, lastFeedback, engine, stopCountdown],
  )

  /** 关闭反馈，进入下一题或下一阶段 */
  const dismissFeedback = useCallback(() => {
    if (!lastFeedback) return
    setLastFeedback(null)

    const activeSession = getActiveSession()
    if (!activeSession) return

    // 更新进度
    setProgress(activeSession.currentIndex / activeSession.choiceQuestions.length)
    setAnsweredCount(activeSession.answers.length)

    // 检查当前阶段是否完成
    const hasMore = activeSession.currentIndex < activeSession.choiceQuestions.length

    if (hasMore) {
      // 继续当前阶段
      updateCurrentQuestion(activeSession)
      return
    }

    // 当前阶段答完 → 进入下一阶段
    if (phase === 'phase1_testing') {
      handlePhase1Complete()
    } else if (phase === 'phase2_testing') {
      handleTestComplete()
    }
  }, [lastFeedback, getActiveSession, phase])

  /** 阶段一完成处理 */
  const handlePhase1Complete = useCallback(async () => {
    const session = phase1SessionRef.current
    if (!session) return

    setPhase('phase1_analyzing')
    stopCountdown()

    try {
      const curriculum = await loadCurriculum(gradeLevel, subject)
      if (!curriculum) {
        // 降级：直接完成
        handleTestComplete()
        return
      }

      const analysis = engine.analyzePhase1(session, curriculum.modules)
      setPhase1Analysis(analysis)
      setPhase2Mode(analysis.phase2Mode)
      log.info('阶段一分析完成:', analysis, '阶段二模式:', analysis.phase2Mode)

      // 阶段二永远触发！评测的目的是精准定位孩子的真实水平
      // - challenge: 阶段一表现优秀，出更难的题找到真实上限
      // - mixed: 阶段一表现一般，验证薄弱+适当挑战
      // - verify: 阶段一表现差，确认具体薄弱环节
      setPhase('phase2_loading')

      const child = useChildStore.getState().currentChild
      const settings = mergeChildSettingsWithLiveStore(
        child?.settings,
        extractChildSettingsFromStore(),
      )

      log.info(
        '[Phase2] 运行时配置解析完成',
        JSON.stringify({
          llmProviderId: settings?.llmProviderId || '',
          llmModel: settings?.llmModel || '',
          hasLlmApiKey: Boolean(settings?.llmApiKey),
        }),
      )

      const phase2Plan = await engine.generatePhase2Plan(
        analysis,
        curriculum.modules,
        subject,
        gradeLevel,
        settings ?? undefined,
      )

      if (phase2Plan.length === 0) {
        // 没有可用题目 → 直接完成（极端情况兜底）
        log.warn('阶段二无可用题目，直接完成')
        handleTestComplete()
        return
      }

      // 创建阶段二会话
      const phase2Session = engine.createTwoPhaseSession(phase2Plan, 'phase2')
      phase2SessionRef.current = phase2Session
      setTotalQuestions(phase2Plan.length)
      setAnsweredCount(0)
      setProgress(0)
      setCurrentPhaseLabel('phase2')
      consecutiveRef.current = 0
      setConsecutiveCorrect(0)
      updateCurrentQuestion(phase2Session)
      setPhase('phase2_testing')
    } catch (err) {
      log.error('阶段一分析/阶段二加载失败:', err)
      // 降级：直接以阶段一结果完成
      handleTestComplete()
    }
  }, [engine, gradeLevel, subject, stopCountdown, updateCurrentQuestion])

  /** 测评完成（两阶段合并结果） */
  const handleTestComplete = useCallback(async () => {
    setPhase('completing')
    stopCountdown()
    setCurrentQuestion(null)

    try {
      const curriculum = await loadCurriculum(gradeLevel, subject)
      const phase1Session = phase1SessionRef.current
      const phase2Session = phase2SessionRef.current

      if (!phase1Session) {
        setPhase('error')
        setErrorMessage('测评会话异常')
        return
      }

      let testResult: PlacementResult

      if (curriculum) {
        testResult = engine.completeTest(
          phase1Session,
          curriculum.modules,
          phase2Session ?? undefined,
        )
      } else {
        // 课程数据加载失败 → 基于已答数据构建结果
        const allAnswers = [
          ...phase1Session.answers,
          ...(phase2Session?.answers ?? []),
        ]
        const correctCount = allAnswers.filter(a => a.isCorrect).length
        const overallScore = allAnswers.length > 0
          ? Math.round((correctCount / allAnswers.length) * 100)
          : 0
        testResult = {
          masteredNodes: allAnswers.filter(a => a.isCorrect).map(a => a.nodeId),
          startingNodes: allAnswers.filter(a => !a.isCorrect).map(a => a.nodeId).slice(0, 1),
          overallScore,
        }
      }

      setResult(testResult)

      // 写入 DB
      try {
        const child = useChildStore.getState().currentChild
        const childId = child?.id ? Number(child.id) : 0

        // 写入阶段一记录
        const phase1Record = await apiClient.post('/placement_tests', {
          childId,
          subject,
          gradeLevel,
          phase: 'phase1',
          questions: phase1Session.answers.map((a: AnswerRecord, i: number) => ({
            knowledgeNodeId: a.nodeId,
            questionId: a.nodeId,
            answer: a.selectedIndex ?? a.isCorrect,
            isCorrect: a.isCorrect,
            timeSpent: a.timeSpent,
            stem: phase1Session.choiceQuestions[i]?.stem,
            selectedIndex: a.selectedIndex,
            timedOut: a.timedOut,
            source: phase1Session.choiceQuestions[i]?.source,
            difficulty: phase1Session.choiceQuestions[i]?.difficulty,
          })),
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          result: testResult,
          phase1Result: phase1Analysis,
        })

        // 如果有阶段二，写入阶段二记录
        if (phase2Session && phase2Session.answers.length > 0) {
          const phase1Id = (phase1Record as { id?: number })?.id
          await apiClient.post('/placement_tests', {
            childId,
            subject,
            gradeLevel,
            phase: 'phase2',
            parentTestId: phase1Id,
            phase1Result: phase1Analysis,
            questions: phase2Session.answers.map((a: AnswerRecord, i: number) => ({
              knowledgeNodeId: a.nodeId,
              questionId: a.nodeId,
              answer: a.selectedIndex ?? a.isCorrect,
              isCorrect: a.isCorrect,
              timeSpent: a.timeSpent,
              stem: phase2Session.choiceQuestions[i]?.stem,
              selectedIndex: a.selectedIndex,
              timedOut: a.timedOut,
              source: phase2Session.choiceQuestions[i]?.source,
              difficulty: phase2Session.choiceQuestions[i]?.difficulty,
            })),
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            result: testResult,
          })
        }

        // 写入 mastery_records — 让 LessonPlanner 基于评测结果做精准课程规划
        // 统一使用 knowledge_nodes ID（而非 curriculum_nodes ID）
        if (curriculum) {
          try {
            const masteryMap = engine.applyResult(
              phase1Session,
              curriculum.modules,
              phase2Session ?? undefined,
            )

            // Build curriculum_node name → knowledge_node id mapping
            const curriculumNameToKnNodeId = new Map<string, string>()
            try {
              const knNodes = await apiClient.get<{ id: string; name: string }>('/knowledge_nodes', {
                filters: [{ column: 'subject', operator: 'eq', value: subject }],
                select: 'id,name',
              })
              for (const kn of knNodes) {
                curriculumNameToKnNodeId.set(kn.name, kn.id)
              }
            } catch {
              log.warn('加载 knowledge_nodes 映射失败')
            }

            // Build curriculum_node id → name mapping
            const currNodeIdToName = new Map<string, string>()
            for (const mod of curriculum.modules) {
              for (const cn of mod.knowledgeNodes) {
                currNodeIdToName.set(cn.id, cn.name)
              }
            }

            const today = new Date()
            for (const [currNodeId, level] of masteryMap) {
              // Resolve to knowledge_nodes ID via name match
              const currNodeName = currNodeIdToName.get(currNodeId) ?? ''
              const knNodeId = curriculumNameToKnNodeId.get(currNodeName) ?? currNodeId

              const daysUntilReview = level >= 80 ? 7 : level >= 60 ? 3 : 1
              const nextReview = new Date(today.getTime() + daysUntilReview * 24 * 60 * 60 * 1000)
              await apiClient.upsert('/mastery_records', {
                childId,
                knowledgeNodeId: knNodeId,
                masteryLevel: level,
                lastPracticed: today.toISOString(),
                nextReviewDate: nextReview.toISOString(),
              })
            }
            log.info('mastery_records 写入完成, 共', masteryMap.size, '个知识点 (已映射为 knowledge_nodes ID)')
          } catch {
            log.warn('mastery_records 写入失败，将由课堂完成后补充')
          }
        }

        // 刷新缓存
        queryClient.invalidateQueries({
          queryKey: placementTestKeys.byChild(childId),
        })

        // 异步触发预生成（不 await，不阻塞结果页）
        triggerPreGeneration(childId, subject).catch(() => {
          log.warn('预生成触发失败，Home 页 Hook 将作为兜底')
        })
      } catch (dbErr) {
        log.error('测评结果写入数据库失败:', dbErr)
        console.error('测评结果写入数据库失败，详情:', dbErr)
      }

      setPhase('result')
    } catch {
      setPhase('result')
    }
  }, [engine, gradeLevel, subject, queryClient, phase1Analysis, stopCountdown])

  /** 完成结果页 */
  const finishAndNavigate = useCallback(() => {
    if (result) {
      onComplete(result)
    }
  }, [result, onComplete])

  return {
    phase,
    currentQuestion,
    progress,
    totalQuestions,
    answeredCount,
    lastFeedback,
    result,
    phase1Analysis,
    recommendedLevel,
    consecutiveCorrect,
    isLoading,
    errorMessage,
    countdown,
    currentPhaseLabel,
    phase2Mode,
    startIntro,
    startTest,
    submitAnswer,
    dismissFeedback,
    finishAndNavigate,
  }
}

// ===== 预生成触发 =====

/**
 * 异步触发课堂预生成
 *
 * 在评测完成后，发送 CustomEvent `placement-test-completed`
 * 通知 `usePreGeneration` 重新执行逐科学科缓存检查与补货。
 *
 * 不 await（不阻塞结果页展示），catch 错误静默处理。
 */
async function triggerPreGeneration(
  childId: number,
  subject: string,
): Promise<void> {
  log.info('[PreGeneration] 触发评测后预生成检查, childId:', childId, 'subject:', subject)

  try {
    window.dispatchEvent(new CustomEvent('placement-test-completed', {
      detail: { childId, subject, trigger: 'placement_test' },
    }))
    log.info('[PreGeneration] CustomEvent 已分发')
  } catch {
    log.warn('[PreGeneration] CustomEvent 分发失败')
  }
}
