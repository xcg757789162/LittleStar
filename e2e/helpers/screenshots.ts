import type { PageScreenshotOptions } from '@playwright/test'

export type StepShot = (name: string, options?: PageScreenshotOptions) => Promise<void>

export async function captureFlowScreenshot(
  stepShot: StepShot,
  name: string,
  options?: PageScreenshotOptions,
) {
  await stepShot(`lesson-picker-${name}`, options)
}
