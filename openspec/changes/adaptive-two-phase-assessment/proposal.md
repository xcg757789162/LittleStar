## Why

当前入学评测系统存在以下核心问题：
1. **评测形式过于简单** — 只有"我会/不太会"两个自评按钮，不是真正的选择题，无法客观衡量孩子的知识掌握程度
2. **针对性不强** — 从每个模块选最简单的知识点出题，无法有效区分不同水平的孩子
3. **缺乏验证机制** — 单阶段自评容易产生偏差（孩子自信心强但实际未掌握，或反之），没有交叉验证环节
4. **预生成触发不可靠** — 评测完成后的课堂预生成依赖 Home 页面的 Hook 检测，存在触发延迟

需要将评测系统重构为两阶段自适应选择题评测，并在评测完成后立即可靠地触发课堂预生成。

## What Changes

- **重构** `PlacementTestEngine` — 从自评式改为两阶段选择题评测引擎（阶段一摸底 + 阶段二验证）
- **新增** AI 评测题目生成器 — 调用 LLM 为每个知识点生成 4 选 1 选择题
- **新增** 预设题库 + 题库加载机制 — 阶段一使用预设核心题库，阶段二由 AI 动态生成验证题
- **重构** `PlacementTestPage.tsx` — 从两个按钮改为真正的 4 选 1 选择题 UI，支持两阶段过渡动画
- **重构** `usePlacementTest.ts` — 支持两阶段状态机流转（phase1_testing → phase1_analyzing → phase2_testing → completing → result）
- **新增** 评测完成后立即触发预生成 — 在 `usePlacementTest` 完成回调中直接调用预生成逻辑，不依赖 Home 页面检测
- **修改** 数据库 Schema — 扩展 `placement_tests` 表，新增 `phase`、`phase1_result` 字段；新增 `placement_questions` 表存储题目池

## Capabilities

### New Capabilities

- `ai-question-generator`: AI 评测题目生成器，调用 LLM 根据知识点名称和描述生成 4 选 1 选择题（含题干、4 个选项、正确答案、干扰项解释）
- `two-phase-assessment`: 两阶段自适应评测引擎 — 阶段一覆盖各模块摸底，阶段二针对薄弱/不确定区域验证
- `question-bank`: 预设题库机制 — JSON 格式的核心选择题库，按科目/年级/知识点索引
- `post-assessment-pregeneration`: 评测完成后立即异步预生成 3 堂课内容

### Modified Capabilities

- `placement-test-engine`: 从自评式重构为两阶段选择题引擎
- `placement-test-ui`: 从"我会/不太会"按钮改为 4 选 1 选择题界面（保持 Sunny Playground 暖色风格）
- `placement-test-hook`: 支持两阶段状态机和 AI 题目生成的异步调用
- `placement-test-db`: 扩展数据库表结构以支持两阶段评测数据

## Impact

- **评测体验**: 从约 15 秒自评改为约 3-5 分钟真实答题（阶段一 5-8 题 + 阶段二 3-5 题），更准确但耗时增加
- **AI 调用**: 阶段二需要调用 LLM 生成验证题（约 3-5 次 API 调用），依赖家长配置的 LLM API Key
- **预生成**: 评测完成后立即触发 3 堂课预生成（串行调用 OpenMAIC Pipeline，约 5-15 分钟后台完成）
- **数据库**: 需要执行 migration 新增 `placement_questions` 表和扩展 `placement_tests` 表
- **兼容性**: 已完成旧评测的孩子数据保留，新评测向后兼容旧数据格式
- **离线降级**: 当 LLM API 不可用时，阶段二退化为使用预设题库补充题目
