import type { APIRequestContext, Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { E2EEnv } from '../config/env'
import {
  DEFAULT_CHILD_SEED,
  LESSON_PICKER_SUBJECT_CANDIDATES,
  SUBJECT_LABELS,
  type E2ECredentials,
  type PreparedLessonPickerSeed,
} from '../fixtures/data'
import type { AuthResponse } from '../../src/services/api/types'
import type { Child, PlacementTest, Subject } from '../../src/types/models'
import { E2EApiError, authLogin, authRegister, restGet, restGetOne, restPost } from './api'

function toNumericChildId(child: Pick<Child, 'id'>): number {
  const childId = Number(child.id)
  if (!Number.isFinite(childId)) {
    throw new Error(`无效的 child.id: ${String(child.id)}`)
  }
  return childId
}

async function ensureUserSession(
  request: APIRequestContext,
  env: E2EEnv,
  credentials: E2ECredentials,
): Promise<AuthResponse> {
  try {
    return await authLogin(request, env, credentials)
  } catch (error) {
    if (!(error instanceof E2EApiError) || ![400, 401, 404].includes(error.status)) {
      throw error
    }

    try {
      return await authRegister(request, env, credentials)
    } catch (registerError) {
      if (registerError instanceof E2EApiError && registerError.status === 409) {
        throw new Error(`E2E 账号 ${credentials.username} 已存在，但当前密码无法登录，请检查 .env.e2e 配置`)
      }
      throw registerError
    }
  }
}

async function ensureChildRecord(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  userId: number,
): Promise<Child> {
  const existingChild = await restGetOne<Child>(request, env, token, '/children', {
    order: [{ column: 'createdAt', ascending: true }],
  })

  if (existingChild) {
    return existingChild
  }

  return restPost<Child>(request, env, token, '/children', {
    userId,
    ...DEFAULT_CHILD_SEED,
    settings: {
      dailyLearningMinutes: 20,
      preferredSubjects: LESSON_PICKER_SUBJECT_CANDIDATES,
      difficultyAdjustment: 0,
      voiceEnabled: true,
      soundEffectsEnabled: true,
    },
  })
}

async function ensurePlacementTestRecord(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  childId: number,
  subject: Subject,
) {
  const existingTest = await restGetOne<PlacementTest>(request, env, token, '/placement_tests', {
    filters: [
      { column: 'childId', operator: 'eq', value: childId },
      { column: 'subject', operator: 'eq', value: subject },
    ],
    order: [{ column: 'startedAt', ascending: false }],
  })

  if (existingTest) {
    return existingTest
  }

  const now = new Date().toISOString()
  return restPost<PlacementTest>(request, env, token, '/placement_tests', {
    childId,
    subject,
    phase: 'phase1',
    questions: [
      {
        knowledgeNodeId: `e2e-${subject}-seed-node`,
        questionId: `e2e-${subject}-seed-question`,
        answer: 0,
        isCorrect: true,
        timeSpent: 1200,
        stem: `${SUBJECT_LABELS[subject]} E2E 种子题`,
        selectedIndex: 0,
        timedOut: false,
        source: 'preset',
        difficulty: 1,
      },
    ],
    startedAt: now,
    completedAt: now,
    result: {
      masteredNodes: [],
      startingNodes: [],
      overallScore: 100,
    },
    phase1Result: {
      weakModules: [],
      uncertainNodes: [],
      overallPhase1Score: 100,
      moduleScores: {},
      needsPhase2: true,
      phase2Mode: 'challenge',
    },
  })
}

export async function seedLessonPickerUser(
  request: APIRequestContext,
  env: E2EEnv,
  credentials: E2ECredentials,
): Promise<PreparedLessonPickerSeed> {
  const session = await ensureUserSession(request, env, credentials)
  const child = await ensureChildRecord(request, env, session.token, session.user.id)
  const childId = toNumericChildId(child)
  const subject = LESSON_PICKER_SUBJECT_CANDIDATES[0]

  await ensurePlacementTestRecord(request, env, session.token, childId, subject)

  return {
    token: session.token,
    userId: session.user.id,
    childId,
    childName: child.name,
    subject,
    subjectLabel: SUBJECT_LABELS[subject],
    credentials,
  }
}

function toISODate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildCoreLoopClassroom(knowledgeNodeId: string, date: string): Classroom {
  const timestamp = Date.now()
  const stageId = `stage-${knowledgeNodeId}-${date}`

  return {
    id: `classroom-${knowledgeNodeId}-${date}`,
    title: 'E2E 数学课堂',
    status: 'completed',
    language: 'zh-CN',
    createdAt: new Date(timestamp).toISOString(),
    stage: {
      id: stageId,
      name: 'E2E 数学课堂',
      description: '用于核心学习闭环 Playwright 测试的最小课堂',
      createdAt: timestamp,
      updatedAt: timestamp,
      language: 'zh-CN',
    },
    scenes: [
      {
        id: `quiz-${knowledgeNodeId}`,
        stageId,
        type: 'quiz',
        title: '数学小测验',
        order: 0,
        content: {
          type: 'quiz',
          questions: [
            {
              id: `question-${knowledgeNodeId}`,
              type: 'single',
              question: '1 + 1 = ?',
              options: [
                { label: '2', value: 'A' },
                { label: '3', value: 'B' },
              ],
              answer: ['A'],
              analysis: '1 加 1 等于 2。',
              points: 1,
            },
          ],
        },
        actions: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  }
}

export async function ensureCoreLoopClassroomCache(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  childId: number,
) {
  const date = toISODate()
  const knowledgeNodeId = 'math-e2e-core-loop'
  const cacheKey = `${knowledgeNodeId}::${date}`

  const existingCache = await restGetOne<{ id: number }>(request, env, token, '/classroom_cache', {
    filters: [
      { column: 'childId', operator: 'eq', value: childId },
      { column: 'cacheKey', operator: 'eq', value: cacheKey },
    ],
    select: 'id',
  })

  if (!existingCache) {
    const cachedAt = new Date()
    const response = await request.fetch(`${env.restApiURL.replace(/\/$/, '')}/classroom_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
      data: {
        child_id: childId,
        cache_key: cacheKey,
        knowledge_node_id: knowledgeNodeId,
        date,
        classroom_data: buildCoreLoopClassroom(knowledgeNodeId, date),
        cached_at: cachedAt.toISOString(),
        expires_at: new Date(cachedAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    if (!response.ok()) {
      throw new Error(`写入 classroom_cache 失败: ${response.status()} ${await response.text()}`)
    }
  }

  return {
    knowledgeNodeId,
    date,
    cacheKey,
  }
}

function getFirstLessonCard(page: Page): Locator {
  return page.locator('span').filter({ hasText: '▶️' }).first()
}

export async function openFirstAvailableLesson(
  page: Page,
  options: {
    maxReloads?: number
    reloadDelayMs?: number
  } = {},
) {
  const { maxReloads = 8, reloadDelayMs = 2_000 } = options

  for (let attempt = 0; attempt <= maxReloads; attempt += 1) {
    const firstLessonCard = getFirstLessonCard(page)
    if (await firstLessonCard.isVisible().catch(() => false)) {
      await firstLessonCard.click({ force: true })
      return
    }

    const reloadButton = page.getByRole('button', { name: '🔄 重新加载' })
    if (!(await reloadButton.isVisible().catch(() => false))) {
      await page.waitForTimeout(reloadDelayMs)
      continue
    }

    if (attempt === maxReloads) {
      break
    }

    await reloadButton.click()
    await page.waitForTimeout(reloadDelayMs)
  }

  await expect(page.getByText('今日课程')).toBeVisible()
  await getFirstLessonCard(page).click({ force: true })
}
