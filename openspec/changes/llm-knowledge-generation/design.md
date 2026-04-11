# Design: LLM 驱动的个性化知识点生成系统

## 概述

将 OpenMAIC 的知识点系统从静态 seed 数据完全替换为 LLM 动态生成。每个孩子基于评测结果获得个性化知识图谱，并在每次学习后持续更新。

## 动机

### 现状问题

1. **静态知识点**：59 个 knowledge_nodes 全部来自 SQL seed 文件（`04-seed.sql` + `05-seed-activities.sql`），所有孩子共享相同知识图谱
2. **无个性化**：知识点的难度、顺序、前后依赖关系不会根据孩子的实际水平调整
3. **评测断层**：PlacementTestEngine 产出 mastery_records，但知识图谱本身不会因评测结果而变化，只是标记 mastery_level
4. **扩展困难**：新增知识点需要手动编写 SQL INSERT，无法自动扩展学习路径

### 目标

- 评测完成后，LLM 根据评测结果为每个孩子生成个性化知识图谱（10-20 个知识点/科目）
- 每次课堂学习后，异步更新知识图谱（调整 mastery、新增进阶/补充知识点）
- 完全删除 seed 数据和原 `knowledge_nodes` 表，统一使用 `child_knowledge_nodes`
- 保留 `curriculum_nodes` 系统不受影响（评测引擎依赖）

## 架构设计

### 数据流全景

```
评测阶段：
  PlacementTestEngine
    → mastery_records (upsert)
    → LLM Knowledge Generator (新)
      → child_knowledge_nodes (INSERT)

学习阶段：
  课堂结束
    → mastery_records (update)
    → Knowledge Updater (异步/后台, 新)
      → child_knowledge_nodes (UPDATE/INSERT)

预生成阶段：
  usePreGeneration
    → 读取 child_knowledge_nodes (替代原 knowledge_nodes)
    → LessonPlanner → RequirementGenerator → Backend Pipeline
```

### 新建数据库表

```sql
CREATE TABLE child_knowledge_nodes (
  id VARCHAR(100) PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject VARCHAR(50) NOT NULL,
  grade_level VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  prerequisites JSONB DEFAULT '[]',
  next_nodes JSONB DEFAULT '[]',
  difficulty INTEGER DEFAULT 1,
  content_type VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'llm',
  assessment_id UUID REFERENCES placement_tests(id),
  mastery_level NUMERIC(3,2) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_context JSONB,
  UNIQUE(child_id, subject, name)
);
```

### 删除清单

| 目标 | 动作 |
|------|------|
| `knowledge_nodes` 表 | DROP TABLE（schema 中删除定义） |
| `questions` 表 seed 数据 | 删除 INSERT 语句 |
| `04-seed.sql` 中 knowledge_nodes INSERT | 全部删除 |
| `04-seed.sql` 中 questions INSERT | 全部删除 |
| `05-seed-activities.sql` 中 knowledge_nodes INSERT | 删除（保留 parent_activities, tpr_instructions） |
| `05-seed-activities.sql` 中 questions INSERT | 删除 |
| `useQuestions` hook | 整个文件删除（零消费者） |
| `02-roles.sql` 中 knowledge_nodes 权限 | 删除 |
| `03-rls.sql` 中 knowledge_nodes 相关 | 删除 |

### 重构清单

| 文件 | 变更 |
|------|------|
| `src/hooks/queries/useKnowledgeNodes.ts` | 改为查询 `child_knowledge_nodes`，增加 `childId` 过滤 |
| `src/hooks/queries/index.ts` | 移除 useQuestions 导出，更新 useKnowledgeNodes 导出 |
| `src/pages/Home.tsx` | 使用新 hook，传入当前 childId |
| `src/pages/SubjectMasteryPage.tsx` | 同上 |
| `src/pages/ParentDashboard.tsx` | 改 apiClient 调用为新表 + childId 过滤 |
| `src/engine/review-manager.ts` | 查询改为 child_knowledge_nodes |
| `src/hooks/usePreGeneration.ts` | 查询改为 child_knowledge_nodes；无数据时触发 LLM 生成 |
| `src/types/models.ts` | 扩展 KnowledgeNode 类型，新增 ChildKnowledgeNode 类型 |
| `src/services/api/client.ts` | 更新 PUBLIC_READONLY_PATHS |

### 不受影响的模块

- `PlacementTestEngine` — 使用 curriculum_nodes，不依赖 knowledge_nodes
- `06-seed-curricula.sql` — 完全独立
- `src/data/question-bank/` — 静态 JSON，不依赖 DB questions 表
- `LessonPlanner / AdaptiveRouter` — 接口不变，只是上游数据源变化

## LLM 知识点生成设计

### Generator 模块

新建 `src/engine/knowledge-generator.ts`，参考现有 `ai-question-generator.ts` 的模式：

- 使用 Vercel AI SDK `generateObject()` + Zod schema
- 从 ChildSettings 读取 LLM 配置（llmModel, llmApiKey, llmBaseUrl）
- 输入：评测结果摘要 + 科目 + 孩子年龄/等级 + 现有知识图谱（如有）
- 输出：结构化的知识点数组（含依赖关系图）

### Updater 模块

新建 `src/engine/knowledge-updater.ts`：

- 课堂结束后异步触发（不阻塞用户）
- 输入：当前知识图谱 + 最新学习表现 + mastery 变化
- LLM 决策：更新 mastery / 添加进阶知识点 / 添加补充知识点
- 增量更新 child_knowledge_nodes 表

### 触发时机

1. **评测完成后** — `PlacementTestEngine.finalize()` 后调用 Generator
2. **课堂结束后** — 异步后台触发 Updater，不阻塞用户操作

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| LLM 生成失败 | 重试机制 + 降级为基础知识点模板 |
| 生成延迟 | 评测后生成用 loading 状态提示；课堂后用异步 |
| mastery_records 外键孤立 | 迁移期清理旧数据，或允许 orphan records |
| 知识点质量不稳定 | Zod schema 约束输出格式 + 后置校验 |
| 并发生成冲突 | UNIQUE 约束 + ON CONFLICT 策略 |
