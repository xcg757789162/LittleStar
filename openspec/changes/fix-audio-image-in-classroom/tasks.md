**⚠️ 本 Change 已废弃** — iframe 架构已被 OpenMAIC 原生迁移完全替代（openmaic-frontend-native-migration），所有 iframe 相关代码已删除。以下任务不再适用。

## 1. 创建 iframe 桥接脚本（已废弃）

- [ ] 1.1 创建 `docker/nginx/iframe-bridge.js` 文件，实现 TTS 桥接：Monkey Patch `speechSynthesis.speak()` 将文本以 `classroom:tts-request` postMessage 转发宿主层，并实现 5s 超时 fallback
- [ ] 1.2 在 `iframe-bridge.js` 中实现场景切换检测：使用 MutationObserver 监听课堂 DOM 变化，检测场景切换后发送 `classroom:scene-change` postMessage，页面首次加载时发送 `classroom:ready` + sceneIndex=0
- [ ] 1.3 在 `iframe-bridge.js` 中实现图片生成拦截：Monkey Patch `window.fetch` 拦截 `/api/generate-image` 请求，以 `classroom:image-request` postMessage 委托宿主层，监听 `host:image-result` 回传结果，30s 超时兜底
- [ ] 1.4 在 `iframe-bridge.js` 中实现 gen_img 占位符 DOM 监测：MutationObserver 检测 `gen_img_*` 占位符图片，替换为生成中占位 UI 并触发图片生成请求，缓存已发请求防重复

## 2. Nginx 配置修改

- [ ] 2.1 在 `docker/nginx/nginx.conf` 中添加 `/iframe-bridge.js` 静态文件 location 块
- [ ] 2.2 修改 `/openmaic/` location 块的 `sub_filter` 规则：将现有 inline 脚本迁移到 `iframe-bridge.js`，并注入 `<script src="/iframe-bridge.js"></script>` 标签

## 3. 宿主层 postMessage 协议扩展

- [ ] 3.1 在 `src/hooks/useClassroomBridge.ts` 中新增 `classroom:image-request` 消息类型、`ImageRequestPayload` 接口和运行时校验函数
- [ ] 3.2 在 `src/hooks/useClassroomBridge.ts` 中新增 `host:image-result` 指令类型，扩展 `ClassroomBridgeCallbacks` 增加 `onImageRequest` 回调
- [ ] 3.3 在 `src/pages/LearningSession.tsx` 中添加 `handleImageRequest` 回调，调用宿主层图片生成服务（复用家长模块 API Key 配置），完成后通过 `sendCommand('host:image-result', result)` 回传 iframe

## 4. Docker 重建与端到端验证

- [ ] 4.1 重建 Nginx 容器（`docker compose up -d --build nginx`），验证 `iframe-bridge.js` 可访问、注入标签出现在 iframe 页面 HTML 中
- [ ] 4.2 端到端验证 TTS：进入课堂页面，确认 AI 教师语音可正常播放（观察浏览器控制台 `[ClassroomAudio]` 日志）
- [ ] 4.3 端到端验证图片：进入课堂页面，确认教学插图从 "生成中..." 状态变为实际图片显示
