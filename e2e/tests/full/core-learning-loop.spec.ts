import { expect, test } from '../../fixtures/auth'
import {
  expectHomePageReady,
  expectLessonPickerReadyState,
  expectSubjectSelectReady,
} from '../../helpers/assertions'
import { clearAuthState, loginThroughUi } from '../../helpers/auth'
import { restGet } from '../../helpers/api'
import { ensureCoreLoopClassroomCache, openFirstAvailableLesson } from '../../helpers/learning'

test.setTimeout(120_000)

async function getHistoryCount(
  request: Parameters<typeof restGet>[0],
  env: Parameters<typeof restGet>[1],
  token: string,
  childId: number,
) {
  const history = await restGet<{ id: number }>(request, env, token, '/classroom_history', {
    filters: [{ column: 'childId', operator: 'eq', value: childId }],
    select: 'id',
  })

  return history.length
}

async function getLatestHistoryRecord(
  request: Parameters<typeof restGet>[0],
  env: Parameters<typeof restGet>[1],
  token: string,
  childId: number,
) {
  const history = await restGet<{
    id: number
    questionsCompleted: number
    correctCount: number
  }>(request, env, token, '/classroom_history', {
    filters: [{ column: 'childId', operator: 'eq', value: childId }],
    select: 'id,questions_completed,correct_count',
    order: [{ column: 'id', ascending: false }],
    limit: 1,
  })

  return history[0] ?? null
}

test('full core learning loop should persist a completed math lesson to history', async ({
  page,
  request,
  env,
  gotoApp,
  pickerSeed,
}) => {
  await clearAuthState(page)
  await ensureCoreLoopClassroomCache(request, env, pickerSeed.token, pickerSeed.childId)

  const initialHistoryCount = await getHistoryCount(request, env, pickerSeed.token, pickerSeed.childId)

  await gotoApp('/auth')
  await loginThroughUi(page, pickerSeed.credentials)
  await expectHomePageReady(page)

  await page.getByRole('button', { name: '开始学习' }).click()
  await expect(page).toHaveURL(/\/classroom/)
  await expectSubjectSelectReady(page, '数学')

  await page.getByRole('button', { name: '数学' }).click()
  await expectLessonPickerReadyState(page)

  await openFirstAvailableLesson(page)

  const startQuizButton = page.getByTestId('quiz-start-button')
  await expect(startQuizButton).toBeVisible({ timeout: 30_000 })
  await startQuizButton.click()

  const firstOption = page.getByTestId('option-0')
  await expect(firstOption).toBeVisible({ timeout: 20_000 })
  await firstOption.click()

  const submitAnswersButton = page.getByRole('button', { name: /^(提交答案|Submit Answers)$/ })
  await expect(submitAnswersButton).toBeEnabled()
  await submitAnswersButton.click()
  await expect(page.getByRole('button', { name: /^(重新答题|Retry)$/ })).toBeVisible({ timeout: 20_000 })

  // Classroom auto-completes after all quizzes are answered on the last scene
  await expect(page.getByTestId('session-summary')).toBeVisible({ timeout: 30_000 })

  await expect
    .poll(() => getHistoryCount(request, env, pickerSeed.token, pickerSeed.childId), {
      timeout: 15_000,
      message: '课堂完成后应新增一条学习历史记录',
    })
    .toBeGreaterThan(initialHistoryCount)

  // 验证统计链路：最新历史记录的 questionsCompleted >= 1 且 correctCount >= 1
  const latestRecord = await getLatestHistoryRecord(request, env, pickerSeed.token, pickerSeed.childId)
  expect(latestRecord, '应能查到最新历史记录').not.toBeNull()
  expect(latestRecord!.questionsCompleted, '统计链路应让 questionsCompleted >= 1').toBeGreaterThanOrEqual(1)
  expect(latestRecord!.correctCount, '至少一道答对 correctCount >= 1').toBeGreaterThanOrEqual(1)

  await page.getByRole('button', { name: /查看学习记录/ }).click()
  await expect(page.getByTestId('learning-history-page')).toBeVisible()
  await expect(page.getByRole('button', { name: /快速复习/ }).first()).toBeVisible()
})
