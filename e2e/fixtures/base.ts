import {
  test as base,
  expect,
  type ConsoleMessage,
  type Page,
  type PageScreenshotOptions,
  type Request,
  type Response,
  type TestInfo,
} from '@playwright/test'
import { e2eEnv, type E2EEnv } from '../config/env'

type BaseFixtures = {
  env: E2EEnv
  consoleErrors: string[]
  networkErrors: string[]
  gotoApp: (path?: string) => Promise<void>
  stepShot: (name: string, options?: PageScreenshotOptions) => Promise<void>
}

function normalizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').toLowerCase()
}

function shouldIgnoreUrl(url: string) {
  return url.includes('favicon') || url.startsWith('data:')
}

function pushConsoleError(errors: string[], message: ConsoleMessage) {
  const text = message.text()
  if (message.type() === 'error' && !text.includes('DevTools') && !shouldIgnoreUrl(text)) {
    errors.push(text)
  }
}

function pushNetworkError(errors: string[], response: Response) {
  if (response.status() >= 400 && !shouldIgnoreUrl(response.url())) {
    errors.push(`${response.status()} ${response.url()}`)
  }
}

function pushRequestFailure(errors: string[], request: Request) {
  if (shouldIgnoreUrl(request.url())) {
    return
  }

  const failureText = request.failure()?.errorText ?? 'request failed'
  errors.push(`${failureText} ${request.method()} ${request.url()}`)
}

async function attachScreenshot(testInfo: TestInfo, path: string, name: string) {
  await testInfo.attach(name, {
    path,
    contentType: 'image/png',
  })
}

async function captureAndAttach(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: PageScreenshotOptions = {},
) {
  const fileName = `${normalizeFileName(name)}.png`
  const screenshotPath = testInfo.outputPath(fileName)

  await page.screenshot({ path: screenshotPath, fullPage: true, ...options })
  await attachScreenshot(testInfo, screenshotPath, `screenshot:${fileName}`)
}

export const test = base.extend<BaseFixtures>({
  env: async ({}, use) => {
    await use(e2eEnv)
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    const handleConsole = (message: ConsoleMessage) => pushConsoleError(errors, message)
    const handlePageError = (error: Error) => errors.push(error.message)

    page.on('console', handleConsole)
    page.on('pageerror', handlePageError)

    await use(errors)

    page.off('console', handleConsole)
    page.off('pageerror', handlePageError)
  },

  networkErrors: async ({ page }, use) => {
    const errors: string[] = []
    const handleResponse = (response: Response) => pushNetworkError(errors, response)
    const handleRequestFailed = (request: Request) => pushRequestFailure(errors, request)

    page.on('response', handleResponse)
    page.on('requestfailed', handleRequestFailed)

    await use(errors)

    page.off('response', handleResponse)
    page.off('requestfailed', handleRequestFailed)
  },

  gotoApp: async ({ page, baseURL }, use) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL 未配置，无法打开应用')
    }

    await use(async (targetPath = '/') => {
      const target = /^https?:\/\//.test(targetPath)
        ? targetPath
        : targetPath.startsWith('/')
          ? targetPath
          : `/${targetPath}`

      await page.goto(target, { waitUntil: 'domcontentloaded' })
    })
  },

  stepShot: async ({ page }, use, testInfo) => {
    await use(async (name: string, options: PageScreenshotOptions = {}) => {
      await captureAndAttach(page, testInfo, name, options)
    })
  },
})

export { expect }

export async function waitForAppIdle(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined)
  await page.waitForTimeout(250)
}
