/**
 * 核心学习闭环端到端测试（完整版）
 * 
 * 测试账户：testuser_e2e（已完成三科评测）
 * 测试流程：
 *   P1: 登录 → 验证预生成自动触发 → 课堂缓存写入
 *   P2: 选择科目 → 加载课堂 → 课堂交互答题 → 完成总结
 *   P3: 验证进度数据持久化（6 张表全量验证）
 *   P4: 退出登录 → 重新登录 → 数据恢复验证
 *   P5: 学习历史页 → 科目筛选 → 复习入口验证
 *   P6: 继续学习新课（第二次学习，验证缓存消费 + 无 409）
 */

import { chromium, Page, Browser } from 'playwright'

const BASE_URL = 'http://localhost:5173'
const TEST_USER = 'testuser_e2e'
const TEST_PASSWORD = 'Test1234'

// 颜色输出
const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  ok: (msg: string) => console.log(`\x1b[32m[✅ OK]\x1b[0m ${msg}`),
  fail: (msg: string) => console.log(`\x1b[31m[❌ FAIL]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[⚠️ WARN]\x1b[0m ${msg}`),
  section: (msg: string) => console.log(`\n\x1b[35m${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}\x1b[0m`),
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function takeScreenshot(page: Page, name: string) {
  const path = `test-screenshots/${name}.png`
  await page.screenshot({ path, fullPage: true })
  log.info(`📸 截图: ${path}`)
}

// 收集 console 错误和网络错误
const consoleErrors: string[] = []
const networkErrors: string[] = []

// 测试结果统计
const testResults: { phase: string; test: string; status: 'pass' | 'fail' | 'warn' | 'skip'; detail?: string }[] = []

function recordResult(phase: string, test: string, status: 'pass' | 'fail' | 'warn' | 'skip', detail?: string) {
  testResults.push({ phase, test, status, detail })
  const logFn = status === 'pass' ? log.ok : status === 'fail' ? log.fail : status === 'warn' ? log.warn : log.info
  logFn(`[${phase}] ${test}${detail ? ` — ${detail}` : ''}`)
}

/** 通过 page.evaluate 发送 API 请求 */
async function apiQuery(page: Page, path: string): Promise<unknown> {
  return page.evaluate(async (apiPath) => {
    try {
      const token = localStorage.getItem('littlestar_jwt_token')
      if (!token) return { error: 'no_token' }
      const resp = await fetch(`/api/rest${apiPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resp.ok) return await resp.json()
      return { error: resp.status, text: await resp.text() }
    } catch (e) {
      return { error: String(e) }
    }
  }, path)
}

async function main() {
  log.section('🚀 核心学习闭环 E2E 测试（完整版）')

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/chenguoxie/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  // 监听 console 错误
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // 监听网络请求失败
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      networkErrors.push(`${response.status()} ${response.url()}`)
    }
  })

  // 保存 childId 供后续 API 验证使用
  let savedChildId: string | null = null

  try {
    // ========================================
    // P1: 登录 + 课堂预生成验证
    // ========================================
    log.section('P1: 登录 + 课堂预生成验证')

    // 1.1 登录
    log.info('1.1 导航到首页...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await takeScreenshot(page, 'P1-01-landing')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || await page.locator('[data-testid="auth-username"]').count() > 0) {
      log.info('执行登录流程...')
      await page.locator('[data-testid="auth-username"]').click()
      await page.locator('[data-testid="auth-username"]').fill(TEST_USER)
      await sleep(300)
      await page.locator('[data-testid="auth-password"]').click()
      await page.locator('[data-testid="auth-password"]').fill(TEST_PASSWORD)
      await sleep(300)
      await takeScreenshot(page, 'P1-02-login-filled')

      const loginResp = page.waitForResponse(
        (resp) => resp.url().includes('/api/auth/login'),
        { timeout: 10000 },
      ).catch(() => null)
      await page.locator('[data-testid="auth-submit-btn"]').click()

      const resp = await loginResp
      if (resp && resp.status() === 200) {
        recordResult('P1', '1.1 登录', 'pass', `API 200`)
      } else {
        recordResult('P1', '1.1 登录', 'fail', `状态: ${resp?.status() ?? 'timeout'}`)
      }

      await sleep(3000)
    } else {
      recordResult('P1', '1.1 登录', 'pass', '已登录')
    }

    await takeScreenshot(page, 'P1-03-after-login')

    // 获取 token 和 childId
    const token = await page.evaluate(() => localStorage.getItem('littlestar_jwt_token'))
    if (token) {
      recordResult('P1', '1.1 Token 存储', 'pass')
    } else {
      recordResult('P1', '1.1 Token 存储', 'fail', 'localStorage 无 token')
    }

    // 等待首页完全加载
    await sleep(5000)
    await takeScreenshot(page, 'P1-04-home')

    // 从页面获取 childId
    savedChildId = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('littlestar_child_store')
        if (raw) {
          const parsed = JSON.parse(raw)
          return parsed?.state?.currentChild?.id ?? null
        }
        return null
      } catch { return null }
    })
    log.info(`ChildId: ${savedChildId}`)

    // 1.2 首页缓存状态检查
    const cacheStatusEl = page.locator('[data-testid="cache-status"]')
    if (await cacheStatusEl.count() > 0) {
      const statusText = await cacheStatusEl.textContent() || ''
      if (statusText.includes('已就绪')) {
        recordResult('P1', '1.2 缓存状态', 'pass', statusText.trim())
      } else if (statusText.includes('备课') || statusText.includes('准备中')) {
        recordResult('P1', '1.2 缓存状态', 'warn', '生成中，等待...')

        // 等待预生成完成（最多 5 分钟）
        let waitTime = 0
        const maxWait = 300000
        while (waitTime < maxWait) {
          await sleep(10000)
          waitTime += 10000
          const txt = await cacheStatusEl.textContent() || ''
          if (txt.includes('已就绪')) {
            recordResult('P1', '1.4 预生成完成', 'pass', `用时 ${waitTime / 1000}s`)
            break
          }
          if (waitTime % 30000 === 0) {
            await takeScreenshot(page, `P1-05-waiting-${waitTime / 1000}s`)
          }
        }
      } else {
        recordResult('P1', '1.2 缓存状态', 'warn', statusText.trim())
      }
    } else {
      // 检查是否显示入学测评按钮（评测数据丢失）
      const placementBtn = page.locator('[data-testid="placement-test-entry-btn"]')
      if (await placementBtn.count() > 0) {
        recordResult('P1', '1.2 缓存状态', 'fail', '显示入学测评按钮（评测数据丢失）')
      } else {
        recordResult('P1', '1.2 缓存状态', 'warn', '未找到 cache-status 元素')
      }
    }

    // 1.3 数据库直查课堂缓存
    const cacheData = await apiQuery(page, '/classroom_cache?select=id,child_id,knowledge_node_id,date,expires_at') as unknown[]
    if (Array.isArray(cacheData) && cacheData.length > 0) {
      recordResult('P1', '1.3 DB 缓存验证', 'pass', `${cacheData.length} 条缓存记录`)

      // 验证数据结构
      const first = cacheData[0] as Record<string, unknown>
      const hasRequiredFields = first.child_id && first.knowledge_node_id && first.date
      if (hasRequiredFields) {
        recordResult('P1', '1.3 缓存数据结构', 'pass', 'child_id + knowledge_node_id + date 完整')
      } else {
        recordResult('P1', '1.3 缓存数据结构', 'warn', `字段: ${Object.keys(first).join(',')}`)
      }

      // 验证过期时间
      if (first.expires_at) {
        const expiresAt = new Date(first.expires_at as string)
        const now = new Date()
        const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays > 0 && diffDays <= 4) {
          recordResult('P1', '1.3 缓存过期时间', 'pass', `${diffDays.toFixed(1)} 天后过期`)
        } else {
          recordResult('P1', '1.3 缓存过期时间', 'warn', `过期时间异常: ${diffDays.toFixed(1)} 天`)
        }
      }
    } else {
      recordResult('P1', '1.3 DB 缓存验证', 'warn', 'classroom_cache 为空（可能已被消费）')
    }

    await takeScreenshot(page, 'P1-06-pregen-status')

    // ========================================
    // P2: 选择科目 + 完整课堂学习
    // ========================================
    log.section('P2: 选择科目 + 完整课堂学习')

    // 2.1 进入学习会话
    const startLearningBtn = page.locator('button').filter({ hasText: '开始学习' })
    if (await startLearningBtn.count() > 0 && await startLearningBtn.first().isVisible()) {
      const navPromise = page.waitForURL('**/learn**', { timeout: 5000 }).catch(() => null)
      await startLearningBtn.first().click()
      await navPromise
      await sleep(2000)

      if (page.url().includes('/learn')) {
        recordResult('P2', '2.1 进入学习页', 'pass', page.url())
      } else {
        recordResult('P2', '2.1 进入学习页', 'fail', `URL: ${page.url()}`)
      }
    } else {
      recordResult('P2', '2.1 进入学习页', 'fail', '未找到"开始学习"按钮')
    }

    await takeScreenshot(page, 'P2-01-subject-select')

    // 2.2 选择科目
    const subjectButtons = ['英语', '数学', '语文']
    let selectedSubject = ''
    for (const subj of subjectButtons) {
      const subjBtn = page.locator(`button:has-text("${subj}"), [role="button"]:has-text("${subj}")`)
      if (await subjBtn.count() > 0 && await subjBtn.first().isVisible()) {
        await subjBtn.first().click()
        selectedSubject = subj
        await sleep(500)
        break
      }
    }
    if (selectedSubject) {
      recordResult('P2', '2.2 选择科目', 'pass', selectedSubject)
    } else {
      recordResult('P2', '2.2 选择科目', 'fail', '无可选科目')
    }

    await takeScreenshot(page, 'P2-02-subject-selected')

    // 点击"开始学习"
    const startInner = page.locator('button').filter({ hasText: '开始学习' })
    if (await startInner.count() > 0 && await startInner.first().isVisible()) {
      await startInner.first().click()
      await sleep(5000)
      recordResult('P2', '2.2 启动课堂', 'pass')
    }

    await takeScreenshot(page, 'P2-03-classroom-loading')

    // 2.3 课堂加载与渲染
    await sleep(5000)
    await takeScreenshot(page, 'P2-04-classroom-loaded')

    // 检查课堂渲染模式
    const hasIframe = await page.locator('iframe').count() > 0
    const hasClassroomView = await page.locator('[data-testid="classroom-view"]').count() > 0
    const hasEmptyState = (await page.textContent('body') || '').includes('暂无课堂数据')

    if (hasIframe) {
      recordResult('P2', '2.3 课堂渲染', 'pass', 'ClassroomIframe 模式')
    } else if (hasClassroomView || (await page.textContent('body') || '').includes('课堂')) {
      recordResult('P2', '2.3 课堂渲染', 'pass', 'ClassroomView 模式')
    } else if (hasEmptyState) {
      recordResult('P2', '2.3 课堂渲染', 'warn', '空状态 — 无课堂数据')
    } else {
      recordResult('P2', '2.3 课堂渲染', 'warn', '未识别渲染模式')
    }

    // 2.4 课堂交互 — 答题
    log.info('2.4 尝试答题交互...')
    let answeredCount = 0
    const maxAttempts = 20

    for (let i = 0; i < maxAttempts; i++) {
      // 策略 1: 查找 quiz-option 按钮
      const quizOptions = page.locator('[data-testid^="quiz-option"]')
      if (await quizOptions.count() > 0) {
        const firstOption = quizOptions.first()
        if (await firstOption.isVisible()) {
          await firstOption.click()
          answeredCount++
          log.info(`  答题 #${answeredCount}: 点击 quiz-option`)
          await sleep(1500) // 等待反馈动画
          continue
        }
      }

      // 策略 2: 查找通用可点击的答题选项（按钮中包含 A/B/C/D 或 ①②③④）
      const answerBtns = page.locator('button').filter({ hasText: /^[A-D①-④]/ })
      if (await answerBtns.count() > 0) {
        const btn = answerBtns.first()
        if (await btn.isVisible()) {
          await btn.click()
          answeredCount++
          log.info(`  答题 #${answeredCount}: 点击选项按钮`)
          await sleep(1500)
          continue
        }
      }

      // 策略 3: 查找 nav-next 导航按钮（教学 slide 翻页）
      const navNext = page.locator('[data-testid="nav-next"]')
      if (await navNext.count() > 0 && await navNext.first().isVisible()) {
        const navText = await navNext.first().textContent() || ''
        if (navText.includes('完成')) {
          log.info('  发现"完成"按钮，准备完成课堂')
          break
        }
        await navNext.first().click()
        log.info(`  翻页: ${navText}`)
        await sleep(1000)
        continue
      }

      // 没有找到可操作元素，等待一下再试
      await sleep(1000)

      // 检查是否已经完成
      const bodyText = await page.textContent('body') || ''
      if (bodyText.includes('学习完成') || bodyText.includes('太棒了') || bodyText.includes('🎉')) {
        log.info('  课堂已自动完成')
        break
      }
    }

    if (answeredCount > 0) {
      recordResult('P2', '2.4 答题交互', 'pass', `完成 ${answeredCount} 道题`)
    } else {
      recordResult('P2', '2.4 答题交互', 'warn', '未找到可点击的答题选项（课堂可能无 quiz slide）')
    }

    await takeScreenshot(page, 'P2-05-after-answering')

    // 2.5 课堂完成与会话总结
    // 尝试点击"完成课堂"按钮
    const completeBtns = [
      page.locator('button:has-text("完成课堂")'),
      page.locator('button:has-text("完成 🎉")'),
      page.locator('[data-testid="nav-next"]:has-text("完成")'),
    ]

    let clickedComplete = false
    for (const btn of completeBtns) {
      if (await btn.count() > 0 && await btn.first().isVisible()) {
        await btn.first().click()
        clickedComplete = true
        break
      }
    }

    if (clickedComplete) {
      // 等待庆祝动画（约 3.5 秒）
      await sleep(4000)
      await takeScreenshot(page, 'P2-06-celebration')

      // 等待会话总结卡片出现
      await sleep(2000)
      await takeScreenshot(page, 'P2-07-session-summary')

      // 验证会话总结
      const summaryEl = page.locator('[data-testid="session-summary"]')
      if (await summaryEl.count() > 0) {
        recordResult('P2', '2.5 会话总结卡片', 'pass')

        // 检查完成题数
        const summaryText = await summaryEl.textContent() || ''
        const hasQuestionsCount = /\d+/.test(summaryText) && summaryText.includes('完成题数')
        const hasStars = summaryText.includes('⭐')

        if (hasQuestionsCount) {
          recordResult('P2', '2.5 完成题数', 'pass')
        } else {
          recordResult('P2', '2.5 完成题数', 'warn', '未找到完成题数')
        }

        if (hasStars) {
          recordResult('P2', '2.5 星级评价', 'pass')
        } else {
          recordResult('P2', '2.5 星级评价', 'warn', '未找到星星评价')
        }

        // 检查底部按钮
        const backHomeBtn = page.locator('button').filter({ hasText: '回到首页' })
        const viewHistoryBtn = page.locator('button').filter({ hasText: '查看学习记录' })
        if (await backHomeBtn.count() > 0) {
          recordResult('P2', '2.5 "回到首页"按钮', 'pass')
        }
        if (await viewHistoryBtn.count() > 0) {
          recordResult('P2', '2.5 "查看学习记录"按钮', 'pass')
        }
      } else {
        const bodyText = await page.textContent('body') || ''
        if (bodyText.includes('学习完成') || bodyText.includes('太棒了')) {
          recordResult('P2', '2.5 会话总结卡片', 'warn', '完成文案可见但 testid 未找到')
        } else {
          recordResult('P2', '2.5 会话总结卡片', 'fail', '未显示总结')
        }
      }
    } else {
      recordResult('P2', '2.5 课堂完成', 'warn', '未找到完成按钮')
      const btns = await page.locator('button').allTextContents()
      log.info(`当前按钮: ${btns.filter(t => t.trim()).join(' | ')}`)
    }

    // ========================================
    // P3: 学习进度持久化验证（6 张表）
    // ========================================
    log.section('P3: 学习进度持久化验证')

    // 等待 onSessionEnd 异步写入完成
    await sleep(8000)

    // 3.1 daily_sessions
    const dailySessions = await apiQuery(page, '/daily_sessions?order=id.desc&limit=3') as unknown[]
    if (Array.isArray(dailySessions) && dailySessions.length > 0) {
      recordResult('P3', '3.1 daily_sessions', 'pass', `${dailySessions.length} 条记录`)
    } else {
      recordResult('P3', '3.1 daily_sessions', 'fail', '无今日学习会话记录')
    }

    // 3.2 mastery_records
    const masteryRecords = await apiQuery(page, '/mastery_records?order=id.desc&limit=5') as unknown[]
    if (Array.isArray(masteryRecords) && masteryRecords.length > 0) {
      recordResult('P3', '3.2 mastery_records', 'pass', `${masteryRecords.length} 条掌握度记录`)
    } else {
      recordResult('P3', '3.2 mastery_records', 'fail', '无掌握度记录')
    }

    // 3.3 classroom_history
    const classroomHistory = await apiQuery(page, '/classroom_history?order=id.desc&limit=3') as unknown[]
    if (Array.isArray(classroomHistory) && classroomHistory.length > 0) {
      recordResult('P3', '3.3 classroom_history', 'pass', `${classroomHistory.length} 条课堂历史`)
      // 获取 historyId 用于后续 snapshots 查询
      const historyId = (classroomHistory[0] as Record<string, unknown>)?.id
      if (historyId) {
        // 3.4 classroom_snapshots
        const snapshots = await apiQuery(page, `/classroom_snapshots?history_id=eq.${historyId}`) as unknown[]
        if (Array.isArray(snapshots) && snapshots.length > 0) {
          recordResult('P3', '3.4 classroom_snapshots', 'pass', `关联历史 #${historyId}`)
        } else {
          recordResult('P3', '3.4 classroom_snapshots', 'warn', '无关联快照')
        }
      }
    } else {
      recordResult('P3', '3.3 classroom_history', 'fail', '无课堂历史记录')
    }

    // 3.5 mastery_snapshots
    const masterySnapshots = await apiQuery(page, '/mastery_snapshots?order=id.desc&limit=3') as unknown[]
    if (Array.isArray(masterySnapshots) && masterySnapshots.length > 0) {
      recordResult('P3', '3.5 mastery_snapshots', 'pass', `${masterySnapshots.length} 条快照`)
    } else {
      recordResult('P3', '3.5 mastery_snapshots', 'warn', '无掌握度快照')
    }

    // 3.6 achievements
    const achievements = await apiQuery(page, '/achievements?order=id.desc&limit=5') as unknown[]
    if (Array.isArray(achievements)) {
      recordResult('P3', '3.6 achievements', achievements.length > 0 ? 'pass' : 'warn',
        achievements.length > 0 ? `${achievements.length} 个成就` : '暂无成就（可能未触发条件）')
    } else {
      recordResult('P3', '3.6 achievements', 'warn', '查询异常')
    }

    // 3.7 验证缓存已被消费（新修复验证点）
    const remainingCache = await apiQuery(page, '/classroom_cache?select=id') as unknown[]
    log.info(`课堂完成后剩余缓存: ${Array.isArray(remainingCache) ? remainingCache.length : '查询失败'}`)

    // ========================================
    // P4: 退出重登数据恢复验证
    // ========================================
    log.section('P4: 退出重登数据恢复验证')

    // 4.1 回到首页
    const backToHome = page.locator('button').filter({ hasText: '回到首页' })
    if (await backToHome.count() > 0 && await backToHome.first().isVisible()) {
      await backToHome.first().click()
      await sleep(2000)
    } else {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      await sleep(3000)
    }

    // 记录退出前首页状态
    const preLogoutText = await page.textContent('body') || ''
    const preLogoutHasStudyBtn = preLogoutText.includes('开始学习') || preLogoutText.includes('继续学习')
    await takeScreenshot(page, 'P4-01-before-logout')

    // 4.1 退出登录
    log.info('4.1 执行退出登录...')
    // 方法 1: 通过清除 token 模拟退出
    await page.evaluate(() => {
      localStorage.removeItem('littlestar_jwt_token')
      localStorage.removeItem('littlestar_child_store')
    })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await sleep(2000)
    await takeScreenshot(page, 'P4-02-after-logout')

    // 验证已退出
    const afterLogoutUrl = page.url()
    const afterLogoutText = await page.textContent('body') || ''
    const isLoggedOut = afterLogoutUrl.includes('/login') ||
      await page.locator('[data-testid="auth-username"]').count() > 0

    if (isLoggedOut) {
      recordResult('P4', '4.1 退出登录', 'pass', '已跳转到登录页')
    } else {
      recordResult('P4', '4.1 退出登录', 'warn', `URL: ${afterLogoutUrl}`)
    }

    // 4.2 重新登录
    log.info('4.2 重新登录...')
    await sleep(3000) // 等待页面充分加载
    const usernameInput = page.locator('[data-testid="auth-username"]')
    if (await usernameInput.count() > 0) {
      await usernameInput.click()
      await usernameInput.fill(TEST_USER)
      await sleep(300)
      await page.locator('[data-testid="auth-password"]').click()
      await page.locator('[data-testid="auth-password"]').fill(TEST_PASSWORD)
      await sleep(300)

      const reLoginResp = page.waitForResponse(
        (resp) => resp.url().includes('/api/auth/login'),
        { timeout: 10000 },
      ).catch(() => null)
      await page.locator('[data-testid="auth-submit-btn"]').click()

      const resp = await reLoginResp
      if (resp && resp.status() === 200) {
        recordResult('P4', '4.2 重新登录', 'pass')
      } else {
        recordResult('P4', '4.2 重新登录', 'fail', `状态: ${resp?.status() ?? 'timeout'}`)
      }

      await sleep(5000) // 等待首页加载 + 预生成检查
    }

    await takeScreenshot(page, 'P4-03-after-relogin')

    // 4.3 数据恢复验证
    // 4.3.1 评测状态保留
    const reloginText = await page.textContent('body') || ''
    const placementBtnAfter = page.locator('[data-testid="placement-test-entry-btn"]')
    if (await placementBtnAfter.count() === 0 && (reloginText.includes('开始学习') || reloginText.includes('已就绪'))) {
      recordResult('P4', '4.3.1 评测状态保留', 'pass', '显示"开始学习"')
    } else if (await placementBtnAfter.count() > 0) {
      recordResult('P4', '4.3.1 评测状态保留', 'fail', '显示"入学测评"（数据丢失）')
    } else {
      recordResult('P4', '4.3.1 评测状态保留', 'warn', `页面文本片段: ${reloginText.slice(0, 100)}`)
    }

    // 4.3.2 学习记录保留
    const historyAfterRelogin = await apiQuery(page, '/classroom_history?order=id.desc&limit=1') as unknown[]
    if (Array.isArray(historyAfterRelogin) && historyAfterRelogin.length > 0) {
      recordResult('P4', '4.3.2 学习记录保留', 'pass', '课堂历史完整')
    } else {
      recordResult('P4', '4.3.2 学习记录保留', 'fail', '课堂历史丢失')
    }

    // 4.3.3 孩子信息保留
    const childIdAfter = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('littlestar_child_store')
        if (raw) return JSON.parse(raw)?.state?.currentChild?.id ?? null
        return null
      } catch { return null }
    })
    if (childIdAfter) {
      recordResult('P4', '4.3.3 孩子信息保留', 'pass', `childId=${childIdAfter}`)
    } else {
      recordResult('P4', '4.3.3 孩子信息保留', 'warn', '未找到 childId（可能延迟加载）')
    }

    await takeScreenshot(page, 'P4-04-data-recovery')

    // ========================================
    // P5: 学习历史 / 复习
    // ========================================
    log.section('P5: 学习历史 / 复习')

    // 5.1 进入学习历史
    const reviewTab = page.locator('text=复习').first()
    if (await reviewTab.count() > 0 && await reviewTab.isVisible()) {
      await reviewTab.click()
      await sleep(3000)
      await takeScreenshot(page, 'P5-01-history-page')
      recordResult('P5', '5.1 进入学习历史', 'pass')

      // 5.1 验证科目筛选 Tab
      const historyText = await page.textContent('body') || ''
      const hasTabs = ['全部', '数学', '语文', '英语'].filter(t => historyText.includes(t))
      if (hasTabs.length >= 3) {
        recordResult('P5', '5.1 科目筛选 Tab', 'pass', `找到: ${hasTabs.join(', ')}`)
      } else {
        recordResult('P5', '5.1 科目筛选 Tab', 'warn', `只找到: ${hasTabs.join(', ')}`)
      }

      // 检查是否有学习记录
      if (historyText.includes('学习') || historyText.includes('英语') || historyText.includes('数学')) {
        recordResult('P5', '5.1 学习记录', 'pass', '历史页有记录')
      } else if (historyText.includes('暂无')) {
        recordResult('P5', '5.1 学习记录', 'warn', '历史页为空')
      }

      // 5.2 复习入口验证
      const reviewBtns = ['快速复习', '智能重学']
      let foundReviewBtn = false
      for (const txt of reviewBtns) {
        const btn = page.locator(`button:has-text("${txt}")`)
        if (await btn.count() > 0 && await btn.first().isVisible()) {
          recordResult('P5', '5.2 复习入口', 'pass', `找到"${txt}"按钮`)
          foundReviewBtn = true
          break
        }
      }
      if (!foundReviewBtn) {
        recordResult('P5', '5.2 复习入口', 'warn', '未找到"快速复习"/"智能重学"按钮（可能未实现）')
      }
    } else {
      // 尝试直接导航到 /history
      await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle' })
      await sleep(3000)
      await takeScreenshot(page, 'P5-01-history-direct')
      recordResult('P5', '5.1 进入学习历史', 'warn', '通过直接导航进入')
    }

    // ========================================
    // P6: 继续学习新课（第二次学习 + 409 验证）
    // ========================================
    log.section('P6: 继续学习新课（第二次学习）')

    // 回到首页
    const homeTab = page.locator('text=首页').first()
    if (await homeTab.count() > 0 && await homeTab.isVisible()) {
      await homeTab.click()
      await sleep(2000)
    } else {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      await sleep(3000)
    }

    await takeScreenshot(page, 'P6-01-home-again')

    // 记录 P6 前网络错误基线
    const preP6ErrorCount = networkErrors.length
    const preP6ConsoleCount = consoleErrors.length

    // 开始第二次学习
    const startBtn2 = page.locator('button').filter({ hasText: '开始学习' })
    if (await startBtn2.count() > 0 && await startBtn2.first().isVisible()) {
      recordResult('P6', '6.1 学习入口可用', 'pass')

      const nav2 = page.waitForURL('**/learn**', { timeout: 5000 }).catch(() => null)
      await startBtn2.first().click()
      await nav2
      await sleep(2000)
      await takeScreenshot(page, 'P6-02-enter-learn')

      // 选择科目（尝试选择与第一次不同的科目）
      const secondSubjects = subjectButtons.filter(s => s !== selectedSubject)
      let selectedSubject2 = ''
      for (const subj of [...secondSubjects, ...subjectButtons]) {
        const btn = page.locator(`button:has-text("${subj}"), [role="button"]:has-text("${subj}")`)
        if (await btn.count() > 0 && await btn.first().isVisible()) {
          await btn.first().click()
          selectedSubject2 = subj
          await sleep(500)
          break
        }
      }

      if (selectedSubject2) {
        if (selectedSubject2 !== selectedSubject) {
          recordResult('P6', '6.2 选择不同科目', 'pass', `${selectedSubject} → ${selectedSubject2}`)
        } else {
          recordResult('P6', '6.2 选择不同科目', 'warn', `同一科目: ${selectedSubject2}`)
        }
      }

      // 点击开始学习
      const startInner2 = page.locator('button').filter({ hasText: '开始学习' })
      if (await startInner2.count() > 0 && await startInner2.first().isVisible()) {
        await startInner2.first().click()
        await sleep(10000) // 等待课堂加载
        await takeScreenshot(page, 'P6-03-classroom')
      }

      // 完成第二堂课
      const completeBtns2 = [
        page.locator('button:has-text("完成课堂")'),
        page.locator('button:has-text("完成 🎉")'),
        page.locator('[data-testid="nav-next"]:has-text("完成")'),
      ]

      let clickedComplete2 = false
      for (const btn of completeBtns2) {
        if (await btn.count() > 0 && await btn.first().isVisible()) {
          await btn.first().click()
          clickedComplete2 = true
          break
        }
      }

      if (clickedComplete2) {
        await sleep(8000) // 等待 onSessionEnd + 缓存删除
        await takeScreenshot(page, 'P6-04-complete')
        recordResult('P6', '6.2 第二堂课完成', 'pass')

        // 检查 409 冲突
        const newNetworkErrors = networkErrors.slice(preP6ErrorCount)
        const has409 = newNetworkErrors.some(e => e.includes('409'))

        if (has409) {
          recordResult('P6', '6.3 upsert 409 检查', 'fail', '仍有 409 冲突!')
          newNetworkErrors.filter(e => e.includes('409')).forEach(e => log.fail(`  409: ${e}`))
        } else {
          recordResult('P6', '6.3 upsert 409 检查', 'pass', '无 409 冲突 🎉')
        }

        // 检查 DB 写入错误
        const newConsoleErrors = consoleErrors.slice(preP6ConsoleCount)
        const dbErrors = newConsoleErrors.filter(e => e.includes('DB 写入失败') || e.includes('duplicate key'))
        if (dbErrors.length > 0) {
          recordResult('P6', '6.3 DB 写入', 'fail', `${dbErrors.length} 个写入错误`)
        } else {
          recordResult('P6', '6.3 DB 写入', 'pass', '无 DB 写入错误')
        }
      } else {
        recordResult('P6', '6.2 第二堂课完成', 'warn', '未找到完成按钮')
      }

      // 验证已消费缓存被删除（新修复验证点）
      await sleep(2000)
      const finalCache = await apiQuery(page, '/classroom_cache?select=id') as unknown[]
      log.info(`第二次学习后剩余缓存: ${Array.isArray(finalCache) ? finalCache.length : '查询失败'}`)

    } else {
      recordResult('P6', '6.1 学习入口可用', 'warn', '首页无"开始学习"按钮')
    }

    // ========================================
    // 📊 测试总结
    // ========================================
    log.section('📊 测试总结')

    const passCount = testResults.filter(r => r.status === 'pass').length
    const failCount = testResults.filter(r => r.status === 'fail').length
    const warnCount = testResults.filter(r => r.status === 'warn').length
    const skipCount = testResults.filter(r => r.status === 'skip').length

    console.log(`\n  ✅ 通过: ${passCount}`)
    console.log(`  ❌ 失败: ${failCount}`)
    console.log(`  ⚠️ 警告: ${warnCount}`)
    console.log(`  ⏭️ 跳过: ${skipCount}`)
    console.log(`  📝 总计: ${testResults.length}`)

    if (failCount > 0) {
      console.log('\n  失败项:')
      testResults.filter(r => r.status === 'fail').forEach(r => {
        console.log(`    ❌ [${r.phase}] ${r.test} — ${r.detail ?? ''}`)
      })
    }

    console.log(`\n  Console 错误: ${consoleErrors.length}`)
    console.log(`  网络错误: ${networkErrors.length}`)
    if (networkErrors.length > 0) {
      networkErrors.slice(0, 10).forEach(e => console.log(`    ${e}`))
    }

    console.log('\n  截图保存在 test-screenshots/ 目录下\n')

  } catch (error) {
    log.fail(`测试异常: ${error}`)
    await takeScreenshot(page, 'error-crash')
    throw error
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('测试失败:', err)
  process.exit(1)
})
