# e2e-implementer-3 progress

- 状态: 已完成
- 负责任务: Task 2 - 抽取共享夹具与辅助工具
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`

## TODO
- [x] 新建 `e2e/fixtures/data.ts`
- [x] 新建 `e2e/fixtures/auth.ts`
- [x] 新建 `e2e/helpers/tags.ts`
- [x] 新建 `e2e/helpers/auth.ts`
- [x] 新建 `e2e/helpers/api.ts`
- [x] 新建 `e2e/helpers/screenshots.ts`
- [x] 新建 `e2e/helpers/reporting.ts`
- [x] 新建 `e2e/helpers/assertions.ts`
- [x] 新建 `e2e/helpers/learning.ts`
- [x] 新建 `e2e/reports/README.md`
- [x] 新建 `e2e/tests/feature/lesson-picker.spec.ts`
- [x] 调整 `e2e/fixtures/base.ts`
- [x] 运行 `feature` 验证

## 工作内容
- 基于真实流程补齐 `lesson picker` 所需 helper/fixture：
  - `e2e/fixtures/data.ts`
  - `e2e/fixtures/auth.ts`
  - `e2e/helpers/tags.ts`
  - `e2e/helpers/auth.ts`
  - `e2e/helpers/api.ts`
  - `e2e/helpers/screenshots.ts`
  - `e2e/helpers/reporting.ts`
  - `e2e/helpers/assertions.ts`
  - `e2e/helpers/learning.ts`
  - `e2e/reports/README.md`
  - `e2e/tests/feature/lesson-picker.spec.ts`
- 修复 `e2e/fixtures/base.ts` 中缺失的 `captureAndAttach`，恢复 `stepShot` 共享截图能力且未破坏 smoke 基座
- `lesson-picker.spec.ts` 已按真实路径落地：UI 登录 → 首页 `开始学习` → `/classroom` → 选择已可用科目（数学）→ 断言出现 `选择课程` / fallback
- `learning.ts` 通过 Auth + PostgREST 在真实后端上幂等准备账号、孩子、测评记录；`api.ts` 使用 `URL` / `URLSearchParams` 做参数化路径与查询拼接

## 验证命令
- `export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npm run test:e2e:feature -- --grep "lesson picker"`

## 验证结果
- 结果：通过
- 输出：`1 passed (6.8s)`

## 剩余风险
- 当前种子依赖本地服务 `http://127.0.0.1:5173`、`/api/auth`、`/api/rest` 可用；若后端表结构再调整，`placement_tests` 种子 payload 需要同步更新
- `lesson picker` 目前断言标题或空课程 fallback，未覆盖实际缓存课程卡片点击进入 `playing` 的深链路

## 环境信息
- Node PATH 需包含 `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 仅允许修改 worktree 内文件
- 禁止 git commit/push
