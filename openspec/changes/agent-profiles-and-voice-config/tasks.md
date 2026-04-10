## 1. MiniMax 音色常量 + 预设角色定义 + ChildSettings 扩展

- [x] 1.1 新增 MiniMax 音色常量与预设角色定义  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 1.1.1 写失败测试：`src/types/__tests__/agent-voice-config.test.ts` — 测试 MINIMAX_VOICES 数组（12 个音色、每个含 id/label/gender）、PRESET_AGENTS 数组（6 个角色含 teacher、每个含 id/name/emoji/description/defaultVoice）、defaultVoice 都在 MINIMAX_VOICES 中存在
  - [x] 1.1.2 验证测试失败（运行：`npx vitest run src/types/__tests__/agent-voice-config.test.ts`，确认失败原因是缺少常量定义）
  - [x] 1.1.3 写最小实现：修改 `src/types/models.ts` — 新增 `MiniMaxVoice` 接口（id, label, gender）、`PresetAgent` 接口（id, name, emoji, description, defaultVoice）、`MINIMAX_VOICES` 常量（12 个音色）、`PRESET_AGENTS` 常量（6 个角色）
  - [x] 1.1.4 验证测试通过（运行：`npx vitest run src/types/__tests__/agent-voice-config.test.ts`，确认所有测试通过，输出干净）
  - [x] 1.1.5 重构：确认音色 voice_id 与 MiniMax 官方文档一致，确认角色名称和 emoji 适合幼儿教育场景

- [x] 1.2 扩展 ChildSettings 类型  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 1.2.1 写失败测试：`src/types/__tests__/child-settings-agents.test.ts` — 测试 ChildSettings 新增字段（selectedAgents: string[]、agentVoiceMap: Record<string, string>、teacherVoice: string、maxDiscussionRounds: number）的类型正确性、DEFAULT_ADVANCED_SETTINGS 包含新字段默认值
  - [x] 1.2.2 验证测试失败（运行：`npx vitest run src/types/__tests__/child-settings-agents.test.ts`，确认失败原因是缺少新字段）
  - [x] 1.2.3 写最小实现：修改 `src/types/models.ts` — 在 ChildSettings 接口新增 4 个字段，在 DEFAULT_ADVANCED_SETTINGS 新增对应默认值（selectedAgents: ['assistant', 'showoff', 'curious']、agentVoiceMap: {}、teacherVoice: ''、maxDiscussionRounds: 3）
  - [x] 1.2.4 验证测试通过（运行：`npx vitest run src/types/__tests__/child-settings-agents.test.ts`，确认所有测试通过，输出干净）
  - [x] 1.2.5 重构：确保 DEFAULT_ADVANCED_SETTINGS 的 Pick 类型包含新字段

- [x] 1.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/agent-profiles-and-voice-config/design.md` D1, D2, D3 和 `openspec/changes/agent-profiles-and-voice-config/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/types/models.ts`、测试文件
    - `{BASE_SHA}` → 任务组开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入；用户选择"处理"类操作后，调用 superpowers:receiving-code-review 对每条审查意见做技术验证后再实施
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 2. Headers Builder 扩展 + AgentInfo 类型扩展

- [x] 2.1 扩展 AgentInfo 类型  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 2.1.1 执行变更：修改 `src/services/openmaic/pipeline-types.ts` — 在 AgentInfo 接口中新增 `voiceId?: string` 字段
  - [x] 2.1.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 2.1.3 检查：确认 AgentInfo 扩展与 design.md D4 一致

- [x] 2.2 扩展 buildHeadersFromSettings 函数  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.2.1 写失败测试：`src/services/openmaic/__tests__/headers-builder-agents.test.ts` — 测试新增 3 个 Headers 的构建逻辑：
    - `x-agent-profiles` — preset 模式下包含 teacher + selectedAgents，JSON 格式正确，voiceId 取 agentVoiceMap 优先、fallback 到 defaultVoice
    - `x-teacher-voice` — 取 teacherVoice，fallback 到 teacher 的 defaultVoice
    - `x-max-discussion-rounds` — 取 maxDiscussionRounds 值
    - 边界测试：selectedAgents 为空、agentVoiceMap 为空、auto 模式下不传 x-agent-profiles
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/headers-builder-agents.test.ts`，确认失败原因是缺少新 Headers 逻辑）
  - [x] 2.2.3 写最小实现：修改 `src/services/openmaic/headers-builder.ts` — 扩展 `buildHeadersFromSettings()`，在 preset 模式下构建 x-agent-profiles（从 PRESET_AGENTS + agentVoiceMap 组装）、x-teacher-voice、x-max-discussion-rounds
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/headers-builder-agents.test.ts`，确认所有测试通过，输出干净）
  - [x] 2.2.5 重构：确保 header 构建逻辑清晰，JSON 格式与 OpenMAIC 后端解析兼容

- [x] 2.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/agent-profiles-and-voice-config/design.md` D4 和 `openspec/changes/agent-profiles-and-voice-config/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/services/openmaic/pipeline-types.ts`、`src/services/openmaic/headers-builder.ts`、测试文件
    - `{BASE_SHA}` → 任务组 1 审查后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 3. ParentDashboard UI — 角色配置折叠面板

- [x] 3.1 实现角色配置折叠面板 UI  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 3.1.1 执行变更：修改 `src/pages/ParentDashboard.tsx` — 在"课堂角色模式"切换按钮（约第 1046 行 `</div>` 后）下方新增：
    - **预设模式面板**（AnimatePresence 动画展开/收起）：
      - 教师行：emoji + 名称 + "必选" 标签 + 音色下拉（MINIMAX_VOICES）
      - 分隔线："── 课堂同学 ──"
      - 5 个角色行：checkbox + emoji + 名称 + 描述 + 音色下拉
      - 讨论轮数行：标签 + `-` 按钮 + 数字 + `+` 按钮（1-10 范围）
    - **自动模式面板**：💡 提示文案
    - 所有状态绑定到 `advancedSettings.selectedAgents`、`advancedSettings.agentVoiceMap`、`advancedSettings.teacherVoice`、`advancedSettings.maxDiscussionRounds`
    - 使用 `updateAdvanced()` 更新设置
  - [x] 3.1.2 验证无回归（运行：`npx vitest run`，确认输出干净；确认 UI 渲染正常）
  - [x] 3.1.3 检查：确认 UI 遵循 OpenMAIC 前端设计规范（圆角 16px、T.sunOrange 配色、幼儿友好）、data-testid 命名规范

- [x] 3.2 确保 childStore 持久化新字段  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 3.2.1 执行变更：检查 `src/stores/childStore.ts` — 确认 `selectedAgents`、`agentVoiceMap`、`teacherVoice`、`maxDiscussionRounds` 4 个字段在保存/加载时被正确处理（含默认值 fallback）
  - [x] 3.2.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 3.2.3 检查：确认已有用户升级后不会因缺少新字段而报错

- [x] 3.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/agent-profiles-and-voice-config/design.md` D5 和 `openspec/changes/agent-profiles-and-voice-config/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/pages/ParentDashboard.tsx`、`src/stores/childStore.ts`
    - `{BASE_SHA}` → 任务组 2 审查后的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 4. Pipeline Client agent-profiles 集成

- [x] 4.1 新增 agent-profiles API 调用方法  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.1.1 写失败测试：`src/services/openmaic/__tests__/pipeline-client-agents.test.ts` — 测试 `generateAgentProfiles()` 方法：发送 POST 到 `/api/generate/agent-profiles`、传入 requirements + headers、解析返回的 AgentInfo[]（含 voiceId）、错误处理和重试
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-client-agents.test.ts`，确认失败原因是缺少 generateAgentProfiles 方法）
  - [x] 4.1.3 写最小实现：修改 `src/services/openmaic/pipeline-client.ts` — 在 OpenMAICPipelineClient 类中新增 `generateAgentProfiles(requirements: UserRequirements, headers: Record<string, string>): Promise<AgentInfo[]>` 方法，调用 `/api/generate/agent-profiles`，解析返回值
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/pipeline-client-agents.test.ts`，确认所有测试通过，输出干净）
  - [x] 4.1.5 重构：确保方法签名与其他子 API 方法（generateOutlines 等）风格一致

- [x] 4.2 Pipeline 编排集成 auto 模式  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 4.2.1 执行变更：修改 `src/services/openmaic/pipeline-client.ts` 的 `runFullPipeline()` 方法 — 在调用 scene-outlines-stream 之前，判断 headers 中 `x-agent-mode` 是否为 `auto`，若是则先调用 `generateAgentProfiles()` 获取角色列表，将结果序列化为 JSON 写入 headers 的 `x-agent-profiles`
  - [x] 4.2.2 验证无回归（运行：`npx vitest run`，确认输出干净）
  - [x] 4.2.3 检查：确认 preset 模式不受影响（不调用 agent-profiles API）

- [x] 4.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/agent-profiles-and-voice-config/design.md` D6 和 `openspec/changes/agent-profiles-and-voice-config/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → `src/services/openmaic/pipeline-client.ts`、测试文件
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
