/**
 * Courses Routes — 热拔插课程 API
 *
 * POST /api/courses/dialog      —— 苏格拉底式多轮对话，收集课程需求
 * POST /api/courses/finalize    —— 确认课程名，触发异步初始化任务
 * POST /api/courses/:id/continue —— 从已就绪课程续开下一阶段（LLM 规划 + 新 initializing 行）
 * POST /api/courses/:id/retry   —— 失败后重试初始化
 *
 * 增删改查列表走 PostgREST（前端直连），这里只处理需要 LLM/后台任务的动作。
 */

import type { Express, Request, Response } from 'express'
import { generateText } from 'ai'
import { pool } from '../db.js'
import { createQuestionModel, type QuestionGenerationSettings } from '../question-model.js'
import { triggerProcessing } from '../services/task-processor.js'
import { requireAuth } from '../middleware/auth.js'
import { planNextStageCourse } from '../services/course-continuation-planner.js'
import { classifyDisciplineFromSlug } from '../services/discipline-classifier.js'

// ============================================================
// 类型
// ============================================================

interface DialogMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** 仅 assistant 消息使用：这一轮 LLM 建议的 3 个候选回复 */
  suggestedReplies?: string[]
}

interface RequirementSpec {
  topic?: string
  goal?: string
  scope?: string
  depth?: string
  prior_knowledge?: string
  preferred_style?: string
  level?: string
  extras?: Record<string, unknown>
  ready?: boolean
}

interface DialogResponseJSON {
  assistant_message: string
  spec: RequirementSpec
  ready: boolean
  /** 3 个快捷候选答案（让用户一键点选，不满足再手动输入）；ready=true 时不用填 */
  suggested_replies?: string[]
  suggested_name?: string
  suggested_emoji?: string
  suggested_color_hex?: string
  suggested_slug?: string
}

// ============================================================
// Socratic System Prompt
// ============================================================

const SOCRATIC_SYSTEM_PROMPT = `你是一位苏格拉底式的课程设计师。用户告诉你他想学什么，你通过提问帮他把需求想清楚，最后确认课程名和外观。

## 你要收集的字段（逐步问出来，不要一次问多个）
- topic：学习主题（学科名或知识点名，如"生物"、"三角函数"、"个人理财"）
- level：学习者的当前水平 / 年龄 / 年级（比如"五年级"、"成人零基础"）——**你必须主动询问这一项**
- goal：学习目标（入门了解 / 系统掌握 / 应付考试 / 个人兴趣）
- scope：覆盖范围（整个学科 / 某一章节 / 某个具体知识点）
- depth：学习深度（浅尝 / 中等 / 深入）
- prior_knowledge：已有基础
- preferred_style：偏好的学习方式（视频 / 文字 / 互动 / 问答）

## 对话原则
- **每轮只问一个问题**，用温和、好奇、口语化的中文
- 保留主动权，引导而非审讯
- 如果用户给的信息已经能回答某字段，不必再追问
- 如果用户回答模糊，用具体例子帮他厘清
- **收集齐 topic + level + goal + 至少一个以下：scope/depth/prior_knowledge/preferred_style** 之后，设置 ready=true，并给出建议课程名、emoji、颜色、slug

## 输出格式（⚠️ 非常重要，每一轮都必须遵守）
你的**每一次回复**都必须且仅能是**一个合法的 JSON 对象**，不要 markdown 代码块、不要前后多余文字、不要解释说明。
即使用户的上一句只是"嗯"、"零基础"、"不知道"等极短回复，你也要继续输出 JSON。

JSON 结构（字段名严格一致，区分大小写）：
{
  "assistant_message": "要展示给用户的下一句话（问题 或 确认语）",
  "spec": {
    "topic": "...", "level": "...", "goal": "...",
    "scope": "...", "depth": "...",
    "prior_knowledge": "...", "preferred_style": "..."
  },
  "ready": false,
  "suggested_replies": ["选项1", "选项2", "选项3"],
  "suggested_name": "",
  "suggested_emoji": "",
  "suggested_color_hex": "",
  "suggested_slug": ""
}

## 字段规则
- spec 里只填你已经确认的字段，其他留空字符串或省略
- 下一句要问的问题**写进 assistant_message**，绝不要把问题直接作为纯文本回复
- **suggested_replies：ready=false 时必须给恰好 3 个**候选答复，让用户一键选择；每项≤14个汉字，三个选项要覆盖典型场景（包括一个"中间/常见"档、一个"深入/进阶"档、一个"具体/实用"档等），**彼此要有区分度**，不要三个都大同小异
- ⚠️ 严禁在 assistant_message 里用"A/B/C"或"1/2/3"去枚举选项 —— 选项只放在 suggested_replies 数组里，assistant_message 只说问题本身
- ready=true 时 suggested_replies 可为空数组 []
- ready=true 时必须同时填写 suggested_name（<=12字中文）、suggested_emoji（单个 emoji）、suggested_color_hex（#RRGGBB，柔和温暖或清新色）、suggested_slug（纯小写英文+连字符，如 "biology" 或 "personal-finance"，≤30 字符）
- ready=true 时的 assistant_message 应该是："好的，我为你准备了一门叫「{suggested_name}」的课程 ✨ 确认要开始吗？"

## 示例（仅演示格式，不要照搬内容）
用户："零基础"
你应该回复：
{"assistant_message":"完全没问题！那你希望从哪个角度切入学炒股呢？","spec":{"prior_knowledge":"零基础"},"ready":false,"suggested_replies":["先搞清楚最基础的概念","从一个具体入门案例开始","边看新闻边慢慢学"],"suggested_name":"","suggested_emoji":"","suggested_color_hex":"","suggested_slug":""}
`

// ============================================================
// LLM 辅助
// ============================================================

/**
 * 用 Vercel AI SDK 发起一轮对话（与现有 question-model.ts 保持同一套 provider 解析逻辑：
 * OpenAI/Anthropic/Google 各自走正确的 endpoint，不会再出现 /chat/completions 被硬塞给
 * 非 OpenAI 兼容服务导致 nginx 404 的问题）
 */
async function callChat(
  settings: Record<string, unknown> | undefined,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  timeoutMs = 90_000,
): Promise<{ content: string } | { error: string; status: number }> {
  const s = (settings || {}) as QuestionGenerationSettings
  if (!s.llmModel || !s.llmApiKey) {
    return { error: 'LLM 未配置：请在家长 → 设置里填写 LLM 模型和 API Key', status: 400 }
  }
  const model = createQuestionModel(s)
  if (!model) {
    return { error: '无法解析 LLM provider 配置（llmProviderId/llmModel/llmBaseUrl）', status: 400 }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      maxOutputTokens: 1200,
      abortSignal: controller.signal,
    })
    return { content: text || '' }
  } catch (e) {
    const msg = (e as Error)?.message || String(e)
    return { error: `LLM 请求失败：${msg.slice(0, 240)}`, status: 502 }
  } finally {
    clearTimeout(timer)
  }
}

function extractJSON<T>(content: string): T {
  // 1) 去掉 ```json ... ``` 或 ``` ... ``` 代码围栏
  let text = content.trim()
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/)
  if (fence) text = fence[1].trim()

  // 2) 从第一个 '{' 到最后一个 '}' 切出 JSON 对象
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('LLM response contains no JSON')
  }
  const slice = text.slice(first, last + 1)
  try {
    return JSON.parse(slice) as T
  } catch (e) {
    // 3) 兜底：常见 LLM 输出的尾巴是垃圾字符，尝试逐个右括号收紧
    for (let end = last; end > first; end--) {
      if (text[end] !== '}') continue
      try {
        return JSON.parse(text.slice(first, end + 1)) as T
      } catch {
        // continue
      }
    }
    throw new Error(`LLM response is malformed JSON: ${(e as Error).message}`)
  }
}

/**
 * 严格尝试提取 JSON；返回 null 表示失败（供上层决定是否重试）。
 * 额外要求 assistant_message 存在，避免部分 JSON 片段被误当成对话回复。
 */
function tryStrictParse(content: string): DialogResponseJSON | null {
  try {
    const obj = extractJSON<DialogResponseJSON>(content)
    if (obj && typeof obj.assistant_message === 'string' && obj.assistant_message.trim()) {
      return obj
    }
    return null
  } catch {
    return null
  }
}

/**
 * 尝试解析 LLM 返回的对话 JSON；解析失败时以"降级模式"继续对话：
 *   - 把原始文本作为 assistant_message 展示（起码对话不会卡死）
 *   - ready=false、spec 不更新，等下一轮 LLM 重新正常回 JSON 时再继续
 */
function parseDialogResponseOrFallback(content: string): DialogResponseJSON {
  try {
    return extractJSON<DialogResponseJSON>(content)
  } catch (err) {
    console.warn(
      '[courses/dialog] JSON 解析失败，使用降级文本：',
      (err as Error).message,
      '| raw:', content.slice(0, 300),
    )
    // 截掉可能的 JSON 残片，只保留前面人话的那一段
    let plain = content.trim()
    const jsonStart = plain.indexOf('{')
    if (jsonStart > 40) plain = plain.slice(0, jsonStart).trim()
    return {
      spec: {},
      ready: false,
      assistant_message: plain || '（思考了一下还没想好怎么问你，再跟我说几句好吗？）',
    }
  }
}

function validateSlug(slug: string): string {
  const cleaned = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return cleaned.slice(0, 30)
}

// ============================================================
// 注册路由
// ============================================================

export function registerCoursesRoutes(app: Express): void {
  // ============================================================
  // POST /api/courses/dialog
  // ============================================================
  app.post('/api/courses/dialog', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.authUser!.userId
      const {
        courseId,
        userMessage,
        childSettings,
      } = req.body as {
        courseId?: number
        userMessage: string
        childSettings: Record<string, unknown>
      }

      if (!userMessage || typeof userMessage !== 'string') {
        res.status(400).json({ error: 'userMessage is required' })
        return
      }

      // 加载或创建 course 行
      let course: {
        id: number
        slug: string
        name: string
        requirement_spec: RequirementSpec
        dialog_history: DialogMessage[]
        status: string
      }

      if (courseId) {
        const { rows } = await pool.query(
          `SELECT id, slug, name, requirement_spec, dialog_history, status
           FROM api.courses WHERE id = $1 AND user_id = $2`,
          [courseId, userId],
        )
        if (rows.length === 0) {
          res.status(404).json({ error: 'course not found' })
          return
        }
        course = rows[0]
        if (course.status === 'ready') {
          res.status(400).json({ error: 'course already ready, cannot continue dialog' })
          return
        }
      } else {
        // 新建草稿课程
        const tempSlug = `draft-${Date.now().toString(36)}`
        const { rows } = await pool.query(
          `INSERT INTO api.courses (user_id, slug, name, status, requirement_spec, dialog_history)
           VALUES ($1, $2, '新课程', 'draft', '{}', '[]')
           RETURNING id, slug, name, requirement_spec, dialog_history, status`,
          [userId, tempSlug],
        )
        course = rows[0]
      }

      // 追加用户消息到历史
      const dialogHistory: DialogMessage[] = [
        ...(course.dialog_history || []),
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      ]

      // 调 LLM（走 Vercel AI SDK，自动区分 OpenAI / Anthropic / Google endpoint）
      const llmResult = await callChat(
        childSettings,
        SOCRATIC_SYSTEM_PROMPT,
        dialogHistory.map((m) => ({ role: m.role, content: m.content })),
        90_000,
      )
      if ('error' in llmResult) {
        res.status(llmResult.status).json({ error: llmResult.error })
        return
      }
      let content = llmResult.content

      // 首次 JSON 解析尝试 —— 成功就直接用
      let parsed = tryStrictParse(content)
      // 如果 LLM 没按指令输出 JSON，发一条"请严格用 JSON 回复"的纠正消息重试一次
      if (!parsed) {
        console.warn('[courses/dialog] 首轮非 JSON，发起纠正重试。raw=', content.slice(0, 200))
        const retryMessages = [
          ...dialogHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          {
            role: 'assistant' as const,
            content,
          },
          {
            role: 'user' as const,
            content:
              '（系统提示）上一条回复不是合法 JSON。请严格按 system prompt 里定义的 JSON 对象格式，' +
              '只输出一个 JSON 对象，不要 markdown 代码块，不要额外说明文字。',
          },
        ]
        const retry = await callChat(childSettings, SOCRATIC_SYSTEM_PROMPT, retryMessages, 60_000)
        if (!('error' in retry)) {
          content = retry.content
          parsed = tryStrictParse(content)
        }
      }
      // 两次都不行就降级（以 LLM 原文作为 assistant_message 继续对话，不让 UI 卡死）
      if (!parsed) {
        parsed = parseDialogResponseOrFallback(content)
      }

      // 合并 spec
      const mergedSpec: RequirementSpec = {
        ...(course.requirement_spec || {}),
        ...parsed.spec,
        ready: parsed.ready,
      }

      // 归一化 suggested_replies —— 最多 3 条、每条去空格、≤40 字
      const suggestedReplies: string[] = Array.isArray(parsed.suggested_replies)
        ? parsed.suggested_replies
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, 3)
        : []

      // 追加 assistant 消息（带上本轮候选回复，续聊时能还原胶囊）
      dialogHistory.push({
        role: 'assistant',
        content: parsed.assistant_message,
        timestamp: new Date().toISOString(),
        suggestedReplies: suggestedReplies.length > 0 ? suggestedReplies : undefined,
      })

      // 持久化
      await pool.query(
        `UPDATE api.courses
         SET requirement_spec = $1::jsonb, dialog_history = $2::jsonb, updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(mergedSpec), JSON.stringify(dialogHistory), course.id],
      )

      res.json({
        courseId: course.id,
        assistantMessage: parsed.assistant_message,
        spec: mergedSpec,
        ready: !!parsed.ready,
        suggestedReplies,
        suggestedName: parsed.suggested_name,
        suggestedEmoji: parsed.suggested_emoji,
        suggestedColorHex: parsed.suggested_color_hex,
        suggestedSlug: parsed.suggested_slug ? validateSlug(parsed.suggested_slug) : undefined,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[courses/dialog] 错误:', message)
      res.status(500).json({ error: message })
    }
  })

  // ============================================================
  // POST /api/courses/finalize —— 确认课程名并触发初始化
  // ============================================================
  app.post('/api/courses/finalize', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.authUser!.userId
      const {
        courseId,
        childId,
        name,
        emoji,
        colorHex,
        slug,
        childAge: bodyChildAge,
        childSettings,
      } = req.body as {
        courseId: number
        childId: number
        name: string
        emoji?: string
        colorHex?: string
        slug?: string
        childAge?: number
        childSettings: Record<string, unknown>
      }

      if (!courseId || !childId || !name) {
        res.status(400).json({ error: 'courseId, childId, name are required' })
        return
      }

      // 校验 course 归属
      const { rows: courseRows } = await pool.query(
        `SELECT id, slug FROM api.courses WHERE id = $1 AND user_id = $2`,
        [courseId, userId],
      )
      if (courseRows.length === 0) {
        res.status(404).json({ error: 'course not found' })
        return
      }

      let resolvedChildAge =
        typeof bodyChildAge === 'number' && Number.isFinite(bodyChildAge)
          ? Math.max(3, Math.min(18, Math.round(bodyChildAge)))
          : undefined
      if (resolvedChildAge === undefined) {
        const { rows: ageRows } = await pool.query<{ age: number }>(
          `SELECT age FROM api.children WHERE id = $1 AND user_id = $2`,
          [childId, userId],
        )
        resolvedChildAge = ageRows[0]?.age ?? 7
      }

      // slug 需要 **全局唯一**（curricula.subject 全局唯一，subject 即 course.slug；
      // subject 即取自 course.slug；同 slug 跨用户会在 curricula 主键上冲撞）
      const desiredSlug = validateSlug(slug || name.toLowerCase().replace(/\s+/g, '-') || `course-${courseId}`)
      let finalSlug = desiredSlug
      let n = 1
      while (true) {
        const { rows: existing } = await pool.query(
          `SELECT id FROM api.courses WHERE slug = $1 AND id != $2`,
          [finalSlug, courseId],
        )
        if (existing.length === 0) break
        n++
        finalSlug = `${desiredSlug}-${n}`
        if (n > 20) throw new Error('cannot resolve unique slug')
      }

      // 更新 course
      await pool.query(
        `UPDATE api.courses
         SET name = $1, emoji = COALESCE($2, emoji), color_hex = COALESCE($3, color_hex),
             slug = $4, status = 'initializing', init_error = NULL, updated_at = NOW()
         WHERE id = $5`,
        [name, emoji || null, colorHex || null, finalSlug, courseId],
      )

      // 投递初始化任务
      const { rows: taskRows } = await pool.query<{ id: number }>(
        `INSERT INTO api.generation_tasks
           (child_id, task_type, course_id, date, language, settings, status, max_retries, knowledge_node_id, requirement)
         VALUES ($1, 'course-initialization', $2, $3, 'zh-CN', $4::jsonb, 'pending', 1, NULL, NULL)
         RETURNING id`,
        [
          childId,
          courseId,
          new Date().toISOString().slice(0, 10),
          JSON.stringify({ ...childSettings, childAge: resolvedChildAge }),
        ],
      )

      await pool.query(
        `UPDATE api.courses SET init_task_id = $1 WHERE id = $2`,
        [taskRows[0].id, courseId],
      )

      triggerProcessing()

      res.json({
        courseId,
        slug: finalSlug,
        taskId: taskRows[0].id,
        status: 'initializing',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[courses/finalize] 错误:', message)
      res.status(500).json({ error: message })
    }
  })

  // ============================================================
  // POST /api/courses/:id/continue —— 续阶新课程
  // ============================================================
  app.post('/api/courses/:id/continue', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.authUser!.userId
      const parentCourseId = parseInt(String(req.params.id), 10)
      const { childId, childSettings, childAge: bodyChildAge } = req.body as {
        childId: number
        childSettings?: Record<string, unknown>
        childAge?: number
      }

      if (!parentCourseId || !childId) {
        res.status(400).json({ error: 'parent course id and childId are required' })
        return
      }

      const settings =
        childSettings && typeof childSettings === 'object' ? childSettings : {}

      const { rows: childRows } = await pool.query(`SELECT id FROM api.children WHERE id = $1 AND user_id = $2`, [
        childId,
        userId,
      ])
      if (childRows.length === 0) {
        res.status(400).json({ error: 'child not found' })
        return
      }

      const { rows: parRows } = await pool.query<{
        id: number
        slug: string
        name: string
        emoji: string
        color_hex: string
        status: string
        stage_index: number
        discipline_type: string | null
      }>(
        `SELECT id, slug, name, emoji, color_hex, status,
            COALESCE(stage_index, 0) AS stage_index,
            discipline_type
         FROM api.courses
         WHERE id = $1
           AND (user_id = $2 OR (is_system = TRUE AND user_id IS NULL))`,
        [parentCourseId, userId],
      )
      if (parRows.length === 0) {
        res.status(404).json({ error: 'course not found' })
        return
      }
      const parent = parRows[0]
      if (parent.status !== 'ready') {
        res.status(400).json({ error: 'parent course must be ready' })
        return
      }

      let resolvedChildAge =
        typeof bodyChildAge === 'number' && Number.isFinite(bodyChildAge)
          ? Math.max(3, Math.min(18, Math.round(bodyChildAge)))
          : undefined
      if (resolvedChildAge === undefined) {
        const { rows: ageRows } = await pool.query<{ age: number }>(
          `SELECT age FROM api.children WHERE id = $1 AND user_id = $2`,
          [childId, userId],
        )
        resolvedChildAge = ageRows[0]?.age ?? 7
      }

      const plan = await planNextStageCourse({
        parentCourseId,
        childId,
        settings,
      })

      const nextStage = Number(parent.stage_index) + 1
      let baseSlug = validateSlug(plan.suggestedSlug)
      if (!baseSlug) baseSlug = validateSlug(`${parent.slug}-s${nextStage}`)
      let finalSlug = baseSlug
      let n = 0
      while (true) {
        const { rows: existing } = await pool.query(`SELECT id FROM api.courses WHERE slug = $1`, [finalSlug])
        if (existing.length === 0) break
        n++
        finalSlug = validateSlug(`${baseSlug}-${n}`)
        if (n > 40) {
          res.status(500).json({ error: 'cannot resolve unique slug for continuation' })
          return
        }
      }

      const discRaw = parent.discipline_type
      const disciplineType =
        discRaw === 'academic' || discRaw === 'interest' ? discRaw : classifyDisciplineFromSlug(parent.slug)

      const hex = /^#[0-9A-Fa-f]{6}$/.test((plan.suggestedColorHex || '').trim())
        ? plan.suggestedColorHex.trim()
        : parent.color_hex || '#5BC0EB'
      const emoji = (plan.suggestedEmoji || parent.emoji || '📚').slice(0, 10)
      const courseName = (plan.suggestedName || `${parent.name}·进阶`).slice(0, 100)

      const { rows: insRows } = await pool.query<{ id: number }>(
        `INSERT INTO api.courses (
           user_id, slug, name, emoji, color_hex, is_system, status,
           requirement_spec, dialog_history, parent_course_id, stage_index, discipline_type
         ) VALUES ($1, $2, $3, $4, $5, FALSE, 'initializing', $6::jsonb, '[]', $7, $8, $9)
         RETURNING id`,
        [
          userId,
          finalSlug,
          courseName,
          emoji,
          hex,
          JSON.stringify(plan.requirementSpec),
          parentCourseId,
          nextStage,
          disciplineType,
        ],
      )
      const newCourseId = insRows[0].id

      const { rows: taskRows } = await pool.query<{ id: number }>(
        `INSERT INTO api.generation_tasks
           (child_id, task_type, course_id, date, language, settings, status, max_retries, knowledge_node_id, requirement)
         VALUES ($1, 'course-initialization', $2, $3, 'zh-CN', $4::jsonb, 'pending', 1, NULL, NULL)
         RETURNING id`,
        [
          childId,
          newCourseId,
          new Date().toISOString().slice(0, 10),
          JSON.stringify({ ...settings, childAge: resolvedChildAge }),
        ],
      )

      await pool.query(`UPDATE api.courses SET init_task_id = $1 WHERE id = $2`, [taskRows[0].id, newCourseId])

      triggerProcessing()
      res.json({
        courseId: newCourseId,
        slug: finalSlug,
        taskId: taskRows[0].id,
        status: 'initializing',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[courses/continue] 错误:', message)
      res.status(500).json({ error: message })
    }
  })

  // ============================================================
  // POST /api/courses/:id/retry
  // ============================================================
  // ============================================================
  // DELETE /api/courses/:id —— 级联删除自建课程
  //
  // 直接 DELETE /courses 只会通过 FK 级联掉 curricula / curriculum_*,
  // 但 knowledge_nodes / placement_* / mastery_* / learning_records
  // 等按 subject(=slug) 或 knowledge_node_id 前缀索引的表不会被清。
  // 这里用事务一次性清理干净，避免脏数据堆积。
  // ============================================================
  app.delete('/api/courses/:id', requireAuth, async (req: Request, res: Response) => {
    const client = await pool.connect()
    try {
      const userId = req.authUser!.userId
      const courseId = parseInt(String(req.params.id), 10)
      if (!courseId) {
        res.status(400).json({ error: 'invalid course id' })
        return
      }

      await client.query('BEGIN')

      // 校验归属：
      //   - 自建课程必须归当前家长所有（user_id = $2）
      //   - 系统课程（is_system = TRUE, user_id IS NULL）对该家庭下的任意家长都允许删除
      //     —— 业务上当前 App 是单家庭场景，家长可以选择把预置课程从家里拿掉
      const { rows } = await client.query<{ slug: string; is_system: boolean }>(
        `SELECT slug, is_system FROM api.courses
          WHERE id = $1
            AND (user_id = $2 OR (is_system = TRUE AND user_id IS NULL))
          FOR UPDATE`,
        [courseId, userId],
      )
      if (rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({ error: 'course not found or not owned by user' })
        return
      }
      const slug = rows[0].slug
      const nodeIdPattern = `${slug}-%`

      // 1) 按 knowledge_node_id 前缀清理
      await client.query(`DELETE FROM api.classroom_cache WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])
      await client.query(`DELETE FROM api.knowledge_node_lessons WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])
      await client.query(`DELETE FROM api.learning_records WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])
      await client.query(`DELETE FROM api.mastery_records WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])
      await client.query(`DELETE FROM api.questions WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])
      await client.query(`DELETE FROM api.question_templates WHERE knowledge_node_id LIKE $1`, [nodeIdPattern])

      // 2) 按 subject(=slug) 清理
      await client.query(`DELETE FROM api.placement_questions WHERE subject = $1`, [slug])
      await client.query(`DELETE FROM api.placement_tests WHERE subject = $1`, [slug])
      await client.query(`DELETE FROM api.mastery_snapshots WHERE subject = $1`, [slug])
      await client.query(`DELETE FROM api.classroom_history WHERE subject = $1`, [slug])
      await client.query(`DELETE FROM api.knowledge_nodes WHERE subject = $1`, [slug])

      // 3) 最后删 course 行，FK 级联清空 curricula / curriculum_* / generation_tasks
      await client.query(`DELETE FROM api.courses WHERE id = $1`, [courseId])

      await client.query('COMMIT')
      res.json({ ok: true, deletedCourseId: courseId, deletedSlug: slug })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      const message = error instanceof Error ? error.message : String(error)
      console.error('[courses/delete] 错误:', message)
      res.status(500).json({ error: message })
    } finally {
      client.release()
    }
  })

  app.post('/api/courses/:id/retry', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.authUser!.userId
      const courseId = parseInt(String(req.params.id), 10)
      const { childId, childSettings, childAge: bodyChildAge } = req.body as {
        childId: number
        childSettings: Record<string, unknown>
        childAge?: number
      }
      if (!courseId || !childId) {
        res.status(400).json({ error: 'courseId, childId required' })
        return
      }
      const { rows } = await pool.query(
        `SELECT id FROM api.courses WHERE id = $1 AND user_id = $2 AND status = 'failed'`,
        [courseId, userId],
      )
      if (rows.length === 0) {
        res.status(404).json({ error: 'no failed course found for retry' })
        return
      }

      let resolvedChildAge =
        typeof bodyChildAge === 'number' && Number.isFinite(bodyChildAge)
          ? Math.max(3, Math.min(18, Math.round(bodyChildAge)))
          : undefined
      if (resolvedChildAge === undefined) {
        const { rows: ageRows } = await pool.query<{ age: number }>(
          `SELECT age FROM api.children WHERE id = $1 AND user_id = $2`,
          [childId, userId],
        )
        resolvedChildAge = ageRows[0]?.age ?? 7
      }

      await pool.query(
        `UPDATE api.courses SET status = 'initializing', init_error = NULL, updated_at = NOW()
         WHERE id = $1`,
        [courseId],
      )

      const { rows: taskRows } = await pool.query<{ id: number }>(
        `INSERT INTO api.generation_tasks
           (child_id, task_type, course_id, date, language, settings, status, max_retries, knowledge_node_id, requirement)
         VALUES ($1, 'course-initialization', $2, $3, 'zh-CN', $4::jsonb, 'pending', 1, NULL, NULL)
         RETURNING id`,
        [
          childId,
          courseId,
          new Date().toISOString().slice(0, 10),
          JSON.stringify({ ...childSettings, childAge: resolvedChildAge }),
        ],
      )

      await pool.query(
        `UPDATE api.courses SET init_task_id = $1 WHERE id = $2`,
        [taskRows[0].id, courseId],
      )

      triggerProcessing()
      res.json({ courseId, taskId: taskRows[0].id, status: 'initializing' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[courses/retry] 错误:', message)
      res.status(500).json({ error: message })
    }
  })
}
