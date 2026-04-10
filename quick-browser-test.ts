import { chromium } from 'playwright'

async function main() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  console.log('Browser launched')
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  console.log('Navigating to http://localhost:5173 ...')
  await page.goto('http://localhost:5173', { timeout: 10000 })
  console.log('Page URL:', page.url())
  const title = await page.title()
  console.log('Page title:', title)
  const hasHomePage = await page.locator('[data-testid="home-page"]').count()
  console.log('Has home-page testid:', hasHomePage)
  await page.screenshot({ path: 'test-screenshots/lesson-picker/00-quick-test.png', fullPage: true })
  console.log('Screenshot saved')
  await browser.close()
  console.log('Done')
}

main().catch(e => { console.error(e); process.exit(1) })
