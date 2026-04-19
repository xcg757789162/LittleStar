/**
 * Panel Review Service
 *
 * LLM 教师团自动评审：对 AI 生成的课程大纲进行多视角审核。
 *
 * 流程：
 *   1. 3 位专家（学科 / 教设 / 儿童心理）并行给出 ReviewerVerdict（1-5 分 + approve/reject + 建议）
 *   2. 总编辑拿到三份 verdict，给出 PanelReviewResult.chief（decision + 0-100 综合分 + 合并意见）
 *
 * Safety 规则：只要任一评审 score ≤ 2，无论总编辑怎么说都强制 reject（兜底防止总编辑被"说服")。
 *
 * 本文件为纯函数：只接受 settings + 输入，返回结构化结果，不直接访问 DB 也不写 system_log
 * （调用方 course-initializer 负责把结果存进 checkpoint.reviewRounds 与日志）。
 */

import { callLLMAndParse } from './llm-json.js'
import { getStandardsSnippet } from './subject-standards.js'

// ============================================================
// 共享的大纲类型（也被 course-initializer.ts 复用）
// 放在这里是为了避免 course-initializer ↔ panel-review 互相 import。
// ============================================================

export interface GeneratedNode {
  id: string
  name: string
  description: string
  difficulty: number
  content_types: string[]
  prerequisites: string[]
  template_prompts?: unknown[]
}

export interface GeneratedModule {
  id: string
  name: string
  description: string
  order_index: number
  nodes: GeneratedNode[]
}

// ============================================================
// 评审结果类型
// ============================================================

export type ReviewerRole = 'subject' | 'instructional' | 'child-dev'

export interface ReviewerVerdict {
  reviewer: ReviewerRole
  /** 1-5，5 为最佳 */
  score: number
  verdict: 'approve' | 'reject'
  /** 优点列表（1-3 条） */
  strengths: string[]
  /** 需补强的地方（可为空） */
  gaps: string[]
  /** 具体修改建议（用于重写 LLM 的 feedback） */
  suggestions: string[]
}

export interface PanelReviewResult {
  round: number
  chief: {
    decision: 'approve' | 'reject'
    /** 0-100 综合得分 */
    score: number
    /** 合并后的修改方向（用于下一轮重写 feedback 的主文本） */
    mergedFeedback: string
    /** 最关键需要补足的点 */
    criticalGaps: string[]
    /** 若被 safety 规则强制否决，此字段非空 */
    safetyOverride?: string
  }
  reviewers: ReviewerVerdict[]
}

// ============================================================
// Prompt 构造
// ============================================================

function formatOutline(modules: GeneratedModule[]): string {
  return modules
    .map(
      (m) => `### 模块 ${m.order_index}. ${m.name}
- 简介：${m.description}
- 知识点：
${m.nodes
  .map(
    (n) =>
      `  - [${n.id}] ${n.name}（难度 ${n.difficulty}）\n    - ${n.description}\n    - 前置：${
        n.prerequisites.length ? n.prerequisites.join(', ') : '无'
      }`,
  )
  .join('\n')}`,
    )
    .join('\n\n')
}

function formatContext(ctx: ReviewContext): string {
  const spec = ctx.requirementSpec || {}
  const lines = [
    `- 课程 slug：${ctx.slug}`,
    `- 目标学习者水平：${ctx.learnerLevel}`,
    `- 主题：${spec.topic ?? ctx.slug}`,
    `- 学习目标：${spec.goal ?? '系统掌握'}`,
    `- 覆盖范围：${spec.scope ?? '不限'}`,
    `- 深度偏好：${spec.depth ?? 'medium'}`,
    `- 学习者已有基础：${spec.prior_knowledge ?? '未指定'}`,
    `- 偏好学习方式：${spec.preferred_style ?? '综合'}`,
  ]
  if (ctx.disciplineType) lines.push(`- 学科类型 discipline_type：${ctx.disciplineType}`)
  if (ctx.subjectKey) lines.push(`- 学科键 subjectKey：${ctx.subjectKey}`)
  return lines.join('\n')
}

/** 学科专家：课内 vs 素质拓展 + 课标摘要 */
function buildSubjectReviewerSystemPrompt(ctx: ReviewContext): string {
  const key = (ctx.subjectKey || ctx.slug.split('-')[0] || 'math').toLowerCase()
  const snippet = getStandardsSnippet(key)
  if (ctx.disciplineType === 'interest') {
    return `你是一位【素质拓展 / 主题式学习】方向的课程顾问（非应试科目组长）。评审重点：主题是否清晰、活动与探究是否可落地、是否尊重儿童认知负荷与兴趣；**不必**按考试科目要求系统覆盖课标条目。

${REVIEWER_OUTPUT_SCHEMA}

（若与常见学科相关，可作弱参考）${snippet}`.trim()
  }
  return `${SUBJECT_SYSTEM_PROMPT}

## 课标锚点（2022 义务教育，对照用；勿要求大纲机械逐条覆盖）
${snippet}`
}

const REVIEWER_OUTPUT_SCHEMA = `
严格输出如下 JSON（不要任何解释文字、markdown 代码围栏、注释或尾逗号）：

{
  "score": 1-5 的整数,
  "verdict": "approve" 或 "reject",
  "strengths": ["1-3 条优点，简短"],
  "gaps": ["需要补强的地方，可为空数组"],
  "suggestions": ["具体可执行的修改建议（用于让另一个 LLM 据此重写），每条 1-2 句"]
}

评分标准：
- 5 = 基本完美，可以直接开课
- 4 = 有 1-2 处小瑕疵，建议 approve
- 3 = 质量中等，可以 approve 但 suggestions 应具体
- 2 = 存在明显不足，必须 reject
- 1 = 根本不合格，必须 reject
`.trim()

const SUBJECT_SYSTEM_PROMPT = `你是一位【学科专家】教师，正在评审一份由 AI 生成的课程大纲。

你的关注点：
1. **学科准确性**：知识点表述是否正确、术语是否规范
2. **内容覆盖度**：是否覆盖了该主题的核心概念，是否有关键知识点被遗漏
3. **深度合理**：深度是否与"学习目标""深度偏好"相匹配（不能太浅也不能越级）
4. **概念顺序**：知识点之间的依赖关系（prerequisites）是否学术上成立

不要评价教学设计或趣味性——那不是你的工作。

${REVIEWER_OUTPUT_SCHEMA}`

const INSTRUCTIONAL_SYSTEM_PROMPT = `你是一位【教学设计师】，正在评审一份由 AI 生成的课程大纲。

你的关注点：
1. **章节划分**：模块粒度是否合理（不要太碎也不要太大），模块之间逻辑清晰
2. **难度曲线**：从入门到进阶的难度过渡是否平滑（difficulty 1→5）
3. **知识点数量**：每个模块 3-8 个知识点、总数 ≤30 个是否合理
4. **内容类型**：content_types 的选择是否匹配知识点性质（概念类用 flashcard、应用类用 quiz 等）
5. **前置依赖图**：prerequisites 是否构成了一个合理的学习路径

${REVIEWER_OUTPUT_SCHEMA}`

const CHILD_DEV_SYSTEM_PROMPT = `你是一位【儿童发展与学习心理专家】，正在评审一份由 AI 生成的课程大纲。

你的关注点：
1. **年龄适配**：对目标学习者水平来说，概念是否可理解（抽象度、先验知识要求）
2. **认知负荷**：每个知识点的信息密度是否适度，避免一次塞太多
3. **动机设计**：主题命名与描述是否能激发学习兴趣（避免枯燥说教式措辞）
4. **注意力与节奏**：章节大小对该年龄段的专注时长是否合适

${REVIEWER_OUTPUT_SCHEMA}`

const CHIEF_SYSTEM_PROMPT = `你是一位【总编辑】，负责汇总 3 位教师（学科专家 / 教学设计师 / 儿童发展专家）对一份 AI 生成课程大纲的评审意见，给出最终决定。

你的工作：
1. 综合三份意见，给出 **decision**（approve 或 reject）
2. 给出 **score**（0-100 综合分：90+ 很好，70-89 可接受，<70 应 reject）
3. 写一段简洁的 **mergedFeedback**（面向出题 LLM，告诉它最需要改什么）
4. 列出 **criticalGaps**（最关键需要补足的点，用于下一轮重写）

决策原则：
- 任一评审 score ≤ 2 → 必须 reject
- 3 位平均分 < 3.5 → 应该 reject
- 多于 1 位给 reject → 应该 reject
- mergedFeedback 必须具体、可执行（禁止"建议完善"这种空话）

严格输出如下 JSON：

{
  "decision": "approve" 或 "reject",
  "score": 0-100 的整数,
  "mergedFeedback": "1-3 段面向出题 LLM 的修改指引",
  "criticalGaps": ["最关键需要补足的点，每条 1 句，可为空数组"]
}

**不要输出 JSON 以外的任何文字。**`

// ============================================================
// 主入口
// ============================================================

export interface ReviewContext {
  slug: string
  requirementSpec: Record<string, unknown>
  /** 人类可读的学习者水平描述（如「8 岁」） */
  learnerLevel: string
  /** 与 api.courses.discipline_type 一致 */
  disciplineType?: 'academic' | 'interest'
  /** 归一化学科键（如 math、biology） */
  subjectKey?: string
}

async function callOneReviewer(
  settings: Record<string, unknown>,
  role: ReviewerRole,
  systemPrompt: string,
  ctx: ReviewContext,
  outlineText: string,
  contextText: string,
): Promise<ReviewerVerdict> {
  const userPrompt = `## 课程上下文
${contextText}

## 待评审大纲
${outlineText}

请按照 system prompt 要求输出一个 JSON 对象，完成你的评审。`

  try {
    const parsed = await callLLMAndParse<Omit<ReviewerVerdict, 'reviewer'>>(
      settings,
      systemPrompt,
      userPrompt,
      `review-${role}`,
    )
    // 最小化字段校验 + 钳位
    const score = Math.max(1, Math.min(5, Math.round(Number(parsed.score) || 1)))
    const verdict = parsed.verdict === 'approve' ? 'approve' : 'reject'
    return {
      reviewer: role,
      score,
      verdict,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 8) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8) : [],
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[PanelReview][${role}] failed: ${msg}`)
    // 评审自身失败：保守记为 reject 但低权重（score=2），让流程继续
    return {
      reviewer: role,
      score: 2,
      verdict: 'reject',
      strengths: [],
      gaps: [`评审调用失败：${msg.slice(0, 120)}`],
      suggestions: ['该维度的评审未能完成，请重试或忽略此条意见'],
    }
  }
}

async function callChiefEditor(
  settings: Record<string, unknown>,
  ctx: ReviewContext,
  outlineText: string,
  contextText: string,
  reviewers: ReviewerVerdict[],
): Promise<PanelReviewResult['chief']> {
  const reviewerDigest = reviewers
    .map(
      (r) =>
        `### ${
          r.reviewer === 'subject'
            ? '学科专家'
            : r.reviewer === 'instructional'
            ? '教学设计师'
            : '儿童发展专家'
        }（${r.verdict}，${r.score}/5）
- 优点：${r.strengths.join('；') || '（无）'}
- 不足：${r.gaps.join('；') || '（无）'}
- 建议：${r.suggestions.join('；') || '（无）'}`,
    )
    .join('\n\n')

  const userPrompt = `## 课程上下文
${contextText}

## 待评审大纲
${outlineText}

## 3 位教师的评审意见
${reviewerDigest}

请按照 system prompt 要求输出一个 JSON 对象，完成终审。`

  try {
    const parsed = await callLLMAndParse<{
      decision: 'approve' | 'reject'
      score: number
      mergedFeedback: string
      criticalGaps: string[]
    }>(settings, CHIEF_SYSTEM_PROMPT, userPrompt, 'review-chief')
    return {
      decision: parsed.decision === 'approve' ? 'approve' : 'reject',
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      mergedFeedback: String(parsed.mergedFeedback || '').slice(0, 4000),
      criticalGaps: Array.isArray(parsed.criticalGaps) ? parsed.criticalGaps.slice(0, 10) : [],
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[PanelReview][chief] failed: ${msg}`)
    // 总编辑失败：以评审平均分为准
    const avg = reviewers.reduce((s, r) => s + r.score, 0) / Math.max(1, reviewers.length)
    const avgPct = Math.round(avg * 20) // 1-5 → 20-100
    const fallbackDecision: 'approve' | 'reject' =
      reviewers.every((r) => r.verdict === 'approve') && avg >= 3.5 ? 'approve' : 'reject'
    return {
      decision: fallbackDecision,
      score: avgPct,
      mergedFeedback: `总编辑调用失败（${msg.slice(0, 120)}），以评审平均分 ${avg.toFixed(1)}/5 兜底判定。`,
      criticalGaps: reviewers.flatMap((r) => r.gaps).slice(0, 10),
    }
  }
}

/**
 * 对一份课程大纲跑完整教师团评审。
 *
 * @param round 当前是第几轮（1-based），仅写入返回值，调用方自行管理循环。
 */
export async function reviewOutline(
  settings: Record<string, unknown>,
  ctx: ReviewContext,
  modules: GeneratedModule[],
  round: number,
): Promise<PanelReviewResult> {
  const outlineText = formatOutline(modules)
  const contextText = formatContext(ctx)

  // 3 位专家并行
  const reviewers = await Promise.all([
    callOneReviewer(settings, 'subject', buildSubjectReviewerSystemPrompt(ctx), ctx, outlineText, contextText),
    callOneReviewer(
      settings,
      'instructional',
      INSTRUCTIONAL_SYSTEM_PROMPT,
      ctx,
      outlineText,
      contextText,
    ),
    callOneReviewer(settings, 'child-dev', CHILD_DEV_SYSTEM_PROMPT, ctx, outlineText, contextText),
  ])

  // 总编辑终审
  const chief = await callChiefEditor(settings, ctx, outlineText, contextText, reviewers)

  // Safety 规则：任一评审 score ≤ 2 → 强制否决
  const hardFail = reviewers.find((r) => r.score <= 2)
  if (hardFail && chief.decision === 'approve') {
    return {
      round,
      reviewers,
      chief: {
        ...chief,
        decision: 'reject',
        safetyOverride: `${hardFail.reviewer} 给出 ${hardFail.score}/5 的低分，触发 safety 下限，强制 reject`,
      },
    }
  }

  return { round, reviewers, chief }
}

/**
 * 把一份评审结果转成给"下一轮生成 LLM"的 feedback 文本。
 * 调用方（course-initializer）在循环里拿它拼进 userPrompt。
 */
export function buildFeedbackPrompt(rounds: PanelReviewResult[]): string {
  if (rounds.length === 0) return ''
  const latest = rounds[rounds.length - 1]
  const historySnippet =
    rounds.length > 1
      ? `\n\n【历史轮次】本次已经是第 ${rounds.length + 1} 轮重写，请不要重复上一轮的问题。`
      : ''
  return `## 上一轮教师团评审意见（综合分 ${latest.chief.score}/100，${latest.chief.decision}）

${latest.chief.mergedFeedback}

### 必须补足的关键点
${
  latest.chief.criticalGaps.length
    ? latest.chief.criticalGaps.map((g) => `- ${g}`).join('\n')
    : '- （无）'
}

### 各评审的具体建议
${latest.reviewers
  .flatMap((r) =>
    r.suggestions.map(
      (s) =>
        `- [${
          r.reviewer === 'subject' ? '学科' : r.reviewer === 'instructional' ? '教设' : '儿童心理'
        }] ${s}`,
    ),
  )
  .join('\n')}${historySnippet}

请基于以上意见重新生成大纲，修正已指出的问题，同时保留评审认可的优点。`
}
