## Why

当前 LittleStar 的学习内容由 `QuestionGenerator` 生成，仅能产出纯文本选择题（`{question, options, answer}`），缺少：
- 教学过程（只有测试，没有"教"）
- 多模态内容（无图片、无语音、无互动）
- TPR 肢体活动和拟声词等幼儿教学要素

与 OpenMAIC 产出的多模态课件（卡通插画 + TTS 语音 + TPR + 互动测验）相比，差距巨大。

## What Changes

引入 **"教导处 + OpenMAIC"双层架构**：

1. **教导处（LessonPlanner）**：新增课程规划模块，利用已有的课程大纲体系（35 个知识点 + 前置依赖图）、自适应路由、艾宾浩斯复习引擎，规划未来 3 天的学习内容，为每个知识点生成结构化的 `requirement` 文本
2. **OpenMAIC API Client**：封装对本机 Docker 部署的 OpenMAIC 服务的 API 调用，管理课堂缓存（IndexedDB），处理异步生成和状态轮询
3. **课堂渲染器**：解析 OpenMAIC 返回的课堂 JSON，用 React 组件渲染幻灯片、测验、TPR、音频等场景，UI 风格对齐 OpenMAIC
4. **学习流程重构**：重构 `useLearningFlow`，从教导处选课 → 缓存加载 → 课堂播放 → 答题回写闭环
5. **家长面板改造**：分层配置（基础展示 + 密码解锁高级设置），包含 LLM API 配置、OpenMAIC 服务状态、课程日历和手动调整
6. **废弃旧模块**：删除 QuestionGenerator、FlashCard、MultipleChoice，由新组件完全替代

## Impact

- **新增模块**：`src/services/lesson-planner/`、`src/services/openmaic/`、`src/components/classroom/`
- **重构模块**：`src/hooks/useLearningFlow.ts`、`src/pages/ParentDashboard.tsx`、`src/pages/LearningSession.tsx`、`src/pages/Home.tsx`
- **删除模块**：`src/services/ai/question-generator.ts`、`src/components/learning/FlashCard.tsx`、`src/components/learning/MultipleChoice.tsx`
- **保留模块**：Teacher AI（鼓励语）、WritingPad、反馈动画三件套、声音效果、TTS/STT 服务、TPRActivity
- **外部依赖**：本机 Docker 部署的 OpenMAIC 服务（Next.js + PostgreSQL），共用已有的 Qwen API Key
- **数据存储**：IndexedDB 新增 `lesson_cache`（课堂 JSON 缓存）和 `lesson_plan`（3 天课程计划）
