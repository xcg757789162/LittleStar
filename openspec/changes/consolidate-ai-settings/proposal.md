# 整合 AI 设置到家长面板

## 概述

将分散在**课堂设置页面**和**家长高级设置**中的 AI 相关配置整合到一个统一入口：家长面板的"高级设置"中。

## 问题背景

当前 AI 设置分布在两个地方，导致用户体验碎片化：

### 课堂设置 (`ClassroomSettings.tsx`) 中的 AI 配置
1. **LLM 设置** - 大模型提供商、模型、API Key、Base URL
2. **TTS 语音设置** - 语音合成提供商、音色、语速
3. **图片生成设置** - 开关、提供商、API Key
4. **视频生成设置** - 开关

### 家长高级设置 (`ParentSettings.tsx` → `SettingsDialog`) 中的 AI 配置
1. **AI 对话设置** (providers) - 同 LLM 设置
2. **语音合成设置** (tts) - 同 TTS 设置
3. **语音识别设置** (asr) - STT 提供商
4. **发音评测设置** - 通过 `ParentDashboard.tsx` 的多提供商配置

这种分散导致：
- 用户困惑：不知道该去哪里配置
- 配置冲突：同一功能可能在两处都有设置
- 维护困难：代码重复，容易出现不一致

## 目标

1. **统一入口**：所有 AI 相关设置集中到家长面板的"高级设置"
2. **移除课堂设置中的 AI 配置**：简化课堂设置页面，只保留课堂角色、音色等播放体验设置
3. **整合配置体系**：合并 ChildSettings 和 OpenMAIC SettingsStore 的 AI 配置

## 设计原则

1. **单一职责**：课堂设置只管"上课体验"（角色、音色映射、互动），AI 能力配置放到家长设置
2. **向后兼容**：现有 ChildSettings 字段保持兼容，逐步迁移到 OpenMAIC SettingsStore
3. **配置同步**：保持 ChildSettings ↔ OpenMAIC SettingsStore 双向同步

## 受影响范围

### 页面
- `src/pages/ClassroomSettings.tsx` - 移除 LLM/TTS/图片/视频设置区块
- `src/pages/ParentSettings.tsx` - 增强 AI 设置入口描述
- `src/pages/ParentDashboard.tsx` - 清理多提供商配置（迁移到 SettingsDialog）

### 组件
- `src/components/openmaic/settings/` - 复用，不需改动
- `src/components/openmaic/settings/index.tsx` - 可能需要添加发音评测(ISE)设置 Tab

### 数据层
- `src/types/models.ts` (ChildSettings) - 保持，但标记部分字段为 deprecated
- `src/stores/openmaic/settings-sync.ts` - 调整同步逻辑

## 成功标准

1. 用户在家长面板→高级设置中可以配置所有 AI 服务
2. 课堂设置页面不再显示 LLM/TTS/图片/视频提供商配置
3. 原有配置数据自动迁移，无需用户重新配置
4. 课堂播放功能正常工作（从统一配置读取）
