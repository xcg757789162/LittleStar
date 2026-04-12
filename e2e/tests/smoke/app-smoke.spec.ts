import { test, expect, waitForAppIdle } from '../../fixtures/base'

test.describe('app smoke', () => {
  test('打开根路由时应显示首页或登录输入框', async ({ page, gotoApp, stepShot }) => {
    await gotoApp('/')
    await waitForAppIdle(page)

    const appEntry = page.getByTestId('home-page').or(page.getByTestId('auth-username')).first()

    await expect(appEntry).toBeVisible()
    await stepShot('app-smoke-home-or-auth')
  })
})
