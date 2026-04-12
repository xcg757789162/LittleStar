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
import { pool } from './db.js'
import { startTaskProcessor, stopTaskProcessor, triggerProcessing } from './services/task-processor.js'

const app = express()
app.use(express.json({ limit: '10mb', type: 'application/json' }))

const PORT = parseInt(process.env.PREGEN_PORT || '3003', 10)

/** 单次提交的最大任务数 */
const MAX_TASKS_PER_SUBMIT = 50

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

    // 只查询真正活跃的任务（pending / running）
    const { rows } = await pool.query(
      `SELECT id, status, progress, current_step, knowledge_node_id, date, error,
              retry_count, created_at, updated_at
       FROM api.generation_tasks
       WHERE child_id = $1
         AND status IN ('pending', 'running')
       ORDER BY created_at ASC`,
      [childId],
    )

    // 统计最近失败的任务（只返回最新一轮的，用于 UI 提示）
    const { rows: failedRows } = await pool.query(
      `SELECT id, status, progress, current_step, knowledge_node_id, date, error,
              retry_count, created_at, updated_at
       FROM api.generation_tasks
       WHERE child_id = $1
         AND status = 'failed'
         AND updated_at > NOW() - INTERVAL '10 minutes'
       ORDER BY updated_at DESC
       LIMIT 10`,
      [childId],
    )

    // 统计已完成的（最近 1 小时内）
    const { rows: completedRows } = await pool.query(
      `SELECT COUNT(*) as count
       FROM api.generation_tasks
       WHERE child_id = $1
         AND status = 'completed'
         AND completed_at > NOW() - INTERVAL '1 hour'`,
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

    const completedCount = parseInt(completedRows[0]?.count || '0', 10)
    const activeCount = rows.length
    const failedCount = failedRows.length
    // totalCount = 活跃 + 已完成（不包含失败的，避免数字只增不减）
    const totalCount = activeCount + completedCount

    const allTasks = [...rows, ...failedRows]

    res.json({
      tasks: allTasks.map((r) => ({
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
