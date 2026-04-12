import type { APIRequestContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { TOKEN_STORAGE_KEY } from '../../src/services/api/types'
import type { E2EEnv } from '../config/env'
import type { E2ECredentials } from '../fixtures/data'
import { authLogin } from './api'

export async function clearAuthState(page: Page) {
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey)
  }, TOKEN_STORAGE_KEY)
}

export async function primeAuthToken(page: Page, token: string) {
  await page.addInitScript(
    ({ storageKey, nextToken }) => {
      window.localStorage.setItem(storageKey, nextToken)
    },
    { storageKey: TOKEN_STORAGE_KEY, nextToken: token },
  )
}

export async function loginViaApi(
  request: APIRequestContext,
  env: E2EEnv,
  credentials: Pick<E2ECredentials, 'username' | 'password'>,
) {
  return authLogin(request, env, credentials)
}

export async function loginThroughUi(page: Page, credentials: Pick<E2ECredentials, 'username' | 'password'>) {
  await expect(page.getByTestId('auth-username')).toBeVisible()
  await page.getByTestId('auth-username').fill(credentials.username)
  await page.getByTestId('auth-password').fill(credentials.password)
  await page.getByTestId('auth-submit-btn').click()
}
