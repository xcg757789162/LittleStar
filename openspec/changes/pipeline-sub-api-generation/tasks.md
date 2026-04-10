## 1. Pipeline 类型定义与 Pipeline Client 核心实现

- [x] 1.1 新增 Pipeline 类型定义文件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 1.1.1 写失败测试：`src/services/openmaic/__tests__/pipeline-types.test.ts` — 测试 UserRequirements、SceneOutline、AgentInfo、GeneratedContent、PipelineCallbacks 等类型的结构正确性（可使用类型断言测试）
  - [x] 1.1.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-types.test.ts`，确认失败原因是缺少类型定义文件）
  - [x] 1.1.3 写最小实现：`src/services/openmaic/pipeline-types.ts` — 定义 UserRequirements、SceneOutline、SceneContent、SceneAction、AgentInfo、TTSConfig、PipelineInput、PipelineCallbacks、PipelineProgress 等所有类型
  - [x] 1.1.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-types.test.ts`，确认所有测试通过，输出干净）
  - [x] 1.1.5 重构：整理类型导出、改善命名、确保与 OpenMAIC API 参数完全对齐

- [x] 1.2 新增 Pipeline Client — SSE 大纲解析 + 核心 API 调用  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 1.2.1 写失败测试：`src/services/openmaic/__tests__/pipeline-client.test.ts` — 测试 SSE 流式解析、scene-content 调用、scene-actions 调用、tts 调用、错误重试逻辑
  - [x] 1.2.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-client.test.ts`，确认失败原因是缺少 pipeline-client 模块）
  - [x] 1.2.3 写最小实现：`src/services/openmaic/pipeline-client.ts` — 实现 OpenMAICPipelineClient 类，包含 `generateOutlines()`（SSE 流式）、`generateSceneContent()`、`generateSceneActions()`、`generateTTS()`、`runFullPipeline()` 编排方法
  - [x] 1.2.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-client.test.ts`，确认所有测试通过，输出干净）
  - [x] 1.2.5 重构：提取 SSE 解析为独立函数、优化错误处理、改善方法命名

- [x] 1.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/pipeline-sub-api-generation/specs/*.md` 和 `openspec/changes/pipeline-sub-api-generation/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/services/openmaic/pipeline-types.ts`、`src/services/openmaic/pipeline-client.ts`、测试文件
    - `{BASE_SHA}` → 任务组开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入；用户选择"处理"类操作后，调用 superpowers:receiving-code-review 对每条审查意见做技术验证后再实施
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 2. Headers 构建与家长高级课堂设置

- [x] 2.1 扩展 ChildSettings 类型与 settingsStore  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.1.1 写失败测试：`src/stores/__tests__/settingsStore.test.ts` — 测试新增字段（enableTTS、ttsProviderId、ttsVoice、ttsSpeed、enableImageGeneration、enableVideoGeneration、classroomAgentMode、selfIntroduction）的存取和默认值
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/stores/__tests__/settingsStore.test.ts`，确认失败原因是缺少新字段）
  - [x] 2.1.3 写最小实现：修改 `src/types/models.ts` 扩展 ChildSettings 接口，修改 `src/stores/settingsStore.ts` 增加新字段的默认值和持久化逻辑
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/stores/__tests__/settingsStore.test.ts`，确认所有测试通过，输出干净）
  - [x] 2.1.5 重构：统一字段命名风格、优化默认值定义

- [x] 2.2 新增 buildHeadersFromSettings 工具函数  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.2.1 写失败测试：`src/services/openmaic/__tests__/headers-builder.test.ts` — 测试从 settingsStore 配置构建完整 HTTP Headers（x-model、x-api-key、x-base-url、x-image-generation-enabled 等），测试缺少必要配置时抛出错误
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/headers-builder.test.ts`，确认失败原因是缺少 headers-builder 模块）
  - [x] 2.2.3 写最小实现：`src/services/openmaic/headers-builder.ts` — 实现 `buildHeadersFromSettings(settings)` 函数，从 ChildSettings 映射到 OpenMAIC API Headers
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/headers-builder.test.ts`，确认所有测试通过，输出干净）
  - [x] 2.2.5 重构：确保 header key 命名与 OpenMAIC resolveModelFromHeaders 完全对齐

- [x] 2.3 家长设置面板 — 高级课堂设置 UI  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 2.3.1 执行变更：修改 `src/pages/ParentDashboard.tsx` — 在家长设置区域新增"高级课堂设置"折叠面板，包含 TTS 开关/语音选择、图片/视频生成开关、Agent 模式选择、学生自我介绍文本框
  - [x] 2.3.2 验证无回归（运行：`npx vitest run`，确认输出干净；手动确认 UI 渲染正常）
  - [x] 2.3.3 检查：确认新增 UI 组件遵循 OpenMAIC 前端设计规范（圆角、大按钮、幼儿友好配色），所有设置项正确绑定 settingsStore

- [x] 2.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/pipeline-sub-api-generation/specs/*.md` 和 `openspec/changes/pipeline-sub-api-generation/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/types/models.ts`、`src/stores/settingsStore.ts`、`src/services/openmaic/headers-builder.ts`、`src/pages/ParentDashboard.tsx`、测试文件
    - `{BASE_SHA}` → 任务组 1 审查后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 3. requirement-generator 适配与 scheduler 集成

- [x] 3.1 修改 requirement-generator 输出 UserRequirements 格式  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.1.1 写失败测试：`src/services/lesson-planner/__tests__/requirement-generator.test.ts` — 测试生成的需求对象包含 requirement（文本）、language、userNickname、userBio 字段，且 requirement 文本包含教学目标和单词列表
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/requirement-generator.test.ts`，确认失败原因是输出格式不匹配）
  - [x] 3.1.3 写最小实现：修改 `src/services/lesson-planner/requirement-generator.ts` — 新增 `generateUserRequirements()` 方法，返回 UserRequirements 对象；保留原有 `generateRequirement()` 方法供降级使用
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/requirement-generator.test.ts`，确认所有测试通过，输出干净）
  - [x] 3.1.5 重构：提取教学目标格式化为独立函数

- [x] 3.2 修改 scheduler 集成 Pipeline Client  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.2.1 写失败测试：`src/services/lesson-planner/__tests__/scheduler.test.ts` — 测试 scheduler 使用 Pipeline Client 生成课堂（mock Pipeline Client），测试降级逻辑（Pipeline 失败时回退到旧 API），测试进度回调传递
  - [x] 3.2.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/scheduler.test.ts`，确认失败原因是 scheduler 未使用 Pipeline Client）
  - [x] 3.2.3 写最小实现：修改 `src/services/lesson-planner/scheduler.ts` — 在 `generateClassroom` 流程中优先使用 Pipeline Client，失败时降级到旧 client.generateClassroom()
  - [x] 3.2.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/scheduler.test.ts`，确认所有测试通过，输出干净）
  - [x] 3.2.5 重构：清理降级逻辑、确保错误信息清晰

- [x] 3.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/pipeline-sub-api-generation/specs/*.md` 和 `openspec/changes/pipeline-sub-api-generation/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/services/lesson-planner/requirement-generator.ts`、`src/services/lesson-planner/scheduler.ts`、测试文件
    - `{BASE_SHA}` → 任务组 2 审查后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 4. usePreGeneration Hook 适配与端到端集成

- [x] 4.1 修改 usePreGeneration 适配新生成流程  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.1.1 写失败测试：`src/hooks/__tests__/usePreGeneration.test.ts` — 测试 hook 调用 Pipeline Client 生成课堂、进度状态更新（step 名称、百分比、场景索引）、错误处理和降级行为
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/usePreGeneration.test.ts`，确认失败原因是 hook 未使用 Pipeline Client）
  - [x] 4.1.3 写最小实现：修改 `src/hooks/usePreGeneration.ts` — 接入 Pipeline Client，实现步骤级进度状态管理（generationStep、generationProgress、currentSceneIndex 等状态），通过 PipelineCallbacks 接收进度更新
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/usePreGeneration.test.ts`，确认所有测试通过，输出干净）
  - [x] 4.1.5 重构：优化状态管理、确保组件卸载时清理

- [x] 4.2 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/pipeline-sub-api-generation/specs/*.md` 和 `openspec/changes/pipeline-sub-api-generation/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/hooks/usePreGeneration.ts`、测试文件
    - `{BASE_SHA}` → 任务组 3 审查后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 5. PreCI 代码规范检查

- [x] 5.1 检测 preci 安装状态
  - 按以下优先级检测：① `~/PreCI/preci`（优先）→ ② `command -v preci`（PATH）
  - 若均未找到：执行安装命令，安装完成后继续
  - 若找到：记录可用路径，直接继续
- [x] 5.2 检测项目是否已 preci 初始化
  - 检查 `.preci/`、`build.yml`、`.codecc/` 任一存在即为已初始化
  - 若未初始化：执行 `preci init`，等待完成后继续
- [x] 5.3 检测 PreCI Server 状态
  - 执行 `<preci路径> server status` 检查服务是否启动
  - 若未启动：执行 `<preci路径> server start`，等待服务启动（最多 10 秒）
  - 若启动失败且 `skip_preci: false`：暂停流程，提示用户选择操作
- [x] 5.4 执行代码规范扫描
  - 依次执行：`<preci路径> scan --diff` 和 `<preci路径> scan --pre-commit`
  - 合并两次扫描结果，去重后统一处理
  - 仅扫描代码文件
- [x] 5.5 处理扫描结果
  - 若无告警：输出 `✅ PreCI 检查通过`，继续 Documentation Sync
  - 若有告警：自动修正（最多 3 次），修正后重新扫描验证

## 6. Documentation Sync (Required)

- [x] 6.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 6.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 6.3 sync proposal.md: update scope/impact if changed
- [x] 6.4 sync specs/*.md: update requirements if changed
- [x] 6.5 Final review: ensure all OpenSpec docs reflect actual implementation
