# HTTP Headers 扩展规格

## 现有 Headers（不变）

| Header | 来源字段 | 说明 |
|--------|---------|------|
| `x-model` | llmModel | LLM 模型标识 |
| `x-api-key` | llmApiKey | LLM API Key |
| `x-base-url` | llmBaseUrl | LLM Base URL（可选） |
| `x-tts-enabled` | enableTTS | TTS 开关 |
| `x-tts-provider` | ttsProviderId | TTS 服务商 |
| `x-tts-voice` | ttsVoice | TTS 全局默认音色 |
| `x-tts-speed` | ttsSpeed | TTS 语速 |
| `x-image-generation-enabled` | enableImageGeneration | 图片生成开关 |
| `x-video-generation-enabled` | enableVideoGeneration | 视频生成开关 |
| `x-agent-mode` | classroomAgentMode | Agent 模式（preset/auto） |

## 新增 Headers

### `x-agent-profiles`

| 属性 | 值 |
|------|-----|
| Header 名 | `x-agent-profiles` |
| 类型 | JSON 字符串 |
| 条件 | 仅 `x-agent-mode: preset` 时发送 |
| 格式 | `AgentProfileHeader[]` 数组的 JSON 序列化 |

**AgentProfileHeader 结构**：

```typescript
interface AgentProfileHeader {
  id: string          // 角色 ID
  name: string        // 角色名称
  emoji: string       // 角色 emoji
  description: string // 角色描述
  voiceId: string     // MiniMax voice_id
}
```

**构建逻辑**：

```typescript
function buildAgentProfilesHeader(settings: ChildSettings): string {
  const profiles: AgentProfileHeader[] = []

  // 1. 始终包含教师
  const teacher = PRESET_AGENTS.find(a => a.id === 'teacher')!
  profiles.push({
    id: teacher.id,
    name: teacher.name,
    emoji: teacher.emoji,
    description: teacher.description,
    voiceId: settings.teacherVoice || teacher.defaultVoice,
  })

  // 2. 包含已勾选的学生角色
  for (const agentId of settings.selectedAgents) {
    const agent = PRESET_AGENTS.find(a => a.id === agentId)
    if (agent) {
      profiles.push({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        description: agent.description,
        voiceId: settings.agentVoiceMap[agentId] || agent.defaultVoice,
      })
    }
  }

  return JSON.stringify(profiles)
}
```

**auto 模式**：不发送此 Header。后端调用 agent-profiles API 自动生成角色后，Pipeline Client 将返回的角色信息注入此 Header。

### `x-teacher-voice`

| 属性 | 值 |
|------|-----|
| Header 名 | `x-teacher-voice` |
| 类型 | 字符串 |
| 条件 | 始终发送 |
| 值 | `settings.teacherVoice || 'female-tianmei'` |
| 用途 | 后端快速获取教师音色，无需解析 x-agent-profiles |

### `x-max-discussion-rounds`

| 属性 | 值 |
|------|-----|
| Header 名 | `x-max-discussion-rounds` |
| 类型 | 数字字符串 |
| 条件 | 始终发送 |
| 值 | `String(settings.maxDiscussionRounds)` |
| 范围 | 1-10（默认 3） |
| 用途 | 控制课堂讨论最大轮数 |

## 完整 Headers 示例

### preset 模式

```
x-model: openai:gpt-4o
x-api-key: sk-xxxx
x-tts-enabled: true
x-tts-speed: 1
x-agent-mode: preset
x-agent-profiles: [{"id":"teacher","name":"AI 教师","emoji":"👨‍🏫","description":"主讲教师，引导课堂节奏和知识讲解","voiceId":"female-tianmei"},{"id":"assistant","name":"AI 助教","emoji":"🎯","description":"辅助老师，帮忙补充讲解和引导互动","voiceId":"male-qn-jingying"},{"id":"showoff","name":"显眼包","emoji":"🌟","description":"活泼爱表现，经常抢答和分享","voiceId":"clever_boy"}]
x-teacher-voice: female-tianmei
x-max-discussion-rounds: 3
```

### auto 模式

```
x-model: openai:gpt-4o
x-api-key: sk-xxxx
x-tts-enabled: true
x-tts-speed: 1
x-agent-mode: auto
x-teacher-voice: female-tianmei
x-max-discussion-rounds: 3
```

> auto 模式下不传 `x-agent-profiles`。Pipeline Client 调用 agent-profiles API 后，将返回的角色信息注入后续请求的 headers。
