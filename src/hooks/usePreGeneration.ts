/**
 * usePreGeneration Hook — 瘦客户端版
 *
 * 评测完成后自动触发课堂预生成。
 * 与旧版的区别：不再在前端执行 Pipeline / Scheduler / LessonPlanner，
 * 而是向后端 `/api/pre-generate` 提交任务，然后通过轮询 `/api/pre-generate/status`
 * 追踪进度。后端负责所有耗时编排，即使前端页面跳转/关闭也不会中断。
 *
 * 设计决策参考：design.md D4 (Thin Client)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { apiClient } from '@/services/api'
import { useChildStore } from '@/stores/childStore'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { ClassroomCache, inferSubjectFromNodeId } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import {
  LessonPlanner,
  RequirementGenerator,
} from '@/services/lesson-planner'
import type { TemplatePrompt } from '@/services/lesson-planner/requirement-generator'
import type { Child, ChildSettings, Subject, KnowledgeNode, MasteryRecord, PlacementTest } from '@/types/models'
import type { PipelineStepName } from '@/services/openmaic/pipeline-types'
import { createLogger } from '@/lib/openmaic/logger'
import {
  getSelfIntroductionFromSettings,
  mergeChildSettingsWithLiveStore,
} from '@/stores/openmaic/child-settings-compat'
import { extractChildSettingsFromStore } from '@/stores/openmaic/settings-reverse-sync'
import { getSyncedChildId } from '@/stores/openmaic/settings-sync'

const log = createLogger('PreGeneration')

/** 预生成状态 */
export type PreGenerationStatus = 'idle' | 'checking' | 'generating' | 'completed' | 'failed' | 'api-key-missing'

/** 单个任务的进度摘要（供 UI 展示每堂课状态） */
export interface TaskProgressInfo {
  id: number
  knowledgeNodeId: string
  knowledgeNodeName: string
  status: string
  progress: number
  currentStep: string | null
}

/** Hook 返回值 */
export interface PreGenerationState {
  status: PreGenerationStatus
  pendingCount: number
  completedCount: number
  totalCount: number
  stageText: string
  error: string | null
  triggerGeneration: () => void
  generationStep: PipelineStepName | null
  /** 整体进度（所有任务加权平均，0-100） */
  generationProgress: number
  currentSceneIndex: number
  /** 每个活跃任务的进度明细 */
  taskDetails: TaskProgressInfo[]
}

const SUBJECTS: Subject[] = ['math', 'chinese', 'english']
const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}
const MIN_CACHE_SIZE_PER_SUBJECT = 1

export function getMinCacheSizeForCompletedSubjects(completedSubjectCount: number): number {
  return Math.max(0, Math.min(completedSubjectCount, SUBJECTS.length))
}

export function getSubjectsMissingCache(
  completedSubjects: Iterable<Subject>,
  cacheCounts: Partial<Record<Subject, number>>,
  minimumPerSubject = MIN_CACHE_SIZE_PER_SUBJECT,
): Subject[] {
  const missing: Subject[] = []

  for (const subject of completedSubjects) {
    const count = cacheCounts[subject] ?? 0
    if (count < minimumPerSubject) {
      missing.push(subject)
    }
  }

  return missing
}

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 3000

// ============================================================
// 后端 API 调用
// ============================================================

interface BackendTask {
  knowledgeNodeId: string
  date: string
  requirement: string
  language?: string
}

interface BackendSubmitResponse {
  taskIds: number[]
  message: string
}

interface BackendStatusTask {
  id: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string | null
  knowledgeNodeId: string
  knowledgeNodeName: string
  date: string
  error: string | null
  retryCount: number
}

interface BackendStatusResponse {
  tasks: BackendStatusTask[]
  completedCount: number
  totalCount: number
  activeCount: number
  failedCount: number
}

/** 获取后端 API 基础路径 */
function getApiBase(): string {
  // 开发环境通过 Vite proxy，生产环境通过 Nginx proxy
  // 注意：必须带末尾斜杠，否则 Nginx location 的 trailing-slash 301 重定向
  // 会丢失宿主机端口号（容器内部 listen 80，宿主机映射 8080）
  return '/api/pre-generate/'
}

export function buildPreGenerationChildSettings(
  child: Pick<Child, 'name' | 'settings'> | null | undefined,
  resolvedSettings?: Partial<ChildSettings> | null,
): Record<string, unknown> {
  const effectiveSettings = resolvedSettings
    ?? mergeChildSettingsWithLiveStore(
      child?.settings as Partial<ChildSettings> & { bio?: unknown } | undefined,
      extractChildSettingsFromStore(),
    )

  if (!effectiveSettings) {
    return {}
  }

  const userNickname = child?.name?.trim()
  const userBio = getSelfIntroductionFromSettings(
    effectiveSettings as Partial<ChildSettings> & { bio?: unknown },
  )

  return {
    ...(effectiveSettings as unknown as Record<string, unknown>),
    ...(userNickname ? { userNickname } : {}),
    ...(userBio ? { userBio } : {}),
  }
}

async function submitTasks(
  childId: number,
  childSettings: Record<string, unknown>,
  tasks: BackendTask[],
): Promise<BackendSubmitResponse> {
  const res = await fetch(getApiBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, childSettings, tasks }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || `提交失败: ${res.status}`)
  }
  return res.json() as Promise<BackendSubmitResponse>
}

async function pollStatus(childId: number): Promise<BackendStatusResponse> {
  const res = await fetch(`${getApiBase()}/status?childId=${childId}`)
  if (!res.ok) {
    throw new Error(`查询进度失败: ${res.status}`)
  }
  return res.json() as Promise<BackendStatusResponse>
}

// ============================================================
// Hook
// ============================================================

export function usePreGeneration(
  childId: string | number | undefined,
  hasPlacementTest: boolean | null,
  cachedCount: number,
  completedSubjectCount = 0,
): PreGenerationState {
  const [status, setStatus] = useState<PreGenerationStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [stageText, setStageText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Pipeline 进度状态（来自后端轮询）
  const [generationStep, setGenerationStep] = useState<PipelineStepName | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [taskDetails, setTaskDetails] = useState<TaskProgressInfo[]>([])

  const isRunningRef = useRef(false)
  const hasTriggeredRef = useRef(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 监听 child settings 与 live settings 变化（API Key 配置后自动刷新）
  const currentChild = useChildStore((s) => s.currentChild)
  const liveProviderId = useSettingsStore((s) => s.providerId)
  const liveModelId = useSettingsStore((s) => s.modelId)
  const liveProvidersConfig = useSettingsStore((s) => s.providersConfig)
  const liveLlmModel = liveProviderId && liveModelId
    ? `${liveProviderId}:${liveModelId}`
    : ''
  const liveLlmApiKey = liveProvidersConfig[liveProviderId]?.apiKey ?? ''
  const llmModel = liveLlmModel || currentChild?.settings?.llmModel || ''
  const llmApiKey = liveLlmApiKey || currentChild?.settings?.llmApiKey || ''

  /**
   * 停止轮询
   */
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  /**
   * 开始轮询后端进度
   */
  const startPolling = useCallback((numChildId: number) => {
    stopPolling()

    const poll = async () => {
      try {
        const data = await pollStatus(numChildId)
        const active = data.tasks.filter((t) => t.status === 'pending' || t.status === 'running')
        const failed = data.tasks.filter((t) => t.status === 'failed')
        const running = data.tasks.find((t) => t.status === 'running')

        setCompletedCount(data.completedCount)
        setPendingCount(active.length)
        setTotalCount(data.totalCount)

        // 每个活跃任务的进度摘要
        setTaskDetails(data.tasks.map((t) => ({
          id: t.id,
          knowledgeNodeId: t.knowledgeNodeId,
          knowledgeNodeName: t.knowledgeNodeName,
          status: t.status,
          progress: t.status === 'completed' ? 100 : t.progress,
          currentStep: t.currentStep,
        })))

        // 计算整体进度：已完成任务算 100%，活跃任务按实际进度
        if (data.totalCount > 0) {
          const activeProgressSum = active.reduce((sum, t) => sum + (t.progress || 0), 0)
          const overall = Math.round(
            (data.completedCount * 100 + activeProgressSum) / data.totalCount,
          )
          setGenerationProgress(overall)
        }

        // 更新 Pipeline 步骤信息
        if (running) {
          if (running.currentStep) {
            setGenerationStep(running.currentStep as PipelineStepName)
          }
          const runningIdx = data.tasks.indexOf(running)
          setCurrentSceneIndex(runningIdx >= 0 ? runningIdx : 0)

          const completedLabel = data.completedCount > 0 ? `${data.completedCount} 堂已完成，` : ''
          setStageText(`${completedLabel}正在生成第 ${data.completedCount + 1} 堂课 (${running.progress}%)...`)
        }

        // 判断是否全部完成
        if (active.length === 0 && data.totalCount > 0) {
          // 无活跃任务 → 完成或全部失败
          stopPolling()
          if (data.completedCount > 0) {
            setStatus('completed')
            setStageText(`${data.completedCount} 节课堂已就绪！`)
            setGenerationProgress(100)
          } else if (failed.length > 0) {
            setStatus('failed')
            setError(failed[0]?.error || '生成任务失败')
            setStageText('课程生成失败，请重试')
          } else {
            setStatus('completed')
            setStageText('备课完成！')
          }
          isRunningRef.current = false
        }
      } catch (pollErr) {
        log.warn('轮询失败:', pollErr)
        // 轮询失败不中止，等下次重试
      }
    }

    // 立即执行一次
    void poll()
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL)
  }, [stopPolling])

  /**
   * 核心预生成逻辑 — 瘦客户端版
   */
  const runPreGeneration = useCallback(async () => {
    if (!childId || isRunningRef.current) {
      log.debug('跳过执行:', { childId: !!childId, isRunning: isRunningRef.current })
      return
    }
    log.info('🚀 开始预生成流程 (瘦客户端), childId:', childId)
    isRunningRef.current = true
    setStatus('checking')
    setStageText('正在分析学习情况...')
    setError(null)
    setGenerationProgress(0)
    setGenerationStep(null)

    try {
      const numChildId = Number(childId)
      const child = useChildStore.getState().currentChild
      if (!child) {
        log.warn('currentChild 为空，跳过')
        setStatus('idle')
        isRunningRef.current = false
        return
      }

      // Only trust live Store values when the Store has been synced for this child.
      // Otherwise a stale Store (e.g. from a previous child or session) could
      // inject wrong API keys into the merge result.
      const isSyncedForThisChild = getSyncedChildId() === String(child.id)
      const liveSettings = isSyncedForThisChild ? extractChildSettingsFromStore() : null

      const effectiveSettings = mergeChildSettingsWithLiveStore(
        child.settings as Partial<ChildSettings> & { bio?: unknown },
        liveSettings,
      )

      log.info('[PreGeneration] 运行时配置解析', JSON.stringify({
        llmProviderId: effectiveSettings?.llmProviderId || '',
        llmModel: effectiveSettings?.llmModel || '',
        hasLlmApiKey: Boolean(effectiveSettings?.llmApiKey),
      }))

      // 1. 检查是否有已完成的评测（只查 subject，避免拉庞大的 questions/result JSON）
      const tests = await apiClient.get<PlacementTest>('/placement_tests', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
        select: 'subject',
      })
      const completedSubjects = [...new Set(tests.map((t) => t.subject as Subject))]
      log.info('已完成评测科目:', completedSubjects)

      if (completedSubjects.length === 0) {
        log.info('无已完成评测，跳过')
        setStatus('idle')
        isRunningRef.current = false
        return
      }

      // 2. 按学科检查缓存水位线（只计算未学习的课程）
      const cache = new ClassroomCache(new PostgresCacheStore(numChildId))

      // 2a. 获取已完成课程的 knowledgeNodeId 集合
      const historyRecords = await apiClient.get<{ knowledgeNodeId: string; subject: string }>('/classroom_history', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
        select: 'knowledge_node_id,subject',
      })
      const completedNodeIds = new Set(historyRecords.map((r) => r.knowledgeNodeId))

      // 2b. 获取缓存元数据（轻量级，不拉 classroomData）
      const metaEntries = await cache.getMetadataEntries()

      // 2c. 按科目统计未学习的缓存数
      const unlearnedCounts: Record<Subject, number> = { math: 0, chinese: 0, english: 0 }
      let totalUnlearnedCount = 0
      for (const meta of metaEntries) {
        if (completedNodeIds.has(meta.knowledgeNodeId)) continue
        const subj = inferSubjectFromNodeId(meta.knowledgeNodeId)
        if (subj && subj in unlearnedCounts) {
          unlearnedCounts[subj as Subject]++
          totalUnlearnedCount++
        }
      }

      const subjectsNeedingCache = getSubjectsMissingCache(
        completedSubjects,
        unlearnedCounts,
      )

      log.info('按学科缓存统计 (未学习):', unlearnedCounts, '已完成节点:', completedNodeIds.size, '待补学科:', subjectsNeedingCache)

      if (subjectsNeedingCache.length === 0) {
        log.info('各已评测学科未学习缓存已达最低水位线，无需生成')
        setStatus('completed')
        setCompletedCount(totalUnlearnedCount)
        setStageText('各学科课程缓存已就绪')
        isRunningRef.current = false
        return
      }

      // 3. 检查 API Key
      if (!effectiveSettings?.llmModel || !effectiveSettings.llmApiKey) {
        log.warn('API Key 未配置', {
          childId: numChildId,
          childModel: child.settings?.llmModel || '',
          liveModel: effectiveSettings?.llmModel || '',
          hasChildApiKey: Boolean(child.settings?.llmApiKey),
          hasLiveApiKey: Boolean(effectiveSettings?.llmApiKey),
        })
        setStatus('api-key-missing')
        setStageText('请先配置 AI 模型和 API Key')
        setError('请在「家长面板 → 高级设置 → 高级课堂设置」中配置 LLM 模型和 API Key 后再试')
        isRunningRef.current = false
        return
      }

      // 4. 课程规划（纯算法，前端即可完成）
      setStatus('generating')
      setStageText(`正在为 ${subjectsNeedingCache.map((subject) => SUBJECT_LABELS[subject]).join(' / ')} 准备课程...`)

      const planner = new LessonPlanner()
      const reqGenerator = new RequirementGenerator()

      // 获取掌握率（只查规划所需的两列）
      const masteryRecords = await apiClient.get<MasteryRecord>('/mastery_records', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
        select: 'knowledge_node_id,mastery_level',
      })
      const masteryMap = new Map<string, number>()
      for (const record of masteryRecords) {
        masteryMap.set(record.knowledgeNodeId, record.masteryLevel)
      }

      // 5. 仅为缺课学科生成任务列表（排除已有未学习缓存的节点）
      const backendTasks: BackendTask[] = []
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const unlearnedCachedNodeIds = new Set(
        metaEntries
          .filter((m) => !completedNodeIds.has(m.knowledgeNodeId))
          .map((m) => m.knowledgeNodeId),
      )

      for (const subject of subjectsNeedingCache) {

        try {
          const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
            filters: [{ column: 'subject', operator: 'eq', value: subject }],
            order: [{ column: 'orderIndex', ascending: true }],
          })
          if (nodes.length === 0) continue

          const plans = planner.planLessons({
            nodes,
            masteryMap,
            subject,
            reviewQueue: [],
            days: 2,
          })

          for (const dayPlan of plans) {
            for (const item of dayPlan.items) {
              if (unlearnedCachedNodeIds.has(item.nodeId)) continue
              const node = nodes.find((n) => n.id === item.nodeId)
              if (!node) continue

              const requirement = reqGenerator.generate({
                knowledgeNode: {
                  id: node.id!,
                  name: node.name,
                  description: node.description ?? '',
                  difficulty: node.difficulty,
                  templatePrompts: ((node as unknown as Record<string, unknown>).templatePrompts ?? []) as TemplatePrompt[],
                  prerequisites: node.prerequisites ?? [],
                },
                child: {
                  age: child.age,
                  gradeLevel: child.gradeLevel,
                },
                masteryLevel: item.masteryLevel,
                mode: item.mode,
              })

              backendTasks.push({
                knowledgeNodeId: item.nodeId,
                date: dayPlan.date,
                requirement,
                language: 'zh-CN',
              })
            }
          }
        } catch (subjectError) {
          log.warn(`${subject} 课程规划失败:`, subjectError)
        }
      }

      // Fallback：无知识点数据时生成默认课堂
      if (backendTasks.length === 0) {
        const subjectLabels: Record<Subject, string> = {
          math: '趣味数学入门',
          chinese: '快乐语文启蒙',
          english: '英语字母乐园',
        }

        for (const subject of subjectsNeedingCache) {
          backendTasks.push({
            knowledgeNodeId: `default-${subject}`,
            date: dateStr,
            requirement: `为一位 ${child.age} 岁的 ${child.gradeLevel} 学生创建一节${subjectLabels[subject]}课堂。包含教学和测验环节，以趣味互动为主，难度适中。`,
            language: 'zh-CN',
          })
        }
      }

      if (backendTasks.length === 0) {
        setStatus('completed')
        setStageText('备课完成！')
        isRunningRef.current = false
        return
      }

      // 6. 先检查后端是否已有活跃任务（pending/running）
      //    如果有，直接进入轮询模式，不重复提交
      try {
        const existingStatus = await pollStatus(numChildId)
        if (existingStatus.activeCount > 0) {
          log.info(`⏳ 后端已有 ${existingStatus.activeCount} 个活跃任务，直接轮询`)
          setTotalCount(existingStatus.totalCount)
          setCompletedCount(existingStatus.completedCount)
          setPendingCount(existingStatus.activeCount)
          setStageText('AI 老师正在创作课堂内容...')
          startPolling(numChildId)
          return
        }
      } catch (checkErr) {
        log.warn('检查后端任务状态失败，继续提交:', checkErr)
      }

      // 7. 提交到后端
      log.info(`📤 向后端提交 ${backendTasks.length} 个生成任务`)
      setStageText(`正在提交 ${backendTasks.length} 个备课任务...`)
      setPendingCount(backendTasks.length)
      setTotalCount(backendTasks.length)

      try {
        const result = await submitTasks(
          numChildId,
          buildPreGenerationChildSettings(child, effectiveSettings),
          backendTasks,
        )
        log.info('✅ 任务提交成功:', result.message, 'taskIds:', result.taskIds)
        setStageText('AI 老师正在创作课堂内容...')
      } catch (submitErr) {
        const msg = submitErr instanceof Error ? submitErr.message : String(submitErr)
        log.error('❌ 任务提交失败:', msg)
        setError(msg)
        setStatus('failed')
        setStageText('课程生成失败，请重试')
        isRunningRef.current = false
        return
      }

      // 8. 启动轮询
      startPolling(numChildId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.error('预生成失败:', message)
      setError(message)
      setStatus('failed')
      setStageText('课程生成失败，请重试')
      isRunningRef.current = false
    }
  }, [childId, startPolling])

  /**
   * 手动触发
   */
  const triggerGeneration = useCallback(() => {
    hasTriggeredRef.current = false
    void runPreGeneration()
  }, [runPreGeneration])

  /**
   * 自动触发：评测完成 + 缓存低于水位线
   */
  const prevHasTestRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (prevHasTestRef.current !== true && hasPlacementTest === true) {
      log.info('检测到评测数据就绪，重置触发标记')
      hasTriggeredRef.current = false
    }
    prevHasTestRef.current = hasPlacementTest
  }, [hasPlacementTest])

  useEffect(() => {
    if (
      !childId
      || hasPlacementTest !== true
      || completedSubjectCount <= 0
      || hasTriggeredRef.current
      || isRunningRef.current
    ) {
      return
    }

    log.info('✅ 条件满足，自动触发预生成检查')
    hasTriggeredRef.current = true
    const timer = setTimeout(() => void runPreGeneration(), 0)
    return () => clearTimeout(timer)
  }, [childId, hasPlacementTest, completedSubjectCount, runPreGeneration, cachedCount])

  /**
   * 监听课堂完成事件
   */
  useEffect(() => {
    const handleClassroomCompleted = () => {
      hasTriggeredRef.current = false
      setTimeout(() => void runPreGeneration(), 2000)
    }

    window.addEventListener('classroom-completed', handleClassroomCompleted)
    return () => window.removeEventListener('classroom-completed', handleClassroomCompleted)
  }, [runPreGeneration, childId])

  /**
   * 监听评测完成事件
   */
  useEffect(() => {
    const handlePlacementTestCompleted = () => {
      log.info('收到 placement-test-completed 事件')
      hasTriggeredRef.current = false
      setTimeout(() => void runPreGeneration(), 1000)
    }

    window.addEventListener('placement-test-completed', handlePlacementTestCompleted)
    return () => window.removeEventListener('placement-test-completed', handlePlacementTestCompleted)
  }, [runPreGeneration])

  /**
   * 监听 API Key 配置变化：当状态为 api-key-missing 且 key 已填写时自动重试
   */
  useEffect(() => {
    if (status === 'api-key-missing' && llmModel && llmApiKey) {
      log.info('🔑 检测到 API Key 已配置，自动重新触发预生成')
      hasTriggeredRef.current = false
      isRunningRef.current = false
      // 延迟 500ms，等 childStore 完全写入
      const timer = setTimeout(() => void runPreGeneration(), 500)
      return () => clearTimeout(timer)
    }
  }, [status, llmModel, llmApiKey, runPreGeneration])

  /**
   * 清理：组件卸载时停止轮询
   */
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

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
    taskDetails,
  }
}
