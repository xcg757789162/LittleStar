# 设计文档：整合 AI 设置到家长面板

## 架构设计

### 当前架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          配置入口                                    │
├────────────────────────────────┬────────────────────────────────────┤
│   课堂设置 (ClassroomSettings)  │  家长设置 (ParentSettings)         │
│   ├─ LLM 提供商/模型/ApiKey     │   └─ AI 设置按钮                   │
│   ├─ TTS 提供商/音色/语速       │       └─ SettingsDialog            │
│   ├─ 图片生成开关/提供商        │           ├─ providers (LLM)       │
│   ├─ 视频生成开关               │           ├─ tts                   │
│   ├─ Agent 模式/角色选择        │           ├─ asr                   │
│   └─ 音色映射/讨论轮数          │           ├─ image                 │
├────────────────────────────────┴───┬────────────────────────────────┤
│   ParentDashboard (高级设置区)      │                                │
│   ├─ LLM 多提供商选择              │                                │
│   ├─ TTS 多提供商选择              │                                │
│   ├─ STT 多提供商选择              │                                │
│   └─ ISE 多提供商选择              │                                │
└─────────────────────────────────────┴────────────────────────────────┘
                           ↓ 写入 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          数据层                                      │
├─────────────────────────────┬───────────────────────────────────────┤
│  ChildSettings (DB)          │  OpenMAIC SettingsStore (localStorage)│
│  ├─ llmProviderId/Model/Key  │  ├─ providerId/modelId/providersConfig│
│  ├─ ttsProviderId/Voice/Speed│  ├─ ttsProviderId/ttsProvidersConfig  │
│  ├─ imageProviderId/Key      │  ├─ imageProviderId/Config            │
│  └─ enableVideoGeneration    │  └─ videoProviderId/Config            │
└─────────────────────────────┴───────────────────────────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          配置入口                                    │
├────────────────────────────────┬────────────────────────────────────┤
│   课堂设置 (ClassroomSettings)  │  家长设置 (ParentSettings)         │
│   ├─ 用户资料卡(头像/昵称/简介) │   └─ 🤖 AI 服务设置按钮           │
│   ├─ Agent 模式/角色选择        │       └─ SettingsDialog (统一入口)│
│   ├─ 音色映射/教师音色          │           ├─ 🧠 AI 对话 (LLM)     │
│   └─ 讨论轮数                   │           ├─ 🔊 语音合成 (TTS)    │
│                                 │           ├─ 🎙️ 语音识别 (ASR)    │
│ 【移除】LLM/TTS/Image/Video     │           ├─ 📢 发音评测 (ISE)    │
│        配置已迁移到家长设置     │           ├─ 🖼️ 图片生成          │
│                                 │           ├─ 🎬 视频生成          │
│                                 │           └─ ⚙️ 通用设置          │
└─────────────────────────────────┴────────────────────────────────────┘
                                       ↓ 读写 ↓
┌─────────────────────────────────────────────────────────────────────┐
│              OpenMAIC SettingsStore (主数据源)                       │
│  ├─ providerId/modelId/providersConfig (LLM)                        │
│  ├─ ttsProviderId/ttsProvidersConfig (TTS)                          │
│  ├─ asrProviderId/asrProvidersConfig (ASR)                          │
│  ├─ iseProviderId/iseProvidersConfig (ISE) 【新增】                  │
│  ├─ imageProviderId/imageProvidersConfig                            │
│  └─ videoProviderId/videoProvidersConfig                            │
└─────────────────────────────────────────────────────────────────────┘
                        ↕ 同步 ↕ (settings-sync.ts)
┌─────────────────────────────────────────────────────────────────────┐
│              ChildSettings (DB - 部分字段 deprecated)                │
│  ├─ llmProviderId/Model/Key/BaseUrl  → 映射到 SettingsStore         │
│  ├─ ttsProviderId/Voice/Speed        → 映射到 SettingsStore         │
│  └─ enableImageGeneration/Video      → 映射到 SettingsStore         │
└─────────────────────────────────────────────────────────────────────┘
```

## 详细设计

### 1. ClassroomSettings.tsx 精简

**移除以下区块：**
- `LLM 设置` 区块（第 450-600 行左右）
- `TTS 语音设置` 区块（第 600-750 行左右）
- `图片生成设置` 区块
- `视频生成设置` 区块

**保留：**
- 用户资料卡（头像、昵称、自我介绍）
- Agent 模式切换（预设/自动）
- 同学选择器
- 音色映射（角色→音色）
- 教师音色选择
- 讨论轮数设置

**新增提示：**
在页面顶部添加提示卡片：
> 💡 AI 模型、语音合成等服务配置已移至「家长面板 → 高级设置」

### 2. ParentSettings.tsx 增强

**修改 AI 设置区块描述：**
```tsx
<section style={sectionStyle}>
  <h2>🤖 AI 服务设置</h2>
  <p>统一配置所有 AI 服务：大模型、语音合成、语音识别、发音评测、图片生成、视频生成</p>
  <Button onClick={() => setShowAISettings(true)}>
    ⚙️ 打开 AI 设置面板
  </Button>
</section>
```

### 3. SettingsDialog 增强

**新增 ISE (发音评测) 设置 Tab：**

在 `src/components/openmaic/settings/ise-settings.tsx` 中实现：
- 讯飞 ISE 配置（appId, apiKey, apiSecret）
- 文本匹配降级配置（无需 API Key）
- 默认提供商选择

**侧边栏新增：**
```tsx
<button onClick={() => setActiveSection('ise')}>
  <Mic2 className="h-4 w-4" />
  <span>{t('settings.iseSettings')}</span>  // 发音评测设置
</button>
```

### 4. 配置同步策略

**settings-sync.ts 修改：**

```ts
// 方向：OpenMAIC SettingsStore → ChildSettings (DB)
// 触发时机：SettingsStore 变更时
export function syncSettingsFromOpenMAIC(childId: string) {
  const settingsStore = useSettingsStore.getState()
  const childStore = useChildStore.getState()
  
  // LLM 配置同步
  const llmConfig = settingsStore.providersConfig[settingsStore.providerId]
  childStore.updateChildSettings(childId, {
    llmProviderId: settingsStore.providerId,
    llmModel: settingsStore.modelId,
    llmApiKey: llmConfig?.apiKey ?? '',
    llmBaseUrl: llmConfig?.baseUrl ?? '',
  })
  
  // TTS 配置同步
  const ttsConfig = settingsStore.ttsProvidersConfig[settingsStore.ttsProviderId]
  childStore.updateChildSettings(childId, {
    ttsProviderId: settingsStore.ttsProviderId,
    ttsApiKey: ttsConfig?.apiKey ?? '',
    ttsVoice: ttsConfig?.voiceId ?? '',
    ttsSpeed: ttsConfig?.speed ?? 1.0,
  })
  
  // Image/Video 配置同步...
}
```

### 5. ParentDashboard.tsx 清理

**移除高级设置区：**
- 移除 `selectedProviders` / `providerConfigs` 状态
- 移除多提供商配置 UI
- 移除 `expandedGroups` 逻辑

配置入口统一到 `ParentSettings.tsx` → `SettingsDialog`。

### 6. 数据迁移

首次加载时自动迁移：
1. 读取 ChildSettings 中的旧配置
2. 写入 OpenMAIC SettingsStore
3. 标记迁移完成（localStorage flag）

```ts
// 在 useInitializeApp.ts 中
export function migrateSettingsIfNeeded(child: Child) {
  const migrated = localStorage.getItem(`settings-migrated-${child.id}`)
  if (migrated) return
  
  const store = useSettingsStore.getState()
  const settings = child.settings
  
  // 迁移 LLM
  if (settings.llmProviderId && settings.llmApiKey) {
    store.setProviderConfig(settings.llmProviderId as ProviderId, {
      apiKey: settings.llmApiKey,
      baseUrl: settings.llmBaseUrl,
    })
    store.setModel(settings.llmProviderId as ProviderId, settings.llmModel)
  }
  
  // 迁移 TTS...
  
  localStorage.setItem(`settings-migrated-${child.id}`, 'true')
}
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/pages/ClassroomSettings.tsx` | 修改 | 移除 AI 配置区块，添加迁移提示 |
| `src/pages/ParentSettings.tsx` | 修改 | 增强 AI 设置入口描述 |
| `src/pages/ParentDashboard.tsx` | 修改 | 移除多提供商配置区块 |
| `src/components/openmaic/settings/index.tsx` | 修改 | 添加 ISE 设置 Tab |
| `src/components/openmaic/settings/ise-settings.tsx` | 新增 | ISE 发音评测设置组件 |
| `src/stores/openmaic/settings-sync.ts` | 修改 | 增强同步逻辑 |
| `src/hooks/useInitializeApp.ts` | 修改 | 添加数据迁移逻辑 |
| `src/lib/openmaic/store/settings.ts` | 修改 | 添加 ISE 配置字段 |
| `src/services/config.ts` | 修改 | ISE 提供商定义迁移到 SettingsStore |

## 测试策略

1. **单元测试**
   - `settings-sync.ts` 同步逻辑
   - 数据迁移函数

2. **集成测试**
   - E2E: 家长面板 → AI 设置 → 配置 LLM/TTS → 课堂播放验证

3. **回归测试**
   - 现有课堂播放功能
   - 发音评测功能
   - 语音合成功能
