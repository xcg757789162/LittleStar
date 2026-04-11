## Context

LittleStar（小星辰）是面向 2-8 岁幼儿的英语启蒙应用，基于 OpenMAIC 构建。当前入学评测系统使用自评式按钮（"我会/不太会"），无法真实反映孩子的知识掌握情况。

**当前状态**：
- `src/engine/placement-test-engine.ts` — 自评式评测引擎，从每个模块选最简单知识点，最多 15 题
- `src/pages/PlacementTestPage.tsx` — 评测 UI，只有两个大按钮
- `src/hooks/usePlacementTest.ts` — 评测 Hook，单阶段状态机（intro → testing → completing → result）
- `src/hooks/usePreGeneration.ts` — 课堂预生成 Hook，在 Home 页面触发，不在评测完成时直接触发
- `docker/postgresql/init/01-schema.sql` — `placement_tests` 表存储评测记录

**约束**：
- 目标用户是 2-8 岁幼儿，UI 必须保持 Sunny Playground 暖色儿童风格
- 选择题必须简单直观，4 选 1 且选项可带图标/emoji 辅助理解
- AI 调用依赖家长在高级设置中配置的 LLM API Key（通过 `ChildSettings.llmApiKey`）
- 预生成使用 OpenMAIC Pipeline Client，需要后端 Docker 容器运行
- 所有数据通过 PostgREST API 访问 PostgreSQL（api schema）

## Goals / Non-Goals

**Goals:**
- 将评测从自评式改为真正的 4 选 1 选择题，客观衡量孩子掌握程度
- 实现两阶段评测：阶段一摸底（预设题库） → 阶段二验证（AI 动态生成）
- 评测完成后立即可靠地触发 3 堂课异步预生成
- 保持 Sunny Playground 暖色儿童友好 UI 风格
- 向后兼容已完成旧评测的孩子数据

**Non-Goals:**
- 不重构 OpenMAIC 原生的 Quiz 系统（那是课堂内的答题组件）
- 不修改课程大纲数据结构（curricula/modules/nodes 保持不变）
- 不实现语音识别答题（仅支持点击选择）
- 不实现评测重考机制（已完成的评测不可重做，未来迭代再支持）
- 不修改 Home 页面的预生成 Hook（保留作为补充触发）

## Decisions

### D1: 选择题来源策略 — 混合方案（预设 + AI）

**选择**: 阶段一使用预设核心题库，阶段二由 AI 动态生成验证题

**替代方案**:
- *纯 AI 生成*: 每次评测都调用 LLM，网络延迟大、API 费用高、无法离线
- *纯预设题库*: 题目固定不变，缺乏自适应能力，无法针对性验证

**理由**: 混合方案兼顾了启动速度（阶段一秒级加载）和智能自适应（阶段二根据摸底结果精准验证）。阶段二 AI 不可用时自动降级为预设补充题。

### D2: 两阶段评测流程设计

**选择**: 阶段一出 5-8 道覆盖各模块的摸底题 → 分析弱项 → 阶段二出 3-5 道验证题

**阶段一**:
- 从预设题库中按科目/年级选题，每个模块 1-2 道代表性选择题
- 覆盖从易到难的知识点梯度
- 答题后即时显示对错反馈（✓/✗ + 鼓励动画）

**阶段二**:
- 根据阶段一结果识别"不确定区域"（答错的模块 + 相邻模块的边界知识点）
- 调用 LLM 为这些知识点生成验证题（带具体场景的选择题）
- 用于确认是"真的不会"还是"题目理解偏差"

**理由**: 两阶段设计避免了过多题目导致幼儿注意力丧失，同时通过针对性验证提高评测精度。

### D3: 预设题库格式和存储

**选择**: JSON 文件存储在 `src/data/question-bank/` 目录下，按 `{subject}-{gradeLevel}.json` 命名

**替代方案**:
- *数据库存储*: 增加 CRUD 接口开发量，当前阶段不需要动态管理题库
- *TypeScript 硬编码*: 不利于后续扩展和非开发人员维护

**理由**: JSON 文件方便人工编辑和版本管理，按科目/年级分文件便于查找。格式包含：知识点 ID、题干、4 个选项（text + emoji）、正确答案索引、难度级别。

### D4: AI 题目生成 Prompt 策略

**选择**: 使用结构化 Prompt，指定知识点 + 年龄段 + 输出 JSON Schema

**Prompt 包含**:
- 知识点名称和描述
- 孩子年龄段和认知水平
- 要求：题干简短（≤20字）、选项带 emoji、一个正确答案 + 三个合理干扰项
- 输出格式：严格 JSON（`{ stem, options: [{text, emoji}], correctIndex, explanation }`）

**理由**: 结构化输出保证前端可直接解析，emoji 辅助低龄儿童理解选项。

### D5: 评测后预生成触发方式

**选择**: 在 `usePlacementTest` 的 `finalize` 完成后直接调用预生成调度器

**替代方案**:
- *仅依赖 Home 页 Hook*: 用户可能不立即回到 Home 页，延迟触发
- *后端触发*: 需要新增后端 API，当前架构无自有后端

**理由**: 前端直接调用最简单可靠。评测完成 → 写入 DB → 调用 `GenerationScheduler.scheduleForChild()` 预生成 3 堂课。失败时 Home 页 Hook 作为兜底补充。

### D6: 数据库扩展策略

**选择**: 扩展现有 `placement_tests` 表 + 新增 `placement_questions` 表

**扩展 `placement_tests`**:
- 新增 `phase` 字段 (VARCHAR): 'single' | 'phase1' | 'phase2'
- 新增 `phase1_result` 字段 (JSONB): 阶段一分析结果
- 新增 `parent_test_id` 字段 (INTEGER): 阶段二引用阶段一的 ID

**新增 `placement_questions`**:
- 存储预设题库和 AI 生成的题目
- 字段：id, subject, grade_level, knowledge_node_id, source ('preset' | 'ai'), stem, options (JSONB), correct_index, difficulty, created_at

**理由**: 题目单独存储便于复用和分析，`placement_tests` 表保持向后兼容。

## Risks / Trade-offs

- **[AI 延迟]** 阶段二 AI 生成题目需 2-5 秒 → 显示"小星老师正在出题..."加载动画，保持孩子注意力
- **[API Key 缺失]** 家长未配置 LLM API Key → 阶段二降级为使用预设补充题（对应知识点的难度变体）
- **[幼儿注意力]** 总题量增加（8-13 题 vs 原 15 题自评） → 每道选择题限时 30 秒，超时自动跳过；答对时播放鼓励动画
- **[预设题库维护]** 需要人工编写首批核心题库 → 先支持 3 个科目 × 1 个年级的题库（中班），后续迭代扩展
- **[预生成失败]** OpenMAIC Pipeline 调用可能因各种原因失败 → 评测结果不受影响，预生成失败后由 Home 页 Hook 补充重试
- **[旧数据兼容]** 旧评测记录没有 phase 字段 → 默认视为 'single' 阶段，向后兼容
