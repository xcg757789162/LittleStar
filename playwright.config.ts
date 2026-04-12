import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/config/env'

function resolveDevServerCommand(baseURL: string) {
  const url = new URL(baseURL)
  const host = url.hostname || '127.0.0.1'
  const port = url.port || '5173'

  return `npm run dev -- --host ${host} --port ${port} --strictPort`
}

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  workers: e2eEnv.workers,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: e2eEnv.baseURL,
    headless: e2eEnv.headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: {
      width: 1280,
      height: 800,
    },
  },
  webServer: {
    command: resolveDevServerCommand(e2eEnv.baseURL),
    url: e2eEnv.baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
