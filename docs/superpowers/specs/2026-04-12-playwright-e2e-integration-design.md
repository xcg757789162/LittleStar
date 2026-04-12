# Playwright E2E 标准化整合设计

> 日期：2026-04-12  
> 项目：OpenMAIC / LittleStar  
> 状态：已完成设计评审，待用户审阅文档  
> 目标：将当前散落在仓库根目录的 Playwright 脚本整合为标准 `Playwright Test Runner` 项目，并建立统一的目录结构、配置、夹具、分组执行与报告体系。

---

## 1. 背景与现状

当前仓库已经存在多类“端到端/近端到端”测试资产，但组织方式不统一：

1. 根目录存在多个基于 `playwright` API 的独立脚本，例如：
   - `quick-browser-test.ts`
   - `e2e-lesson-picker-test.ts`
   - `e2e-core-loop-test.ts`
   - `e2e-verify-bugs.ts`
   - `e2e-bridge-*.ts`
2. 这些脚本依赖真实浏览器、真实登录、真实页面与部分真实数据库/REST 校验，但没有标准 `Playwright Test Runner` 配置，也没有统一命令入口。
3. 项目内另有 `src/__tests__/e2e-flow.test.tsx`，其本质是 `Vitest + Testing Library + MemoryRouter` 路由/渲染级冒烟测试，不属于真实浏览器 E2E。
4. 现有文档 `docs/核心学习闭环测试方案.md` 已经定义了完整 P1-P6 业务闭环测试口径，但自动化代码未与该文档形成稳定、标准化映射。

现状带来的问题：

- 测试入口分散，团队成员不清楚“标准跑法”是什么。
- 登录、截图、结果记录、API 校验等逻辑重复散落，维护成本高。
- 测试脚本偏“调试脚本”风格，失败诊断主要依赖 `console.log`，缺乏统一报告。
- 新旧测试（主线业务 E2E、历史 bridge 验证、Vitest 路由冒烟）混名为 “E2E”，语义边界不清。
- 无法稳定支持按场景、按耗时、按风险等级进行分组执行。

---

## 2. 设计目标

本次整合的目标是：

1. 建立标准 `Playwright Test Runner` 项目结构。
2. 为现有 Playwright 真实浏览器测试提供统一执行入口。
3. 将现有高价值脚本迁移为可维护的 `spec` 测试文件，而不是继续保留根目录散装脚本形态。
4. 将测试按价值和运行成本拆分为 `smoke / feature / full / legacy` 四层。
5. 抽离公共 `fixtures/helpers`，统一登录、截图、报告、API/DB 校验等能力。
6. 为失败诊断提供标准化 `HTML report + screenshot + trace + video`。
7. 保留历史专项验证能力，但不让遗留脚本进入主流程。
8. 明确 `Vitest` 与 `Playwright` 的职责边界，避免“伪 E2E”命名继续扩散。

---

## 3. 非目标

本次设计明确不包含以下内容：

1. 不重写 LittleStar 业务逻辑或页面结构，只整合测试体系。
2. 不在第一轮就引入重量级 Page Object 全量重构；优先 Runner 化与公共能力抽取。
3. 不把所有历史调试脚本都纳入默认执行集，遗留验证只做归档和隔离。
4. 不在本轮解决测试数据完全自动重置/回滚平台化问题；如有必要，仅为后续阶段预留接口。
5. 不把 `Vitest` 单测/集成测试迁入 Playwright。

---

## 4. 总体方案概览

采用“标准 Playwright Runner + 分层目录 + 共享夹具/工具 + 标签分组 + 统一环境变量”的方案。

核心思路：

- 用标准 `playwright.config.ts` 接管真实浏览器 E2E。
- 保留现有脚本验证语义，但不保留脚本式 `main()` 组织方式。
- 将“测试能力”抽象为公共函数、夹具与报告工具。
- 将高价值主线测试与历史专项验证彻底分层。
- 用目录分组与 tag 分组双轨并行，既方便人理解，也方便命令过滤。

---

## 5. 目标目录结构

```text
playwright.config.ts

e2e/
├── config/
│   ├── env.ts                 # 统一解析 E2E_* 环境变量
│   └── projects.ts            # 第二阶段如扩展多浏览器/多项目时再提取，首轮逻辑先放在 playwright.config.ts
├── fixtures/
│   ├── base.ts                # test.extend，注入页面级共享能力
│   ├── auth.ts                # 登录能力与测试账号夹具
│   └── data.ts                # 公共测试数据/账号定义
├── helpers/
│   ├── auth.ts                # UI 登录 / API token 登录
│   ├── screenshots.ts         # 截图与附件工具
│   ├── api.ts                 # PostgREST / Auth API 请求包装
│   ├── assertions.ts          # 业务级断言封装
│   ├── learning.ts            # 学习流程导航与等待辅助
│   ├── reporting.ts           # Markdown/文本报告构建
│   └── tags.ts                # 统一 tag 常量
├── tests/
│   ├── smoke/
│   │   └── app-smoke.spec.ts
│   ├── feature/
│   │   ├── lesson-picker.spec.ts
│   │   └── bug-regressions.spec.ts
│   ├── full/
│   │   └── core-learning-loop.spec.ts
│   └── legacy/
│       ├── bridge-classroom.spec.ts
│       ├── bridge-final.spec.ts
│       └── bridge-verify.spec.ts
└── reports/
    └── README.md              # 首轮即创建，说明辅助报告目录用途与约定
```

说明：

- `playwright-report/` 与 `test-results/` 继续使用 Playwright 标准输出目录。
- `e2e/reports/` 用于业务辅助截图、markdown 报告、手工分析产物，不替代官方 HTML report。
- 若后续需要多浏览器或远端环境，可以在 `config/` 层继续扩展，而不破坏 `tests/` 结构。

---

## 6. 测试分层与执行策略

### 6.1 分层定义

#### `smoke`

定位：最小可运行健康检查。

覆盖目标：

- 首页可打开
- 基础 DOM 可见
- 关键路由/基础登录未崩溃
- 浏览器截图能力正常

特点：

- 运行快
- 失败信号明确
- 适合本地快速自检、PR 前快速回归、CI 最小门禁

#### `feature`

定位：专项业务流程回归。

覆盖目标：

- 课程选择器
- 某类历史 bug 回归
- 某个完整但局部的用户路径

特点：

- 单个用例聚焦一个子系统
- 运行时长中等
- 适合功能开发完成后的定向回归

#### `full`

定位：最高价值业务闭环验证。

覆盖目标：

- P1-P6 核心学习闭环
- 登录 → 课堂生成 → 学习完成 → 持久化 → 重登恢复 → 历史/复习/继续学习

特点：

- 依赖真实环境较多
- 运行时间最长
- 用于里程碑、验收、发版前验证

#### `legacy`

定位：保留历史专项验证能力，但不纳入主线。

覆盖目标：

- iframe / bridge 相关历史验证
- 已不代表当前主路径、但偶尔仍有诊断价值的脚本

特点：

- 默认不参与 `test:e2e` 主入口
- 仅在定位历史问题时手动执行

### 6.2 推荐命令入口

在 `package.json` 中统一提供：

- `test:e2e`：默认执行 `smoke + feature`
- `test:e2e:smoke`
- `test:e2e:feature`
- `test:e2e:full`
- `test:e2e:legacy`
- `test:e2e:ui`：Playwright UI 调试
- `test:e2e:report`：打开 HTML 报告

推荐默认策略：

- 日常开发：`test:e2e` 或 `test:e2e:smoke`
- 功能验收：`test:e2e:feature`
- 大改动/发版前：`test:e2e:full`
- 历史问题排查：`test:e2e:legacy`

### 6.3 标签策略

除了目录分层，还应对每个用例添加 tag，便于灵活筛选：

- `@smoke`
- `@feature`
- `@full`
- `@legacy`
- `@slow`
- `@auth`
- `@db`
- `@manual-followup`

设计原则：

- 目录负责“结构化组织”。
- tag 负责“跨目录筛选”。
- 当目录和筛选需求发生偏差时，以 tag 为最终执行过滤依据。

---

## 7. 夹具与公共能力设计

### 7.1 总体原则

本次整合的关键不是简单搬运脚本，而是抽离脚本中重复出现的环境与业务辅助逻辑。

重复逻辑应收敛到 `fixtures` 与 `helpers` 层，避免每个 `spec` 再次实现：

- 浏览器初始化约定
- 测试账号
- UI 登录
- API 注入 token 登录
- 截图与附件
- 控制台错误收集
- REST 校验
- 业务级等待（如首页就绪、学习页加载、课程选择器出现等）

### 7.2 夹具分层

#### `fixtures/base.ts`

用途：

- 导出项目统一的 `test` 与 `expect`
- 为 `page` 注入常用工具
- 注入 `stepShot()`、`consoleErrors`、`networkErrors`、`env` 等常用能力

#### `fixtures/auth.ts`

用途：

- 统一测试账号与登录方式
- 暴露 `loginAsPrimaryUser()`、`loginAsPickerUser()` 等高阶操作
- 根据测试类型选择 UI 登录或 API 登录

#### `fixtures/data.ts`

用途：

- 统一保存测试账号、测试孩子、默认科目等稳定数据
- 避免账号密码在多个测试文件中硬编码复制

### 7.3 Helper 设计

#### 认证 Helper

提供两种登录模式：

1. **UI 登录**
   - 优点：更真实，适合烟雾测试与验收路径
   - 缺点：慢、脆弱度略高

2. **API 登录 + token 注入**
   - 优点：更快、更稳定，适合长流程和回归测试
   - 缺点：绕开了登录 UI 本身，不适合登录页验收

设计决策：

- `smoke` 默认优先使用 UI 登录（或至少保留一条 UI 登录链路）
- `feature/full` 默认可使用 API 登录加速
- 某条测试如果明确要覆盖登录页交互，必须显式选择 UI 登录

#### 截图与附件 Helper

统一提供：

- `stepShot(name)`：步骤截图
- `attachJson(name, data)`：把关键对象附到报告中
- `attachMarkdown(name, content)`：辅助阅读长流程结果

#### API/REST Helper

统一封装：

- Auth API 登录请求
- PostgREST 查询
- 通用带 JWT 请求头构造
- 常见业务表查询（如 `classroom_cache`、`daily_sessions`、`classroom_history`）

注意：

- 该层只做请求与解析，不直接耦合太多业务判断。
- 业务判断应在 `assertions.ts` 或具体 `spec` 中完成。

#### 业务断言 Helper

封装高复用业务断言，例如：

- 首页是否显示可学习状态
- 是否出现课程选择器
- 是否进入课堂
- 会话总结卡片是否完整
- 学习历史是否包含最新记录
- 是否存在关键控制台错误

这样可以把“日志式脚本”转化为更清晰的断言风格。

---

## 8. 环境变量设计

### 8.1 设计原则

E2E 配置不应与应用运行时配置语义混杂，应采用独立前缀：`E2E_*`。

理由：

1. 清晰区分“应用运行配置”和“测试运行配置”。
2. 方便本地/CI/不同环境切换。
3. 降低误用生产配置或错误共享变量的风险。

### 8.2 推荐变量

建议至少支持：

- `E2E_BASE_URL`
- `E2E_AUTH_API_URL`
- `E2E_REST_API_URL`
- `E2E_TEST_USERNAME`
- `E2E_TEST_PASSWORD`
- `E2E_PICKER_USERNAME`
- `E2E_PICKER_PASSWORD`
- `E2E_HEADLESS`
- `E2E_USE_API_LOGIN`

可选增强：

- `E2E_ENABLE_DB_CHECKS`
- `E2E_ARTIFACT_DIR`
- `E2E_WORKERS`

### 8.3 默认值策略

若未显式配置，开发默认值可指向当前本地环境：

- Base URL：`http://localhost:5173`
- Auth/REST：优先通过前端代理访问，必要时允许直连地址配置
- Headless：本地默认 `true`，调试时可通过命令或变量切到 `false`

---

## 9. Playwright 配置策略

`playwright.config.ts` 应包含以下核心配置：

1. `testDir` 指向 `e2e/tests`
2. `timeout` 与 `expect.timeout` 为长流程测试留出合理空间
3. `fullyParallel` 需谨慎，默认不建议对重度共享环境用例全开
4. `reporter` 至少包含：
   - `list`
   - `html`
5. `use` 建议默认：
   - `trace: 'retain-on-failure'`
   - `video: 'retain-on-failure'`
   - `screenshot: 'only-on-failure'`
6. 可通过 `projects` 支持 `smoke/feature/full/legacy` 或 Chromium 单浏览器起步
7. 对重度状态依赖测试建议支持 `workers=1` 的串行执行模式

设计取舍：

- 第一轮优先保证稳定性，不追求多浏览器并发覆盖。
- 先以 Chromium 为主，后续如有 CI 需求再扩展到更多浏览器项目。

---

## 10. 现有脚本迁移映射

### 10.1 `quick-browser-test.ts`

迁移目标：`e2e/tests/smoke/app-smoke.spec.ts`

迁移原则：

- 从脚本 `main()` 改造成标准 `test()`
- 保留最小首页打开与 DOM 检查能力
- 成为最小 smoke 门禁

### 10.2 `e2e-lesson-picker-test.ts`

迁移目标：`e2e/tests/feature/lesson-picker.spec.ts`

迁移原则：

- 保留登录 → 学习页 → 选科 → 课程选择器 → 顺序解锁 → 安全退出 的核心流程
- 将大脚本改成 `test.step()` 分段
- 截图与 markdown 报告逻辑迁入共享报告工具或局部辅助函数

### 10.3 `e2e-core-loop-test.ts`

迁移目标：`e2e/tests/full/core-learning-loop.spec.ts`

迁移原则：

- 保留 P1-P6 业务闭环语义
- 按阶段划分 `describe` 或 `test.step()`
- 若确有必要，可拆成多个测试，但必须避免脆弱的跨测试共享隐式状态
- 对 DB/REST 校验采用共享 helper

### 10.4 `e2e-verify-bugs.ts`

迁移目标：`e2e/tests/feature/bug-regressions.spec.ts`

迁移原则：

- 将不同 bug 验证拆分成可独立失败的多个 `test()`
- 不再保留“大而全的单脚本”模式
- 让历史 bug 变成长期可复用回归资产

### 10.5 `e2e-bridge-*.ts`

迁移目标：`e2e/tests/legacy/*.spec.ts`

迁移原则：

- 保留历史诊断能力
- 默认不进入主流程
- 在文档上明确其遗留属性，防止被误认为当前主线测试

### 10.6 `src/__tests__/e2e-flow.test.tsx`

处理原则：

- 不迁入 Playwright
- 保留在 `Vitest` 体系
- 本轮不改文件名，只在文档与测试说明中明确其“路由渲染级冒烟测试”属性，避免扩大迁移范围

---

## 11. 报告与失败诊断设计

### 11.1 官方报告

以 Playwright HTML report 作为主报告出口。

要求：

- 失败时可看到步骤、trace、截图、视频
- 本地开发人员可以快速定位失败阶段
- 与 `console.log` 相比，报告应成为第一诊断入口

### 11.2 业务辅助产物

允许保留业务辅助报告，例如：

- 某专项测试的 markdown 总结
- 业务表快照 JSON
- 关键步骤截图合集

这些产物应作为补充，而不是替代 Playwright 标准报告。

### 11.3 证据保留策略

推荐默认策略：

- `screenshot: 'only-on-failure'`
- `trace: 'retain-on-failure'`
- `video: 'retain-on-failure'`

原因：

- 足够支撑诊断
- 不至于让每次执行产生过多沉重产物
- 更适合当前本地共享环境

### 11.4 步骤化诊断

所有长流程测试必须使用 `test.step()` 明确阶段边界，例如：

- 登录
- 首页状态检查
- 进入学习页
- 选择科目
- 课程选择器展示
- 课堂答题
- 会话总结
- DB 校验
- 历史页校验

这样失败报告会天然反映“卡在哪一阶段”，不必再依赖海量手写日志排查。

---

## 12. 错误处理与稳定性策略

### 12.1 环境不可用

若前端服务或后端服务未启动，应尽早失败，给出清晰错误信息，而不是在流程中后段才超时。

建议：

- 在基础夹具或 smoke 前置步骤中探测 `BASE_URL` 是否可访问
- 对认证接口不可用、REST 不可用给出明确失败提示

### 12.2 动态内容与 AI 生成波动

课堂内容、题目结构、加载时间存在波动，因此测试不应过度依赖固定文本或固定题目数量。

应采用：

- “存在某类交互控件/课堂容器/总结卡片”这类结构性断言
- 有上限的轮询与等待
- 必要时使用安全退出阈值，防止无限循环

### 12.3 共享环境干扰

某些测试依赖公共测试账号与数据库状态，存在互相污染风险。

策略：

- 对 `full` 用例优先串行执行
- 对特定 feature 用例显式声明需要独占环境
- 后续再考虑引入测试数据重置或专用账号池

### 12.4 历史遗留不稳定用例

`legacy` 用例不应阻塞主验证流程。

策略：

- 默认不参与 `test:e2e`
- 报告中明确标示为遗留验证
- 只有在明确诊断需求下才执行

---

## 13. 测试职责边界

### 13.1 Playwright 负责什么

- 真实浏览器行为
- 页面导航与交互
- 登录链路
- 课程选择器/课堂/历史页等跨页面真实流程
- 结合 REST/DB 的端到端业务验证

### 13.2 Vitest 负责什么

- 组件测试
- Hook 测试
- store 测试
- 纯逻辑集成测试
- 路由渲染级冒烟

### 13.3 边界规则

如果测试不依赖真实浏览器和真实导航，则优先保留在 `Vitest`。  
如果测试必须依赖真实页面交互、真实网络与真实用户路径，则迁入 `Playwright`。

这样可以避免用 Playwright 做过于底层的事情，也避免用 Vitest 冒充真实 E2E。

---

## 14. 分阶段实施建议

### 阶段 1：搭骨架

目标：建立标准 Runner 基础设施。

包含：

- 新建 `playwright.config.ts`
- 新建 `e2e/` 目录结构
- 建立 `fixtures/helpers/config` 基础层
- 增加 `package.json` 统一脚本入口
- 增加 E2E README 或说明文档

### 阶段 2：迁移主线测试

目标：优先迁移高价值用例。

优先顺序：

1. `quick-browser-test.ts` → `smoke`
2. `e2e-lesson-picker-test.ts` → `feature`
3. `e2e-core-loop-test.ts` → `full`
4. `e2e-verify-bugs.ts` → `feature`

### 阶段 3：处理遗留验证

目标：归档历史 bridge 脚本。

包含：

- `e2e-bridge-*` 迁入 `legacy`
- 在说明文档中标注默认不纳入主执行集
- 视后续稳定情况再决定彻底删除

### 阶段 4：清理与命名收敛

目标：让仓库只保留一种标准 E2E 入口。

包含：

- 删除或归档根目录旧脚本
- 修正文档中对 E2E 的命名描述
- 在测试说明中明确 `src/__tests__/e2e-flow.test.tsx` 属于 `Vitest` 路由渲染级冒烟测试，本轮不改文件名
- 更新 `.codebuddy/project-index.md`

---

## 15. 风险与权衡

### 风险 1：共享测试账号导致串扰

缓解：

- 优先串行执行 `full`
- 明确文档中的推荐执行顺序
- 后续追加测试数据 reset 能力

### 风险 2：AI 动态内容导致断言脆弱

缓解：

- 以结构性断言代替静态文本断言
- 抽象业务等待与重试策略
- 把人工观察需求显式标成 `@manual-followup`

### 风险 3：第一轮重构范围过大

缓解：

- 本轮不引入过重的 Page Object 体系
- 先完成 Runner 化与公共层抽取
- 后续根据实际维护痛点再进化架构

### 风险 4：旧文档与新入口短期并存造成混淆

缓解：

- 在新说明文档和脚本命令中明确“标准入口”
- 将旧脚本定义为迁移期参考，不再作为正式方案

---

## 16. 最终决策

本次设计最终采用以下方案：

1. 用标准 `Playwright Test Runner` 作为真实浏览器 E2E 的唯一正式入口。
2. 采用 `e2e/tests + fixtures + helpers + config + reports` 的分层结构。
3. 采用 `smoke / feature / full / legacy` 四层测试分组。
4. 使用独立的 `E2E_*` 环境变量体系。
5. 同时支持 UI 登录与 API 登录，按用例选择最适合的方式。
6. 保留高价值业务脚本能力，淘汰“根目录散装脚本”组织方式。
7. 将 `Vitest` 保留为组件/逻辑/路由级测试工具，不与真实 E2E 混用。

这是一个以“先标准化、再优化”为原则的方案：优先统一入口、结构、诊断与执行体验，再逐步演进测试内部抽象层。

---

## 17. 实施完成后的验收标准

当以下条件全部满足时，可认为整合达标：

1. 存在标准 `playwright.config.ts`。
2. 根目录高价值 Playwright 脚本已经迁入 `e2e/tests/`。
3. 能通过统一 `npm run test:e2e:*` 命令执行对应分组。
4. 至少有一条 `smoke`、一条 `feature`、一条 `full` 用例可运行。
5. 登录、截图、API/REST 校验逻辑已收敛到共享层。
6. 失败时可通过 HTML report + trace/screenshot 快速定位问题。
7. `legacy` 用例默认不纳入主入口。
8. 团队文档已明确标准入口与测试分层。

---

## 18. 后续计划接口（非本轮实现）

为后续阶段预留但不在本轮强制实现的能力：

- 测试数据重置脚本
- 多浏览器项目
- CI 集成
- Page Object 精细化抽象
- 按环境（local/staging）切换的项目矩阵
- 更细粒度的业务 fixture 与 mock/seed 机制

---

## 19. 结语

这次整合不是单纯“把脚本搬到另一个目录”，而是把当前零散但有价值的真实验证资产，沉淀成一套清晰、标准、可维护、可扩展的 Playwright E2E 体系。

只要严格按本设计推进，项目将从“能跑一些脚本”升级为“拥有正式的端到端测试基础设施”，并为后续 CI、发布门禁、长期回归测试打下稳定基础。
