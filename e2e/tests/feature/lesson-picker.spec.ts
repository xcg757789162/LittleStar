import { expect, test } from '../../fixtures/auth'
import {
  expectHomePageReady,
  expectLessonPickerReadyState,
  expectSubjectSelectReady,
} from '../../helpers/assertions'
import { clearAuthState, loginThroughUi } from '../../helpers/auth'
import { attachJsonReport } from '../../helpers/reporting'
import { captureFlowScreenshot } from '../../helpers/screenshots'
import { LESSON_PICKER_TEST_TITLE } from '../../helpers/tags'

test(LESSON_PICKER_TEST_TITLE, async ({ page, gotoApp, pickerSeed, stepShot }, testInfo) => {
  await attachJsonReport(testInfo, 'lesson-picker-seed', pickerSeed)
  await clearAuthState(page)

  await gotoApp('/auth')
  await loginThroughUi(page, pickerSeed.credentials)
  await expectHomePageReady(page)
  await captureFlowScreenshot(stepShot, 'home-after-login')

  await page.getByRole('button', { name: '开始学习' }).click()
  await expect(page).toHaveURL(/\/classroom/)
  await expectSubjectSelectReady(page, pickerSeed.subjectLabel)
  await captureFlowScreenshot(stepShot, 'subject-select')

  await page.getByRole('button', { name: pickerSeed.subjectLabel }).click()
  await expectLessonPickerReadyState(page)
  await captureFlowScreenshot(stepShot, 'lesson-picker-ready')
})
