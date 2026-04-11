## 1. 数据库 Schema 扩展与迁移脚本

- [x] 1.1 创建 SQL 迁移文件 `docker/postgresql/init/02-assessment-migration.sql`：
  - 新增 `api.placement_questions` 表（id, subject, grade_level, knowledge_node_id, source, stem, options, correct_index, difficulty, created_at）
  - 扩展 `api.placement_tests` 表新增 3 个列：`phase` (VARCHAR DEFAULT 'single'), `phase1_result` (JSONB), `parent_test_id` (INTEGER REFERENCES api.placement_tests(id))
  - 创建索引 `idx_placement_questions_node` ON (subject, grade_level, knowledge_node_id)
  - 创建索引 `idx_placement_tests_phase` ON (phase)
  - 创建索引 `idx_placement_tests_parent` ON (parent_test_id)
- [x] 1.2 同步更新 `docker/postgresql/init/01-schema.sql` 主 schema 文件，在 `placement_tests` 表定义中加入新字段，在末尾追加 `placement_questions` 表定义
- [x] 1.3 新增 TypeScript 类型 `PlacementQuestion`（stem, options, correctIndex, knowledgeNodeId, difficulty, source）到 `src/types/models.ts`，扩展 `PlacementTest` 类型新增 phase/phase1Result/parentTestId 字段

## 2. 预设题库（Question Bank）

- [x] 2.1 创建题库目录 `src/data/question-bank/` 和加载器 `src/data/question-bank/loader.ts`
  - 加载器函数 `loadQuestionBank(subject, gradeLevel): Promise<Map<string, PlacementQuestion[]>>`
  - 按知识点 ID 索引，每个知识点至少 2 道题（易/难各一）
- [x] 2.2 创建数学题库 `src/data/question-bank/math-middle-kindergarten.json`（涵盖数数、10以内加减法、图形认识、比较大小，每个知识点 2-3 题）
- [x] 2.3 创建语文题库 `src/data/question-bank/chinese-middle-kindergarten.json`（涵盖汉字认读、拼音基础、词汇、简单阅读，每个知识点 2-3 题）
- [x] 2.4 创建英语题库 `src/data/question-bank/english-middle-kindergarten.json`（涵盖字母认识、基础单词、颜色数字、问候语，每个知识点 2-3 题）

## 3. AI 评测题目生成器

- [x] 3.1 创建 AI 题目生成器 `src/engine/ai-question-generator.ts`：
  - 函数 `generateQuestion(node: {name, description}, gradeLevel, subject, settings: ChildSettings): Promise<PlacementQuestion>`
  - 使用 `ChildSettings` 中的 llmApiKey/llmModel/llmBaseUrl 配置
  - 构建结构化 Prompt：知识点上下文 + 年龄段 + 严格 JSON Schema 输出
  - 超时 10 秒，失败自动返回 null（由调用方降级到预设题库）
- [x] 3.2 创建 Prompt 模板 `src/engine/prompts/assessment-question.md`，包含系统指令 + 输出格式约束 + 少样本示例
- [x] 3.3 添加 AI 生成结果 JSON Schema 验证（使用 Zod 或手动校验），确保 stem ≤ 20 字、options 恰好 4 项、correctIndex 在 0-3 范围

## 4. 两阶段评测引擎重构

- [x] 4.1 重构 `src/engine/placement-test-engine.ts`：
  - 新增 `generatePhase1Plan(modules, questionBank)` — 从预设题库中为每个模块选 1-2 道题，返回 5-8 道摸底选择题
  - 新增 `analyzePhase1(session)` — 分析阶段一结果，输出 `Phase1Analysis`（weakModules, uncertainNodes, overallPhase1Score）
  - 新增 `generatePhase2Plan(phase1Analysis, modules, questionBank, aiGenerator?)` — 为薄弱/不确定区域生成 3-5 道验证题（AI 优先，降级预设）
  - 保留 `completeTest()` 和 `applyResult()` 接口兼容，内部合并两阶段结果
  - 新增 `submitChoiceAnswer(session, selectedIndex)` 替代旧的 `submitAnswer(session, isCorrect)`
- [x] 4.2 新增类型定义：`Phase1Analysis`, `ChoiceQuestion`（包含 stem/options/correctIndex/knowledgeNodeId/difficulty/source）, `TwoPhaseTestSession`（extends TestSession 新增 phase/phase1Analysis）
- [x] 4.3 新增 30 秒超时逻辑：`submitTimeout(session)` — 标记当前题为超时未答（isCorrect=false, timedOut=true）

## 5. 重构评测 Hook（usePlacementTest）

- [x] 5.1 重构 `src/hooks/usePlacementTest.ts` 支持两阶段状态机：
  - 新增 PlacementPhase 枚举值：`'phase1_testing' | 'phase1_analyzing' | 'phase2_loading' | 'phase2_testing'`
  - 阶段一完成 → 'phase1_analyzing' → 调用 `analyzePhase1()` → 判断是否需要阶段二
  - 如需阶段二 → 'phase2_loading' → 调用 AI 生成器 + 预设降级 → 'phase2_testing'
  - 全部正确时跳过阶段二 → 直接 'completing'
- [x] 5.2 重构 `submitAnswer` 方法：接收 `selectedIndex: number`（而非旧的 `isCorrect: boolean`），内部比对 `correctIndex`
- [x] 5.3 新增 30 秒计时器逻辑：每道题开始时启动倒计时，到期自动调用 `submitTimeout`
- [x] 5.4 评测完成后直接触发预生成：在 `finalize()` 中 DB 写入成功后，调用 `triggerPreGeneration(childId, subject, result)`

## 6. 重构评测 UI（PlacementTestPage）

- [x] 6.1 重构 `src/pages/PlacementTestPage.tsx` 的答题区域：
  - 移除旧的"我会/不太会"两按钮 UI
  - 新增 4 选 1 选择题组件：题干显示（大号友好字体）+ 2×2 选项网格（每个选项含 emoji + 文字 + 触摸反馈动画）
  - 选中后 0.3s 延迟显示对错反馈（✓ 绿色弹跳 / ✗ 轻柔提示 + 显示正确答案）
- [x] 6.2 新增阶段过渡 UI：
  - Phase 1 → Phase 2 过渡动画：小星老师角色 + "让我想想更好的题目..." 气泡 + 脉冲加载指示器
  - Phase 2 开始提示："验证环节！再答几道就好了 💪"
- [x] 6.3 新增 30 秒倒计时 UI：圆形进度条（绿→黄→橙色渐变），5 秒时脉冲动画提醒
- [x] 6.4 重构结果页：显示两阶段合计星级评分、各模块掌握度（emoji 指示）、正确率（x/y 题）、鼓励语句

## 7. 评测后预生成集成

- [x] 7.1 在 `src/hooks/usePlacementTest.ts` 的 `finalize()` 中新增预生成触发逻辑：
  - 创建辅助函数 `triggerPreGeneration(childId, subject, result)`
  - 调用 `GenerationScheduler.scheduleForChild(childId, subject, 3)` 预生成 3 堂课
  - 使用 `Promise` 异步执行，不 await（不阻塞结果页展示）
  - catch 错误静默处理（Home 页 Hook 作为兜底）
- [x] 7.2 确保 `GenerationScheduler` 支持接收评测结果作为课程规划的输入参数，使 `LessonPlanner` 能根据掌握/薄弱知识点规划课程内容
