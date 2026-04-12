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
- 已补齐真实 `gotoApp()`、`env`、`consoleErrors`、`networkErrors`、`stepShot()`，并新增 `waitForAppIdle()` 的短超时兜底，避免持续网络请求把 smoke 卡死。
- 已将 `e2e/tests/smoke/app-smoke.spec.ts` 调整为计划版：打开 `/`、等待 idle、断言 `home-page` 或 `auth-username` 至少一个可见，并执行 `stepShot('app-smoke-home-or-auth')`。
- 已统一 `playwright.config.ts`、`e2e/config/env.ts`、`.env.e2e.example` 到 `5173` 基准地址，并覆盖 `E2E_AUTH_API_URL`、`E2E_REST_API_URL`、`E2E_TEST_USERNAME`、`E2E_TEST_PASSWORD`、`E2E_PICKER_USERNAME`、`E2E_PICKER_PASSWORD`、`E2E_HEADLESS`、`E2E_USE_API_LOGIN`、`E2E_WORKERS`。
- 已补齐 `package.json` 中的 `test:e2e`、`test:e2e:smoke`、`test:e2e:feature`、`test:e2e:full`、`test:e2e:legacy`、`test:e2e:ui`、`test:e2e:report`、`test:e2e:install`，并清理重复 `dotenv`；`.gitignore` 已复核包含 `.env.e2e`、`.env.e2e.local`。
- 真实验证：先复现错误断言 `/auth` 与实际 URL `http://127.0.0.1:4173/` 的不一致；修复后第一次又暴露 `networkidle` 30 秒超时，已处理为短超时兜底；最终执行 `export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npm run test:e2e:smoke`，结果 `1 passed (7.9s)`。
- 额外执行 `python3` 解析 `package.json`，结果 `package.json ok`。

## 环境信息
- Node PATH 需包含 `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 仅允许修改 worktree 内文件
- 禁止 git commit/push
