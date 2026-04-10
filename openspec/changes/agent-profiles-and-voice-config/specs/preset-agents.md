# 预设课堂角色规格

## 角色设计理念

OpenMAIC 的课堂模拟中，多个 AI 角色互动讨论以增强教学效果。角色设计遵循：

1. **教师主导**：1 个教师角色作为课堂主导，不可取消
2. **学生多样**：5 个学生角色覆盖不同性格类型，模拟真实课堂讨论
3. **幼儿友好**：名称和描述简洁、正面，emoji 图标直观

## TypeScript 接口

```typescript
interface PresetAgent {
  /** 角色唯一 ID */
  id: string
  /** 角色名称（中文） */
  name: string
  /** 角色图标 */
  emoji: string
  /** 角色描述 */
  description: string
  /** 默认 MiniMax 音色 voice_id */
  defaultVoice: string
  /** 是否为教师角色（教师不可取消） */
  isTeacher: boolean
}
```

## 角色定义

### 教师角色（必选）

| 字段 | 值 |
|------|-----|
| id | `teacher` |
| name | AI 教师 |
| emoji | 👨‍🏫 |
| description | 主讲教师，引导课堂节奏和知识讲解 |
| defaultVoice | `female-tianmei` |
| isTeacher | `true` |

> 教师角色始终参与课堂，家长只能修改其音色，不能取消。

### 学生角色（可选，默认 3/5 启用）

#### 🎯 AI 助教

| 字段 | 值 |
|------|-----|
| id | `assistant` |
| name | AI 助教 |
| emoji | 🎯 |
| description | 辅助老师，帮忙补充讲解和引导互动 |
| defaultVoice | `male-qn-jingying` |
| isTeacher | `false` |
| 默认启用 | ✅ 是 |

#### 🌟 显眼包

| 字段 | 值 |
|------|-----|
| id | `showoff` |
| name | 显眼包 |
| emoji | 🌟 |
| description | 活泼爱表现，经常抢答和分享 |
| defaultVoice | `clever_boy` |
| isTeacher | `false` |
| 默认启用 | ✅ 是 |

#### 🤔 好奇宝宝

| 字段 | 值 |
|------|-----|
| id | `curious` |
| name | 好奇宝宝 |
| emoji | 🤔 |
| description | 爱提问，追根究底，常问"为什么" |
| defaultVoice | `lovely_girl` |
| isTeacher | `false` |
| 默认启用 | ✅ 是 |

#### 📝 笔记员

| 字段 | 值 |
|------|-----|
| id | `notetaker` |
| name | 笔记员 |
| emoji | 📝 |
| description | 认真记录要点，帮助整理和总结 |
| defaultVoice | `female-shaonv` |
| isTeacher | `false` |
| 默认启用 | ❌ 否 |

#### 💭 思考者

| 字段 | 值 |
|------|-----|
| id | `thinker` |
| name | 思考者 |
| emoji | 💭 |
| description | 深度分析，善于总结规律和对比 |
| defaultVoice | `Chinese (Mandarin)_Gentleman` |
| isTeacher | `false` |
| 默认启用 | ❌ 否 |

## 默认配置

```typescript
// 默认启用的角色（不含 teacher，teacher 始终启用）
const DEFAULT_SELECTED_AGENTS = ['assistant', 'showoff', 'curious']

// 默认讨论轮数
const DEFAULT_MAX_DISCUSSION_ROUNDS = 3  // 范围 1-10
```

## x-agent-profiles Header 格式

preset 模式下，`x-agent-profiles` Header 的 JSON 格式：

```json
[
  {
    "id": "teacher",
    "name": "AI 教师",
    "emoji": "👨‍🏫",
    "description": "主讲教师，引导课堂节奏和知识讲解",
    "voiceId": "female-tianmei"
  },
  {
    "id": "assistant",
    "name": "AI 助教",
    "emoji": "🎯",
    "description": "辅助老师，帮忙补充讲解和引导互动",
    "voiceId": "male-qn-jingying"
  },
  {
    "id": "showoff",
    "name": "显眼包",
    "emoji": "🌟",
    "description": "活泼爱表现，经常抢答和分享",
    "voiceId": "clever_boy"
  },
  {
    "id": "curious",
    "name": "好奇宝宝",
    "emoji": "🤔",
    "description": "爱提问，追根究底，常问"为什么"",
    "voiceId": "lovely_girl"
  }
]
```

> 注意：只包含教师 + 已勾选的角色。未勾选的角色不出现在 JSON 中。
