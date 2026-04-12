import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function expectHomePageReady(page: Page) {
  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始学习' })).toBeVisible()
}

export async function expectSubjectSelectReady(page: Page, subjectLabel: string) {
  await expect(page.getByText('选择要学习的科目')).toBeVisible()
  await expect(page.getByRole('button', { name: subjectLabel })).toBeVisible()
}

export async function expectLessonPickerReadyState(page: Page) {
  const readyState = page
    .getByText('选择课程')
    .or(page.getByText(/课程准备中/))
    .or(page.getByText(/正在加载课程/))
    .first()

  await expect(readyState).toBeVisible()
}
