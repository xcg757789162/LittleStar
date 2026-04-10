import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // 获取 token
  const loginResp = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser_e2e', password: 'Test1234' }),
  })
  const loginData = await loginResp.json()
  const token = loginData.token
  console.log('=== Got token:', token.substring(0, 30) + '...')

  // 注入 token
  await page.goto('http://localhost:5173')
  await page.evaluate((t: string) => {
    localStorage.setItem('littlestar_jwt_token', t)
  }, token)
  await page.goto('http://localhost:5173')
  await page.waitForTimeout(3000)
  console.log('=== After login URL:', page.url())

  // 收集请求
  const failedRequests: string[] = []
  const allRequests: { url: string; status: number; type: string }[] = []
  
  page.on('response', (res) => {
    allRequests.push({ url: res.url(), status: res.status(), type: res.request().resourceType() })
    if (res.status() >= 400) {
      failedRequests.push(`[${res.status()}] [${res.request().resourceType()}] ${res.url()}`)
    }
  })

  const consoleMsgs: string[] = []
  page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`))

  // 导航到学习页面
  await page.goto('http://localhost:5173/learn')
  await page.waitForTimeout(2000)

  // 选数学
  const mathBtn = page.locator('button:has-text("数学")')
  if (await mathBtn.count() > 0) {
    await mathBtn.first().click()
    await page.waitForTimeout(500)
  }

  // 开始学习
  const startBtn = page.locator('button:has-text("开始学习")')
  if (await startBtn.count() > 0) {
    await startBtn.first().click()
    console.log('=== Clicked start')
    await page.waitForTimeout(5000)
  }

  await page.screenshot({ path: 'test-screenshots/verify-01-loading.png' })

  // 等 iframe 加载
  await page.waitForTimeout(15000)
  await page.screenshot({ path: 'test-screenshots/verify-02-classroom.png', fullPage: true })

  // 检查 iframe
  const iframeEl = page.locator('iframe')
  const iframeCount = await iframeEl.count()
  console.log('\n=== IFRAME VERIFICATION ===')
  console.log('iframe count:', iframeCount)
  
  if (iframeCount > 0) {
    const box = await iframeEl.first().boundingBox()
    const sandbox = await iframeEl.first().getAttribute('sandbox')
    const allow = await iframeEl.first().getAttribute('allow')
    const src = await iframeEl.first().getAttribute('src')
    console.log('src:', src)
    console.log('box:', JSON.stringify(box))
    console.log('sandbox:', sandbox)
    console.log('allow:', allow)
    
    // 检查 iframe 尺寸（问题 1 验证）
    if (box) {
      const viewportRatio = (box.width * box.height) / (1280 * 900)
      console.log(`\n=== SIZE CHECK ===`)
      console.log(`iframe: ${box.width}x${box.height}`)
      console.log(`viewport: 1280x900`)
      console.log(`ratio: ${(viewportRatio * 100).toFixed(1)}%`)
      console.log(viewportRatio > 0.8 ? '✅ iframe 占比 > 80%' : '❌ iframe 占比 < 80%')
    }

    // 检查 sandbox 权限（问题 2 验证）
    console.log(`\n=== SANDBOX CHECK ===`)
    console.log(sandbox?.includes('allow-popups-to-escape-sandbox') ? '✅ allow-popups-to-escape-sandbox' : '❌ missing allow-popups-to-escape-sandbox')
    console.log(allow?.includes('autoplay') ? '✅ autoplay allowed' : '❌ autoplay NOT allowed')

    // 检查 iframe 内容（问题 3 验证）
    const frames = page.frames()
    const iframeFrame = frames.find(f => f.url().includes('8080') || f.url().includes('openmaic'))
    if (iframeFrame) {
      console.log('\n=== CONTENT CHECK ===')
      console.log('iframe URL:', iframeFrame.url())
      
      const imgCount = await iframeFrame.locator('img').count()
      const audioCount = await iframeFrame.locator('audio, video').count()
      const canvasCount = await iframeFrame.locator('canvas').count()
      const bodyText = await iframeFrame.locator('body').textContent()
      
      console.log('img elements:', imgCount)
      console.log('audio/video elements:', audioCount)
      console.log('canvas elements:', canvasCount)
      
      const hasGenerationDisabled = bodyText?.includes('Generation disabled') || bodyText?.includes('disabled in settings')
      console.log(hasGenerationDisabled ? '❌ Still shows "Generation disabled"' : '✅ No "Generation disabled" message')
      console.log('body text (first 300):', bodyText?.substring(0, 300))
    }
  }

  // 打印失败请求
  console.log('\n=== FAILED REQUESTS ===')
  failedRequests.forEach(r => console.log(r))

  // 相关控制台消息
  console.log('\n=== KEY CONSOLE MESSAGES ===')
  consoleMsgs
    .filter(m => 
      m.toLowerCase().includes('audio') || m.toLowerCase().includes('autoplay') || 
      m.toLowerCase().includes('error') || m.toLowerCase().includes('generation') ||
      m.toLowerCase().includes('disabled') || m.toLowerCase().includes('image')
    )
    .forEach(m => console.log(m))

  await browser.close()
}

main().catch(console.error)
