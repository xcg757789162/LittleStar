## Why

课堂页面中 **AI 教师语音不播放** 且 **教学插图不显示**，导致用户体验严重退化——幼儿面对一个无声、无图的空白课堂，无法进行任何有效学习。这是当前版本最高优先级的阻塞性 Bug，必须立即修复。

## What Changes

- **注入 TTS 通信桥脚本到 iframe**：通过 Nginx `sub_filter` 在 OpenMAIC iframe 页面中注入 JavaScript，拦截 iframe 内部的语音合成调用，将 TTS 请求以 `classroom:tts-request` postMessage 转发给宿主 LittleStar，由宿主层已有的 `ClassroomAudioService` 统一播放
- **注入图片生成代理脚本到 iframe**：通过 Nginx `sub_filter` 注入 JavaScript，拦截 iframe 内 `gen_img_*` 占位符的渲染，将图片生成请求以 `classroom:image-request` postMessage 转发给宿主层，由宿主层调用已配置好 API Key 的图片生成服务，完成后将结果图片 URL 回传 iframe
- **宿主层增加图片生成委托处理**：在 `useClassroomBridge` 或新 Hook 中监听 `classroom:image-request` 消息，调用宿主层图片生成服务（使用家长模块已配置的 API Key），生成完成后通过 `host:image-result` 回传 iframe
- **备选降级方案**：若 iframe 注入方案不可行，则改为在宿主层直接从课堂数据（`Classroom.scenes[].slides[]`）提取文本和图片占位符，宿主层自行驱动 TTS 播放和图片生成，不依赖 iframe postMessage

## Capabilities

### New Capabilities
- `iframe-tts-bridge`: 通过 Nginx 注入脚本在 iframe 内拦截 TTS 调用，转发给宿主层播放语音
- `iframe-image-bridge`: 通过 Nginx 注入脚本在 iframe 内拦截图片占位符渲染，委托宿主层生成图片并回传

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **Nginx 配置** (`docker/openmaic/nginx/default.conf`)：新增 `sub_filter` 规则注入 TTS 桥接和图片代理脚本
- **宿主层 Hooks** (`src/hooks/useClassroomBridge.ts`)：新增 `classroom:image-request` / `host:image-result` 消息处理
- **宿主层 Hooks** (`src/hooks/useClassroomNarration.ts`)：可能需要调整为同时支持 iframe 转发的 TTS 请求和宿主层自驱动的旁白
- **Docker 容器**：Nginx 配置变更后需重建容器
- **前端注入脚本**：新增静态 JS 文件或 inline script，通过 Nginx 注入到 iframe 页面
