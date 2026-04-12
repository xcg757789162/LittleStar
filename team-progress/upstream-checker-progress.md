# upstream-checker progress

- 状态: 已完成
- 负责任务: 核对 OpenMAIC upstream 子 API 现行契约
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC-upstream`

## TODO
- [x] 核对 `scene-outlines-stream` 请求与 SSE 响应结构
- [x] 核对 `scene-content` 请求与响应包装结构
- [x] 核对 `scene-actions` 请求与 `scene` 级返回结构
- [x] 核对 `tts` 必填 provider 参数与返回字段
- [x] 汇总 LittleStar 当前实现最致命的契约偏差

## 工作内容
- 核对 `app/api/generate/scene-outlines-stream/route.ts`，确认 upstream 当前要求请求体使用 `{ requirements }` 包裹，并通过 `text/event-stream` 返回 `outline` / `retry` / `done` / `error` 事件。
- 核对 `app/api/generate/scene-content/route.ts`，确认必填参数为 `outline`、`allOutlines`、`stageId`，返回结构为 `{ success: true, content, effectiveOutline }`。
- 核对 `app/api/generate/scene-actions/route.ts`，确认必填参数为 `outline`、`allOutlines`、`content`、`stageId`，返回结构为 `{ success: true, scene, previousSpeeches }`，其中 `scene` 已是完整组装结果。
- 核对 `app/api/generate/tts/route.ts`，确认必填参数为 `text`、`audioId`、`ttsProviderId`、`ttsVoice`，返回结构为 `{ success: true, audioId, base64, format }`。
- 汇总结论：LittleStar 当前最容易立即打断预生成流水线的 4 个点分别是 outlines 的 `{ requirements }` 包装、outline 元信息与旧类型守卫不匹配、content/actions 缺少 `allOutlines + stageId`、以及 TTS 缺 provider 参数并错误解析返回字段。

## 环境信息
- 本次仅做阅读与契约核对，未修改 upstream 代码
- 契约以 upstream route handler 为准，不以本仓旧测试或 mock 为准
