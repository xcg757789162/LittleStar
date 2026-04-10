/**
 * 教导处（LessonPlanner）模块
 *
 * 负责课程规划、Requirement 生成、生成调度和动态调整。
 *
 * @example
 * ```ts
 * import {
 *   RequirementGenerator,
 *   LessonPlanner,
 *   GenerationScheduler,
 *   DynamicAdjuster,
 * } from '@/services/lesson-planner'
 *
 * // 1. 规划课程
 * const planner = new LessonPlanner()
 * const plans = planner.planLessons({ nodes, masteryMap, subject: 'math', reviewQueue: [] })
 *
 * // 2. 生成 requirement
 * const generator = new RequirementGenerator()
 * const requirement = generator.generate({ knowledgeNode, child, masteryLevel, mode: 'new-teaching' })
 *
 * // 3. 提交生成
 * const scheduler = new GenerationScheduler(client, cache)
 * scheduler.submitTask({ knowledgeNodeId, date, requirement })
 * await scheduler.executeTasks()
 *
 * // 4. 动态调整
 * const adjuster = new DynamicAdjuster()
 * const result = adjuster.evaluate({ knowledgeNodeId, knowledgeNodeName, currentMastery, sessionCorrectRate, totalAttempts })
 * ```
 */

// Requirement Generator
export { RequirementGenerator } from './requirement-generator'
export type {
  RequirementMode,
  RequirementInput,
  KnowledgeNodeInput,
  ChildProfile,
  TemplatePrompt,
} from './requirement-generator'

// Lesson Planner
export { LessonPlanner } from './planner'
export type {
  LessonPlanInput,
  LessonPlanItem,
  DailyLessonPlan,
  LessonPlannerConfig,
  ReviewQueueItem,
} from './planner'

// Generation Scheduler
export { GenerationScheduler } from './scheduler'
export type {
  SchedulerConfig,
  GenerationTaskInput,
  GenerationTask,
  TaskStatus,
  TaskProgressInfo,
} from './scheduler'

// Dynamic Adjuster
export { DynamicAdjuster } from './adjuster'
export type {
  AdjusterConfig,
  AdjustmentInput,
  AdjustmentResult,
  AdjustmentAction,
} from './adjuster'
