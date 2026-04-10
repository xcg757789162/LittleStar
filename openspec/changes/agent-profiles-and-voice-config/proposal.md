## Why

当前 LittleStar 的课堂角色模式设置仅有"预设角色"和"自动生成"两个模式切换按钮，但并未实现实际功能——没有角色选择面板、没有 TTS 音色配置、没有讨论轮数控制，也没有通过 agent-profiles API 传递角色信息给 OpenMAIC 后端。

OpenMAIC 原版 App 支持以下完整功能：
1. **课堂角色选配**：教师角色 + 多个课堂同学角色，每个角色可勾选启用/禁用
2. **TTS 音色绑定**：每个角色独立绑定 MiniMax TTS 音色
3. **讨论轮数控制**：家长可设置课堂讨论的最大轮数
4. **Agent Profiles API 调用**：前端将角色配置通过 HTTP Headers 传递给后端
5. **自动模式**：系统根据课程内容自动生成角色配置

LittleStar 需要完整对齐这 5 项功能，让家长能精细控制课堂中的角色和音色。

## What Changes

实现"完整对齐 OpenMAIC 原版"的角色配置与音色选择功能：

1. **新增 MiniMax TTS 音色常量**：从 MiniMax 官方系统音色中筛选 12 个适合幼儿教育场景的音色，定义 `MINIMAX_VOICES` 常量数组
2. **新增预设角色常量**：定义 `PRESET_AGENTS` 常量（5 个课堂同学角色 + 1 个教师角色），每个角色包含名称、emoji、描述、默认音色
3. **扩展 ChildSettings**：新增 `selectedAgents`（勾选的角色 ID 列表）、`agentVoiceMap`（角色 → 音色 ID 映射）、`teacherVoice`（教师音色 ID）、`maxDiscussionRounds`（讨论轮数）4 个字段
4. **扩展 Headers Builder**：新增 `x-agent-profiles`（JSON）、`x-teacher-voice`、`x-max-discussion-rounds` 三个 HTTP Headers
5. **扩展 AgentInfo 类型**：添加 `voiceId` 字段
6. **扩展 ParentDashboard UI**：模式切换按钮下方新增折叠面板（U1 列表式）：
   - 预设模式：教师音色选择 + 角色勾选列表（每行：勾选框 + emoji + 角色名 + 描述 + 音色下拉）+ 讨论轮数调节
   - 自动模式：折叠面板，显示提示文案
7. **Pipeline Client 集成**：自动模式下调用 `agent-profiles` API

## Impact

- **修改文件**：
  - `src/types/models.ts` — 扩展 ChildSettings 接口 + 新增常量
  - `src/services/openmaic/headers-builder.ts` — 新增 3 个 Headers
  - `src/services/openmaic/pipeline-types.ts` — 扩展 AgentInfo 类型 + 新增 `agent-profiles` PipelineStepName
  - `src/services/openmaic/pipeline-client.ts` — 新增 agent-profiles API 调用 + auto 模式编排
  - `src/pages/ParentDashboard.tsx` — 新增角色配置折叠面板 UI
  - `src/stores/childStore.ts` — 确认新字段持久化（无需修改）
- **新增文件**：
  - `src/types/__tests__/agent-voice-config.test.ts` — 音色和角色常量测试（12 tests）
  - `src/types/__tests__/child-settings-agents.test.ts` — ChildSettings 新字段测试（8 tests）
  - `src/services/openmaic/__tests__/headers-builder-agents.test.ts` — Headers 扩展测试（15 tests）
  - `src/services/openmaic/__tests__/pipeline-client-agents.test.ts` — Pipeline Agent API 测试（5 tests）
- **更新文件**：
  - `src/services/openmaic/__tests__/pipeline-types.test.ts` — 更新步骤数量检查（5→6）
- **API 依赖**：OpenMAIC 容器的 `/api/generate/agent-profiles` 端点（已存在）
- **外部依赖**：MiniMax TTS 系统音色（voice_id 来自 MiniMax 官方文档）
- **向后兼容**：现有配置无新字段时使用默认值，不影响已有用户
