/**
 * Course Initializer
 *
 * 负责把一个 courses 行（status=initializing）从零初始化成可学习的状态（status=ready）：
 *   1. 调用 LLM 生成课程大纲（modules + nodes）→ 写入 curricula / curriculum_modules / curriculum_nodes
 *   2. 把 curriculum_nodes 同步到 knowledge_nodes（运行时学习节点）
 *   3. 调用 LLM 生成 8-12 道入学测评题 → 写入 placement_questions
 *   4. 更新 courses.status='ready'
 *
 * 所有 LLM 调用都通过 task row.settings 里的 llmModel/llmApiKey 完成（参考 question 路由的做法）。
 */

import { pool } from '../db.js'
import { writeSystemLog } from './system-log.js'
import { generateDefaultLessonPlan } from '../../services/lesson-planner/lesson-plan-generator.js'
import { callLLMAndParse } from './llm-json.js'
import { classifyDisciplineFromSlug } from './discipline-classifier.js'
import { resolveSubjectClassification } from './subject-classifier.js'
import {
  reviewOutline,
  buildFeedbackPrompt,
  type PanelReviewResult,
  type GeneratedModule,
} from './panel-review.js'

// ============================================================
// 类型
// ============================================================

interface CourseInitTaskRow {
  id: number
  child_id: number
  course_id: number
  settings: Record<string, unknown>
  checkpoint: CourseInitCheckpoint | null
}

/** 单轮"生成 + 评审"的完整记录，存入 checkpoint.reviewRounds */
interface ReviewRoundRecord {
  round: number
  modules: GeneratedModule[]
  result: PanelReviewResult
  finishedAt: string
}

interface CourseInitCheckpoint {
  // 'nodes' 保留仅为兼容旧任务 checkpoint（当前代码不再进入该步）
  step?: 'outline' | 'review' | 'nodes' | 'placement' | 'done'
  curriculumId?: number
  moduleCount?: number
  nodeCount?: number
  placementCount?: number
  /** 教师团每一轮的评审历史 */
  reviewRounds?: ReviewRoundRecord[]
  /** 当前正在进行第几轮（1-based） */
  currentRound?: number
  /** 最终写入 DB 的大纲来自哪一轮 */
  usedRound?: number
}

interface GeneratedPlacementQuestion {
  knowledge_node_id: string
  stem: string
  options: Array<{ text: string; emoji?: string }>
  correct_index: number
  difficulty: number
}

// ============================================================
// 进度分段（与前端 STEP_LABELS 配合）
//
// outline / review 占 10 - 55，均分到最多 4 轮：
//   每轮 outline 起点 10 / 21 / 32 / 43，review 加 8 步至 18 / 29 / 40 / 51
// placement 占 55 - 95
// done 占 95 - 100
// ============================================================

const MAX_REVIEW_ROUNDS = 4
const OUTLINE_PROGRESS_STEP = 11 // 每轮 outline 起点之间的间隔
const REVIEW_PROGRESS_DELTA = 8 // 进入 review 时在当轮 outline 起点上加多少

// ============================================================
// Step 1: 生成大纲
// ============================================================

const OUTLINE_SYSTEM_PROMPT = `你是一位资深课程设计专家。用户告诉你他想学习什么，你要为他设计一份结构化的课程大纲。

## 输出要求
严格输出一个 JSON 对象，结构：

\`\`\`json
{
  "modules": [
    {
      "id": "slug-module-id",
      "name": "章节名",
      "description": "章节介绍（1-2 句）",
      "order_index": 1,
      "nodes": [
        {
          "id": "slug-concrete-node-id",
          "name": "知识点名",
          "description": "知识点说明（1-2 句）",
          "difficulty": 1,
          "content_types": ["flashcard", "quiz"],
          "prerequisites": []
        }
      ]
    }
  ]
}
\`\`\`

## 设计原则
- **模块数**：3-6 个章节
- **每个章节知识点数**：3-8 个
- **总知识点数**：不超过 30 个
- **ID 规则**：所有 module.id 和 node.id 必须以课程 slug（我下面会告诉你）开头，用连字符分隔，全小写英文数字
- **difficulty**：1-5 递增
- **content_types**：从 ["flashcard","quiz","writing","voice"] 中选
- **prerequisites**：前置 node id 列表（从之前已出现的 node 中选，首个模块第一个节点应为空数组）
- **学习者水平**：根据我提供的 level 调整起点和难度
- **不要输出 JSON 以外的任何文字（也不要 markdown 代码块标记）**
`

async function generateOutlineWithFeedback(
  settings: Record<string, unknown>,
  slug: string,
  requirementSpec: Record<string, unknown>,
  /** 来自上一轮教师团评审的 feedback 文本；首轮传空 */
  feedback?: string,
): Promise<GeneratedModule[]> {
  const baseSpec = `请为以下课程设计大纲。

- 课程 slug（所有 id 必须以此开头）：${slug}
- 主题：${requirementSpec.topic || slug}
- 学习目标：${requirementSpec.goal || '系统掌握'}
- 覆盖范围：${requirementSpec.scope || '不限'}
- 深度：${requirementSpec.depth || 'medium'}
- 学习者当前水平/年级：${requirementSpec.level || '未指定'}
- 已有基础：${requirementSpec.prior_knowledge || '未指定'}
- 偏好学习方式：${requirementSpec.preferred_style || '综合'}`

  const userPrompt = feedback
    ? `${baseSpec}\n\n${feedback}\n\n请输出修正后的 JSON 大纲。`
    : `${baseSpec}\n\n请输出 JSON 大纲。`

  const parsed = await callLLMAndParse<{ modules: GeneratedModule[] }>(
    settings,
    OUTLINE_SYSTEM_PROMPT,
    userPrompt,
    feedback ? 'outline-rewrite' : 'outline',
  )
  if (!Array.isArray(parsed.modules) || parsed.modules.length === 0) {
    throw new Error('generated outline has no modules')
  }
  for (const mod of parsed.modules) {
    if (!mod.id?.startsWith(slug)) mod.id = `${slug}-${mod.id || 'm' + Math.random().toString(36).slice(2, 6)}`
    if (!Array.isArray(mod.nodes)) mod.nodes = []
    for (const node of mod.nodes) {
      if (!node.id?.startsWith(slug)) node.id = `${slug}-${node.id || 'n' + Math.random().toString(36).slice(2, 6)}`
      if (!Array.isArray(node.content_types)) node.content_types = ['flashcard', 'quiz']
      if (!Array.isArray(node.prerequisites)) node.prerequisites = []
      if (typeof node.difficulty !== 'number') node.difficulty = 1
    }
  }
  return parsed.modules
}

// ============================================================
// Step 2: 生成入学测评题
// ============================================================

const PLACEMENT_SYSTEM_PROMPT = `你是一位教育评测专家。请根据给定课程大纲，为学习者设计一份入学水平测评题。

## 输出要求
严格输出一个 JSON 对象：

\`\`\`json
{
  "questions": [
    {
      "knowledge_node_id": "slug-node-id（必须来自我给你的节点列表）",
      "stem": "题干（30 字以内，可包含 emoji）",
      "options": [
        {"text": "选项A", "emoji": "🍎"},
        {"text": "选项B", "emoji": "🍌"},
        {"text": "选项C", "emoji": "🍇"},
        {"text": "选项D", "emoji": "🍊"}
      ],
      "correct_index": 0,
      "difficulty": 2
    }
  ]
}
\`\`\`

## 设计原则
- 题目数量：8-12 道
- 难度分布：简单（1-2）占 30%，中等（3）占 50%，困难（4-5）占 20%
- 覆盖不同模块的节点
- 每题 4 个选项，正确答案位置随机
- 选项文字简洁（不超过 8 字），干扰项合理
- knowledge_node_id 必须严格来自提供的节点列表，不要编造
- **不要输出 JSON 以外的任何文字**
`

async function generatePlacementQuestions(
  settings: Record<string, unknown>,
  slug: string,
  modules: GeneratedModule[],
  requirementSpec: Record<string, unknown>,
): Promise<GeneratedPlacementQuestion[]> {
  const nodeList = modules.flatMap((m) =>
    m.nodes.map((n) => `- ${n.id}（${n.name}，难度${n.difficulty}，模块:${m.name}）`),
  ).join('\n')

  const userPrompt = `课程 slug：${slug}
课程主题：${requirementSpec.topic || slug}
学习者水平：${requirementSpec.level || '未指定'}

## 可用知识点列表
${nodeList}

请为这门课设计 8-12 道入学测评选择题，覆盖不同模块和难度。只输出 JSON。`

  const parsed = await callLLMAndParse<{ questions: GeneratedPlacementQuestion[] }>(
    settings,
    PLACEMENT_SYSTEM_PROMPT,
    userPrompt,
    'placement',
  )
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('generated placement has no questions')
  }
  const allowedIds = new Set(modules.flatMap((m) => m.nodes.map((n) => n.id)))
  const valid = parsed.questions.filter((q) => {
    if (!allowedIds.has(q.knowledge_node_id)) return false
    if (!Array.isArray(q.options) || q.options.length !== 4) return false
    if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3) return false
    return true
  })
  if (valid.length === 0) {
    throw new Error('no valid placement questions after filtering')
  }
  return valid
}

// ============================================================
// DB 持久化
// ============================================================

async function persistOutline(
  courseId: number,
  slug: string,
  modules: GeneratedModule[],
  requirementSpec: Record<string, unknown>,
): Promise<{ curriculumId: number; nodeIds: string[] }> {
  const client = await pool.connect()
  const nodeIds: string[] = []
  try {
    await client.query('BEGIN')

    // 1. curricula
    const { rows: currRows } = await client.query<{ id: number }>(
      `INSERT INTO api.curricula (subject, version, reference, is_active, course_id)
       VALUES ($1, '1.0', $2, TRUE, $3)
       ON CONFLICT (subject) DO UPDATE
         SET reference = EXCLUDED.reference, is_active = TRUE, course_id = EXCLUDED.course_id
       RETURNING id`,
      [slug, `AI 生成：${requirementSpec.topic || slug}`, courseId],
    )
    const curriculumId = currRows[0].id

    // 清理旧数据（幂等性）
    await client.query(
      `DELETE FROM api.curriculum_modules WHERE curriculum_id = $1`,
      [curriculumId],
    )
    await client.query(
      `DELETE FROM api.knowledge_nodes WHERE subject = $1`,
      [slug],
    )

    // 2. modules + nodes
    for (const mod of modules) {
      await client.query(
        `INSERT INTO api.curriculum_modules (id, curriculum_id, name, description, order_index)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
           SET curriculum_id = EXCLUDED.curriculum_id,
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               order_index = EXCLUDED.order_index`,
        [mod.id, curriculumId, mod.name, mod.description, mod.order_index],
      )

      for (const [idx, node] of mod.nodes.entries()) {
        await client.query(
          `INSERT INTO api.curriculum_nodes
             (id, module_id, name, description, difficulty, content_types, prerequisites, template_prompts)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
           ON CONFLICT (id) DO UPDATE
             SET module_id = EXCLUDED.module_id,
                 name = EXCLUDED.name,
                 description = EXCLUDED.description,
                 difficulty = EXCLUDED.difficulty,
                 content_types = EXCLUDED.content_types,
                 prerequisites = EXCLUDED.prerequisites,
                 template_prompts = EXCLUDED.template_prompts`,
          [
            node.id,
            mod.id,
            node.name,
            node.description,
            node.difficulty,
            JSON.stringify(node.content_types),
            JSON.stringify(node.prerequisites),
            JSON.stringify(node.template_prompts || []),
          ],
        )

        // 为该知识点生成默认课时计划（2-5 堂课）
        const lessonPlan = generateDefaultLessonPlan({
          name: node.name,
          description: node.description,
          difficulty: node.difficulty,
        })

        // knowledge_nodes 运行时表（与 curriculum_nodes 同步）
        await client.query(
          `INSERT INTO api.knowledge_nodes
             (id, subject, name, description, prerequisites, next_nodes,
              difficulty, content_type, order_index, template_prompts, total_lessons)
           VALUES ($1, $2, $3, $4, $5::jsonb, '[]'::jsonb, $6, $7, $8, $9::jsonb, $10)
           ON CONFLICT (id) DO UPDATE
             SET subject = EXCLUDED.subject,
                 name = EXCLUDED.name,
                 description = EXCLUDED.description,
                 prerequisites = EXCLUDED.prerequisites,
                 difficulty = EXCLUDED.difficulty,
                 content_type = EXCLUDED.content_type,
                 order_index = EXCLUDED.order_index,
                 template_prompts = EXCLUDED.template_prompts,
                 total_lessons = EXCLUDED.total_lessons`,
          [
            node.id,
            slug,
            node.name,
            node.description,
            JSON.stringify(node.prerequisites),
            node.difficulty,
            node.content_types[0] || 'flashcard',
            mod.order_index * 100 + idx,
            JSON.stringify(node.template_prompts || []),
            lessonPlan.totalLessons,
          ],
        )

        // 清理旧课时计划并写入新的（幂等：重跑初始化时覆盖）
        await client.query(
          `DELETE FROM api.knowledge_node_lessons WHERE knowledge_node_id = $1`,
          [node.id],
        )
        for (const lesson of lessonPlan.lessons) {
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

        nodeIds.push(node.id)
      }
    }

    await client.query('COMMIT')
    return { curriculumId, nodeIds }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function persistPlacementQuestions(
  slug: string,
  questions: GeneratedPlacementQuestion[],
): Promise<number> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // 重试场景下：先清理旧题，避免重复堆积
    await client.query(`DELETE FROM api.placement_questions WHERE subject = $1 AND source = 'ai'`, [slug])
    let count = 0
    for (const q of questions) {
      await client.query(
        `INSERT INTO api.placement_questions
           (subject, knowledge_node_id, source, stem, options, correct_index, difficulty)
         VALUES ($1, $2, 'ai', $3, $4::jsonb, $5, $6)`,
        [slug, q.knowledge_node_id, q.stem, JSON.stringify(q.options), q.correct_index, q.difficulty],
      )
      count++
    }
    await client.query('COMMIT')
    return count
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ============================================================
// 主入口：处理一个 course-initialization 任务
// ============================================================

export async function processCourseInitTask(task: CourseInitTaskRow): Promise<void> {
  console.log(`[CourseInit] 开始处理 #${task.id} (course=${task.course_id})`)

  // 加载 course 行
  const { rows } = await pool.query<{
    id: number
    slug: string
    name: string
    requirement_spec: Record<string, unknown>
  }>(
    `SELECT id, slug, name, requirement_spec FROM api.courses WHERE id = $1`,
    [task.course_id],
  )
  if (rows.length === 0) throw new Error(`course #${task.course_id} not found`)
  const course = rows[0]

  const cls = resolveSubjectClassification(course.slug, course.requirement_spec || {})
  const prevMeta =
    course.requirement_spec?.meta && typeof course.requirement_spec.meta === 'object'
      ? { ...(course.requirement_spec.meta as Record<string, unknown>) }
      : {}
  const mergedSpec: Record<string, unknown> = {
    ...(course.requirement_spec || {}),
    meta: { ...prevMeta, subjectKey: cls.subjectKey },
  }
  course.requirement_spec = mergedSpec
  await pool.query(
    `UPDATE api.courses SET discipline_type = $2, requirement_spec = $3::jsonb, updated_at = NOW() WHERE id = $1`,
    [course.id, cls.disciplineType, JSON.stringify(mergedSpec)],
  )

  const rawChildAge = task.settings?.childAge
  const childAge =
    typeof rawChildAge === 'number' && Number.isFinite(rawChildAge)
      ? Math.max(3, Math.min(18, Math.round(rawChildAge)))
      : 8
  const learnerLevel = `${childAge} 岁`

  const checkpoint: CourseInitCheckpoint = task.checkpoint || {}

  async function updateProgress(step: CourseInitCheckpoint['step'], progress: number): Promise<void> {
    await pool.query(
      `UPDATE api.generation_tasks
       SET current_step = $1, progress = $2, checkpoint = $3::jsonb, updated_at = NOW()
       WHERE id = $4`,
      [step, progress, JSON.stringify({ ...checkpoint, step }), task.id],
    )
  }

  try {
    // Step 1: 生成大纲 + 教师团评审（最多 MAX_ROUNDS 轮）
    if (
      !checkpoint.step ||
      checkpoint.step === 'outline' ||
      checkpoint.step === 'review' ||
      checkpoint.step === 'nodes'
    ) {
      // 断点续跑时如果已经有部分 reviewRounds，就从下一轮继续
      const previousRounds = Array.isArray(checkpoint.reviewRounds) ? checkpoint.reviewRounds : []
      checkpoint.reviewRounds = previousRounds
      const startRound = previousRounds.length + 1

      const reviewCtx = {
        slug: course.slug,
        requirementSpec: course.requirement_spec,
        learnerLevel,
        disciplineType: cls.disciplineType,
        subjectKey: cls.subjectKey,
      }

      for (let round = startRound; round <= MAX_REVIEW_ROUNDS; round++) {
        checkpoint.currentRound = round
        const outlineStepProgress = 10 + (round - 1) * OUTLINE_PROGRESS_STEP
        checkpoint.step = 'outline'
        await updateProgress('outline', outlineStepProgress)
        writeSystemLog(
          task.child_id,
          'info',
          'CourseInit',
          round === 1
            ? `生成《${course.name}》大纲（第 1 轮）...`
            : `教师团给出评审意见，第 ${round}/${MAX_REVIEW_ROUNDS} 轮重写《${course.name}》大纲...`,
          task.id,
        )

        const feedback =
          round === 1
            ? undefined
            : buildFeedbackPrompt(checkpoint.reviewRounds!.map((r) => r.result))

        const modules = await generateOutlineWithFeedback(
          task.settings,
          course.slug,
          course.requirement_spec,
          feedback,
        )

        checkpoint.step = 'review'
        await updateProgress('review', outlineStepProgress + REVIEW_PROGRESS_DELTA)
        writeSystemLog(
          task.child_id,
          'info',
          'CourseInit',
          `教师团开始评审《${course.name}》大纲（第 ${round}/${MAX_REVIEW_ROUNDS} 轮）...`,
          task.id,
        )

        const result = await reviewOutline(task.settings, reviewCtx, modules, round)
        checkpoint.reviewRounds = [
          ...checkpoint.reviewRounds!,
          {
            round,
            modules,
            result,
            finishedAt: new Date().toISOString(),
          },
        ]

        writeSystemLog(
          task.child_id,
          'info',
          'CourseInit',
          `第 ${round} 轮评审结果：${result.chief.decision}（综合分 ${result.chief.score}/100）`,
          task.id,
        )

        if (result.chief.decision === 'approve') {
          checkpoint.usedRound = round
          break
        }

        // 本轮 reject：如果还没到上限，就继续；否则兜底取最高分
        if (round === MAX_REVIEW_ROUNDS) {
          const best = [...checkpoint.reviewRounds!].sort(
            (a, b) => b.result.chief.score - a.result.chief.score,
          )[0]
          checkpoint.usedRound = best.round
          writeSystemLog(
            task.child_id,
            'warn',
            'CourseInit',
            `教师团 ${MAX_REVIEW_ROUNDS} 轮审核均未通过，已采用综合分最高（${best.result.chief.score}/100，第 ${best.round} 轮）的大纲入库。如不满意可点"重试初始化"。`,
            task.id,
          )
        }
      }

      const finalRecord = checkpoint.reviewRounds!.find(
        (r) => r.round === checkpoint.usedRound,
      )
      if (!finalRecord) {
        throw new Error('教师团评审流程异常：未能确定最终入库大纲（usedRound 不存在）')
      }

      // 评审通过/兜底 → 持久化
      const { curriculumId, nodeIds } = await persistOutline(
        course.id,
        course.slug,
        finalRecord.modules,
        course.requirement_spec,
      )
      checkpoint.curriculumId = curriculumId
      checkpoint.moduleCount = finalRecord.modules.length
      checkpoint.nodeCount = nodeIds.length
      checkpoint.step = 'placement'
      await updateProgress('placement', 55)
      writeSystemLog(
        task.child_id,
        'info',
        'CourseInit',
        `大纲已入库（采用第 ${finalRecord.round} 轮，综合分 ${finalRecord.result.chief.score}/100）：${finalRecord.modules.length} 章节 / ${nodeIds.length} 知识点`,
        task.id,
      )
    }

    // Step 2: 生成入学测评题
    if (checkpoint.step === 'placement') {
      await updateProgress('placement', 70)
      writeSystemLog(task.child_id, 'info', 'CourseInit', `生成《${course.name}》入学测评题...`, task.id)

      // 重新从 DB 读 modules（断点恢复时不再依赖内存）
      const { rows: modRows } = await pool.query<{
        id: string
        name: string
        order_index: number
      }>(
        `SELECT id, name, order_index FROM api.curriculum_modules WHERE curriculum_id = $1 ORDER BY order_index`,
        [checkpoint.curriculumId],
      )
      const { rows: nodeRows } = await pool.query<{
        id: string
        name: string
        difficulty: number
        module_id: string
      }>(
        `SELECT id, name, difficulty, module_id FROM api.curriculum_nodes
         WHERE module_id = ANY($1::text[])`,
        [modRows.map((m) => m.id)],
      )
      const modulesForPlacement: GeneratedModule[] = modRows.map((m) => ({
        id: m.id,
        name: m.name,
        description: '',
        order_index: m.order_index,
        nodes: nodeRows
          .filter((n) => n.module_id === m.id)
          .map((n) => ({
            id: n.id,
            name: n.name,
            description: '',
            difficulty: n.difficulty,
            content_types: ['flashcard', 'quiz'],
            prerequisites: [],
          })),
      }))

      const questions = await generatePlacementQuestions(
        task.settings,
        course.slug,
        modulesForPlacement,
        course.requirement_spec,
      )
      const count = await persistPlacementQuestions(course.slug, questions)
      checkpoint.placementCount = count
      checkpoint.step = 'done'
      await updateProgress('done', 95)
      writeSystemLog(task.child_id, 'info', 'CourseInit',
        `入学测评题已生成：${count} 道`, task.id)
    }

    // Step 3: 标记课程 ready，并写入学科类型（与 slug 对齐）
    await pool.query(
      `UPDATE api.courses
       SET status = 'ready', init_error = NULL, updated_at = NOW(),
           discipline_type = $2
       WHERE id = $1`,
      [course.id, classifyDisciplineFromSlug(course.slug)],
    )

    await pool.query(
      `UPDATE api.generation_tasks
       SET status = 'completed', progress = 100, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [task.id],
    )
    console.log(`[CourseInit] ✅ 课程 ${course.slug} 初始化完成`)
    writeSystemLog(task.child_id, 'info', 'CourseInit',
      `《${course.name}》已准备好啦！共 ${checkpoint.nodeCount || 0} 个知识点，${checkpoint.placementCount || 0} 道测评题`,
      task.id)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[CourseInit] ❌ 任务 #${task.id} 失败:`, errorMsg)
    await pool.query(
      `UPDATE api.courses
       SET status = 'failed', init_error = $1, updated_at = NOW()
       WHERE id = $2`,
      [errorMsg, course.id],
    )
    throw error
  }
}
