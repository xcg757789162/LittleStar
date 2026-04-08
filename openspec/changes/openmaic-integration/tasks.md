## 1. OpenMAIC Docker 部署与配置 <!-- 轻量任务组：跳过独立审查，变更纳入后续任务组统一审查 -->

- [x] 1.1 创建 OpenMAIC Docker 部署配置  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 1.1.1 执行变更：创建 `docker/openmaic/docker-compose.yml` 和 `docker/openmaic/.env.example`，配置 OpenMAIC 服务（Next.js + PostgreSQL），设置 Qwen API 环境变量
  - [x] 1.1.2 验证无回归（运行：`cd docker/openmaic && docker-compose config`，确认配置语法正确）
  - [x] 1.1.3 检查：确认 docker-compose.yml 包含所有必要服务（app、db），端口映射（3000）、环境变量、卷挂载配置完整

## 2. OpenMAIC API Client 集成层

- [x] 2.1 定义 OpenMAIC 数据类型  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.1.1 写失败测试：`src/services/openmaic/__tests__/types.test.ts`（验证类型导出和类型守卫函数）
  - [x] 2.1.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/types.test.ts`，确认失败原因是缺少模块）
  - [x] 2.1.3 写最小实现：`src/services/openmaic/types.ts`（Classroom、Scene、Slide、SlideType 等类型定义 + 类型守卫函数）
  - [x] 2.1.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/types.test.ts`，确认所有测试通过）
  - [x] 2.1.5 重构：整理类型命名、添加 JSDoc 注释

- [x] 2.2 实现 OpenMAIC API Client  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.2.1 写失败测试：`src/services/openmaic/__tests__/client.test.ts`（测试 generateClassroom、getClassroom、getClassroomStatus 方法，mock fetch）
  - [x] 2.2.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/client.test.ts`，确认失败原因是缺少模块）
  - [x] 2.2.3 写最小实现：`src/services/openmaic/client.ts`（封装 HTTP 调用 /api/generate-classroom、/api/classroom/[id]，含轮询逻辑和重试机制）
  - [x] 2.2.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/client.test.ts`，确认所有测试通过）
  - [x] 2.2.5 重构：提取配置常量、优化错误处理

- [x] 2.3 实现课堂缓存管理  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 2.3.1 写失败测试：`src/services/openmaic/__tests__/cache.test.ts`（测试 saveClassroom、getClassroom、listCachedClassrooms、deleteClassroom、clearExpiredCache 方法）
  - [x] 2.3.2 验证测试失败（运行：`npx vitest run src/services/openmaic/__tests__/cache.test.ts`，确认失败原因是缺少模块）
  - [x] 2.3.3 写最小实现：`src/services/openmaic/cache.ts`（IndexedDB 存储层，lesson_cache 表，按 knowledgeNodeId + date 索引）
  - [x] 2.3.4 验证测试通过（运行：`npx vitest run src/services/openmaic/__tests__/cache.test.ts`，确认所有测试通过）
  - [x] 2.3.5 重构：提取 IndexedDB 操作工具函数、添加缓存过期清理逻辑

- [x] 2.4 导出模块入口  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 2.4.1 执行变更：创建 `src/services/openmaic/index.ts`，统一导出 types、client、cache
  - [x] 2.4.2 验证无回归（运行：`npx vitest run`，确认全量测试通过）
  - [x] 2.4.3 检查：确认所有公开 API 均通过 index.ts 导出

- [x] 2.5 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 1 + 2 的所有变更文件（含 docker 配置 + openmaic 服务模块）
    - `{BASE_SHA}` → 任务组 1 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 3. 教导处（LessonPlanner）核心模块

- [x] 3.1 实现 Requirement 生成器  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.1.1 写失败测试：`src/services/lesson-planner/__tests__/requirement-generator.test.ts`（测试根据 KnowledgeNode + ChildProfile + masteryLevel 生成结构化 requirement 文本）
  - [x] 3.1.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/requirement-generator.test.ts`，确认失败原因是缺少模块）
  - [x] 3.1.3 写最小实现：`src/services/lesson-planner/requirement-generator.ts`（根据知识点信息、模板提示、孩子画像、掌握率生成 requirement 文本，支持新知识教学和加固复习两种模式）
  - [x] 3.1.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/requirement-generator.test.ts`，确认所有测试通过）
  - [x] 3.1.5 重构：提取 requirement 模板为可配置结构

- [x] 3.2 实现课程规划引擎  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.2.1 写失败测试：`src/services/lesson-planner/__tests__/planner.test.ts`（测试 planLessons：给定课程体系+掌握率+复习队列，输出未来 3 天的知识点学习序列）
  - [x] 3.2.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/planner.test.ts`，确认失败原因是缺少模块）
  - [x] 3.2.3 写最小实现：`src/services/lesson-planner/planner.ts`（读取 AdaptiveRouter 推荐 + 艾宾浩斯复习队列 + 掌握率，按优先级排出 3 天课程序列，每天 3-5 个知识点）
  - [x] 3.2.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/planner.test.ts`，确认所有测试通过）
  - [x] 3.2.5 重构：优化优先级排序算法、处理边界情况（所有知识点已掌握等）

- [x] 3.3 实现生成调度器  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.3.1 写失败测试：`src/services/lesson-planner/__tests__/scheduler.test.ts`（测试批量提交生成、轮询管理、缓存写入、失败重试逻辑）
  - [x] 3.3.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/scheduler.test.ts`，确认失败原因是缺少模块）
  - [x] 3.3.3 写最小实现：`src/services/lesson-planner/scheduler.ts`（调用 OpenMAIC Client 批量提交 requirement、管理异步轮询、成功后写入缓存、失败重试最多 3 次）
  - [x] 3.3.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/scheduler.test.ts`，确认所有测试通过）
  - [x] 3.3.5 重构：提取重试策略为可配置参数

- [x] 3.4 实现动态调整器  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 3.4.1 写失败测试：`src/services/lesson-planner/__tests__/adjuster.test.ts`（测试根据答题结果动态调整课程：掌握率低→加固、掌握率高→跳过、更新缓存队列）
  - [x] 3.4.2 验证测试失败（运行：`npx vitest run src/services/lesson-planner/__tests__/adjuster.test.ts`，确认失败原因是缺少模块）
  - [x] 3.4.3 写最小实现：`src/services/lesson-planner/adjuster.ts`（监测答题结果，掌握率 < 0.5 → 生成加固课，掌握率 ≥ 0.8 → 可跳过，更新 lesson_plan）
  - [x] 3.4.4 验证测试通过（运行：`npx vitest run src/services/lesson-planner/__tests__/adjuster.test.ts`，确认所有测试通过）
  - [x] 3.4.5 重构：统一阈值配置、优化调整策略

- [x] 3.5 导出模块入口  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 3.5.1 执行变更：创建 `src/services/lesson-planner/index.ts`，统一导出 requirement-generator、planner、scheduler、adjuster
  - [x] 3.5.2 验证无回归（运行：`npx vitest run`，确认全量测试通过）
  - [x] 3.5.3 检查：确认所有公开 API 均通过 index.ts 导出

- [x] 3.6 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 3 的所有变更文件
    - `{BASE_SHA}` → 任务组 3 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 4. 课堂渲染器组件

- [x] 4.1 实现基础 Slide 组件（TeachingSlide + ImageSlide）  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.1.1 写失败测试：`src/components/classroom/__tests__/TeachingSlide.test.tsx` 和 `src/components/classroom/__tests__/ImageSlide.test.tsx`（测试渲染教学内容、图片展示、TTS 触发）
  - [x] 4.1.2 验证测试失败（运行：`npx vitest run src/components/classroom/__tests__/`，确认失败原因是缺少组件）
  - [x] 4.1.3 写最小实现：`src/components/classroom/TeachingSlide.tsx` 和 `src/components/classroom/ImageSlide.tsx`（渐变背景、大卡通图、大字号、TTS 自动朗读、拟声词展示）
  - [x] 4.1.4 验证测试通过（运行：`npx vitest run src/components/classroom/__tests__/`，确认所有测试通过）
  - [x] 4.1.5 重构：提取共享样式和布局组件

- [x] 4.2 实现 QuizSlide 互动测验组件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.2.1 写失败测试：`src/components/classroom/__tests__/QuizSlide.test.tsx`（测试渲染配图选择题、选择反馈、答题数据回调、与 FeedbackAnimation 集成）
  - [x] 4.2.2 验证测试失败（运行：`npx vitest run src/components/classroom/__tests__/QuizSlide.test.tsx`，确认失败原因是缺少组件）
  - [x] 4.2.3 写最小实现：`src/components/classroom/QuizSlide.tsx`（配图圆润选项按钮、即时反馈动画、答题结果回调 onAnswer）
  - [x] 4.2.4 验证测试通过（运行：`npx vitest run src/components/classroom/__tests__/QuizSlide.test.tsx`，确认所有测试通过）
  - [x] 4.2.5 重构：优化触摸交互、统一反馈动画接口

- [x] 4.3 实现 TPRSlide 和 AudioSlide 组件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.3.1 写失败测试：`src/components/classroom/__tests__/TPRSlide.test.tsx` 和 `src/components/classroom/__tests__/AudioSlide.test.tsx`（测试 TPR 指令渲染和动画引导、音频播放和跟读）
  - [x] 4.3.2 验证测试失败（运行：`npx vitest run src/components/classroom/__tests__/`，确认失败原因是缺少组件）
  - [x] 4.3.3 写最小实现：`src/components/classroom/TPRSlide.tsx`（动作指令卡片 + 动画引导 + TTS 朗读）和 `src/components/classroom/AudioSlide.tsx`（语音播放 + 跟读）
  - [x] 4.3.4 验证测试通过（运行：`npx vitest run src/components/classroom/__tests__/`，确认所有测试通过）
  - [x] 4.3.5 重构：提取动画和音频播放的通用 hooks

- [x] 4.4 实现 ClassroomView 主容器和导航  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 4.4.1 写失败测试：`src/components/classroom/__tests__/ClassroomView.test.tsx`（测试场景分发渲染、进度条、上一张/下一张导航、自动播放、课堂完成回调）
  - [x] 4.4.2 验证测试失败（运行：`npx vitest run src/components/classroom/__tests__/ClassroomView.test.tsx`，确认失败原因是缺少组件）
  - [x] 4.4.3 写最小实现：`src/components/classroom/ClassroomView.tsx`（SceneRenderer 分发 + ClassroomProgress 进度条 + SlideNavigation 导航 + ClassroomTTS 全局 TTS 控制）
  - [x] 4.4.4 验证测试通过（运行：`npx vitest run src/components/classroom/__tests__/ClassroomView.test.tsx`，确认所有测试通过）
  - [x] 4.4.5 重构：优化组件层级、提取状态管理 hook

- [x] 4.5 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 4 的所有变更文件
    - `{BASE_SHA}` → 任务组 4 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 5. 学习流程重构与页面集成

- [x] 5.1 重构 useLearningFlow hook  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.1.1 写失败测试：`src/hooks/__tests__/useLearningFlow.integration.test.ts`（测试新流程：教导处选课 → 缓存加载 → 课堂播放 → 答题回写 → 动态调整）
  - [x] 5.1.2 验证测试失败（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.integration.test.ts`，确认失败原因是旧接口不匹配）
  - [x] 5.1.3 写最小实现：重构 `src/hooks/useLearningFlow.ts`（核心流程改为从缓存加载课堂 → ClassroomView 渲染 → 答题回写 MasteryTracker → 触发动态调整）
  - [x] 5.1.4 验证测试通过（运行：`npx vitest run src/hooks/__tests__/useLearningFlow.integration.test.ts`，确认所有测试通过）
  - [x] 5.1.5 重构：清理旧的 QuestionGenerator 调用路径

- [x] 5.2 改造 LearningSession 页面  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.2.1 写失败测试：`src/pages/__tests__/LearningSession.integration.test.tsx`（测试从缓存加载课堂并渲染 ClassroomView，缓存为空时显示"课程准备中"）
  - [x] 5.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/LearningSession.integration.test.tsx`，确认失败原因是旧组件）
  - [x] 5.2.3 写最小实现：改造 `src/pages/LearningSession.tsx`（替换 FlashCard/MultipleChoice 为 ClassroomView，从缓存加载课堂 JSON，缓存为空时"课程准备中"提示）
  - [x] 5.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/LearningSession.integration.test.tsx`，确认所有测试通过）
  - [x] 5.2.5 重构：优化加载状态和错误处理

- [x] 5.3 改造 Home 页面  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 5.3.1 写失败测试：`src/pages/__tests__/Home.integration.test.tsx`（测试首页触发教导处预生成、展示缓存课程数量、各学科入口跳转）
  - [x] 5.3.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/Home.integration.test.tsx`，确认失败原因是缺少教导处集成）
  - [x] 5.3.3 写最小实现：改造 `src/pages/Home.tsx`（接入教导处，首次加载时触发 3 天课程预生成，展示各学科缓存状态）
  - [x] 5.3.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/Home.integration.test.tsx`，确认所有测试通过）
  - [x] 5.3.5 重构：优化预生成触发时机和加载态展示

- [x] 5.4 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 5 的所有变更文件
    - `{BASE_SHA}` → 任务组 5 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 6. 家长面板改造

- [x] 6.1 实现 PIN 码验证组件  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 6.1.1 写失败测试：`src/components/__tests__/PinVerification.integration.test.tsx`（测试 PIN 设置、验证、错误处理）
  - [x] 6.1.2 验证测试失败（运行：`npx vitest run src/components/__tests__/PinVerification.integration.test.tsx`，确认失败原因是缺少功能）
  - [x] 6.1.3 写最小实现：扩展已有的 `src/components/PinVerification.tsx`（如需要）或创建新的验证流程，支持 PIN 设置和验证
  - [x] 6.1.4 验证测试通过（运行：`npx vitest run src/components/__tests__/PinVerification.integration.test.tsx`，确认所有测试通过）
  - [x] 6.1.5 重构：优化 PIN 输入 UX

- [x] 6.2 改造 ParentDashboard 分层配置  <!-- TDD 任务：使用 5 步子任务 -->
  - [x] 6.2.1 写失败测试：`src/pages/__tests__/ParentDashboard.integration.test.tsx`（测试基础层展示、高级配置解锁、LLM 配置、OpenMAIC 配置、课程手动调整）
  - [x] 6.2.2 验证测试失败（运行：`npx vitest run src/pages/__tests__/ParentDashboard.integration.test.tsx`，确认失败原因是缺少新功能）
  - [x] 6.2.3 写最小实现：改造 `src/pages/ParentDashboard.tsx`（基础展示层：学习概览+服务状态+课程日历；高级配置层：PIN 解锁后显示 API 配置+OpenMAIC 配置+课程调整）
  - [x] 6.2.4 验证测试通过（运行：`npx vitest run src/pages/__tests__/ParentDashboard.integration.test.tsx`，确认所有测试通过）
  - [x] 6.2.5 重构：提取配置子组件、优化布局

- [x] 6.3 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 6 的所有变更文件
    - `{BASE_SHA}` → 任务组 6 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 7. 废弃旧模块与清理

- [x] 7.1 删除 QuestionGenerator 及相关旧组件  <!-- 非 TDD 任务：使用 3 步子任务 -->
  - [x] 7.1.1 执行变更：删除 `src/services/ai/question-generator.ts`、`src/components/learning/FlashCard.tsx`、`src/components/learning/MultipleChoice.tsx` 及其测试文件，更新所有 import 引用
  - [x] 7.1.2 验证无回归（运行：`npx vitest run`，确认全量测试通过，无编译错误）
  - [x] 7.1.3 检查：确认无残留的 QuestionGenerator/FlashCard/MultipleChoice 引用，无未使用的 import

- [x] 7.2 代码审查
  - 前置验证：调用 superpowers:verification-before-completion 运行全量测试，确认输出干净后才继续
  - 调用 superpowers:requesting-code-review 审查本任务组所有变更，占位符映射：
    - `{PLAN_OR_REQUIREMENTS}` → `openspec/changes/openmaic-integration/specs/integration.md` 和 `openspec/changes/openmaic-integration/tasks.md`
    - `{WHAT_WAS_IMPLEMENTED}` → 任务组 7 的所有变更文件
    - `{BASE_SHA}` → 任务组 7 开始前的 commit SHA
    - `{HEAD_SHA}` → 当前 HEAD
  - 若存在 Critical/Important 问题：输出审查结果后追加选项提示，停止等待用户输入
  - 若仅有 Minor 或无问题：自动继续下一任务组

## 8. PreCI 代码规范检查

- [x] 8.1 检测 preci 安装状态
  - 按以下优先级检测：① `~/PreCI/preci`（优先）→ ② `command -v preci`（PATH）
  - 若均未找到：执行安装命令，安装完成后继续
  - 若找到：记录可用路径，直接继续
- [x] 8.2 检测项目是否已 preci 初始化
  - 检查 `.preci/`、`build.yml`、`.codecc/` 任一存在即为已初始化
  - 若未初始化：执行 `preci init`，等待完成后继续
- [x] 8.3 检测 PreCI Server 状态
  - 执行 `<preci路径> server status` 检查服务是否启动
  - 若未启动：执行 `<preci路径> server start`，等待服务启动（最多 10 秒）
  - 若启动失败且 `skip_preci: false`：暂停流程，提示用户选择操作
- [x] 8.4 执行代码规范扫描
  - 依次执行：`<preci路径> scan --diff` 和 `<preci路径> scan --pre-commit`
  - 合并两次扫描结果，去重后统一处理
  - 仅扫描代码文件
- [x] 8.5 处理扫描结果
  - 若无告警：输出 `✅ PreCI 检查通过`，继续 Documentation Sync
  - 若有告警：自动修正（最多 3 次），修正后重新扫描验证

## 9. Documentation Sync (Required)

- [x] 9.1 sync design.md: record technical decisions, deviations, and implementation details after each code change
- [x] 9.2 sync tasks.md: 逐一检查所有顶层任务及其子任务，将已完成但仍为 `[ ]` 的条目标记为 `[x]`；每次更新只修改 `[ ]` → `[x]`，禁止修改任何任务描述文字
- [x] 9.3 sync proposal.md: update scope/impact if changed
- [x] 9.4 sync specs/*.md: update requirements if changed
- [x] 9.5 Final review: ensure all OpenSpec docs reflect actual implementation
