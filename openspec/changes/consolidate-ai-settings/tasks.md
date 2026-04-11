# 任务清单：整合 AI 设置到家长面板

## 任务总览

| ID | 任务 | 优先级 | 预估 | 依赖 |
|----|------|--------|------|------|
| T1 | 新增 ISE 设置组件 | P1 | 1h | - |
| T2 | SettingsDialog 添加 ISE Tab | P1 | 0.5h | T1 |
| T3 | ClassroomSettings 移除 AI 配置区块 | P0 | 1h | - |
| T4 | ParentSettings 增强入口描述 | P2 | 0.5h | - |
| T5 | ParentDashboard 移除多提供商配置 | P1 | 1h | T2 |
| T6 | settings-sync 增强同步逻辑 | P1 | 1h | - |
| T7 | 数据迁移逻辑 | P1 | 1h | T6 |
| T8 | E2E 测试验证 | P2 | 1h | T3, T5 |

---

## T1: 新增 ISE 设置组件

**目标**：创建发音评测 (ISE) 设置面板组件

**文件**：`src/components/openmaic/settings/ise-settings.tsx` (新增)

**实现要点**：
1. 参考 `asr-settings.tsx` 实现结构
2. ISE 提供商列表：
   - `iflytek-ise`: 讯飞口语评测（需要 appId, apiKey, apiSecret）
   - `text-match-fallback`: 文本匹配降级（免费，无需配置）
3. 配置字段：
   - 选中提供商
   - 讯飞配置：App ID、API Key、API Secret
4. 连接测试按钮

**验收标准**：
- [ ] ISE 设置面板可正常渲染
- [ ] 讯飞配置可保存到 SettingsStore
- [ ] 切换提供商时 UI 正确更新

---

## T2: SettingsDialog 添加 ISE Tab

**目标**：在 AI 设置弹窗侧边栏添加"发音评测"入口

**文件**：`src/components/openmaic/settings/index.tsx` (修改)

**实现要点**：
1. 导入 ISESettings 组件
2. 添加 activeSection = 'ise' 分支
3. 侧边栏新增按钮（在 ASR 下方）
4. 添加 ISE 提供商列表列（参考 ASR）

**验收标准**：
- [ ] 点击"发音评测"显示 ISE 设置面板
- [ ] ISE 提供商列表正确显示
- [ ] 配置保存后持久化

---

## T3: ClassroomSettings 移除 AI 配置区块

**目标**：精简课堂设置页面，移除 AI 服务配置

**文件**：`src/pages/ClassroomSettings.tsx` (修改)

**移除区块**：
1. LLM 设置区块（~150 行）
   - 删除 LLM 提供商选择器
   - 删除模型输入框
   - 删除 API Key 输入框
   - 删除 Base URL 输入框
2. TTS 设置区块（~100 行）
   - 删除 TTS 提供商选择器
   - 删除 API Key 输入框
   - 保留音色选择（用于角色音色映射）
3. 图片生成设置（~50 行）
   - 删除开关
   - 删除提供商选择
   - 删除 API Key
4. 视频生成设置（~30 行）
   - 删除开关

**保留**：
- 用户资料卡
- Agent 模式切换
- 同学选择器
- 音色映射（VoicePicker 保留）
- 讨论轮数

**新增**：
在页面顶部添加提示卡片：
```tsx
<div style={{ padding: '12px 16px', borderRadius: '14px', background: '#FFF3CD', marginBottom: '20px' }}>
  💡 AI 模型、语音合成等服务配置已移至「家长面板 → 高级设置」
</div>
```

**验收标准**：
- [ ] 页面不再显示 LLM/TTS/Image/Video 配置区块
- [ ] 页面显示迁移提示
- [ ] 音色选择功能正常（从统一配置读取）
- [ ] Agent 模式/角色选择正常

---

## T4: ParentSettings 增强入口描述

**目标**：优化 AI 设置入口的描述文案

**文件**：`src/pages/ParentSettings.tsx` (修改)

**修改内容**：
```tsx
{/* AI 服务统一设置 */}
<section style={sectionStyle}>
  <h2 style={...}>🤖 AI 服务设置</h2>
  <p style={{ fontSize: '13px', color: T.textLight, margin: '0 0 14px' }}>
    统一配置所有 AI 服务：大模型对话、语音合成、语音识别、发音评测、图片生成、视频生成
  </p>
  <motion.button ...>
    ⚙️ 打开 AI 设置面板
  </motion.button>
</section>
```

**验收标准**：
- [ ] 描述文案包含所有 AI 服务类型
- [ ] 点击按钮正常打开 SettingsDialog

---

## T5: ParentDashboard 移除多提供商配置

**目标**：清理家长仪表盘中冗余的多提供商配置 UI

**文件**：`src/pages/ParentDashboard.tsx` (修改)

**移除内容**：
1. 状态变量：
   - `selectedProviders`
   - `providerConfigs`
   - `expandedGroups`
2. 配置 UI 区块（高级设置展开区）
3. `SERVICE_TYPES` 导入
4. `getProvidersForService` 等函数调用

**保留**：
- 今日学习统计
- 科目掌握率
- 缓存状态
- 服务在线状态检测
- PIN 验证（用于进入高级设置）

**验收标准**：
- [ ] 页面不再显示多提供商配置区块
- [ ] 统计数据正常显示
- [ ] 高级设置入口（跳转到 ParentSettings）正常

---

## T6: settings-sync 增强同步逻辑

**目标**：优化 OpenMAIC SettingsStore ↔ ChildSettings 双向同步

**文件**：`src/stores/openmaic/settings-sync.ts` (修改)

**实现要点**：
1. 新增 `syncFromOpenMAICToChild(childId: string)` 函数
   - 读取 SettingsStore 中的配置
   - 更新 ChildSettings（通过 childStore.updateChildSettings）
2. 修改 `syncSettingsToOpenMAIC()`
   - 触发时机：ChildSettings 变更时
   - 方向：ChildSettings → SettingsStore
3. SettingsStore 订阅变更 → 自动同步到 ChildSettings

**验收标准**：
- [ ] 在 SettingsDialog 修改 LLM 配置后，ChildSettings 同步更新
- [ ] 在 SettingsDialog 修改 TTS 配置后，ChildSettings 同步更新
- [ ] 课堂播放时能正确读取配置

---

## T7: 数据迁移逻辑

**目标**：首次加载时自动将旧 ChildSettings 迁移到 SettingsStore

**文件**：`src/hooks/useInitializeApp.ts` (修改)

**实现要点**：
1. 新增 `migrateSettingsIfNeeded(child: Child)` 函数
2. 迁移判断：`localStorage.getItem(\`settings-migrated-\${child.id}\`)`
3. 迁移内容：
   - LLM: llmProviderId → providerId, llmModel → modelId, llmApiKey/BaseUrl → providersConfig
   - TTS: ttsProviderId, ttsApiKey, ttsVoice, ttsSpeed → ttsProvidersConfig
   - Image: imageProviderId, imageApiKey → imageProvidersConfig
4. 迁移完成后设置标记

**验收标准**：
- [ ] 新用户无迁移动作
- [ ] 老用户首次加载自动迁移
- [ ] 迁移后原有配置生效
- [ ] 重复加载不会重复迁移

---

## T8: E2E 测试验证

**目标**：验证整合后的完整流程

**测试场景**：
1. **配置流程**
   - 进入家长面板 → 设置 → 打开 AI 设置
   - 配置 LLM（选择提供商、输入 API Key）
   - 配置 TTS（选择提供商、选择音色）
   - 配置 ISE（讯飞配置）
   - 保存关闭

2. **课堂播放验证**
   - 进入课堂设置，确认无 AI 配置区块
   - 选择知识点开始学习
   - 验证 TTS 播放正常
   - 验证图片生成正常（如果启用）

3. **发音评测验证**
   - 进入跟读环节
   - 验证发音评测功能正常

**验收标准**：
- [ ] 配置流程顺畅
- [ ] 课堂 TTS 播放正常
- [ ] 课堂图片生成正常
- [ ] 发音评测正常

---

## 执行顺序建议

```
T6 (sync) ──┐
            ├─► T7 (migration) ──┐
T1 (ISE) ──► T2 (Dialog) ──┐     │
                           ├─────┼─► T8 (E2E)
T3 (Classroom) ────────────┤     │
T4 (ParentSettings) ───────┤     │
T5 (Dashboard) ────────────┘     │
                                 ↑
                            并行执行
```

推荐先完成 T6、T7 确保数据层稳定，然后并行执行 T1-T5 的 UI 改动，最后 T8 验收。
