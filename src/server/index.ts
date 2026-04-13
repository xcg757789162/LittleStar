/**
 * LittleStar Pre-Generation Backend Service
 *
 * Express 后端服务，负责课堂预生成的任务队列管理和 Pipeline 编排。
 * 监听 3003 端口，暴露以下 API：
 *   POST /api/pre-generate         — 提交生成任务
 *   GET  /api/pre-generate/status   — 查询任务进度
 *   POST /api/pre-generate/cancel   — 取消任务
 *   GET  /api/pre-generate/health   — 健康检查
 *
 * 设计决策参考：design.md D1
 */

import express from 'express'
import { aiQuestionSchema, validateAIQuestion } from '../engine/ai-question-schema.js'
import { pool } from './db.js'
import { resolveLLMBaseUrl, type QuestionGenerationSettings } from './question-model.js'
import { startTaskProcessor, stopTaskProcessor, triggerProcessing } from './services/task-processor.js'

const app = express()
app.use(express.json({ limit: '10mb', type: 'application/json' }))

const PORT = parseInt(process.env.PREGEN_PORT || '3003', 10)

/** 单次提交的最大任务数 */
const MAX_TASKS_PER_SUBMIT = 50
/** 评测题目 AI 超时 */
const QUESTION_TIMEOUT_MS = 45_000

interface Phase2Ctx {
  assessmentType?: 'placement' | 'exam' | 'practice'
  phase2Mode: 'verify' | 'challenge' | 'mixed'
  overallPhase1Score: number
  sameModulePerformance?: { nodeName: string; isCorrect: boolean; difficulty: number }[]
  purpose: string
}

const ASSESSMENT_SCENE_LABELS: Record<string, string> = {
  placement: '入学水平测评',
  exam: '课后/阶段性考试',
  practice: '针对性强化练习',
}

const PHASE2_MODE_LABELS: Record<string, string> = {
  challenge: '挑战模式（找到真实能力上限）',
  verify: '验证模式（确认薄弱环节）',
  mixed: '混合模式（验证+挑战）',
}

function buildQuestionSystemPrompt(
  nodeName: string,
  nodeDescription: string,
  gradeLevel: string,
  subject: string,
  phase2Context?: Phase2Ctx,
): string {
  const gradeAgeMap: Record<string, string> = {
    'middle-kindergarten': '中班（4-5岁）',
    'senior-kindergarten': '大班（5-6岁）',
    'grade-1': '一年级（6-7岁）',
    'grade-2': '二年级（7-8岁）',
    'grade-3': '三年级（8-9岁）',
    'grade-4': '四年级（9-10岁）',
    'grade-5': '五年级（10-11岁）',
    'grade-6': '六年级（11-12岁）',
  }
  const subjectNameMap: Record<string, string> = {
    math: '数学',
    chinese: '语文',
    english: '英语',
  }

  const ageDescription = gradeAgeMap[gradeLevel] || gradeLevel
  const subjectName = subjectNameMap[subject] || subject

  let prompt = `你是一个面向幼儿的教育评测出题专家。

## 任务
根据给定的知识点，生成一道四选一选择题，用于评估 ${ageDescription} 孩子对 ${subjectName} 科目中「${nodeName}」知识点的掌握程度。

## 知识点信息
- 名称：${nodeName}
- 描述：${nodeDescription}
- 科目：${subjectName}
- 年龄段：${ageDescription}
`

  if (phase2Context) {
    const sceneLabel = ASSESSMENT_SCENE_LABELS[phase2Context.assessmentType || 'placement'] || '评测'
    const modeLabel = PHASE2_MODE_LABELS[phase2Context.phase2Mode] || phase2Context.phase2Mode
    prompt += `
## 评测背景
- 评测类型：${sceneLabel}
- 前一轮得分：${phase2Context.overallPhase1Score}/100
- 当前出题模式：${modeLabel}
`
    if (phase2Context.sameModulePerformance?.length) {
      prompt += '- 同模块已答知识点表现：\n'
      for (const p of phase2Context.sameModulePerformance) {
        const status = p.isCorrect ? '答对' : '答错'
        prompt += `  - 「${p.nodeName}」(难度${p.difficulty}): ${status}\n`
      }
    }
    prompt += `- 出题目的：${phase2Context.purpose}

## 难度调整要求
`
    if (phase2Context.phase2Mode === 'challenge') {
      prompt += '- 难度 3-5，重点考察理解应用和综合能力，题目应比前一轮更有挑战性\n'
    } else if (phase2Context.phase2Mode === 'verify') {
      prompt += '- 难度 1-3，用于确认学生是否真的不掌握，不要出太难的题\n'
    } else {
      prompt += '- 根据上述出题目的自行调整难度\n'
    }
  }

  prompt += `
## 要求
1. 题干使用简单口语化中文${subject === 'english' ? '（可中英混合）' : ''}，不超过 30 字，可用 emoji
2. 恰好 4 个选项，每个选项含 text（≤8 字）和 emoji
3. 正确答案的位置要随机（不总是第一个或最后一个）
4. 干扰项合理，不要太离谱
5. 难度 1-5（1=基本认知, 3=理解应用, 5=综合能力）
6. 只输出 JSON，不要其他文字

## 输出格式（严格遵守）
\`\`\`json
{
  "stem": "题干文字",
  "options": [
    {"text": "选项A", "emoji": "🍎"},
    {"text": "选项B", "emoji": "🍌"},
    {"text": "选项C", "emoji": "🍇"},
    {"text": "选项D", "emoji": "🍊"}
  ],
  "correctIndex": 0,
  "difficulty": 2
}
\`\`\``

  return prompt
}

// ============================================================
// POST /api/pre-generate/question — 评测题目同源代理
// ============================================================
app.post('/api/pre-generate/question', async (req, res) => {
  const t0 = Date.now()
  try {
    const {
      node,
      gradeLevel,
      subject,
      settings,
      phase2Context,
    } = req.body as {
      node?: { id: string; name: string; description: string }
      gradeLevel?: string
      subject?: string
      settings?: QuestionGenerationSettings
      phase2Context?: Phase2Ctx
    }

    if (!node?.id || !node.name || typeof node.description !== 'string') {
      res.status(400).json({ error: 'node with id/name/description is required' })
      return
    }

    if (!gradeLevel || !subject) {
      res.status(400).json({ error: 'gradeLevel and subject are required' })
      return
    }

    if (!settings?.llmModel || !settings.llmApiKey) {
      res.status(400).json({ error: 'llmModel and llmApiKey are required' })
      return
    }

    const { modelId } = (() => {
      const m = settings.llmModel.trim()
      const idx = m.indexOf(':')
      return idx > 0 ? { modelId: m.substring(idx + 1).trim() } : { modelId: m }
    })()
    const baseUrl = (settings.llmBaseUrl?.trim() || resolveLLMBaseUrl(settings) || '').replace(/\/+$/, '')
    if (!baseUrl) {
      res.status(400).json({ error: 'cannot resolve LLM base URL' })
      return
    }

    console.log(`[API] question 请求: model=${modelId}, baseUrl=${baseUrl}, node=${node.name}, phase2=${phase2Context?.phase2Mode ?? 'none'}`)

    const systemPrompt = buildQuestionSystemPrompt(node.name, node.description, gradeLevel, subject, phase2Context)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), QUESTION_TIMEOUT_MS)

    try {
      const llmResp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.llmApiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请为知识点「${node.name}」生成一道评测选择题。只输出 JSON，不要其他文字。` },
          ],
          temperature: 0.7,
          max_tokens: 800,
          enable_thinking: false,
        }),
        signal: controller.signal,
      })

      const elapsed = Date.now() - t0
      if (!llmResp.ok) {
        const errBody = await llmResp.text().catch(() => '')
        console.error(`[API] LLM HTTP ${llmResp.status} (${elapsed}ms): ${errBody.slice(0, 200)}`)
        const retryable = llmResp.status >= 500 || llmResp.status === 429
        res.status(502).json({ error: `LLM returned HTTP ${llmResp.status}`, retryable })
        return
      }

      const llmBody = await llmResp.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = llmBody.choices?.[0]?.message?.content || ''
      console.log(`[API] ✅ LLM 响应: ${elapsed}ms, ${content.length} 字符`)

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[API] LLM 返回中未找到 JSON:', content.slice(0, 200))
        res.status(502).json({ error: 'LLM response contains no JSON object', retryable: true })
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        console.error('[API] JSON 解析失败:', jsonMatch[0].slice(0, 200))
        res.status(502).json({ error: 'Failed to parse JSON from LLM response', retryable: true })
        return
      }

      const zodResult = aiQuestionSchema.safeParse(parsed)
      if (!zodResult.success) {
        console.error('[API] Schema 校验失败:', zodResult.error.message)
        res.status(502).json({ error: 'Generated question failed schema validation', retryable: true })
        return
      }

      const validated = validateAIQuestion(zodResult.data)
      if (!validated) {
        res.status(502).json({ error: 'Generated question failed business validation' })
        return
      }

      res.json({ question: validated })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const elapsed = Date.now() - t0
    const message = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Unknown'
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    const isOverloaded = message.includes('overloaded') || message.includes('529')
    const isRateLimit = message.includes('rate_limit') || message.includes('429')
    const status = isTimeout ? 504 : 502
    const retryable = isTimeout || isOverloaded || isRateLimit
    console.error(`[API] ❌ question 错误 (${elapsed}ms): [${errorName}] ${message}`)
    res.status(status).json({ error: message || 'question generation failed', retryable })
  }
})

// ============================================================
// POST /api/pre-generate — 提交生成任务
// ============================================================
app.post('/api/pre-generate', async (req, res) => {
  try {
    const { childId, childSettings, tasks } = req.body as {
      childId: number
      childSettings: Record<string, unknown>
      tasks: Array<{
        knowledgeNodeId: string
        date: string
        requirement: string
        language?: string
      }>
    }

    // 参数验证
    if (!childId || typeof childId !== 'number') {
      res.status(400).json({ error: 'childId is required and must be a number' })
      return
    }
    if (!childSettings || !childSettings.llmModel || !childSettings.llmApiKey) {
      res.status(400).json({ error: 'childSettings with llmModel and llmApiKey is required' })
      return
    }
    if (!Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: 'tasks array is required and must not be empty' })
      return
    }
    if (tasks.length > MAX_TASKS_PER_SUBMIT) {
      res.status(400).json({ error: `tasks array must not exceed ${MAX_TASKS_PER_SUBMIT} items` })
      return
    }

    // 使用事务批量插入任务（原子性：全部成功或全部回滚）
    const client = await pool.connect()
    const taskIds: number[] = []
    try {
      await client.query('BEGIN')

      // 1. 清理该 child 所有失败/取消的旧任务（避免数字无限累积）
      await client.query(
        `DELETE FROM api.generation_tasks
         WHERE child_id = $1
           AND status IN ('failed', 'cancelled')`,
        [childId],
      )

      // 2. 检查已有的 pending/running 任务，用于去重
      const { rows: existingTasks } = await client.query(
        `SELECT knowledge_node_id, date
         FROM api.generation_tasks
         WHERE child_id = $1
           AND status IN ('pending', 'running')`,
        [childId],
      )
      const existingSet = new Set(
        existingTasks.map((r: { knowledge_node_id: string; date: string }) =>
          `${r.knowledge_node_id}|${r.date}`,
        ),
      )

      // 3. 只插入不重复的任务
      for (const task of tasks) {
        const key = `${task.knowledgeNodeId}|${task.date}`
        if (existingSet.has(key)) {
          console.log(`[API] 跳过重复任务: ${key}`)
          continue
        }
        const result = await client.query(
          `INSERT INTO api.generation_tasks
             (child_id, knowledge_node_id, date, requirement, language, settings, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')
           RETURNING id`,
          [
            childId,
            task.knowledgeNodeId,
            task.date,
            task.requirement,
            task.language || 'zh-CN',
            JSON.stringify(childSettings),
          ],
        )
        taskIds.push(result.rows[0].id)
        existingSet.add(key)
      }
      await client.query('COMMIT')
    } catch (txError) {
      await client.query('ROLLBACK')
      throw txError
    } finally {
      client.release()
    }

    // 如果所有任务都被去重跳过了
    if (taskIds.length === 0) {
      res.json({
        taskIds: [],
        message: '所有任务已在队列中，无需重复提交',
      })
      return
    }

    // 触发处理
    triggerProcessing()

    res.json({
      taskIds,
      message: `${taskIds.length} 个生成任务已提交`,
    })
  } catch (error) {
    console.error('[API] POST /api/pre-generate 错误:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================
// GET /api/pre-generate/status — 查询任务进度
// ============================================================
app.get('/api/pre-generate/status', async (req, res) => {
  try {
    const childId = parseInt(req.query.childId as string, 10)
    if (!childId || isNaN(childId)) {
      res.status(400).json({ error: 'childId query parameter is required' })
      return
    }

    // 统一查询所有相关任务（活跃 + 已完成 + 最近失败），按创建时间排序
    // 确保 UI 能按正确顺序展示所有课堂（含已完成的），避免标签偏移
    const { rows } = await pool.query(
      `SELECT id, status, progress, current_step, knowledge_node_id, date, error,
              retry_count, created_at, updated_at
       FROM api.generation_tasks
       WHERE child_id = $1
         AND (
           status IN ('pending', 'running')
           OR (status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour')
           OR (status = 'failed' AND updated_at > NOW() - INTERVAL '10 minutes')
         )
       ORDER BY created_at ASC, id ASC`,
      [childId],
    )

    // 自动清理超过 1 小时的失败任务（避免无限累积）
    await pool.query(
      `DELETE FROM api.generation_tasks
       WHERE child_id = $1
         AND status = 'failed'
         AND updated_at < NOW() - INTERVAL '1 hour'`,
      [childId],
    ).catch((cleanErr: unknown) => {
      console.warn('[API] 清理失败任务出错:', cleanErr)
    })

    const completedCount = rows.filter(r => r.status === 'completed').length
    const activeCount = rows.filter(r => r.status === 'pending' || r.status === 'running').length
    const failedCount = rows.filter(r => r.status === 'failed').length
    const totalCount = activeCount + completedCount

    res.json({
      tasks: rows.map((r) => ({
        id: r.id,
        status: r.status,
        progress: r.progress,
        currentStep: r.current_step,
        knowledgeNodeId: r.knowledge_node_id,
        date: r.date,
        error: r.error,
        retryCount: r.retry_count,
      })),
      completedCount,
      totalCount,
      activeCount,
      failedCount,
    })
  } catch (error) {
    console.error('[API] GET /api/pre-generate/status 错误:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================
// POST /api/pre-generate/cancel — 取消任务
// ============================================================
app.post('/api/pre-generate/cancel', async (req, res) => {
  try {
    const { taskIds, childId } = req.body as {
      taskIds?: number[]
      childId?: number
    }

    // I3 fix: 验证 taskIds 元素类型
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      if (!taskIds.every((id) => typeof id === 'number' && Number.isInteger(id))) {
        res.status(400).json({ error: 'taskIds must be an array of integers' })
        return
      }
    }

    let result
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      result = await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = ANY($1)
           AND status IN ('pending', 'running')`,
        [taskIds],
      )
    } else if (childId) {
      result = await pool.query(
        `UPDATE api.generation_tasks
         SET status = 'cancelled', updated_at = NOW()
         WHERE child_id = $1
           AND status IN ('pending', 'running')`,
        [childId],
      )
    } else {
      res.status(400).json({ error: 'taskIds or childId is required' })
      return
    }

    res.json({
      cancelledCount: result.rowCount || 0,
      message: `${result.rowCount || 0} 个任务已取消`,
    })
  } catch (error) {
    console.error('[API] POST /api/pre-generate/cancel 错误:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================
// GET /api/pre-generate/health — 健康检查 (I4 fix: 增加 DB 检查)
// ============================================================
app.get('/api/pre-generate/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', service: 'pre-generation', db: 'connected' })
  } catch (err) {
    console.error('[API] 健康检查 DB 失败:', err)
    res.status(503).json({ status: 'degraded', service: 'pre-generation', db: 'disconnected' })
  }
})

// ============================================================
// 启动
// ============================================================
app.listen(PORT, () => {
  console.log(`[PreGeneration] 🚀 后端服务启动，端口 ${PORT}`)
  startTaskProcessor()
})

// ============================================================
// 优雅关闭 (C1 fix)
// ============================================================
const gracefulShutdown = async (signal: string) => {
  console.log(`[PreGeneration] 收到 ${signal}，正在关闭...`)
  stopTaskProcessor()
  try {
    await pool.end()
    console.log('[PreGeneration] 数据库连接池已关闭')
  } catch (err) {
    console.error('[PreGeneration] 关闭连接池出错:', err)
  }
  process.exit(0)
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
