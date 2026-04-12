# e2e-implementer-2 progress

- 状态: 已完成
- 负责任务: Task 1 收尾 - 修正骨架并跑通 smoke
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`

## TODO
- [x] 修正 `e2e/fixtures/base.ts` 的页面导航与基础夹具
- [x] 修正 `e2e/tests/smoke/app-smoke.spec.ts` 的断言与截图
- [x] 补全 `package.json` 的标准 `test:e2e*` 脚本和 `dotenv`
- [x] 补全 `.gitignore` 的 `.env.e2e*` 忽略项
- [x] 执行失败验证与成功验证

## 工作内容
- 接替 `e2e-implementer-1` 完成 Task 1 收尾
- 修改 `e2e/fixtures/base.ts`：`gotoApp()` 使用真实应用路径；补齐 `env`、`consoleErrors`、`networkErrors`、`stepShot()`；新增 `waitForAppIdle()` 的短超时兜底
- 修改 `e2e/tests/smoke/app-smoke.spec.ts`：打开 `/`，等待 idle，断言 `home-page` 或 `auth-username` 至少一个可见，并执行 `stepShot('app-smoke-home-or-auth')`
- 修改 `e2e/config/env.ts`：统一读取 `E2E_BASE_URL`、`E2E_AUTH_API_URL`、`E2E_REST_API_URL`、`E2E_TEST_USERNAME`、`E2E_TEST_PASSWORD`、`E2E_PICKER_USERNAME`、`E2E_PICKER_PASSWORD`、`E2E_HEADLESS`、`E2E_USE_API_LOGIN`、`E2E_WORKERS`
- 修改 `playwright.config.ts`：统一 5173 基准地址、workers、`outputDir=test-results`、标准 webServer 启动命令
- 修改 `.env.e2e.example`：示例值切到 5173，并同步 auth/rest API 与测试账号命名
- 修改 `package.json`：补齐 `test:e2e`、`test:e2e:smoke`、`test:e2e:feature`、`test:e2e:full`、`test:e2e:legacy`、`test:e2e:ui`、`test:e2e:report`、`test:e2e:install`，并补齐 `dotenv`
- 复核 `.gitignore`：已包含 `.env.e2e`、`.env.e2e.local`

## 验证命令与结果
- 修复前验证：`export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npx playwright test e2e/tests/smoke/app-smoke.spec.ts --reporter=list`
  - 结果：真实失败点为错误断言 `/auth`，实际 URL 为 `http://127.0.0.1:4173/`
- 实现后首次验证：`export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npm run test:e2e:smoke`
  - 结果：页面已渲染，但 `waitForAppIdle()` 的 `networkidle` 持续等待导致 30s timeout，随后已修成短超时兜底
- 最终验证：`export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npm run test:e2e:smoke`
  - 结果：`1 passed (7.9s)`
- 附加校验：`python3` 解析 `package.json`
  - 结果：`package.json ok`

## 环境信息
- Node PATH 需包含 `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 仅允许修改 worktree 内文件
- 禁止 git commit/push
