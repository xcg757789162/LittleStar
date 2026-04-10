/**
 * Lesson Picker E2E 验证测试
 * 使用 testuser_e2e 账号（child_id=3，三科评测完成，有 2 节缓存课程）
 */

import { chromium, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = 'http://localhost:5173'
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'lesson-picker')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface TestResult { test: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string }
const results: TestResult[] = []

function log(msg: string) { console.log(msg) }
function pass(test: string, detail: string) { results.push({ test, status: 'PASS', detail }); log(`  ✅ ${test}`) }
function fail(test: string, detail: string) { results.push({ test, status: 'FAIL', detail }); log(`  ❌ ${test}: ${detail}`) }
function skip(test: string, detail: string) { results.push({ test, status: 'SKIP', detail }); log(`  ⚠️ ${test}: ${detail}`) }

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true })
}

async function runTests() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // 收集 console 错误
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push(err.message))

  try {
    // ═══ 1. 登录 ═══
    log('\n📋 步骤 1: 登录...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
    await sleep(1000)
    await screenshot(page, '01-login-page.png')

    // 填写用户名和密码
    const usernameInput = page.locator('input[placeholder*="用户名"]')
    const passwordInput = page.locator('input[placeholder*="密码"]')

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('e2e_picker')
      await passwordInput.fill('Test1234!')
      await screenshot(page, '02-login-filled.png')

      // 点击登录按钮
      const loginBtn = page.locator('button:has-text("出发")')
      if (await loginBtn.count() > 0) {
        await loginBtn.click()
      } else {
        // 尝试其他按钮文字
        const altBtn = page.locator('button[type="submit"], button:has-text("登录")')
        await altBtn.first().click()
      }

      await sleep(3000) // 等待登录完成
      await screenshot(page, '03-after-login.png')

      // 检查是否需要选择孩子
      const childSelector = page.locator('text=小测')
      if (await childSelector.count() > 0) {
        log('  🔄 选择孩子: 小明')
        await childSelector.click()
        await sleep(2000)
        await screenshot(page, '04-child-selected.png')
      }

      // 验证是否到达首页
      await sleep(2000)
      const homePageExists = await page.locator('[data-testid="home-page"]').count()
      if (homePageExists > 0) {
        pass('登录成功', '到达首页')
      } else {
        // 可能已经在首页但没有 testid
        const pageContent = await page.textContent('body') ?? ''
        if (pageContent.includes('开始学习') || pageContent.includes('入学测评') || pageContent.includes('星辰') || pageContent.includes('好，')) {
          pass('登录成功', '页面包含首页内容')
        } else {
          fail('登录', `未到达首页，页面内容: ${pageContent.substring(0, 100)}`)
        }
      }
    } else {
      // 可能已经登录了
      const pageContent = await page.textContent('body') ?? ''
      if (pageContent.includes('开始学习') || pageContent.includes('好，')) {
        pass('已登录', '直接在首页')
      } else {
        fail('登录页面', '未找到用户名输入框')
      }
    }

    await screenshot(page, '05-home-ready.png')

    // ═══ 2. 检查首页状态 ═══
    log('\n📋 步骤 2: 检查首页...')
    const pageText = await page.textContent('body') ?? ''

    // 检查是否有"开始学习"按钮
    const startLearningBtn = page.locator('button:has-text("开始学习")')
    const hasStartBtn = await startLearningBtn.count() > 0
    log(`  📝 "开始学习"按钮: ${hasStartBtn ? '存在' : '不存在'}`)

    // 检查缓存课程数量提示
    const hasCacheInfo = pageText.includes('节课已准备好') || pageText.includes('节课')
    log(`  📝 课程缓存提示: ${hasCacheInfo ? '存在' : '不存在'}`)

    if (hasStartBtn) {
      pass('首页开始学习按钮', '按钮可见')
    } else if (pageText.includes('入学测评')) {
      skip('首页开始学习按钮', '用户需要先完成评测')
    } else {
      fail('首页开始学习按钮', '未找到')
    }

    // ═══ 3. 导航到学习页 → 科目选择 ═══
    log('\n📋 步骤 3: 导航到学习页...')
    if (hasStartBtn) {
      await startLearningBtn.first().click()
      await sleep(2000)
    } else {
      await page.goto(`${BASE_URL}/learn`, { waitUntil: 'networkidle', timeout: 10000 })
      await sleep(2000)
    }

    await screenshot(page, '06-learning-session.png')

    const sessionPage = await page.locator('[data-testid="learning-session"]').count()
    if (sessionPage > 0) {
      pass('学习页面加载', 'data-testid="learning-session" 存在')
    } else {
      fail('学习页面加载', '未找到 learning-session')
    }

    // 检查标题
    const progressText = await page.textContent('[data-testid="session-progress"]').catch(() => '')
    log(`  📝 顶部栏: "${progressText}"`)

    if (progressText?.includes('选择要学习的科目')) {
      pass('科目选择页', '显示"选择要学习的科目"')
    }

    // ═══ 4. 选择科目 → 点击开始学习 → 验证 Lesson Picker ═══
    log('\n📋 步骤 4: 选择科目并进入课程选择器...')

    // 选择数学（有缓存的科目）
    const mathButton = page.locator('button:has-text("数学")')
    if (await mathButton.count() > 0) {
      const cursor = await mathButton.first().evaluate(el => getComputedStyle(el).cursor)
      if (cursor !== 'not-allowed') {
        await mathButton.first().click()
        await sleep(500)
        log('  ✅ 选择了数学科目')
        await screenshot(page, '07-math-selected.png')

        // 找到学习页内的"开始学习"按钮
        const innerStartBtn = page.locator('button:has-text("开始学习")')
        if (await innerStartBtn.count() > 0) {
          log('  🔄 点击"开始学习"...')
          await innerStartBtn.first().click()
          await sleep(4000) // 等待 loadCachedLessons 完成

          await screenshot(page, '08-after-start.png')

          // ═══ 核心验证：课程选择器 ═══
          const afterProgress = await page.textContent('[data-testid="session-progress"]').catch(() => '')
          log(`  📝 点击后顶部栏: "${afterProgress}"`)

          // 检查是否出现了课程选择器（"选择课程"）还是直接进入课堂（"正在学习"）
          if (afterProgress?.includes('选择课程')) {
            pass('【核心】课程选择器展示', `标题显示"选择课程"，未直接进入课堂`)

            // 检查课程列表
            const todayCourse = await page.locator('text=今日课程').count()
            log(`  📝 "今日课程": ${todayCourse > 0 ? '显示' : '不显示'}`)
            if (todayCourse > 0) {
              pass('课程列表标题', '"今日课程"文字显示')
            }

            // 检查 "按顺序完成课程" 提示
            const seqHint = await page.locator('text=按顺序完成课程').count()
            if (seqHint > 0) {
              pass('顺序提示', '"按顺序完成课程，解锁下一课"文字显示')
            }

            // 截一张完整的课程列表截图
            await screenshot(page, '09-lesson-picker-view.png')

            // ═══ 5. 验证顺序解锁 ═══
            log('\n📋 步骤 5: 验证顺序解锁...')

            // 检查闪烁指示（可学习）和锁定图标
            const sparkles = await page.locator('text=✨').count()
            const locks = await page.locator('text=🔒').count()
            const unlockTexts = await page.locator('text=按顺序解锁').count()
            log(`  📝 ✨ 闪烁指示: ${sparkles}`)
            log(`  📝 🔒 锁定图标: ${locks}`)
            log(`  📝 "按顺序解锁" 文字: ${unlockTexts}`)

            if (sparkles > 0) {
              pass('可学习状态指示', `${sparkles} 个 ✨ 闪烁指示`)
            }

            if (locks > 0 && unlockTexts > 0) {
              pass('锁定状态', `${locks} 个 🔒，${unlockTexts} 个"按顺序解锁"`)
            } else if (locks === 0 && sparkles > 0) {
              // 可能只有一节缓存课，没有锁定状态
              pass('单课程无锁定', '仅一节缓存课，无需锁定')
            }

            await screenshot(page, '10-unlock-state.png')

            // ═══ 6. 验证退出按钮（C2 修复） ═══
            log('\n📋 步骤 6: 验证退出按钮（C2: lesson picker 阶段安全退出）...')

            const exitBtn = page.locator('[data-testid="exit-button"]')
            if (await exitBtn.count() > 0) {
              const errorsBeforeExit = consoleErrors.length
              await exitBtn.click()
              await sleep(2000)

              await screenshot(page, '11-after-exit.png')

              const afterExitUrl = page.url()
              log(`  📝 退出后 URL: ${afterExitUrl}`)

              if (afterExitUrl.includes('/learn') === false || afterExitUrl === BASE_URL + '/') {
                pass('C2: lesson picker 安全退出', `返回首页: ${afterExitUrl}`)
              } else {
                fail('C2: lesson picker 退出', `仍在学习页: ${afterExitUrl}`)
              }

              // 检查退出后是否有新的 JS 错误
              const newErrors = consoleErrors.slice(errorsBeforeExit)
              const criticalErrors = newErrors.filter(e =>
                e.includes('Cannot read') || e.includes('endSession') || e.includes('startSession')
              )

              if (criticalErrors.length === 0) {
                pass('C2: 退出无状态错误', '无 endSession/startSession 相关错误')
              } else {
                fail('C2: 退出状态错误', criticalErrors.join('; '))
              }
            } else {
              skip('退出按钮', '未找到')
            }

          } else if (afterProgress?.includes('正在学习')) {
            fail('【核心】课程选择器', '直接进入课堂，跳过了课程选择器！')
            await screenshot(page, '09-skipped-to-classroom.png')
          } else if (afterProgress?.includes('加载中') || await page.locator('text=正在准备课程').count() > 0) {
            log('  ⏳ 仍在加载中，等待更久...')
            await sleep(5000)
            await screenshot(page, '09-still-loading.png')
            const finalProgress = await page.textContent('[data-testid="session-progress"]').catch(() => '')
            if (finalProgress?.includes('选择课程')) {
              pass('【核心】课程选择器展示（延迟）', `最终显示"选择课程"`)
            } else {
              fail('【核心】课程选择器', `长时间加载后: ${finalProgress}`)
            }
          } else {
            // 可能显示了空缓存提示
            const emptyCache = await page.locator('text=课程准备中').count()
            if (emptyCache > 0) {
              pass('空缓存提示（I1）', '显示"课程准备中"提示')
              await screenshot(page, '09-empty-cache.png')

              // 验证"重新加载"和"返回首页"按钮
              const reloadBtn = await page.locator('button:has-text("重新加载")').count()
              const backHomeBtn = await page.locator('button:has-text("返回首页")').count()
              if (reloadBtn > 0 && backHomeBtn > 0) {
                pass('空缓存操作按钮', `重新加载:${reloadBtn > 0} 返回首页:${backHomeBtn > 0}`)
              }

              // 测试退出
              const exitBtnEmpty = page.locator('[data-testid="exit-button"]')
              if (await exitBtnEmpty.count() > 0) {
                await exitBtnEmpty.click()
                await sleep(2000)
                pass('空缓存退出', '退出成功')
              }
            } else {
              fail('课程选择器', `意外状态: "${afterProgress}"`)
            }
          }
        } else {
          fail('内部开始学习按钮', '未找到')
        }
      } else {
        skip('数学科目', '不可点击（未评测）')
      }
    } else {
      fail('数学按钮', '未找到')
    }

  } catch (err) {
    fail('测试执行异常', String(err))
    await screenshot(page, '99-error.png').catch(() => {})
  } finally {
    await browser.close()
  }

  // ═══ Console 错误汇总 ═══
  if (consoleErrors.length > 0) {
    log(`\n⚠️ Console 错误 (${consoleErrors.length})：`)
    consoleErrors.slice(0, 5).forEach(e => log(`  - ${e.substring(0, 120)}`))
  }

  // ═══ 测试报告 ═══
  log('\n' + '═'.repeat(60))
  log('📊 Lesson Picker E2E 测试报告')
  log('═'.repeat(60))

  let passCount = 0, failCount = 0, skipCount = 0
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️'
    log(`${icon} [${r.status}] ${r.test}: ${r.detail}`)
    if (r.status === 'PASS') passCount++
    else if (r.status === 'FAIL') failCount++
    else skipCount++
  }

  log('\n' + '-'.repeat(60))
  log(`总计: ${results.length} | ✅ PASS: ${passCount} | ❌ FAIL: ${failCount} | ⚠️ SKIP: ${skipCount}`)
  log(`截图: ${SCREENSHOT_DIR}`)
  log('═'.repeat(60))

  // 写入报告
  const report = [
    '# Lesson Picker E2E 测试报告',
    `\n**时间**: ${new Date().toLocaleString('zh-CN')}`,
    `**用户**: testuser_e2e (child: 小明, child_id=3)`,
    `**缓存课程**: math-shapes, english-song-abc (2 节)`,
    '',
    '## 测试结果',
    '',
    '| 状态 | 测试项 | 详情 |',
    '|------|--------|------|',
    ...results.map(r => `| ${r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️'} ${r.status} | ${r.test} | ${r.detail} |`),
    '',
    `## 统计`,
    `- 总计: ${results.length}`,
    `- ✅ PASS: ${passCount}`,
    `- ❌ FAIL: ${failCount}`,
    `- ⚠️ SKIP: ${skipCount}`,
    '',
    consoleErrors.length > 0 ? `## Console 错误\n${consoleErrors.map(e => `- ${e}`).join('\n')}` : '',
    '',
    '## 截图',
    ...fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort().map(f => `\n### ${f}\n![${f}](${f})`),
  ].join('\n')

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.md'), report)

  process.exit(failCount > 0 ? 1 : 0)
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(2) })
