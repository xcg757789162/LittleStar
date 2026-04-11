/**
 * usePlacementTest Hook
 * 封装入学测评引擎调用、状态管理、结果写入 DB
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PlacementTestEngine } from '@/engine/placement-test-engine'
import { loadCurriculum } from '@/curriculum'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import { placementTestKeys } from '@/hooks/queries/usePlacementTests'
import type { TestSession, TestPlanItem } from '@/engine/placement-test-engine'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('PlacementTest')

/** 测评阶段 */
export type PlacementPhase = 'intro' | 'welcome' | 'testing' | 'completing' | 'result' | 'error'

/** 反馈状态 */
export interface AnswerFeedback {
  isCorrect: boolean
  consecutiveCorrect: number
}

/** Hook 返回值 */
export interface PlacementTestState {
  /** 当前阶段 */
  phase: PlacementPhase
  /** 当前题目 */
  currentQuestion: TestPlanItem | null
  /** 答题进度 (0-1) */
  progress: number
  /** 总题目数 */
  totalQuestions: number
  /** 已答题数 */
  answeredCount: number
  /** 最近一次答题反馈 */
  lastFeedback: AnswerFeedback | null
  /** 测评结果 */
  result: PlacementResult | null
  /** 推荐的起始级别（图形化：星星数 1-5） */
  recommendedLevel: number
  /** 连续答对次数 */
  consecutiveCorrect: number
  /** 是否加载中 */
  isLoading: boolean
  /** 错误信息 */
  errorMessage: string | null
  /** 开始引导 */
  startIntro: () => void
  /** 开始测评 */
  startTest: () => Promise<void>
  /** 提交答案 */
  submitAnswer: (isCorrect: boolean) => void
  /** 关闭反馈，进入下一题 */
  dismissFeedback: () => void
  /** 完成结果页，跳转 */
  finishAndNavigate: () => void
}

export function usePlacementTest(
  subject: Subject,
  gradeLevel: GradeLevel,
  onComplete: (result: PlacementResult) => void,
): PlacementTestState {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<PlacementPhase>('intro')
  const [session, setSession] = useState<TestSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<TestPlanItem | null>(null)
  const [progress, setProgress] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const engine = useMemo(() => new PlacementTestEngine(), [])
  const consecutiveRef = useRef(0)

  /** 计算推荐的起始级别（1-5 星） */
  const recommendedLevel = useMemo(() => {
    if (!result) return 0
    const score = result.overallScore
    if (score >= 90) return 5
    if (score >= 70) return 4
    if (score >= 50) return 3
    if (score >= 30) return 2
    return 1
  }, [result])

  /** 开始引导动画阶段 */
  const startIntro = useCallback(() => {
    setPhase('intro')
  }, [])

  /** 开始测评 */
  const startTest = useCallback(async () => {
    log.info('开始测评, subject:', subject, 'gradeLevel:', gradeLevel)
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const curriculum = await loadCurriculum(gradeLevel, subject)
      if (!curriculum) {
        log.error('课程数据加载失败（后端服务连接失败或无数据）')
        setErrorMessage('后端服务连接失败或未找到课程数据，请检查服务是否正常运行后重试')
        setPhase('error')
        setIsLoading(false)
        return
      }

      const plan = engine.generateTestPlan(curriculum.modules)
      log.info('测评计划生成完成, 题目数:', plan.length)
      if (plan.length === 0) {
        log.warn('该科目暂无测评题目')
        setErrorMessage('该科目暂无测评题目')
        setPhase('error')
        setIsLoading(false)
        return
      }

      const newSession = engine.createSession(plan)
      setSession(newSession)
      setTotalQuestions(plan.length)
      setCurrentQuestion(engine.getCurrentQuestion(newSession))
      setPhase('testing')
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      log.error('加载课程数据失败:', message)
      setErrorMessage(`加载课程数据失败：${message}`)
      setPhase('error')
    } finally {
      setIsLoading(false)
    }
  }, [engine, gradeLevel, subject])

  /** 提交答案 */
  const submitAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!session) return

      // 更新连续答对计数
      if (isCorrect) {
        consecutiveRef.current++
      } else {
        consecutiveRef.current = 0
      }
      setConsecutiveCorrect(consecutiveRef.current)

      // 设置反馈
      setLastFeedback({
        isCorrect,
        consecutiveCorrect: consecutiveRef.current,
      })
    },
    [session],
  )

  /** 关闭反馈，进入下一题或完成 */
  const dismissFeedback = useCallback(() => {
    if (!session || !lastFeedback) return

    const submitResult = engine.submitAnswer(session, lastFeedback.isCorrect)
    setProgress(submitResult.progress / 100)
    setAnsweredCount(session.answers.length)
    setLastFeedback(null)

    if (submitResult.nextQuestion === null) {
      // 测评完成
      setPhase('completing')
      const finalize = async () => {
        try {
          const curriculum = await loadCurriculum(gradeLevel, subject)
          if (!curriculum) {
            // 课程数据加载失败（可能后端暂时断开），但答题数据已有
            // 构建一个基于已答数据的简单结果
            const correctCount = session.answers.filter(a => a.isCorrect).length
            const overallScore = session.answers.length > 0
              ? Math.round((correctCount / session.answers.length) * 100)
              : 0
            const fallbackResult: PlacementResult = {
              masteredNodes: session.answers.filter(a => a.isCorrect).map(a => a.nodeId),
              startingNodes: session.answers.filter(a => !a.isCorrect).map(a => a.nodeId).slice(0, 1),
              overallScore,
            }
            setResult(fallbackResult)
            setPhase('result')
            return
          }

          const testResult = engine.completeTest(session, curriculum.modules)
          setResult(testResult)

          // 写入 DB（通过 PostgREST API）
          try {
            const child = useChildStore.getState().currentChild
            const childId = child?.id ? Number(child.id) : 0
            await apiClient.post('/placement_tests', {
              childId,
              subject,
              gradeLevel,
              questions: session.answers.map((a) => ({
                knowledgeNodeId: a.nodeId,
                questionId: a.nodeId,
                answer: a.isCorrect,
                isCorrect: a.isCorrect,
                timeSpent: a.timeSpent,
              })),
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              result: testResult,
            })
            // 刷新 React Query 缓存，确保返回科目选择页时显示最新状态
            queryClient.invalidateQueries({
              queryKey: placementTestKeys.byChild(childId),
            })
          } catch {
            // DB 写入失败不阻塞结果显示（用户可以看到结果但数据未持久化）
            console.warn('测评结果写入数据库失败，将在下次连接时重试')
          }

          setPhase('result')
        } catch {
          // 最终兜底：即使出错也显示结果页
          setPhase('result')
        }
      }
      finalize()
    } else {
      setCurrentQuestion(submitResult.nextQuestion)
    }
  }, [session, lastFeedback, engine, gradeLevel, subject, onComplete])

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
    recommendedLevel,
    consecutiveCorrect,
    isLoading,
    errorMessage,
    startIntro,
    startTest,
    submitAnswer,
    dismissFeedback,
    finishAndNavigate,
  }
}
