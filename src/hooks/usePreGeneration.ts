/**
 * usePreGeneration Hook
 * 
 * 评测完成后自动触发课堂预生成（后台异步）。
 * 在 Home 页面调用，当检测到：
 * 1. 有已完成的评测记录
 * 2. 课堂缓存为空
 * 时，自动调用 LessonPlanner → RequirementGenerator → GenerationScheduler 链路。
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { OpenMAICClient } from '@/services/openmaic/client'
import { OpenMAICPipelineClient } from '@/services/openmaic/pipeline-client'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { buildHeadersFromSettings } from '@/services/openmaic/headers-builder'
import {
  LessonPlanner,
  RequirementGenerator,
  GenerationScheduler,
} from '@/services/lesson-planner'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import type { Subject, KnowledgeNode, MasteryRecord, PlacementTest } from '@/types/models'
import type { PipelineStepName } from '@/services/openmaic/pipeline-types'

/** 预生成状态 */
export type PreGenerationStatus = 'idle' | 'checking' | 'generating' | 'completed' | 'failed'

/** Hook 返回值 */
export interface PreGenerationState {
  /** 当前状态 */
  status: PreGenerationStatus
  /** 正在生成的任务数 */
  pendingCount: number
  /** 已完成的任务数 */
  completedCount: number
  /** 任务总数（提交后确定） */
  totalCount: number
  /** 当前阶段文案（中文，适合直接展示） */
  stageText: string
  /** 错误信息 */
  error: string | null
  /** 手动触发预生成 */
  triggerGeneration: () => void

  // === Pipeline 进度状态 ===
  /** 当前 Pipeline 步骤名称（outlines/scene-content/scene-actions/tts/assembly） */
  generationStep: PipelineStepName | null
  /** Pipeline 生成进度百分比 0-100 */
  generationProgress: number
  /** 当前处理的场景索引 */
  currentSceneIndex: number
}

const SUBJECTS: Subject[] = ['math', 'chinese', 'english']

/** 最小缓存水位线：缓存低于此数量时自动触发预生成补充 */
const MIN_CACHE_SIZE = 3

export function usePreGeneration(
  childId: string | number | undefined,
  hasPlacementTest: boolean | null,
  cachedCount: number,
): PreGenerationState {
  const [status, setStatus] = useState<PreGenerationStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [stageText, setStageText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Pipeline 进度状态
  const [generationStep, setGenerationStep] = useState<PipelineStepName | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)

  // 防止重复触发
  const isRunningRef = useRef(false)
  const hasTriggeredRef = useRef(false)

  /**
   * 核心预生成逻辑
   */
  const runPreGeneration = useCallback(async () => {
    if (!childId || isRunningRef.current) return
    isRunningRef.current = true
    setStatus('checking')
    setStageText('正在分析学习情况...')
    setError(null)

    try {
      const numChildId = Number(childId)
      const child = useChildStore.getState().currentChild
      if (!child) {
        setStatus('idle')
        isRunningRef.current = false
        return
      }

      // 1. 查询已完成的评测科目
      const tests = await apiClient.get<PlacementTest>('/placement_tests', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
      })
      const completedSubjects = new Set(tests.map((t) => t.subject as Subject))

      if (completedSubjects.size === 0) {
        setStatus('idle')
        isRunningRef.current = false
        return
      }

      // 2. 初始化缓存
      const cache = new ClassroomCache(new PostgresCacheStore(numChildId))
      const existingSize = await cache.getCacheSize()

      // 如果缓存已达到最小水位线，不再生成
      if (existingSize >= MIN_CACHE_SIZE) {
        setStatus('completed')
        setCompletedCount(existingSize)
        isRunningRef.current = false
        return
      }

      // 3. 对每个已完成评测的科目生成课堂
      setStatus('generating')
      setStageText('正在规划课程...')
      const client = new OpenMAICClient()
      const planner = new LessonPlanner()
      const reqGenerator = new RequirementGenerator()

      // 尝试构建 Pipeline Client（如果孩子设置中配置了 LLM 信息）
      let pipelineClient: OpenMAICPipelineClient | undefined
      let pipelineHeaders: Record<string, string> | undefined
      try {
        if (child.settings.llmModel && child.settings.llmApiKey) {
          pipelineClient = new OpenMAICPipelineClient()
          pipelineHeaders = buildHeadersFromSettings(child.settings)
        }
      } catch {
        // 构建 headers 失败（如缺少必要配置），不使用 Pipeline
      }

      const scheduler = new GenerationScheduler(client, cache, {
        maxRetries: 2,
        retryIntervals: [3000, 10000],
        pollIntervalMs: 5000,
        maxPollAttempts: 120,
        onTaskProgress: (info) => {
          setCompletedCount(info.completedCount)
          setPendingCount(info.totalCount - info.completedCount - info.failedCount)
          setTotalCount(info.totalCount)
          setStageText(info.stageText)
        },
        pipelineClient,
        pipelineHeaders,
        onPipelineProgress: (progress) => {
          setGenerationStep(progress.step)
          setGenerationProgress(progress.percent)
          if (progress.sceneIndex !== undefined) {
            setCurrentSceneIndex(progress.sceneIndex)
          }
          if (progress.message) {
            setStageText(progress.message)
          }
        },
      })

      // 4. 获取掌握率
      const masteryRecords = await apiClient.get<MasteryRecord>('/mastery_records', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
      })
      const masteryMap = new Map<string, number>()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 5. 对每个科目做课程规划
      let totalTasks = 0
      for (const subject of SUBJECTS) {
        if (!completedSubjects.has(subject)) continue

        try {
          // 获取该科目的知识点
          const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
            filters: [{ column: 'subject', operator: 'eq', value: subject }],
            order: [{ column: 'orderIndex', ascending: true }],
          })

          if (nodes.length === 0) continue

          // 规划课程（规划 2 天，确保有足够储备）
          const plans = planner.planLessons({
            nodes,
            masteryMap,
            subject,
            reviewQueue: [],
            days: 2,
          })

          // 为每个计划项生成 requirement 并提交
          const today = new Date()
          const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

          for (const dayPlan of plans) {
            for (const item of dayPlan.items) {
              // 找到对应的知识点完整信息
              const node = nodes.find((n) => n.id === item.nodeId)
              if (!node) continue

              const requirement = reqGenerator.generate({
                knowledgeNode: {
                  id: node.id!,
                  name: node.name,
                  description: node.description ?? '',
                  difficulty: node.difficulty,
                  templatePrompts: node.templatePrompts ?? [],
                  prerequisites: node.prerequisites ?? [],
                },
                child: {
                  age: child.age,
                  gradeLevel: child.gradeLevel,
                },
                masteryLevel: item.masteryLevel,
                mode: item.mode,
              })

              scheduler.submitTask({
                knowledgeNodeId: item.nodeId,
                date: dateStr,
                requirement,
              })
              totalTasks++
            }
          }
        } catch (subjectError) {
          // 单科目失败不影响其他科目
          console.warn(`[PreGeneration] ${subject} 课程规划失败:`, subjectError)
        }
      }

      setPendingCount(totalTasks)
      setTotalCount(totalTasks)

      if (totalTasks === 0) {
        // 无知识点数据，回退到简单生成
        // 为每个已完成科目生成一个默认课堂
        for (const subject of SUBJECTS) {
          if (!completedSubjects.has(subject)) continue

          const subjectLabels: Record<Subject, string> = {
            math: '趣味数学入门',
            chinese: '快乐语文启蒙',
            english: '英语字母乐园',
          }

          scheduler.submitTask({
            knowledgeNodeId: `default-${subject}`,
            date: new Date().toISOString().slice(0, 10),
            requirement: `为一位 ${child.age} 岁的 ${child.gradeLevel} 学生创建一节${subjectLabels[subject]}课堂。包含教学和测验环节，以趣味互动为主，难度适中。`,
          })
          totalTasks++
        }
        setPendingCount(totalTasks)
        setTotalCount(totalTasks)
      }

      if (totalTasks > 0) {
        // 6. 执行所有任务（后台并行）
        const results = await scheduler.executeTasks()
        const completed = results.filter((t) => t.status === 'completed').length
        const failed = results.filter((t) => t.status === 'failed').length

        setCompletedCount(completed)
        setPendingCount(0)

        if (failed > 0) {
          console.warn(`[PreGeneration] ${failed} 个任务失败`, results.filter((t) => t.status === 'failed'))
        }

        setStatus(completed > 0 ? 'completed' : 'failed')
        if (completed > 0) {
          setStageText(`${completed} 节课堂已就绪！`)
        }
        if (completed === 0) {
          setError(`所有 ${totalTasks} 个生成任务失败`)
          setStageText('课程生成失败，请重试')
        }
      } else {
        setStatus('completed')
        setStageText('备课完成！')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[PreGeneration] 预生成失败:', message)
      setError(message)
      setStatus('failed')
      setStageText('课程生成失败，请重试')
    } finally {
      isRunningRef.current = false
    }
  }, [childId])

  /**
   * 手动触发
   */
  const triggerGeneration = useCallback(() => {
    hasTriggeredRef.current = false // 允许重新触发
    void runPreGeneration()
  }, [runPreGeneration])

  /**
   * 自动触发：评测完成 + 缓存为空
   */
  useEffect(() => {
    if (
      childId &&
      hasPlacementTest === true &&
      cachedCount < MIN_CACHE_SIZE &&
      !hasTriggeredRef.current &&
      !isRunningRef.current
    ) {
      hasTriggeredRef.current = true
      void runPreGeneration()
    }
  }, [childId, hasPlacementTest, cachedCount, runPreGeneration])

  /**
   * 监听课堂完成事件：课堂学完后自动触发新一轮预生成
   * 由 useLearningFlow.handleClassroomComplete 通过 CustomEvent 触发
   */
  useEffect(() => {
    const handleClassroomCompleted = () => {
      // 重置触发标记，允许重新生成
      hasTriggeredRef.current = false
      // 延迟 2 秒再触发，等待 onSessionEnd 的 DB 写入完成（mastery_records 更新后再规划）
      setTimeout(async () => {
        // 先检查当前缓存水位
        if (childId) {
          try {
            const cache = new ClassroomCache(new PostgresCacheStore(Number(childId)))
            const currentSize = await cache.getCacheSize()
            // 只有缓存低于水位线才触发补充
            if (currentSize < MIN_CACHE_SIZE) {
              void runPreGeneration()
            }
          } catch {
            // 检查失败时仍然触发预生成（保守策略）
            void runPreGeneration()
          }
        } else {
          void runPreGeneration()
        }
      }, 2000)
    }

    window.addEventListener('classroom-completed', handleClassroomCompleted)
    return () => {
      window.removeEventListener('classroom-completed', handleClassroomCompleted)
    }
  }, [runPreGeneration, childId])

  return {
    status,
    pendingCount,
    completedCount,
    totalCount,
    stageText,
    error,
    triggerGeneration,
    generationStep,
    generationProgress,
    currentSceneIndex,
  }
}
