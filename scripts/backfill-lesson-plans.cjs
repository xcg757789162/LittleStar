#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Backfill lesson plans for existing knowledge nodes that have total_lessons IS NULL.
 *
 * Mirrors src/services/lesson-planner/lesson-plan-generator.ts → generateDefaultLessonPlan.
 *
 * Run from host:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/littlestar \
 *     node scripts/backfill-lesson-plans.cjs
 *
 * Or via docker:
 *   docker exec -e DATABASE_URL=... littlestar-app node /app/scripts/backfill-lesson-plans.cjs
 */

const { Pool } = require('pg')

const MIN = 2
const MAX = 5

function generateDefaultLessonPlan(node) {
  const difficulty = node.difficulty ?? 1
  const totalLessons = Math.max(MIN, Math.min(MAX, Math.ceil(difficulty / 2) + 1))
  const lessons = []
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

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/littlestar'

  const pool = new Pool({ connectionString })

  const { rows } = await pool.query(
    `SELECT id, name, description, difficulty
       FROM api.knowledge_nodes
      WHERE total_lessons IS NULL
      ORDER BY subject, order_index`,
  )

  console.log(`[backfill] Found ${rows.length} nodes without a lesson plan`)
  let ok = 0
  let fail = 0

  for (const node of rows) {
    const plan = generateDefaultLessonPlan(node)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE api.knowledge_nodes SET total_lessons = $1 WHERE id = $2`,
        [plan.totalLessons, node.id],
      )
      await client.query(
        `DELETE FROM api.knowledge_node_lessons WHERE knowledge_node_id = $1`,
        [node.id],
      )
      for (const lesson of plan.lessons) {
        await client.query(
          `INSERT INTO api.knowledge_node_lessons
             (knowledge_node_id, lesson_index, title, description, focus_points)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            node.id,
            lesson.index,
            lesson.title,
            lesson.description,
            JSON.stringify(lesson.focusPoints || []),
          ],
        )
      }
      await client.query('COMMIT')
      ok++
      console.log(`  ✓ ${node.id} → ${plan.totalLessons} lessons`)
    } catch (e) {
      await client.query('ROLLBACK')
      fail++
      console.error(`  ✗ ${node.id}: ${e.message || e}`)
    } finally {
      client.release()
    }
  }

  console.log(`[backfill] Done. ok=${ok} fail=${fail}`)
  await pool.end()
}

main().catch((e) => {
  console.error('[backfill] fatal:', e)
  process.exit(1)
})
