# 开发者修复报告

## Bug 1: ASR 翻译 key 修复
- [x] 已修复
- 修改文件: `src/components/openmaic/settings/asr-settings.tsx`
- 修改内容: 第 298 行 `t('settings.ttsModel')` → `t('settings.asrModel')`，修正了 ASR 模型选择区域错误使用 TTS 翻译 key 的问题
- 额外修改: 在 4 个 i18n 翻译文件中新增 `settings.asrModel` 翻译 key
  - `zh-CN.json`: "ASR 模型"
  - `en-US.json`: "ASR Model"
  - `ja-JP.json`: "ASRモデル"
  - `ru-RU.json`: "Модель ASR"

## Bug 2: ISE 缺少输入框修复
- [x] 已修复
- 修改文件: `src/components/openmaic/settings/ise-settings.tsx`
- 修改内容: 在讯飞 ISE 配置区域（`selectedProviderId === 'iflytek-ise'`）内添加了两个缺失的输入框：
  1. **App ID 输入框** — 放在 API Key 之前，使用 `currentConfig.appId` 绑定，通过 `setISEProviderConfig` 更新
  2. **API Secret 输入框** — 放在 API Key 之后、Base URL 之前，带密码显示/隐藏切换（复用 `showApiKey` 状态），使用 `currentConfig.apiSecret` 绑定
- 现在 UI 与 `handleTestConnection` 函数所需的三个字段（appId, apiKey, apiSecret）完全对应

## 检查结果
- 两个文件均无 lint 错误
- 代码风格与现有代码保持一致
