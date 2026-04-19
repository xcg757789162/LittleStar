/**
 * 续阶课程：读取原课 requirement_spec + 当前孩子在该课知识点上的掌握度，
 * 调用 LLM 生成下一阶段 requirement_spec（及建议名称 / 外观）。
 */

import { pool } from '../db.js'
import { callLLMAndParse } from './llm-json.js'

export interface ContinuationPlannerInput {
  parentCourseId: number
  childId: number
  settings: Record<string, unknown>
}

export interface ContinuationPlanResult {
  requirementSpec: Record<string, unknown>
  suggestedName: string
  suggestedEmoji: string
  suggestedColorHex: string
  suggestedSlug: string
}

interface PlannerLLMOut {
  requirement_spec: Record<string, unknown>
  suggested_name: string
  suggested_emoji: string
  suggested_color_hex: string
  suggested_slug: string
}

const SYSTEM = `你是 K12 课程续阶设计师。用户已完成一门课的大部分学习，你要基于原课目标与孩子当前掌握情况，设计「下一阶段」课程需求。

## 输出
只输出一个 JSON 对象（不要 markdown、不要解释），字段名必须完全一致：
{
  "requirement_spec": {
    "topic": "string",
    "goal": "string",
    "scope": "string",
    "depth": "string",
    "prior_knowledge": "string",
    "preferred_style": "string",
    "level": "string",
    "extras": {},
    "ready": true
  },
  "suggested_name": "≤12 字中文课程名，体现进阶",
  "suggested_emoji": "单个 emoji",
  "suggested_color_hex": "#RRGGBB",
  "suggested_slug": "小写英文+连字符，≤28 字符，需与上一门课的 slug 不同"
}

## 原则
- 在原课 topic 上自然延伸（加深、拓展应用、衔接更高阶概念），不要完全无关的新主题。
- prior_knowledge 要概括「孩子已掌握什么、哪里仍薄」。
- requirement_spec.ready 必须为 true。
`

export async function planNextStageCourse(
  input: ContinuationPlannerInput,
): Promise<ContinuationPlanResult> {
  const { rows: courseRows } = await pool.query<{
    id: number
    slug: string
    name: string
    requirement_spec: Record<string, unknown>
    stage_index: number
  }>(
    `SELECT id, slug, name, requirement_spec, COALESCE(stage_index, 0) AS stage_index
     FROM api.courses WHERE id = $1`,
    [input.parentCourseId],
  )
  const parent = courseRows[0]
  if (!parent) throw new Error('parent course not found')

  const { rows: masteryRows } = await pool.query<{
    node_id: string
    node_name: string
    mastery_level: string | number | null
  }>(
    `SELECT kn.id AS node_id, kn.name AS node_name, mr.mastery_level
     FROM api.knowledge_nodes kn
     LEFT JOIN api.mastery_records mr
       ON mr.knowledge_node_id = kn.id AND mr.child_id = $2
     WHERE kn.subject = $1
     ORDER BY kn.id
     LIMIT 200`,
    [parent.slug, input.childId],
  )

  const lines = masteryRows.map((r) => {
    const lv = r.mastery_level == null ? '（未测）' : String(r.mastery_level)
    return `- ${r.node_name} (${r.node_id}): ${lv}`
  })

  const userPrompt = `## 上一门课
- slug: ${parent.slug}
- 名称: ${parent.name}
- 阶段序号 stage_index（从 0 起）: ${parent.stage_index}
- 原 requirement_spec（JSON）:
${JSON.stringify(parent.requirement_spec || {}, null, 2)}

## 孩子在本课知识点上的掌握度（0–100，空表示尚无记录）
${lines.length ? lines.join('\n') : '（暂无知识点行，可能大纲刚建好）'}

请生成下一阶段课程 JSON。`

  const parsed = await callLLMAndParse<PlannerLLMOut>(
    input.settings,
    SYSTEM,
    userPrompt,
    'course-continuation',
  )

  const spec = parsed.requirement_spec && typeof parsed.requirement_spec === 'object'
    ? { ...parsed.requirement_spec }
    : {}

  spec.ready = true
  spec.extras = {
    ...(typeof spec.extras === 'object' && spec.extras !== null ? (spec.extras as object) : {}),
    continuedFromCourseId: parent.id,
    continuedFromSlug: parent.slug,
    nextStageIndex: parent.stage_index + 1,
  }

  return {
    requirementSpec: spec,
    suggestedName: String(parsed.suggested_name || `${parent.name}·进阶`).slice(0, 24),
    suggestedEmoji: String(parsed.suggested_emoji || '📚').slice(0, 8),
    suggestedColorHex: String(parsed.suggested_color_hex || '#5BC0EB').slice(0, 10),
    suggestedSlug: String(parsed.suggested_slug || `${parent.slug}-next`).slice(0, 30),
  }
}
