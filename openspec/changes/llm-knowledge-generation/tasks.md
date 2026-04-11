# Tasks: LLM 驱动的个性化知识点生成系统

## Status: ready

## Tasks

### Task 1: 数据库 Schema 变更 — 创建 child_knowledge_nodes 表 + 删除旧表
- **Status**: pending
- **Scope**: Database
- **Files**:
  - `docker/postgresql/init/01-schema.sql` — 删除 `knowledge_nodes` 表定义，删除 `questions` 表定义，新增 `child_knowledge_nodes` 表
  - `docker/postgresql/init/02-roles.sql` — 删除 knowledge_nodes/questions 权限，新增 child_knowledge_nodes 权限
  - `docker/postgresql/init/03-rls.sql` — 删除 knowledge_nodes RLS，新增 child_knowledge_nodes RLS 策略
- **Details**:
  1. 在 `01-schema.sql` 中删除 `CREATE TABLE knowledge_nodes` 及其索引
  2. 在 `01-schema.sql` 中删除 `CREATE TABLE questions` 及其索引（如有）
  3. 处理 `mastery_records` 表中对 `knowledge_nodes` 的外键引用（改为无约束 VARCHAR 或改引用 child_knowledge_nodes）
  4. 新增 `CREATE TABLE child_knowledge_nodes` 完整定义（含索引）
  5. 在 `02-roles.sql` 中删除旧表权限、新增新表权限
  6. 在 `03-rls.sql` 中删除旧表 RLS 配置、新增 child_knowledge_nodes RLS 策略
- **Test**: Docker 重建数据库后，`\dt` 确认新表存在、旧表不存在；RLS 策略验证

### Task 2: 清理 Seed 数据文件
- **Status**: pending
- **Scope**: Database
- **Files**:
  - `docker/postgresql/init/04-seed.sql` — 删除 knowledge_nodes 和 questions 的 INSERT 语句
  - `docker/postgresql/init/05-seed-activities.sql` — 删除 knowledge_nodes 和 questions 的 INSERT，保留 parent_activities 和 tpr_instructions
- **Details**:
  1. `04-seed.sql`：删除所有 `INSERT INTO knowledge_nodes` 和 `INSERT INTO questions` 语句
  2. `05-seed-activities.sql`：删除 knowledge_nodes 和 questions INSERT，保留 parent_activities（15条）和 tpr_instructions（20条）
  3. 不触碰 `06-seed-curricula.sql`
- **Test**: SQL 文件语法正确；Docker 重建后 parent_activities 和 tpr_instructions 数据正常

### Task 3: TypeScript 类型定义 + 删除 useQuestions hook
- **Status**: pending
- **Scope**: Frontend
- **Files**:
  - `src/types/models.ts` — 新增 ChildKnowledgeNode 类型，KnowledgeNode 改为别名
  - `src/hooks/queries/useQuestions.ts` — 删除整个文件
  - `src/hooks/queries/index.ts` — 移除 useQuestions 导出
  - `src/services/api/client.ts` — 更新 PUBLIC_READONLY_PATHS
- **Details**:
  1. 在 `models.ts` 中定义 `ChildKnowledgeNode` 接口（含所有新字段）
  2. 将 `KnowledgeNode` 改为 `ChildKnowledgeNode` 的类型别名（兼容过渡期）
  3. 删除 `useQuestions.ts` 文件
  4. 从 `index.ts` 移除所有 useQuestions 导出
  5. 从 `client.ts` 的 `PUBLIC_READONLY_PATHS` 移除 `/knowledge_nodes` 和 `/questions`
- **Test**: TypeScript 编译无错误；无对 useQuestions 的引用残留

### Task 4: 重构 useKnowledgeNodes hook — 查询 child_knowledge_nodes
- **Status**: pending
- **Scope**: Frontend
- **Files**:
  - `src/hooks/queries/useKnowledgeNodes.ts` — 全面重写，改查 child_knowledge_nodes
  - `src/hooks/queries/index.ts` — 更新导出名
- **Details**:
  1. 替换所有查询 URL 从 `/knowledge_nodes` 到 `/child_knowledge_nodes`
  2. 所有 hook 增加 `childId` 参数，加 `?child_id=eq.${childId}` 过滤
  3. 导出新命名：`useChildKnowledgeNodes`, `useChildKnowledgeNodesBySubject` 等
  4. 保留旧命名作为 deprecated wrapper（可选）
  5. staleTime 从 30 分钟调整为 5 分钟
- **Test**: Hook 在有 childId 时正确查询；无 childId 时 disabled

### Task 5: 实现 Knowledge Generator 引擎
- **Status**: pending
- **Scope**: Engine
- **Files**:
  - `src/engine/knowledge-generator.ts` — 新建
- **Details**:
  1. 使用 Vercel AI SDK `generateObject()` + Zod schema
  2. 从 ChildSettings 读取 LLM 配置
  3. 构建 prompt：评测结果摘要 + 科目 + 年龄/等级
  4. Zod schema 约束输出为 ChildKnowledgeNode 数组
  5. ID 生成格式：`ckn_{childId前8位}_{subject}_{序号}`
  6. 生成 10-20 个知识点/科目，含 prerequisites/nextNodes 依赖图
  7. 错误处理：重试机制 + 生成失败时的降级策略
  8. 生成后通过 PostgREST API 批量写入 child_knowledge_nodes
- **Test**: 单元测试 mock LLM 响应；集成测试验证写入数据库

### Task 6: 实现 Knowledge Updater 引擎（异步）
- **Status**: pending
- **Scope**: Engine
- **Files**:
  - `src/engine/knowledge-updater.ts` — 新建
- **Details**:
  1. 接收当前知识图谱 + 最新 mastery 变化
  2. 调用 LLM 决策：更新 mastery / 新增进阶 / 新增补充知识点
  3. 通过 PostgREST UPSERT 增量更新
  4. fire-and-forget 模式，不阻塞用户操作
  5. 错误处理：静默失败 + 日志记录
- **Test**: 单元测试 mock LLM 响应；验证增量更新逻辑

### Task 7: 集成评测流程 — PlacementTestEngine 触发知识点生成
- **Status**: pending
- **Scope**: Engine
- **Files**:
  - `src/engine/placement-test-engine.ts` — 在 finalize() 末尾调用 Knowledge Generator
- **Details**:
  1. 在 `finalize()` 方法中，mastery_records 写入完成后
  2. 调用 `generateKnowledgeNodes()` 生成该科目的知识图谱
  3. 写入 child_knowledge_nodes 表
  4. 处理生成失败的情况（不应阻塞评测完成流程）
- **Test**: 评测完成后，child_knowledge_nodes 中有对应记录

### Task 8: 集成课堂流程 — 课堂结束后异步更新知识点
- **Status**: pending
- **Scope**: Engine/Frontend
- **Files**:
  - `src/stores/openmaic/classroom-bridge.ts` 或相关回调 — 添加异步 Updater 调用
- **Details**:
  1. 在课堂结束回调中触发 `updateKnowledgeNodes()`
  2. 异步执行，不阻塞用户
  3. 传入课堂表现数据 + mastery 变化
- **Test**: 课堂结束后，知识点更新日志可见

### Task 9: 重构页面组件 — 使用新知识点数据源
- **Status**: pending
- **Scope**: Frontend
- **Files**:
  - `src/pages/Home.tsx` — `useKnowledgeNodes()` → `useChildKnowledgeNodes(childId)`
  - `src/pages/SubjectMasteryPage.tsx` — `useKnowledgeNodesBySubject()` → `useChildKnowledgeNodesBySubject(childId, subject)`
  - `src/pages/ParentDashboard.tsx` — apiClient 调用改为 child_knowledge_nodes
  - `src/engine/review-manager.ts` — 查询改为 child_knowledge_nodes
  - `src/hooks/usePreGeneration.ts` — 查询改为 child_knowledge_nodes + 无数据时触发生成
- **Details**:
  1. Home.tsx：传入 currentChildId，mastery 计算逻辑不变
  2. SubjectMasteryPage.tsx：传入 childId + subject
  3. ParentDashboard.tsx：改 API 调用路径和参数
  4. review-manager.ts：查询路径更新
  5. usePreGeneration.ts：关键变更 — 无知识点时先触发 LLM 生成再继续
  6. 处理空数据状态（首次使用、尚未评测时的 UI 提示）
- **Test**: 所有页面正常渲染；空数据时显示友好提示

### Task 10: 端到端验证 + 清理
- **Status**: pending
- **Scope**: Full Stack
- **Details**:
  1. Docker 完全重建数据库，验证新 schema
  2. 创建新孩子 → 进行评测 → 验证知识点自动生成
  3. 进入课堂学习 → 验证课后知识点异步更新
  4. 验证 Home / SubjectMastery / ParentDashboard 页面数据正确
  5. 验证预生成流程正常工作
  6. 清理任何遗留的旧引用
  7. 更新 project-index.md
