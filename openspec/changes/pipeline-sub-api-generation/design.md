## Context

LittleStar（小星辰）是基于 OpenMAIC 的幼儿英语启蒙 App。当前课堂内容生成通过单一的 `/api/generate-classroom` 端点一次性完成，无法控制各生成步骤，也无法提供进度反馈。

OpenMAIC 容器内部提供了 7 个子 API 端点，其原生前端（generation-preview 页面）使用这些子 API 逐步生成课堂内容，功能更完整、控制更精细。本设计将 LittleStar 的生成流程对齐到这套子 API 架构。

### 当前架构

```
LittleStar → generate-classroom (单一 API) → OpenMAIC 内部处理全部步骤 → 返回完整 Classroom
```

### 目标架构

```
LittleStar Pipeline Client:
  Step 1: scene-outlines-stream (SSE) → SceneOutline[]
  Step 2: 对每个 outline:
    2a: scene-content → GeneratedContent
    2b: scene-actions → Scene (含 actions)
    2c: tts × N → AudioData[] (每个 speech action)
  Step 3: 组装完整 Classroom → 写入缓存
```

## Goals / Non-Goals

**Goals:**
- 实现子 API 逐步调用的 Pipeline Client（MVP：大纲 → 内容 → 动作 → TTS）
- 提供步骤级进度回调，方便前端展示生成状态
- 家长设置面板新增高级课堂配置（一次性配置，自动生效）
- requirement-generator 输出 OpenMAIC UserRequirements 格式
- 保留旧 API 作为降级路径

**Non-Goals:**
- 本次不实现 web-search（网络搜索）功能
- 本次不实现 agent-profiles（角色自动生成）功能
- 本次不实现 image/video（图片/视频生成）功能
- 不修改 OpenMAIC 容器内的任何 API

## Decisions

### D1: Pipeline Client 作为独立模块

**决策**：新增 `pipeline-client.ts` 和 `pipeline-types.ts`，与现有 `client.ts` 并存。

**理由**：
- `client.ts` 保留旧 API + 健康检查，可作降级路径
- Pipeline Client 职责独立，易于测试和维护
- 避免大规模修改现有代码

### D2: Headers 配置从 settingsStore 一次性读取

**决策**：Pipeline Client 初始化时从 `settingsStore` 读取所有模型配置，构建 Headers 对象，后续所有 API 调用复用。

**理由**：
- 家长配好后基本不动，无需每次传参
- 避免配置散落在多处
- 与 OpenMAIC 原生前端的 `getApiHeaders()` 模式一致

### D3: SSE 流式大纲解析使用 fetch + ReadableStream

**决策**：不使用 EventSource API，而是使用 `fetch` + `ReadableStream` 解析 SSE 流。

**理由**：
- EventSource 不支持自定义 Headers（我们需要传 x-model 等）
- fetch + ReadableStream 在现代浏览器中支持良好
- 可以更灵活地处理错误和中断

### D4: 重试策略 — 单步重试，最多 2 次

**决策**：每个子 API 调用失败时自动重试最多 2 次，带指数退避（1s, 2s）。

**理由**：
- 网络瞬断是常见场景，单次重试即可恢复
- 超过 2 次通常是服务端问题，不应无限重试
- 大纲步骤失败时降级到旧 API

### D5: TTS 串行生成

**决策**：MVP 阶段 TTS 按顺序串行调用（不并行）。

**理由**：
- 实现简单，避免并发控制复杂度
- 幼儿课堂场景数量有限（通常 3-5 个场景），TTS 数量不多
- 后续优化可改为有限并发（如 concurrency=3）

### D6: 高级课堂设置归入现有 settingsStore

**决策**：在现有 `ChildSettings` 中扩展字段，不新建单独的 store。

**理由**：
- 这些设置本质上是 child-level 的配置
- 复用现有的持久化机制（PostgreSQL）
- 避免增加不必要的 store 复杂度

## Risks / Trade-offs

### R1: SSE 解析复杂度
- **风险**：SSE 流式解析涉及文本拆分、事件类型判断、不完整数据处理
- **缓解**：参考 OpenMAIC 前端的解析逻辑，实现经过验证的解析方案

### R2: 子 API 接口变更
- **风险**：OpenMAIC 升级后子 API 参数可能变化
- **缓解**：类型定义独立在 `pipeline-types.ts`，修改集中；保留旧 API 降级路径

### R3: 生成时间变长
- **风险**：逐步调用比单一 API 多了多次 HTTP 往返
- **缓解**：SSE 流式大纲提供实时反馈；TTS 可后续优化为并发；进度回调让用户感知到进展

### R4: 部分步骤失败导致不完整课堂
- **风险**：大纲生成成功但某个场景内容生成失败
- **缓解**：失败场景标记为 error，返回部分完成的 Classroom 让上层决定是否使用；或全部回滚重试
