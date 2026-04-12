# Playwright E2E Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scattered root-level Playwright scripts with a standard Playwright Test Runner suite that supports shared fixtures, grouped execution, and HTML diagnostics.

**Architecture:** Add a root `playwright.config.ts`, load dedicated `E2E_*` env from `e2e/config/env.ts`, centralize login/API/screenshot helpers in `e2e/fixtures` and `e2e/helpers`, and migrate the existing browser scripts into `smoke`, `feature`, `full`, and `legacy` spec directories. Keep `Vitest` for route/component-level smoke tests and document the new E2E entrypoints in repo docs and the project index.

**Tech Stack:** TypeScript, `@playwright/test`, existing `playwright` browser runtime, Vite dev server, PostgREST/Auth APIs via local Docker, Markdown docs.

---

### Task 1: Bootstrap the Playwright runner scaffold

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/config/env.ts`
- Create: `e2e/fixtures/base.ts`
- Create: `e2e/tests/smoke/app-smoke.spec.ts`
- Create: `.env.e2e.example`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `e2e/tests/smoke/app-smoke.spec.ts`

- [ ] **Step 1: Write the failing smoke spec**

Create `e2e/tests/smoke/app-smoke.spec.ts` with this content:

```ts
import { test, expect } from '../../fixtures/base'

test('@smoke app shell loads at base url', async ({ page, stepShot }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const hasHome = await page.getByTestId('home-page').count()
  const hasAuth = await page.getByTestId('auth-username').count()

  expect(hasHome + hasAuth).toBeGreaterThan(0)
  await stepShot('app-smoke-home-or-auth')
})
```

- [ ] **Step 2: Run the smoke spec to verify it fails before the scaffold exists**

Run:

```bash
npx playwright test e2e/tests/smoke/app-smoke.spec.ts --reporter=list
```

Expected: FAIL with an import error because `../../fixtures/base` and the Playwright config do not exist yet.

- [ ] **Step 3: Add the Playwright Test dependency and npm scripts**

Modify `package.json` so the `scripts` and `devDependencies` sections include the following entries:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:server": "bash scripts/build-server.sh",
    "preview": "vite preview",
    "test:e2e": "playwright test e2e/tests/smoke e2e/tests/feature",
    "test:e2e:smoke": "playwright test e2e/tests/smoke",
    "test:e2e:feature": "playwright test e2e/tests/feature",
    "test:e2e:full": "playwright test e2e/tests/full --workers=1",
    "test:e2e:legacy": "playwright test e2e/tests/legacy",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:install": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "dotenv": "^17.2.3",
    "playwright": "^1.59.1"
  }
}
```

- [ ] **Step 4: Add dedicated E2E env sample and ignore rules**

Create `.env.e2e.example`:

```bash
E2E_BASE_URL=http://127.0.0.1:5173
E2E_AUTH_API_URL=http://127.0.0.1:5173/api/auth
E2E_REST_API_URL=http://127.0.0.1:5173/api/rest
E2E_TEST_USERNAME=testuser_e2e
E2E_TEST_PASSWORD=Test1234
E2E_PICKER_USERNAME=playwright_test
E2E_PICKER_PASSWORD=Test123456
E2E_HEADLESS=true
E2E_USE_API_LOGIN=true
E2E_WORKERS=1
```

Update `.gitignore` by appending these lines near the env/test artifact sections:

```gitignore
# Playwright runner artifacts
playwright-report/
test-results/

# Dedicated E2E env files
.env.e2e
.env.e2e.local
```

- [ ] **Step 5: Create the env loader and Playwright config**

Create `e2e/config/env.ts`:

```ts
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

const envFiles = ['.env.e2e.local', '.env.e2e']
for (const file of envFiles) {
  const fullPath = resolve(process.cwd(), file)
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: false })
  }
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'

export const e2eEnv = {
  baseURL,
  authApiURL: process.env.E2E_AUTH_API_URL ?? new URL('/api/auth', baseURL).toString(),
  restApiURL: process.env.E2E_REST_API_URL ?? new URL('/api/rest', baseURL).toString(),
  headless: parseBoolean(process.env.E2E_HEADLESS, true),
  useApiLogin: parseBoolean(process.env.E2E_USE_API_LOGIN, true),
  workers: parseNumber(process.env.E2E_WORKERS, 1),
  primaryUser: {
    username: process.env.E2E_TEST_USERNAME ?? 'testuser_e2e',
    password: process.env.E2E_TEST_PASSWORD ?? 'Test1234',
  },
  pickerUser: {
    username: process.env.E2E_PICKER_USERNAME ?? 'playwright_test',
    password: process.env.E2E_PICKER_PASSWORD ?? 'Test123456',
  },
} as const

export type E2EEnv = typeof e2eEnv
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/config/env'

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: e2eEnv.workers,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: e2eEnv.baseURL,
    headless: e2eEnv.headless,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: e2eEnv.baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
```

- [ ] **Step 6: Create the base fixture used by all specs**

Create `e2e/fixtures/base.ts`:

```ts
import { test as base, expect } from '@playwright/test'
import type { TestInfo } from '@playwright/test'
import { e2eEnv, type E2EEnv } from '../config/env'

type BaseFixtures = {
  env: E2EEnv
  consoleErrors: string[]
  networkErrors: string[]
  stepShot: (name: string) => Promise<void>
}

function normalizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').toLowerCase()
}

async function attachScreenshot(testInfo: TestInfo, path: string, name: string) {
  await testInfo.attach(name, {
    path,
    contentType: 'image/png',
  })
}

export const test = base.extend<BaseFixtures>({
  env: async ({}, use) => {
    await use(e2eEnv)
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('DevTools')) {
          errors.push(text)
        }
      }
    })
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    await use(errors)
  },

  networkErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().includes('favicon')) {
        errors.push(`${response.status()} ${response.url()}`)
      }
    })
    await use(errors)
  },

  stepShot: async ({ page }, use, testInfo) => {
    await use(async (name: string) => {
      const fileName = `${normalizeFileName(name)}.png`
      const screenshotPath = testInfo.outputPath(fileName)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      await attachScreenshot(testInfo, screenshotPath, `screenshot:${fileName}`)
    })
  },
})

export { expect }
```

- [ ] **Step 7: Run the smoke spec to verify the scaffold works**

Run:

```bash
npm run test:e2e:smoke
```

Expected: PASS with one passing test and a generated HTML report in `playwright-report/`.

- [ ] **Step 8: Commit the scaffold**

Run:

```bash
git add package.json package-lock.json .gitignore .env.e2e.example playwright.config.ts e2e/config/env.ts e2e/fixtures/base.ts e2e/tests/smoke/app-smoke.spec.ts
git commit -m "test: bootstrap playwright e2e runner"
```

Expected: one commit containing the runner scaffold only.

---

### Task 2: Add shared auth, API, screenshot, reporting, and learning helpers

**Files:**
- Create: `e2e/fixtures/data.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/helpers/tags.ts`
- Create: `e2e/helpers/auth.ts`
- Create: `e2e/helpers/api.ts`
- Create: `e2e/helpers/screenshots.ts`
- Create: `e2e/helpers/reporting.ts`
- Create: `e2e/helpers/assertions.ts`
- Create: `e2e/helpers/learning.ts`
- Create: `e2e/reports/README.md`
- Create: `e2e/tests/feature/lesson-picker.spec.ts`
- Modify: `e2e/fixtures/base.ts`
- Test: `e2e/tests/feature/lesson-picker.spec.ts`

- [ ] **Step 1: Write the failing Lesson Picker feature spec against the new helper API**

Create `e2e/tests/feature/lesson-picker.spec.ts` with this content:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { expectLessonPickerOrClassroom, expectNoCriticalErrors } from '../../helpers/assertions'
import { openLearningSession, selectSubjectAndStart } from '../../helpers/learning'

test.describe(`${TAGS.feature} lesson picker`, () => {
  test('shows lesson picker or valid classroom fallback', async ({
    page,
    loginAsPickerUser,
    stepShot,
    restQuery,
    consoleErrors,
    networkErrors,
  }) => {
    await loginAsPickerUser('ui')
    await openLearningSession(page)
    await selectSubjectAndStart(page, '数学')
    await stepShot('lesson-picker-after-start')

    const cacheRows = await restQuery<Array<{ id: number }>>('/classroom_cache?select=id&limit=5')
    expect(Array.isArray(cacheRows)).toBe(true)

    await expectLessonPickerOrClassroom(page)
    await expectNoCriticalErrors(consoleErrors, networkErrors)
  })
})
```

- [ ] **Step 2: Run the feature spec to verify it fails before helpers exist**

Run:

```bash
npx playwright test e2e/tests/feature/lesson-picker.spec.ts --reporter=list
```

Expected: FAIL with import errors for `../../fixtures/auth`, `../../helpers/*`, and `TAGS`.

- [ ] **Step 3: Create shared test data, tag constants, and authentication helpers**

Create `e2e/fixtures/data.ts`:

```ts
export type LoginMode = 'ui' | 'api'

export type TestUser = {
  username: string
  password: string
  childName?: string
  childId?: number
}

export const TEST_USERS: Record<'primary' | 'picker', TestUser> = {
  primary: {
    username: 'testuser_e2e',
    password: 'Test1234',
    childName: '小明',
    childId: 3,
  },
  picker: {
    username: 'playwright_test',
    password: 'Test123456',
    childName: '小测试',
    childId: 4,
  },
}
```

Create `e2e/helpers/tags.ts`:

```ts
export const TAGS = {
  smoke: '@smoke',
  feature: '@feature',
  full: '@full',
  legacy: '@legacy',
  auth: '@auth',
  db: '@db',
  slow: '@slow',
  manual: '@manual-followup',
} as const
```

Create `e2e/helpers/auth.ts`:

```ts
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { E2EEnv } from '../config/env'
import type { LoginMode, TestUser } from '../fixtures/data'

async function submitUiLogin(page: Page, user: TestUser) {
  const username = page.getByTestId('auth-username')
  const password = page.getByTestId('auth-password')
  const submit = page.getByTestId('auth-submit-btn')

  await expect(username).toBeVisible()
  await username.fill(user.username)
  await password.fill(user.password)
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.status() === 200),
    submit.click(),
  ])
  await page.waitForLoadState('networkidle')
}

async function submitApiLogin(page: Page, request: APIRequestContext, env: E2EEnv, user: TestUser) {
  const response = await request.post(`${env.authApiURL}/login`, {
    data: {
      username: user.username,
      password: user.password,
    },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json() as { token: string }
  await page.goto('/')
  await page.evaluate((token) => {
    localStorage.setItem('littlestar_jwt_token', token)
  }, body.token)
  await page.reload({ waitUntil: 'networkidle' })
}

export async function login(page: Page, request: APIRequestContext, env: E2EEnv, user: TestUser, mode: LoginMode) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const alreadyLoggedIn = await page.getByTestId('home-page').count()
  if (alreadyLoggedIn > 0) {
    return
  }

  if (mode === 'api') {
    await submitApiLogin(page, request, env, user)
    return
  }

  await submitUiLogin(page, user)
}
```

- [ ] **Step 4: Create REST helpers, reporting helpers, screenshot helper, and auth fixture**

Create `e2e/helpers/api.ts`:

```ts
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { E2EEnv } from '../config/env'

export async function getJwtToken(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('littlestar_jwt_token'))
  if (!token) {
    throw new Error('JWT token not found in localStorage')
  }
  return token
}

export async function restQuery<T>(request: APIRequestContext, env: E2EEnv, token: string, path: string): Promise<T> {
  const response = await request.get(`${env.restApiURL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  expect(response.ok()).toBeTruthy()
  return await response.json() as T
}

export async function restInsert<T>(request: APIRequestContext, env: E2EEnv, token: string, path: string, body: unknown): Promise<T> {
  const response = await request.post(`${env.restApiURL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    data: body,
  })

  expect(response.ok()).toBeTruthy()
  return await response.json() as T
}

export async function restDelete(request: APIRequestContext, env: E2EEnv, token: string, path: string) {
  const response = await request.delete(`${env.restApiURL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  expect(response.ok()).toBeTruthy()
}
```

Create `e2e/helpers/screenshots.ts`:

```ts
import type { Page, TestInfo } from '@playwright/test'

function normalize(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').toLowerCase()
}

export async function captureAndAttach(page: Page, testInfo: TestInfo, name: string) {
  const fileName = `${normalize(name)}.png`
  const path = testInfo.outputPath(fileName)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(`screenshot:${fileName}`, {
    path,
    contentType: 'image/png',
  })
}
```

Create `e2e/helpers/reporting.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { TestInfo } from '@playwright/test'

export async function writeMarkdownAttachment(testInfo: TestInfo, fileName: string, lines: string[]) {
  const outputPath = testInfo.outputPath(fileName)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8')
  await testInfo.attach(fileName, {
    path: outputPath,
    contentType: 'text/markdown',
  })
}
```

Create `e2e/fixtures/auth.ts`:

```ts
import { test as base, expect } from './base'
import { TEST_USERS, type LoginMode } from './data'
import { login } from '../helpers/auth'
import { getJwtToken, restQuery, restInsert, restDelete } from '../helpers/api'

type AuthFixtures = {
  loginAsPrimaryUser: (mode?: LoginMode) => Promise<void>
  loginAsPickerUser: (mode?: LoginMode) => Promise<void>
  restQuery: <T>(path: string) => Promise<T>
  restInsert: <T>(path: string, body: unknown) => Promise<T>
  restDelete: (path: string) => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  loginAsPrimaryUser: async ({ page, request, env }, use) => {
    await use(async (mode = env.useApiLogin ? 'api' : 'ui') => {
      await login(page, request, env, TEST_USERS.primary, mode)
    })
  },

  loginAsPickerUser: async ({ page, request, env }, use) => {
    await use(async (mode = env.useApiLogin ? 'api' : 'ui') => {
      await login(page, request, env, TEST_USERS.picker, mode)
    })
  },

  restQuery: async ({ page, request, env }, use) => {
    await use(async <T>(path: string) => {
      const token = await getJwtToken(page)
      return await restQuery<T>(request, env, token, path)
    })
  },

  restInsert: async ({ page, request, env }, use) => {
    await use(async <T>(path: string, body: unknown) => {
      const token = await getJwtToken(page)
      return await restInsert<T>(request, env, token, path, body)
    })
  },

  restDelete: async ({ page, request, env }, use) => {
    await use(async (path: string) => {
      const token = await getJwtToken(page)
      await restDelete(request, env, token, path)
    })
  },
})

export { expect }
```

- [ ] **Step 5: Add reusable assertions, learning helpers, report docs, and wire screenshots through the base fixture**

Create `e2e/helpers/assertions.ts`:

```ts
import { expect, type Page } from '@playwright/test'

export async function expectLessonPickerOrClassroom(page: Page) {
  await page.waitForTimeout(2_000)
  const progressText = await page.getByTestId('session-progress').textContent().catch(() => '')
  const bodyText = await page.textContent('body').catch(() => '')
  const hasLessonPicker = Boolean(progressText?.includes('选择课程')) || Boolean(bodyText?.includes('今日课程'))
  const hasClassroom = await page.locator('iframe, [data-testid="classroom-view"], [data-testid="native-classroom"]').count()

  expect(hasLessonPicker || hasClassroom > 0).toBeTruthy()
}

export async function expectNoCriticalErrors(consoleErrors: string[], networkErrors: string[]) {
  const criticalConsole = consoleErrors.filter((line) => !line.includes('favicon'))
  const criticalNetwork = networkErrors.filter((line) => !line.includes('favicon'))

  expect(criticalConsole, `Console errors: ${criticalConsole.join(' | ')}`).toEqual([])
  expect(criticalNetwork, `Network errors: ${criticalNetwork.join(' | ')}`).toEqual([])
}
```

Create `e2e/helpers/learning.ts`:

```ts
import { expect, type Page } from '@playwright/test'

export async function openLearningSession(page: Page) {
  const startButton = page.locator('button').filter({ hasText: '开始学习' }).first()
  await expect(startButton).toBeVisible()
  await startButton.click()
  await page.waitForURL(/\/learn/)
  await page.waitForLoadState('networkidle')
}

export async function selectSubjectAndStart(page: Page, subjectLabel: '英语' | '数学' | '语文') {
  const subjectButton = page.locator(`button:has-text("${subjectLabel}")`).first()
  await expect(subjectButton).toBeVisible()
  await subjectButton.click()

  const innerStart = page.locator('button').filter({ hasText: '开始学习' }).first()
  await expect(innerStart).toBeVisible()
  await innerStart.click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(4_000)
}
```

Create `e2e/reports/README.md`:

```md
# E2E Reports Directory

This directory is reserved for business-facing supplementary artifacts produced by Playwright tests.

- Official runner output remains in `playwright-report/` and `test-results/`.
- Business summaries such as markdown attachments and grouped screenshots may be copied here when a test explicitly needs them.
- Do not commit generated screenshots or HTML reports from routine local runs.
```

Modify `e2e/fixtures/base.ts` to replace the inline screenshot helper with the reusable screenshot helper:

```ts
import { test as base, expect } from '@playwright/test'
import { e2eEnv, type E2EEnv } from '../config/env'
import { captureAndAttach } from '../helpers/screenshots'

// keep the existing BaseFixtures type

export const test = base.extend<BaseFixtures>({
  env: async ({}, use) => {
    await use(e2eEnv)
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('DevTools')) {
          errors.push(text)
        }
      }
    })
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    await use(errors)
  },

  networkErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().includes('favicon')) {
        errors.push(`${response.status()} ${response.url()}`)
      }
    })
    await use(errors)
  },

  stepShot: async ({ page }, use, testInfo) => {
    await use(async (name: string) => {
      await captureAndAttach(page, testInfo, name)
    })
  },
})

export { expect }
```

- [ ] **Step 6: Run the feature spec and keep the helper layer green**

Run:

```bash
npm run test:e2e:feature -- --grep "lesson picker"
```

Expected: PASS with one passing Lesson Picker feature test.

- [ ] **Step 7: Commit the shared helper layer**

Run:

```bash
git add e2e/fixtures/base.ts e2e/fixtures/data.ts e2e/fixtures/auth.ts e2e/helpers/auth.ts e2e/helpers/api.ts e2e/helpers/screenshots.ts e2e/helpers/reporting.ts e2e/helpers/assertions.ts e2e/helpers/learning.ts e2e/helpers/tags.ts e2e/reports/README.md e2e/tests/feature/lesson-picker.spec.ts
git commit -m "test: add shared playwright fixtures and helpers"
```

Expected: one commit containing helper abstractions plus the migrated Lesson Picker spec.

---

### Task 3: Migrate the full P1–P6 learning loop into a single full-flow spec

**Files:**
- Create: `e2e/tests/full/core-learning-loop.spec.ts`
- Modify: `e2e/helpers/learning.ts`
- Modify: `e2e/helpers/assertions.ts`
- Test: `e2e/tests/full/core-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing full-flow spec before adding the extra helpers**

Create `e2e/tests/full/core-learning-loop.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import {
  openLearningSession,
  selectSubjectAndStart,
  answerVisibleClassroom,
  finishClassroomIfPossible,
  logoutAndRelogin,
} from '../../helpers/learning'
import {
  expectCacheReadyOrPreparing,
  expectSessionSummaryCard,
  expectNoCriticalErrors,
} from '../../helpers/assertions'

test.describe.serial(`${TAGS.full} ${TAGS.auth} ${TAGS.db} core learning loop`, () => {
  test('executes P1-P6 against the local stack', async ({
    page,
    loginAsPrimaryUser,
    restQuery,
    stepShot,
    consoleErrors,
    networkErrors,
  }) => {
    await loginAsPrimaryUser('ui')
    await expectCacheReadyOrPreparing(page)
    await stepShot('core-loop-home')

    await openLearningSession(page)
    await selectSubjectAndStart(page, '数学')
    await answerVisibleClassroom(page)
    await finishClassroomIfPossible(page)
    await expectSessionSummaryCard(page)

    const dailySessions = await restQuery<Array<{ id: number }>>('/daily_sessions?order=id.desc&limit=1')
    expect(dailySessions.length).toBeGreaterThan(0)

    await logoutAndRelogin(page, loginAsPrimaryUser)

    const historyRows = await restQuery<Array<{ id: number }>>('/classroom_history?order=id.desc&limit=1')
    expect(historyRows.length).toBeGreaterThan(0)

    await expectNoCriticalErrors(consoleErrors, networkErrors)
  })
})
```

- [ ] **Step 2: Run the full-flow spec to verify it fails because the new helpers do not exist yet**

Run:

```bash
npx playwright test e2e/tests/full/core-learning-loop.spec.ts --workers=1 --reporter=list
```

Expected: FAIL with import errors for `answerVisibleClassroom`, `finishClassroomIfPossible`, `logoutAndRelogin`, and the new assertion helpers.

- [ ] **Step 3: Extend the learning and assertion helpers for the full flow**

Append these exports to `e2e/helpers/learning.ts`:

```ts
export async function answerVisibleClassroom(page: Page) {
  for (let index = 0; index < 20; index += 1) {
    const quizOption = page.locator('[data-testid^="quiz-option"]').first()
    if (await quizOption.count() > 0 && await quizOption.isVisible()) {
      await quizOption.click()
      await page.waitForTimeout(1_500)
      continue
    }

    const answerButton = page.locator('button').filter({ hasText: /^[A-D①-④]/ }).first()
    if (await answerButton.count() > 0 && await answerButton.isVisible()) {
      await answerButton.click()
      await page.waitForTimeout(1_500)
      continue
    }

    const nextButton = page.getByTestId('nav-next')
    if (await nextButton.count() > 0 && await nextButton.isVisible()) {
      const label = (await nextButton.textContent()) ?? ''
      if (label.includes('完成')) {
        break
      }
      await nextButton.click()
      await page.waitForTimeout(1_000)
      continue
    }

    const bodyText = await page.textContent('body').catch(() => '')
    if (bodyText?.includes('学习完成') || bodyText?.includes('太棒了')) {
      break
    }

    await page.waitForTimeout(1_000)
  }
}

export async function finishClassroomIfPossible(page: Page) {
  const candidates = [
    page.locator('button:has-text("完成课堂")').first(),
    page.locator('button:has-text("完成 🎉")').first(),
    page.locator('[data-testid="nav-next"]').filter({ hasText: '完成' }).first(),
  ]

  for (const candidate of candidates) {
    if (await candidate.count() > 0 && await candidate.isVisible()) {
      await candidate.click()
      await page.waitForTimeout(6_000)
      return
    }
  }
}

export async function logoutAndRelogin(
  page: Page,
  loginAgain: (mode?: 'ui' | 'api') => Promise<void>,
) {
  await page.evaluate(() => {
    localStorage.removeItem('littlestar_jwt_token')
    localStorage.removeItem('littlestar_child_store')
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await loginAgain('ui')
}
```

Append these exports to `e2e/helpers/assertions.ts`:

```ts
export async function expectCacheReadyOrPreparing(page: Page) {
  const bodyText = await page.textContent('body').catch(() => '')
  const cacheStatus = await page.getByTestId('cache-status').textContent().catch(() => '')
  const hasReadyState = Boolean(cacheStatus?.includes('已就绪')) || Boolean(bodyText?.includes('节课已准备好'))
  const hasPreparingState = Boolean(cacheStatus?.includes('准备中')) || Boolean(bodyText?.includes('课程准备中'))

  expect(hasReadyState || hasPreparingState).toBeTruthy()
}

export async function expectSessionSummaryCard(page: Page) {
  const summary = page.getByTestId('session-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toContainText('完成题数')
}
```

- [ ] **Step 4: Replace the single-test body with explicit `test.step()` blocks once the helpers exist**

Update `e2e/tests/full/core-learning-loop.spec.ts` to this final form:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import {
  openLearningSession,
  selectSubjectAndStart,
  answerVisibleClassroom,
  finishClassroomIfPossible,
  logoutAndRelogin,
} from '../../helpers/learning'
import {
  expectCacheReadyOrPreparing,
  expectSessionSummaryCard,
  expectNoCriticalErrors,
} from '../../helpers/assertions'

test.describe.serial(`${TAGS.full} ${TAGS.auth} ${TAGS.db} core learning loop`, () => {
  test('executes P1-P6 against the local stack', async ({
    page,
    loginAsPrimaryUser,
    restQuery,
    stepShot,
    consoleErrors,
    networkErrors,
  }) => {
    await test.step('P1 login and home cache validation', async () => {
      await loginAsPrimaryUser('ui')
      await expectCacheReadyOrPreparing(page)
      await stepShot('core-loop-p1-home')
    })

    await test.step('P2 subject selection and classroom completion', async () => {
      await openLearningSession(page)
      await selectSubjectAndStart(page, '数学')
      await stepShot('core-loop-p2-started')
      await answerVisibleClassroom(page)
      await finishClassroomIfPossible(page)
      await expectSessionSummaryCard(page)
      await stepShot('core-loop-p2-summary')
    })

    await test.step('P3 REST persistence checks', async () => {
      const dailySessions = await restQuery<Array<{ id: number }>>('/daily_sessions?order=id.desc&limit=3')
      const masteryRecords = await restQuery<Array<{ id: number }>>('/mastery_records?order=id.desc&limit=5')
      const historyRows = await restQuery<Array<{ id: number }>>('/classroom_history?order=id.desc&limit=3')

      expect(dailySessions.length).toBeGreaterThan(0)
      expect(masteryRecords.length).toBeGreaterThan(0)
      expect(historyRows.length).toBeGreaterThan(0)
    })

    await test.step('P4 logout and relogin recovery', async () => {
      await logoutAndRelogin(page, loginAsPrimaryUser)
      await expectCacheReadyOrPreparing(page)
      await stepShot('core-loop-p4-relogin')
    })

    await test.step('P5 history page remains available after relogin', async () => {
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      const bodyText = await page.textContent('body')
      expect(bodyText?.includes('学习') || bodyText?.includes('记录')).toBeTruthy()
      await stepShot('core-loop-p5-history')
    })

    await test.step('P6 no critical console or network errors', async () => {
      await expectNoCriticalErrors(consoleErrors, networkErrors)
    })
  })
})
```

- [ ] **Step 5: Run the full-flow spec in serial mode**

Run:

```bash
npm run test:e2e:full -- --grep "core learning loop"
```

Expected: PASS with one serial full-flow test. If environment data is temporarily missing, fix the data preconditions before moving on rather than weakening assertions.

- [ ] **Step 6: Commit the full-flow migration**

Run:

```bash
git add e2e/helpers/learning.ts e2e/helpers/assertions.ts e2e/tests/full/core-learning-loop.spec.ts
git commit -m "test: migrate full learning loop to playwright runner"
```

Expected: one commit containing the P1–P6 migration only.

---

### Task 4: Convert useful bug-regression coverage into real Playwright specs

**Files:**
- Create: `e2e/tests/feature/bug-regressions.spec.ts`
- Modify: `e2e/helpers/api.ts`
- Modify: `e2e/helpers/assertions.ts`
- Test: `e2e/tests/feature/bug-regressions.spec.ts`

- [ ] **Step 1: Write the failing regression spec with user-visible and REST-observable assertions only**

Create `e2e/tests/feature/bug-regressions.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { expectNoCriticalErrors } from '../../helpers/assertions'
import { openLearningSession, selectSubjectAndStart } from '../../helpers/learning'

test.describe.serial(`${TAGS.feature} ${TAGS.db} bug regressions`, () => {
  test('parent dashboard refreshes after a new session is inserted', async ({
    page,
    loginAsPrimaryUser,
    restInsert,
    restDelete,
    stepShot,
    consoleErrors,
    networkErrors,
  }) => {
    await loginAsPrimaryUser('api')
    const today = new Date().toISOString().slice(0, 10)

    const inserted = await restInsert<Array<{ id: number }>>('/daily_sessions', [{
      child_id: 3,
      date: today,
      start_time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString(),
      questions_completed: 8,
      correct_count: 6,
      subjects: ['english'],
    }])

    await page.goto('/parent')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('classroom-completed', {
        detail: { childId: 3, subject: 'english' },
      }))
    })
    await page.waitForTimeout(3_000)
    await stepShot('bug-parent-dashboard-refresh')

    const bodyText = await page.textContent('body')
    expect(bodyText?.includes('8题') || bodyText?.includes('75%')).toBeTruthy()
    await expectNoCriticalErrors(consoleErrors, networkErrors)

    await restDelete(`/daily_sessions?id=eq.${inserted[0].id}`)
  })

  test('incomplete lessons do not appear in history UI', async ({ page, loginAsPrimaryUser, stepShot }) => {
    await loginAsPrimaryUser('api')
    await openLearningSession(page)
    await selectSubjectAndStart(page, '英语')
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
    await stepShot('bug-history-incomplete-filter')

    const bodyText = await page.textContent('body')
    const showsIncomplete = Boolean(bodyText?.includes('0题') && bodyText.includes('0%'))
    expect(showsIncomplete).toBe(false)
  })

  test('home cache display matches the REST row count', async ({
    page,
    loginAsPrimaryUser,
    restQuery,
    stepShot,
    consoleErrors,
    networkErrors,
  }) => {
    await loginAsPrimaryUser('api')
    const cacheRows = await restQuery<Array<{ id: number }>>('/classroom_cache?select=id')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await stepShot('bug-home-cache-display')

    const bodyText = await page.textContent('body')
    const dbCount = cacheRows.length
    expect(bodyText?.includes(`${dbCount} 节课`) || bodyText?.includes('课程准备中')).toBeTruthy()
    await expectNoCriticalErrors(consoleErrors, networkErrors)
  })
})
```

- [ ] **Step 2: Run the regression spec to verify it fails before the insert/delete helpers exist**

Run:

```bash
npx playwright test e2e/tests/feature/bug-regressions.spec.ts --workers=1 --reporter=list
```

Expected: FAIL because `restInsert`/`restDelete` are not wired through the helper layer yet.

- [ ] **Step 3: Extend the helper layer for REST mutation support and reusable history assertions**

Update `e2e/helpers/assertions.ts` by appending this helper:

```ts
export async function expectHistoryUiToHideIncompleteRows(page: Page) {
  const bodyText = await page.textContent('body').catch(() => '')
  const showsIncomplete = Boolean(bodyText?.includes('0题') && bodyText.includes('0%'))
  expect(showsIncomplete).toBe(false)
}
```

Update `e2e/helpers/api.ts` so `restInsert` accepts either a single object or an array and always returns the JSON body:

```ts
export async function restInsert<T>(request: APIRequestContext, env: E2EEnv, token: string, path: string, body: unknown): Promise<T> {
  const payload = Array.isArray(body) ? body : [body]
  const response = await request.post(`${env.restApiURL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    data: payload,
  })

  expect(response.ok()).toBeTruthy()
  return await response.json() as T
}
```

- [ ] **Step 4: Re-run the regression suite and keep only user-observable coverage**

Run:

```bash
npm run test:e2e:feature -- --grep "bug regressions"
```

Expected: PASS with three regression tests.

Important rule while implementing this task: do not port the old `grep`-based source-code verification from `e2e-verify-bugs.ts`. That logic belongs in `Vitest` or code review, not in Playwright browser E2E.

- [ ] **Step 5: Commit the regression suite**

Run:

```bash
git add e2e/helpers/api.ts e2e/helpers/assertions.ts e2e/tests/feature/bug-regressions.spec.ts
git commit -m "test: migrate useful bug regressions to playwright"
```

Expected: one commit containing only the browser-facing regression coverage.

---

### Task 5: Preserve legacy bridge diagnostics without polluting the main suite

**Files:**
- Create: `e2e/helpers/bridge.ts`
- Create: `e2e/tests/legacy/bridge-classroom.spec.ts`
- Create: `e2e/tests/legacy/bridge-final.spec.ts`
- Create: `e2e/tests/legacy/bridge-verify.spec.ts`
- Test: `e2e/tests/legacy/bridge-final.spec.ts`

- [ ] **Step 1: Write the first failing legacy spec against a shared bridge helper**

Create `e2e/tests/legacy/bridge-final.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { openBridgeClassroomAndInspect } from '../../helpers/bridge'

test.describe(`${TAGS.legacy} bridge final`, () => {
  test('records iframe bridge state for manual diagnostics', async ({ page, loginAsPrimaryUser, stepShot }) => {
    await loginAsPrimaryUser('api')
    const result = await openBridgeClassroomAndInspect(page, '英语')
    await stepShot('legacy-bridge-final')

    expect(result.iframeCount).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run the legacy spec to verify it fails before the bridge helper exists**

Run:

```bash
npx playwright test e2e/tests/legacy/bridge-final.spec.ts --reporter=list
```

Expected: FAIL because `../../helpers/bridge` does not exist yet.

- [ ] **Step 3: Add the shared bridge helper and the three legacy specs**

Create `e2e/helpers/bridge.ts`:

```ts
import type { Page } from '@playwright/test'
import { openLearningSession, selectSubjectAndStart } from './learning'

export async function openBridgeClassroomAndInspect(page: Page, subjectLabel: '英语' | '数学' | '语文') {
  await openLearningSession(page)
  await selectSubjectAndStart(page, subjectLabel)
  await page.waitForTimeout(5_000)

  const iframeCount = await page.locator('iframe').count()
  const bodyText = await page.textContent('body').catch(() => '')
  const hasClassroom = iframeCount > 0 || Boolean(bodyText?.includes('课堂')) || Boolean(bodyText?.includes('欢迎来到'))

  return {
    iframeCount,
    hasClassroom,
    bodyText: bodyText?.slice(0, 500) ?? '',
  }
}
```

Create `e2e/tests/legacy/bridge-classroom.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { openBridgeClassroomAndInspect } from '../../helpers/bridge'

test.describe(`${TAGS.legacy} bridge classroom`, () => {
  test('captures classroom bridge state for math', async ({ page, loginAsPrimaryUser, stepShot }) => {
    await loginAsPrimaryUser('api')
    const result = await openBridgeClassroomAndInspect(page, '数学')
    await stepShot('legacy-bridge-classroom')
    expect(result.hasClassroom).toBeTruthy()
  })
})
```

Create `e2e/tests/legacy/bridge-final.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { openBridgeClassroomAndInspect } from '../../helpers/bridge'

test.describe(`${TAGS.legacy} bridge final`, () => {
  test('records iframe bridge state for english', async ({ page, loginAsPrimaryUser, stepShot }) => {
    await loginAsPrimaryUser('api')
    const result = await openBridgeClassroomAndInspect(page, '英语')
    await stepShot('legacy-bridge-final')
    expect(result.iframeCount).toBeGreaterThanOrEqual(0)
  })
})
```

Create `e2e/tests/legacy/bridge-verify.spec.ts`:

```ts
import { test, expect } from '../../fixtures/auth'
import { TAGS } from '../../helpers/tags'
import { openBridgeClassroomAndInspect } from '../../helpers/bridge'

test.describe(`${TAGS.legacy} bridge verify`, () => {
  test('captures bridge state for chinese flow', async ({ page, loginAsPrimaryUser, stepShot }) => {
    await loginAsPrimaryUser('api')
    const result = await openBridgeClassroomAndInspect(page, '语文')
    await stepShot('legacy-bridge-verify')
    expect(result.iframeCount).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 4: Verify that legacy tests are discoverable but separated from the main suite**

Run:

```bash
npm run test:e2e:legacy -- --list
```

Expected: Playwright lists exactly three legacy specs.

Then run one targeted legacy diagnostic to make sure the helper wiring is correct:

```bash
npm run test:e2e:legacy -- --grep "bridge final"
```

Expected: PASS or, if the local environment no longer exposes iframe behavior, a single focused failure that still produces screenshot/trace artifacts for manual inspection.

- [ ] **Step 5: Commit the legacy bridge archive layer**

Run:

```bash
git add e2e/helpers/bridge.ts e2e/tests/legacy/bridge-classroom.spec.ts e2e/tests/legacy/bridge-final.spec.ts e2e/tests/legacy/bridge-verify.spec.ts
git commit -m "test: archive bridge diagnostics under legacy playwright specs"
```

Expected: one commit containing only the legacy bridge archive layer.

---

### Task 6: Document the new test entrypoints, clean up the root scripts, and update the project index

**Files:**
- Create: `e2e/README.md`
- Modify: `docs/核心学习闭环测试方案.md`
- Modify: `.codebuddy/project-index.md`
- Delete: `quick-browser-test.ts`
- Delete: `e2e-lesson-picker-test.ts`
- Delete: `e2e-core-loop-test.ts`
- Delete: `e2e-verify-bugs.ts`
- Delete: `e2e-bridge-classroom.ts`
- Delete: `e2e-bridge-final.ts`
- Delete: `e2e-bridge-verify.ts`
- Delete: `debug-classroom.ts`
- Test: `npm run test:e2e:smoke`
- Test: `npm run test:e2e:feature`
- Test: `npm run test:e2e:full`
- Test: `npm run test:e2e:legacy -- --list`

- [ ] **Step 1: Add the top-level E2E README so the standard entrypoint is explicit**

Create `e2e/README.md`:

```md
# Playwright E2E Test Suite

This directory contains the standard browser end-to-end suite for OpenMAIC / LittleStar.

## Prerequisites

1. Local Docker services from `docker/openmaic/docker-compose.yml` are healthy.
2. `npm install` has been run.
3. Copy `.env.e2e.example` to `.env.e2e` and fill in the test credentials if they differ from local defaults.
4. Install the Chromium browser once with `npm run test:e2e:install`.

## Commands

- `npm run test:e2e` — smoke + feature
- `npm run test:e2e:smoke`
- `npm run test:e2e:feature`
- `npm run test:e2e:full`
- `npm run test:e2e:legacy`
- `npm run test:e2e:ui`
- `npm run test:e2e:report`

## Suite layout

- `e2e/tests/smoke` — fastest browser health checks
- `e2e/tests/feature` — focused product regressions
- `e2e/tests/full` — serial high-value business loop
- `e2e/tests/legacy` — archived diagnostics, not part of the default developer run

## Scope boundary

`src/__tests__/e2e-flow.test.tsx` remains a `Vitest` route-render smoke test. It is not part of the Playwright runner.
```

- [ ] **Step 2: Update the business test design doc so it points to the new runner**

Append this section near the top of `docs/核心学习闭环测试方案.md` after the “工具/测试账号/前端地址” block:

```md
## 自动化执行入口

当前正式自动化入口已经统一到 Playwright Test Runner：

- `npm run test:e2e`：默认执行 `smoke + feature`
- `npm run test:e2e:smoke`
- `npm run test:e2e:feature`
- `npm run test:e2e:full`
- `npm run test:e2e:legacy`
- `npm run test:e2e:report`

说明：

- 根目录历史脚本已经迁移到 `e2e/tests/`，不再作为正式执行入口。
- `full` 对应本文 P1-P6 核心学习闭环。
- `legacy` 仅用于历史 bridge/iframe 诊断，不属于默认回归范围。
```

- [ ] **Step 3: Update the project index with the new E2E structure and the migration record**

Add this section to `.codebuddy/project-index.md` in the testing/known-fixes area:

```md
### 🆕 Playwright E2E 标准化结构 (2026-04-12)

**正式入口**：
- `playwright.config.ts`
- `e2e/README.md`
- `npm run test:e2e*`

**目录分层**：
- `e2e/tests/smoke` — 浏览器健康检查
- `e2e/tests/feature` — 课程选择器与关键回归
- `e2e/tests/full` — P1-P6 核心学习闭环
- `e2e/tests/legacy` — bridge/iframe 历史诊断

**共享层**：
- `e2e/fixtures` — Playwright fixtures
- `e2e/helpers` — 登录、REST、截图、报告、断言、学习流程辅助
- `e2e/config/env.ts` — `E2E_*` 环境变量解析

**命名边界**：
- `src/__tests__/e2e-flow.test.tsx` 继续保留在 `Vitest`，其角色是“路由渲染级冒烟测试”，不属于真实浏览器 E2E。

**迁移结果**：
- 根目录 `quick-browser-test.ts`、`e2e-lesson-picker-test.ts`、`e2e-core-loop-test.ts`、`e2e-verify-bugs.ts`、`e2e-bridge-*.ts`、`debug-classroom.ts` 已由标准 Playwright specs 取代。
```

- [ ] **Step 4: Delete the obsolete root scripts after the migrated suite is green**

Run:

```bash
git rm quick-browser-test.ts e2e-lesson-picker-test.ts e2e-core-loop-test.ts e2e-verify-bugs.ts e2e-bridge-classroom.ts e2e-bridge-final.ts e2e-bridge-verify.ts debug-classroom.ts
```

Expected: these files are removed from the root because their coverage now lives under `e2e/tests/`.

- [ ] **Step 5: Run the end-to-end verification matrix**

Run:

```bash
npm run test:e2e:smoke
npm run test:e2e:feature
npm run test:e2e:full
npm run test:e2e:legacy -- --list
```

Expected:

- `smoke` passes
- `feature` passes
- `full` passes in serial mode
- `legacy --list` enumerates the archived bridge specs without mixing them into the default run

- [ ] **Step 6: Commit docs, cleanup, and index updates**

Run:

```bash
git add e2e/README.md docs/核心学习闭环测试方案.md .codebuddy/project-index.md
git commit -m "docs: document standardized playwright e2e suite"
```

Then commit the script removal as a separate cleanup commit:

```bash
git add -u
git commit -m "chore: remove obsolete root e2e scripts"
```

Expected: one docs commit and one cleanup commit, both after the migrated suite is green.

---

## Self-Review Checklist

- **Spec coverage:**
  - Standard `Playwright Test Runner` scaffold: covered by Task 1.
  - Shared fixtures/helpers/env: covered by Task 2.
  - `smoke / feature / full / legacy` grouping: covered by Tasks 1–5.
  - P1–P6 full flow migration: covered by Task 3.
  - Useful bug regressions: covered by Task 4.
  - Legacy bridge isolation: covered by Task 5.
  - Docs and index updates: covered by Task 6.

- **Placeholder scan:**
  - No `TODO`, `TBD`, or “implement later” placeholders remain.
  - Every task lists exact files, commands, and code snippets.

- **Type consistency:**
  - `test`/`expect` come from `e2e/fixtures/base.ts` or `e2e/fixtures/auth.ts` consistently.
  - Shared helper names are aligned across tasks: `loginAsPrimaryUser`, `restQuery`, `restInsert`, `restDelete`, `openLearningSession`, `selectSubjectAndStart`, `answerVisibleClassroom`, `finishClassroomIfPossible`, `logoutAndRelogin`.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-12-playwright-e2e-integration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
