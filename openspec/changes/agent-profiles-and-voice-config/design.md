## Context

LittleStar（小星辰）的 ParentDashboard 已有"课堂角色模式"切换按钮（preset/auto），但缺少完整的角色配置和音色选择功能。Pipeline Client 子 API 调用链路已实现（大纲 → 内容 → 动作 → TTS），但 agent-profiles 调用和角色音色传递尚未实现。

本设计在现有 Pipeline 架构上扩展，补齐角色配置、音色选择、讨论轮数控制功能，并通过 HTTP Headers 传递给 OpenMAIC 后端。

### 当前架构

```
ParentDashboard
  └── classroomAgentMode: 'preset' | 'auto'  ← 仅有模式开关，无实际角色/音色配置
  └── Headers Builder
        └── x-agent-mode: 'preset' | 'auto'   ← 仅传模式，不传角色详情

Pipeline Client
  └── scene-outlines-stream → scene-content → scene-actions → tts
  └── ❌ 缺少 agent-profiles 调用
```

### 目标架构

```
ParentDashboard
  └── classroomAgentMode: 'preset' | 'auto'
  └── [preset] → 角色勾选面板 + 音色绑定 + 讨论轮数
  └── [auto]   → 提示文案（后端自动生成角色）
  └── Headers Builder
        └── x-agent-mode: 'preset' | 'auto'
        └── x-agent-profiles: JSON (角色列表 + 音色)  ← 新增
        └── x-teacher-voice: voice_id                 ← 新增
        └── x-max-discussion-rounds: number            ← 新增

Pipeline Client
  └── [auto] agent-profiles API → AgentInfo[]          ← 新增
  └── scene-outlines-stream → scene-content → scene-actions → tts
```

## Goals / Non-Goals

**Goals:**
- 定义 MiniMax TTS 音色常量池（12 个适合教育场景的官方系统音色）
- 定义 5 个预设课堂同学角色 + 1 个教师角色
- ChildSettings 扩展 4 个字段，支持角色/音色/轮数持久化
- Headers Builder 扩展 3 个新 Headers，传递角色配置给后端
- ParentDashboard 新增 U1 折叠面板（角色勾选 + 音色下拉 + 讨论轮数）
- Pipeline Client 自动模式下调用 agent-profiles API

**Non-Goals:**
- 不修改 OpenMAIC 后端容器
- 不实现自定义角色创建（仅预设角色勾选）
- 不实现角色头像上传
- 不实现音色试听功能（后续版本）

## Decisions

### D1: MiniMax TTS 音色筛选策略

**决策**：从 MiniMax 官方 100+ 系统音色中，筛选 12 个适合幼儿教育场景的音色，定义为前端常量。

**筛选标准**：
- 中文普通话音色（主要教学语言）
- 声音温和、不恐怖、不成人化
- 涵盖男女老少童声多样性
- 包含至少 2 个童声（增强课堂互动氛围）

**音色列表**：

| voice_id | 显示名 | 性别 | 适用场景 |
|----------|--------|------|---------|
| `female-tianmei` | 甜美女声 | 女 | 教师默认 |
| `female-chengshu` | 成熟女声 | 女 | 教师/助教 |
| `female-shaonv` | 少女音色 | 女 | 学生角色 |
| `female-yujie` | 知性女声 | 女 | 教师 |
| `male-qn-qingse` | 青涩青年 | 男 | 教师 |
| `male-qn-jingying` | 精英青年 | 男 | 助教 |
| `male-qn-daxuesheng` | 大学生音色 | 男 | 学生角色 |
| `clever_boy` | 聪明男童 | 男童 | 学生角色 |
| `cute_boy` | 可爱男童 | 男童 | 学生角色 |
| `lovely_girl` | 萌萌女童 | 女童 | 学生角色 |
| `Chinese (Mandarin)_Gentleman` | 温润男声 | 男 | 教师/思考者 |
| `Chinese (Mandarin)_Sweet_Lady` | 甜美淑女 | 女 | 教师 |

**理由**：
- 官方系统音色稳定，不会被删除
- 12 个足够覆盖所有角色需求，不会让家长选择困难
- 童声（clever_boy、cute_boy、lovely_girl）让课堂互动更自然

### D2: 预设角色定义

**决策**：定义 5 个预设课堂同学角色 + 1 个教师角色，每个角色有固定的 id、name、emoji、description、defaultVoice。

| id | name | emoji | description | defaultVoice |
|----|------|-------|-------------|-------------|
| `teacher` | AI 教师 | 👨‍🏫 | 主讲教师，引导课堂 | `female-tianmei` |
| `assistant` | AI 助教 | 🎯 | 辅助教师，补充讲解 | `male-qn-jingying` |
| `showoff` | 显眼包 | 🌟 | 活泼爱表现 | `clever_boy` |
| `curious` | 好奇宝宝 | 🤔 | 爱提问，追根究底 | `lovely_girl` |
| `notetaker` | 笔记员 | 📝 | 认真记录要点 | `female-shaonv` |
| `thinker` | 思考者 | 💭 | 深度分析，善于总结 | `Chinese (Mandarin)_Gentleman` |

**理由**：
- 教师角色固定必选，不可取消
- 5 个学生角色覆盖不同性格类型，让课堂讨论多样化
- 默认音色匹配角色性格（活泼角色用童声，思考角色用沉稳声音）

### D3: ChildSettings 扩展方案 — 混合数据源

**决策**：在 ChildSettings 中新增 4 个字段，角色定义来自前端常量，选择和音色映射来自用户设置。

```typescript
// ChildSettings 新增字段
selectedAgents: string[]              // 已勾选的角色 ID 列表（不含 teacher）
agentVoiceMap: Record<string, string> // 角色 ID → voice_id 映射
teacherVoice: string                  // 教师音色 voice_id
maxDiscussionRounds: number           // 最大讨论轮数（1-10）
```

**默认值**：
- `selectedAgents`: `['assistant', 'showoff', 'curious']`（默认启用 3 个角色）
- `agentVoiceMap`: `{}`（空表示用各角色的 defaultVoice）
- `teacherVoice`: `''`（空表示用教师的 defaultVoice）
- `maxDiscussionRounds`: `3`

**理由**：
- 角色定义（id、name、emoji、desc）是常量，不需要存数据库
- 只存用户选择和自定义配置，数据量小
- 空 agentVoiceMap 时自动 fallback 到 defaultVoice，减少存储

### D4: Headers 传递方案

**决策**：扩展 `buildHeadersFromSettings()` 函数，新增 3 个 Headers。

| Header | 类型 | 格式 | 示例 |
|--------|------|------|------|
| `x-agent-profiles` | JSON 字符串 | `[{id, name, emoji, description, voiceId}]` | `[{"id":"teacher","name":"AI 教师","voiceId":"female-tianmei"},...]` |
| `x-teacher-voice` | 字符串 | MiniMax voice_id | `female-tianmei` |
| `x-max-discussion-rounds` | 数字字符串 | 1-10 | `3` |

**`x-agent-profiles` 构建逻辑**：
1. 始终包含 teacher 角色
2. 从 PRESET_AGENTS 中取 selectedAgents 对应的角色
3. 每个角色的 voiceId = agentVoiceMap[id] || defaultVoice
4. 教师的 voiceId = teacherVoice || teacher.defaultVoice
5. 序列化为 JSON 字符串

**理由**：
- `x-agent-profiles` 用 JSON 包含完整角色信息，后端一次性解析
- `x-teacher-voice` 单独提出方便后端快速获取教师音色
- `x-max-discussion-rounds` 控制讨论深度

### D5: UI 布局 — U1 折叠面板

**决策**：在现有模式切换按钮下方，使用折叠面板展示角色配置。

```
┌──────────────────────────────────────┐
│  📋 预设角色      🎲 自动生成        │ ← 已有
├──────────────────────────────────────┤
│  [预设模式展开]                       │
│  👨‍🏫 AI 教师    音色：[▼ 甜美女声  ]│
│  ──── 课堂同学 ────                  │
│  ☑ 🎯 AI助教   音色：[▼ 精英青年  ]│
│  ☑ 🌟 显眼包   音色：[▼ 聪明男童  ]│
│  ☑ 🤔 好奇宝宝 音色：[▼ 萌萌女童  ]│
│  ☐ 📝 笔记员   音色：[▼ 少女音色  ]│
│  ☐ 💭 思考者   音色：[▼ 温润男声  ]│
│  🔄 讨论轮数：[ - ] 3 [ + ]          │
├──────────────────────────────────────┤
│  [自动模式展开]                       │
│  💡 系统将根据课程内容自动生成角色    │
│     音色和讨论轮数                    │
└──────────────────────────────────────┘
```

**样式约束**：
- 复用 ParentDashboard 现有设计语言（`T.sunOrange`、圆角 `16px`、渐变边框）
- 角色行高度统一，checkbox 用自定义样式（与幼儿 UI 一致）
- 下拉菜单使用 `<select>` 原生元素，加自定义样式
- 讨论轮数用 `+`/`-` 按钮，范围 1-10
- 动画使用 framer-motion `AnimatePresence` 展开/收起

**理由**：
- 列表式信息密度高，6 个角色 + 1 个教师一屏可见
- 与现有 ParentDashboard 设计语言统一
- 移动端天然适配窄屏

### D6: Pipeline Client agent-profiles 集成

**决策**：仅在 `auto` 模式下调用 `/api/generate/agent-profiles` API。`preset` 模式下直接使用前端配置。

**auto 模式调用流程**：
1. Pipeline Client 新增 `generateAgentProfiles(requirements, headers)` 方法
2. 调用 `POST /api/generate/agent-profiles`，传入 requirements + headers
3. 返回 `AgentInfo[]`（后端自动生成的角色列表）
4. 将返回的角色信息注入后续 headers 的 `x-agent-profiles`

**preset 模式**：
- 不调用 API
- 直接从 ChildSettings 构建 `x-agent-profiles` Header

**理由**：
- preset 模式角色已经确定，无需调用 API
- auto 模式需要 AI 根据课程内容智能生成角色
- 与 OpenMAIC 原版行为一致

## Risks / Trade-offs

### R1: MiniMax voice_id 变更

- **风险**：MiniMax 未来可能修改系统音色的 voice_id
- **缓解**：音色列表定义为前端常量，修改集中在一处；使用官方系统音色（比自定义音色更稳定）

### R2: agent-profiles API 格式不匹配

- **风险**：OpenMAIC 后端对 `x-agent-profiles` Header 的解析格式可能与我们的定义不同
- **缓解**：设计时参考 OpenMAIC 原生前端的 getApiHeaders() 实现；auto 模式下使用后端返回的格式，天然兼容

### R3: ChildSettings 字段膨胀

- **风险**：ChildSettings 已有 17+ 字段，再加 4 个会更臃肿
- **缓解**：新字段使用合理默认值（空对象/空数组），未配置时零开销；考虑后续重构为嵌套结构

### R4: 音色下拉列表长度

- **风险**：12 个音色在移动端下拉列表中可能偏长
- **缓解**：使用原生 `<select>`，移动端自动弹出系统选择器；考虑后续加分组（女声/男声/童声）

## Implementation Notes

### 实现偏差

1. **PIPELINE_STEP_NAMES 扩展**：design.md D6 未提及需要扩展 `PipelineStepName` 类型。实际实现中发现 `reportProgress()` 传入的 step 名称 `'agent-profiles'` 不在 `PIPELINE_STEP_NAMES` 常量中，导致 TypeScript 类型错误。修复：在 `pipeline-types.ts` 的 `PIPELINE_STEP_NAMES` 数组中新增 `'agent-profiles'` 条目（放在 `'outlines'` 之前），并更新对应的 pipeline-types 测试从 `toHaveLength(5)` 改为 `toHaveLength(6)`。

2. **AgentInfo 扩展字段**：实际实现中 `AgentInfo` 接口还额外新增了 `id?`、`emoji?`、`description?` 三个可选字段（除 `voiceId?` 外），以支持 agent-profiles API 返回完整角色信息。这些字段在 D4 中未列出但在 D6 的 auto 模式流程中隐含需要。

### 测试覆盖

| 测试文件 | 测试数 | 覆盖内容 |
|----------|--------|---------|
| `agent-voice-config.test.ts` | 12 | MINIMAX_VOICES 和 PRESET_AGENTS 常量完整性 |
| `child-settings-agents.test.ts` | 8 | ChildSettings 新字段类型和默认值 |
| `headers-builder-agents.test.ts` | 15 | 3 个新 Headers 构建逻辑和边界条件 |
| `pipeline-client-agents.test.ts` | 5 | generateAgentProfiles API 调用、重试、错误处理 |
| `pipeline-types.test.ts`（更新） | 27 | 包含 agent-profiles step name 验证 |
