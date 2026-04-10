## Why

当前 LittleStar 调用 OpenMAIC 生成课堂内容时，使用单一的 `/api/generate-classroom` 端点一次性生成整个课堂。这种方式存在以下问题：

1. **黑盒生成**：无法控制生成过程中的每个步骤（大纲、内容、动作、TTS、媒体），一旦失败需要全部重来
2. **缺乏进度反馈**：用户无法知道生成进行到哪一步，体验差
3. **无法精细控制**：无法单独启用/禁用 TTS、图片生成、视频生成等功能
4. **与 OpenMAIC 原生前端能力脱节**：OpenMAIC 自身的 generation-preview 页面使用子 API 逐步生成，功能更完整

## What Changes

实现"方案 B：走子 API 逐步生成"——LittleStar 将像 OpenMAIC 原生前端一样，逐个调用 7 个子 API 端点，实现完整的课堂内容生成控制：

1. **新增 `pipeline-client.ts`**：封装 7 个子 API（web-search、agent-profiles、scene-outlines-stream、scene-content、scene-actions、tts、image/video）的调用逻辑
2. **新增 OpenMAIC 子 API 类型定义**：UserRequirements、SceneOutline、AgentInfo、GeneratedContent 等
3. **修改 `scheduler.ts`**：集成新 Pipeline Client 替代旧的单一 API 调用
4. **修改 `requirement-generator.ts`**：支持生成 `UserRequirements` 格式（含 userNickname、userBio）
5. **修改 `usePreGeneration.ts`**：适配新的逐步生成流程，提供步骤级进度回调
6. **扩展家长设置**：新增高级课堂设置（TTS、图片/视频开关、Agent 模式等），一次性配置后自动应用

### 分阶段实施

- **阶段 1（MVP）**：核心链路 — 大纲 → 内容 → 动作 → TTS（不含 web search、agent 自动生成、图片/视频生成）
- **阶段 2（完整版）**：全功能（web search、agent 自动生成、图片/视频生成）— 后续变更单独处理

本次变更仅实施阶段 1（MVP）。

## Impact

- **新增文件**：`src/services/openmaic/pipeline-client.ts`、`src/services/openmaic/pipeline-types.ts`
- **修改文件**：`src/services/openmaic/types.ts`、`src/services/openmaic/client.ts`（保留旧 API 作降级）、`src/services/lesson-planner/scheduler.ts`、`src/services/lesson-planner/requirement-generator.ts`、`src/hooks/usePreGeneration.ts`、`src/types/models.ts`、`src/pages/ParentDashboard.tsx`、`src/stores/settingsStore.ts`
- **API 依赖**：OpenMAIC 容器的 7 个子 API 端点（已存在，无需修改后端）
- **向后兼容**：保留旧的 `generate-classroom` API 作为降级路径
