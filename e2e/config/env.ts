import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

const envFiles = ['.env.e2e', '.env.e2e.local']
for (const file of envFiles) {
  const fullPath = resolve(process.cwd(), file)
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true })
  }
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
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

function resolveFromBase(baseURL: string, pathname: string) {
  return new URL(pathname, `${baseURL}/`).toString()
}

const baseURL = trimToUndefined(process.env.E2E_BASE_URL) ?? 'http://127.0.0.1:5173'

export const e2eEnv = {
  baseURL,
  authApiURL: trimToUndefined(process.env.E2E_AUTH_API_URL) ?? resolveFromBase(baseURL, '/api/auth'),
  restApiURL: trimToUndefined(process.env.E2E_REST_API_URL) ?? resolveFromBase(baseURL, '/api/rest'),
  headless: parseBoolean(process.env.E2E_HEADLESS, true),
  useApiLogin: parseBoolean(process.env.E2E_USE_API_LOGIN, false),
  workers: parseNumber(process.env.E2E_WORKERS, 1),
  primaryUser: {
    username: trimToUndefined(process.env.E2E_TEST_USERNAME) ?? 'testuser_e2e',
    password: trimToUndefined(process.env.E2E_TEST_PASSWORD) ?? 'Test1234',
  },
  pickerUser: {
    username: trimToUndefined(process.env.E2E_PICKER_USERNAME) ?? 'e2e_picker',
    password: trimToUndefined(process.env.E2E_PICKER_PASSWORD) ?? 'Test1234!',
  },
} as const

export type E2EEnv = typeof e2eEnv
