# Spec: LLM 驱动的个性化知识点生成系统

## 数据库变更

### 1. 新建表 `child_knowledge_nodes`

在 `01-schema.sql` 中添加：

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
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  content_type VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'llm' CHECK (source IN ('llm', 'manual')),
  assessment_id UUID REFERENCES placement_tests(id),
  mastery_level NUMERIC(3,2) DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 1),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_context JSONB,
  UNIQUE(child_id, subject, name)
);

CREATE INDEX idx_child_knowledge_nodes_child_id ON child_knowledge_nodes(child_id);
CREATE INDEX idx_child_knowledge_nodes_subject ON child_knowledge_nodes(child_id, subject);
```

### 2. 删除表 `knowledge_nodes`

从 `01-schema.sql` 中删除 `knowledge_nodes` 表定义及其所有索引。

同时需要处理外键依赖：
- `mastery_records.knowledge_node_id` — 改为 VARCHAR 引用（无外键约束）或改为引用 `child_knowledge_nodes`
- `questions.knowledge_node_id` — questions 表的 seed 数据也要删除，但表结构是否保留取决于未来需求（建议一并删除）

### 3. 删除表 `questions`（可选但推荐）

`questions` 表的 seed 数据无消费者（评测引擎用静态 JSON），`useQuestions` hook 零消费者。建议 DROP TABLE。

### 4. 权限配置 (`02-roles.sql`)

```sql
-- 删除原 knowledge_nodes 权限
-- GRANT SELECT ON knowledge_nodes TO anon;        -- 删除
-- GRANT SELECT ON knowledge_nodes TO authenticated; -- 删除

-- 新增 child_knowledge_nodes 权限
GRANT SELECT, INSERT, UPDATE, DELETE ON child_knowledge_nodes TO authenticated;
-- anon 不需要访问
```

### 5. RLS 策略 (`03-rls.sql`)

```sql
ALTER TABLE child_knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- 家长只能看到自己孩子的知识点
CREATE POLICY "Parents can view their children's knowledge nodes"
  ON child_knowledge_nodes FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- 家长可以为自己的孩子插入/更新知识点（通过 LLM 生成）
CREATE POLICY "Parents can manage their children's knowledge nodes"
  ON child_knowledge_nodes FOR ALL
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );
```

### 6. Seed 数据清理

#### `04-seed.sql`
- 删除所有 `INSERT INTO knowledge_nodes` 语句（54 条记录）
- 删除所有 `INSERT INTO questions` 语句（163 条记录）
- 文件可能变为空或仅保留注释

#### `05-seed-activities.sql`
- 删除 `INSERT INTO knowledge_nodes` 语句（4 条 TPR 相关）
- 删除 `INSERT INTO questions` 语句（12 条 TPR 相关）
- **保留** `INSERT INTO parent_activities` 和 `INSERT INTO tpr_instructions`

#### `06-seed-curricula.sql`
- **不做任何修改**

---

## TypeScript 类型变更

### `src/types/models.ts`

```typescript
// 新增 ChildKnowledgeNode 类型
export interface ChildKnowledgeNode {
  id: string;
  childId: string;
  subject: 'math' | 'chinese' | 'english';
  gradeLevel: string;
  name: string;
  description?: string;
  prerequisites: string[];
  nextNodes: string[];
  difficulty: number;
  contentType?: string;
  orderIndex: number;
  source: 'llm' | 'manual';
  assessmentId?: string;
  masteryLevel: number;
  generatedAt: string;
  updatedAt: string;
  generationContext?: Record<string, unknown>;
}

// KnowledgeNode 类型改为 ChildKnowledgeNode 的别名（兼容过渡）
export type KnowledgeNode = ChildKnowledgeNode;
```

---

## 新增模块

### `src/engine/knowledge-generator.ts`

**职责**：评测完成后，调用 LLM 生成个性化知识图谱。

**接口**：
```typescript
interface KnowledgeGeneratorInput {
  childId: string;
  subject: 'math' | 'chinese' | 'english';
  gradeLevel: string;
  age: number;
  assessmentId: string;
  masteryRecords: MasteryRecord[];
  existingNodes?: ChildKnowledgeNode[];  // 已有知识点（用于增量生成）
}

interface KnowledgeGeneratorOutput {
  nodes: ChildKnowledgeNode[];
  metadata: {
    model: string;
    generatedAt: string;
    inputSummary: string;
  };
}

export async function generateKnowledgeNodes(
  input: KnowledgeGeneratorInput,
  settings: ChildSettings
): Promise<KnowledgeGeneratorOutput>;
```

**实现要点**：
- 使用 Vercel AI SDK `generateObject()` + Zod schema（参考 `ai-question-generator.ts`）
- LLM 配置从 ChildSettings 读取（llmModel, llmApiKey, llmBaseUrl）
- 生成 10-20 个知识点/科目
- 每个知识点包含 prerequisites / nextNodes 形成有向图
- ID 格式：`ckn_{childId前8位}_{subject}_{snake_case_name}_{序号}`
- 生成后通过 PostgREST API 批量 INSERT

**LLM Prompt 结构**：
```
你是一个幼儿教育专家。根据以下评测结果，为这个孩子生成个性化的{subject}知识图谱。

孩子信息：
- 年龄：{age}岁
- 年级：{gradeLevel}
- 科目：{subject}

评测结果：
{masteryRecords 的摘要}

要求：
1. 生成 10-20 个知识点，从基础到进阶排列
2. 每个知识点需指定前置依赖和后续知识点
3. 难度范围 1-5，符合孩子当前水平
4. 关注评测中的薄弱环节，给予更多基础知识点
5. 已掌握的领域可跳过基础，直接给进阶内容
```

### `src/engine/knowledge-updater.ts`

**职责**：课堂学习后，异步更新知识图谱。

**接口**：
```typescript
interface KnowledgeUpdateInput {
  childId: string;
  subject: 'math' | 'chinese' | 'english';
  currentNodes: ChildKnowledgeNode[];
  recentMasteryChanges: MasteryRecord[];
  classroomPerformance?: {
    knowledgeNodeId: string;
    score: number;
    completedActivities: string[];
  };
}

export async function updateKnowledgeNodes(
  input: KnowledgeUpdateInput,
  settings: ChildSettings
): Promise<{
  updated: ChildKnowledgeNode[];
  added: ChildKnowledgeNode[];
  unchanged: string[];  // IDs
}>;
```

**实现要点**：
- 异步触发，不阻塞用户操作
- LLM 接收当前图谱 + 最新学习表现
- 三种操作：更新 mastery_level / 新增进阶知识点 / 新增补充知识点
- 通过 PostgREST UPSERT 增量更新

---

## 现有模块重构

### `src/hooks/queries/useKnowledgeNodes.ts`

改为查询 `child_knowledge_nodes` 表，所有 hook 增加 `childId` 参数：

```typescript
export function useChildKnowledgeNodes(childId: string | undefined) {
  return useQuery({
    queryKey: ['child_knowledge_nodes', childId],
    queryFn: () => apiClient.get<ChildKnowledgeNode>(
      `/child_knowledge_nodes?child_id=eq.${childId}&order=order_index`
    ),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000,  // 5分钟（比原来的30分钟短，因为可能更新）
  });
}

export function useChildKnowledgeNodesBySubject(childId: string | undefined, subject: string) {
  return useQuery({
    queryKey: ['child_knowledge_nodes', childId, subject],
    queryFn: () => apiClient.get<ChildKnowledgeNode>(
      `/child_knowledge_nodes?child_id=eq.${childId}&subject=eq.${subject}&order=order_index`
    ),
    enabled: !!childId && !!subject,
    staleTime: 5 * 60 * 1000,
  });
}
```

### `src/hooks/usePreGeneration.ts`

核心变更：
1. 将 `/knowledge_nodes` 查询改为 `/child_knowledge_nodes?child_id=eq.${childId}`
2. 新增逻辑：如果查询返回空（该科目无知识点），先调用 `generateKnowledgeNodes()` 生成
3. 生成完成后再继续原有的 LessonPlanner 流程

### `src/pages/Home.tsx`

- `useKnowledgeNodes()` → `useChildKnowledgeNodes(currentChildId)`
- mastery 计算逻辑不变，数据源变更

### `src/pages/SubjectMasteryPage.tsx`

- `useKnowledgeNodesBySubject(subject)` → `useChildKnowledgeNodesBySubject(currentChildId, subject)`

### `src/pages/ParentDashboard.tsx`

- `apiClient.get('/knowledge_nodes')` → `apiClient.get('/child_knowledge_nodes?child_id=eq.${childId}')`

### `src/engine/review-manager.ts`

- `/knowledge_nodes` 查询改为 `/child_knowledge_nodes?child_id=eq.${childId}`

### `src/services/api/client.ts`

- 从 `PUBLIC_READONLY_PATHS` 移除 `/knowledge_nodes` 和 `/questions`
- 如需要，添加 `/child_knowledge_nodes`（但因为有 RLS，通常不需要在公开路径中）

### 删除文件

- `src/hooks/queries/useQuestions.ts` — 整个删除
- `src/hooks/queries/index.ts` — 移除 useQuestions 相关导出

---

## 评测流程集成

### `PlacementTestEngine` 修改

在 `finalize()` 方法末尾，mastery_records 写入完成后，调用知识点生成：

```typescript
// placement-test-engine.ts finalize() 末尾新增
import { generateKnowledgeNodes } from './knowledge-generator';

// 在 mastery_records upsert 完成后
const generatedNodes = await generateKnowledgeNodes({
  childId: this.childId,
  subject: this.currentSubject,
  gradeLevel: this.gradeLevel,
  age: this.childAge,
  assessmentId: this.testId,
  masteryRecords: newMasteryRecords,
}, this.childSettings);

// 写入数据库
await apiClient.post('/child_knowledge_nodes', generatedNodes.nodes);
```

### 课堂结束后异步更新

在课堂结束的回调中（`classroom-bridge.ts` 或相关 store），触发异步更新：

```typescript
// 不阻塞，fire-and-forget
updateKnowledgeNodes({
  childId,
  subject,
  currentNodes: existingNodes,
  recentMasteryChanges: updatedRecords,
  classroomPerformance: sessionResult,
}, childSettings).catch(console.error);
```

---

## 迁移策略

### 新部署（Docker 重建）

1. 新 schema 中不含 `knowledge_nodes` 和 `questions` 表
2. `child_knowledge_nodes` 表自动创建
3. 首次评测后自动生成知识点

### 已有部署（升级）

需要编写迁移脚本：
1. DROP TABLE knowledge_nodes CASCADE
2. DROP TABLE questions CASCADE（如果选择删除）
3. CREATE TABLE child_knowledge_nodes（新 schema）
4. 清理 mastery_records 中的 orphan 引用
