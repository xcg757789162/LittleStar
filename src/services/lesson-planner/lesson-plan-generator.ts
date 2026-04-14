/**
 * AI 课时拆分服务
 *
 * 根据知识点信息，由 AI 决定需要几堂课来完成该知识点的学习，
 * 并生成每堂课的标题、描述和聚焦要点。
 *
 * 触发时机：在预生成流程中，发现某知识点 total_lessons 为 NULL 时调用。
 * 运行环境：服务端（通过 /api/lesson-plans 端点）。
 */

import type { KnowledgeNode } from '@/types/models'

export interface LessonPlanItem {
  index: number
  title: string
  description: string
  focusPoints: string[]
}

export interface LessonPlanOutput {
  totalLessons: number
  lessons: LessonPlanItem[]
}

export interface LessonPlanGeneratorConfig {
  minLessons?: number
  maxLessons?: number
}

const DEFAULT_CONFIG: Required<LessonPlanGeneratorConfig> = {
  minLessons: 2,
  maxLessons: 5,
}

/**
 * 构建 AI 课时拆分的 system prompt
 */
export function buildLessonPlanSystemPrompt(config: Required<LessonPlanGeneratorConfig>): string {
  return `你是一个幼儿教育课程设计专家。你的任务是将一个知识点拆分为多堂课时。

规则：
1. 每个知识点拆分为 ${config.minLessons}-${config.maxLessons} 堂课
2. 课时数量根据知识点的难度和内容广度决定：简单知识点 ${config.minLessons} 堂，复杂知识点 ${config.maxLessons} 堂
3. 每堂课有明确的教学主题和聚焦要点
4. 课时之间有递进关系：从认知到理解到应用
5. 最后一堂课应包含综合练习和回顾

你必须严格按照以下 JSON 格式输出，不要输出其他内容：
{
  "totalLessons": <数字>,
  "lessons": [
    {
      "index": 1,
      "title": "<课时标题>",
      "description": "<课时描述，一句话>",
      "focusPoints": ["<要点1>", "<要点2>"]
    }
  ]
}`
}

/**
 * 构建用户消息
 */
export function buildLessonPlanUserPrompt(node: Pick<KnowledgeNode, 'name' | 'description' | 'difficulty'>): string {
  return `请为以下知识点设计课时计划：

知识点名称：${node.name}
知识点描述：${node.description}
难度等级：${node.difficulty}/10

请输出 JSON 格式的课时计划。`
}

/**
 * 解析 AI 返回的课时计划
 */
export function parseLessonPlanResponse(
  response: string,
  config: Required<LessonPlanGeneratorConfig>,
): LessonPlanOutput {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 响应中未找到 JSON 数据')
  }

  const parsed = JSON.parse(jsonMatch[0]) as LessonPlanOutput

  if (!parsed.totalLessons || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
    throw new Error('AI 返回的课时计划格式无效')
  }

  parsed.totalLessons = Math.max(config.minLessons, Math.min(config.maxLessons, parsed.totalLessons))
  parsed.lessons = parsed.lessons.slice(0, parsed.totalLessons)

  for (let i = 0; i < parsed.lessons.length; i++) {
    parsed.lessons[i].index = i + 1
    if (!parsed.lessons[i].title) parsed.lessons[i].title = `第 ${i + 1} 课`
    if (!parsed.lessons[i].description) parsed.lessons[i].description = ''
    if (!Array.isArray(parsed.lessons[i].focusPoints)) parsed.lessons[i].focusPoints = []
  }

  return parsed
}

/**
 * 为无法调用 AI 的场景提供确定性的默认课时计划
 */
export function generateDefaultLessonPlan(
  node: Pick<KnowledgeNode, 'name' | 'description' | 'difficulty'>,
  config?: LessonPlanGeneratorConfig,
): LessonPlanOutput {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const difficulty = node.difficulty ?? 1
  const totalLessons = Math.max(
    cfg.minLessons,
    Math.min(cfg.maxLessons, Math.ceil(difficulty / 2) + 1),
  )

  const lessons: LessonPlanItem[] = []

  lessons.push({
    index: 1,
    title: `${node.name} — 初识与入门`,
    description: `初步认识${node.name}的基本概念，通过趣味引导建立兴趣`,
    focusPoints: ['认识基本概念', '趣味引导入门'],
  })

  if (totalLessons >= 3) {
    for (let i = 2; i < totalLessons; i++) {
      lessons.push({
        index: i,
        title: `${node.name} — 深入学习（${i - 1}）`,
        description: `深入理解和练习${node.name}的核心内容`,
        focusPoints: ['深入理解核心概念', '动手练习'],
      })
    }
  }

  lessons.push({
    index: totalLessons,
    title: `${node.name} — 综合练习与回顾`,
    description: `综合练习${node.name}的全部内容，巩固所学知识`,
    focusPoints: ['综合练习', '回顾总结', '查漏补缺'],
  })

  return { totalLessons, lessons }
}

export { DEFAULT_CONFIG as LESSON_PLAN_DEFAULT_CONFIG }
