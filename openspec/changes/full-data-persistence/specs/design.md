# 全面数据持久化设计

## 概述

将所有运行时数据迁移到 PostgreSQL 数据库持久化存储，包括：AI 生成的课堂缓存、亲子互动活动数据、TPR 指令数据、课程大纲。对于数据库无法高效存储的媒体文件，降级到服务器文件系统。

## 现状分析

| # | 数据类型 | 当前存储 | 大小 | 问题 |
|---|---------|---------|------|------|
| 1 | AI 课堂缓存 (Classroom JSON) | `MemoryCacheStore` 内存 Map | 50-200KB/课堂 | **刷新即丢**，AI 重新生成代价高 |
| 2 | 亲子互动活动 (15 条) | `english-parent-activities.ts` 硬编码 | ~5KB | 无法动态更新、无法定制 |
| 3 | TPR 指令 (20 条+知识点+题目) | `english-tpr.ts` 硬编码 | ~10KB | 同上 |
| 4 | 课程大纲 (21 份: K-G6 × 3 科) | `src/curriculum/*.ts` | ~200KB 总计 | 打包进前端，无法后台更新 |
| 5 | 媒体文件 (图片/音频 URL) | OpenMAIC 外部 URL | 变化大 | 依赖外部服务可用性 |

---

## Phase 1: 课堂缓存持久化

### 1.1 新增数据库表 `classroom_cache`

```sql
CREATE TABLE api.classroom_cache (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id) ON DELETE CASCADE,
  knowledge_node_id VARCHAR(100) NOT NULL,
  date VARCHAR(10) NOT NULL,
  cache_key VARCHAR(220) NOT NULL,
  classroom_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT classroom_cache_key_unique UNIQUE (child_id, cache_key)
);

CREATE INDEX idx_classroom_cache_child ON api.classroom_cache(child_id);
CREATE INDEX idx_classroom_cache_key ON api.classroom_cache(cache_key);
CREATE INDEX idx_classroom_cache_child_date ON api.classroom_cache(child_id, date);
CREATE INDEX idx_classroom_cache_expires ON api.classroom_cache(expires_at);
```

**设计要点：**
- `cache_key` = `{knowledgeNodeId}::{date}`，与 `ClassroomCache.makeCacheKey()` 对齐
- `child_id` 实现多孩子隔离 + RLS 安全
- `expires_at` 支持过期清理（3 天策略）
- `classroom_data` 用 JSONB 存完整 Classroom JSON（PostgreSQL 单字段支持 1GB）

### 1.2 RLS 策略

```sql
ALTER TABLE api.classroom_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY classroom_cache_select ON api.classroom_cache
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = current_setting('request.jwt.claims', true)::json->>'user_id')::integer));

CREATE POLICY classroom_cache_insert ON api.classroom_cache
  FOR INSERT TO authenticated
  WITH CHECK (...同上...);

CREATE POLICY classroom_cache_delete ON api.classroom_cache
  FOR DELETE TO authenticated
  USING (...同上...);
```

### 1.3 实现 `PostgresCacheStore`

在 `src/services/openmaic/postgres-cache-store.ts` 中实现 `CacheStore` 接口：

```typescript
import { apiClient } from '@/services/api'
import type { CacheStore, CacheEntry } from './cache'

export class PostgresCacheStore implements CacheStore {
  private childId: number

  constructor(childId: number) {
    this.childId = childId
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    const row = await apiClient.getOne<DbCacheRow>('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
    return row ? toEntry(row) : undefined
  }

  async set(key: string, value: CacheEntry): Promise<void> {
    await apiClient.upsert('/classroom_cache', {
      childId: this.childId,
      cacheKey: key,
      knowledgeNodeId: value.knowledgeNodeId,
      date: value.date,
      classroomData: value.classroom,
      cachedAt: new Date(value.cachedAt).toISOString(),
    })
  }

  async delete(key: string): Promise<void> {
    await apiClient.delete('/classroom_cache', {
      filters: [
        { column: 'childId', operator: 'eq', value: this.childId },
        { column: 'cacheKey', operator: 'eq', value: key },
      ],
    })
  }

  async entries(): Promise<[string, CacheEntry][]> {
    const rows = await apiClient.get<DbCacheRow[]>('/classroom_cache', {
      filters: [{ column: 'childId', operator: 'eq', value: this.childId }],
    })
    return rows.map(r => [r.cacheKey, toEntry(r)])
  }

  async clear(): Promise<void> {
    await apiClient.delete('/classroom_cache', {
      filters: [{ column: 'childId', operator: 'eq', value: this.childId }],
    })
  }

  async size(): Promise<number> {
    const rows = await apiClient.get<DbCacheRow[]>('/classroom_cache', {
      filters: [{ column: 'childId', operator: 'eq', value: this.childId }],
      select: 'id',
    })
    return rows.length
  }
}
```

### 1.4 注入改造

在 `useLearningFlow.ts`、`Home.tsx`、`ParentDashboard.tsx` 等创建 `ClassroomCache` 的地方：

```typescript
// 之前
const cache = new ClassroomCache()

// 之后
const store = new PostgresCacheStore(childId)
const cache = new ClassroomCache(store)
```

---

## Phase 2: 亲子活动 + TPR 数据入库

### 2.1 新增数据库表

**`parent_activities` 表：**
```sql
CREATE TABLE api.parent_activities (
  id VARCHAR(100) PRIMARY KEY,
  related_node_ids JSONB NOT NULL DEFAULT '[]',
  task_description TEXT NOT NULL,
  parent_guide TEXT NOT NULL,
  guidance_card TEXT NOT NULL,
  offline_extension TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  subject VARCHAR(20) NOT NULL DEFAULT 'english',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

**`tpr_instructions` 表：**
```sql
CREATE TABLE api.tpr_instructions (
  id VARCHAR(100) PRIMARY KEY,
  command TEXT NOT NULL,
  translation TEXT NOT NULL,
  action TEXT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(20) NOT NULL,
  animation_type VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 2.2 种子数据 SQL

将 `english-parent-activities.ts` 的 15 条数据和 `english-tpr.ts` 的 20 条指令 + 4 个知识点 + 12 道题目转为 SQL INSERT。

### 2.3 RLS 策略

两张表为公共只读数据，类似 `knowledge_nodes`：
```sql
-- anon 和 authenticated 都可读，但不能写
GRANT SELECT ON api.parent_activities TO anon, authenticated;
GRANT SELECT ON api.tpr_instructions TO anon, authenticated;
```

### 2.4 前端改造

**受影响文件：**
| 文件 | 当前引用 | 改造方式 |
|------|---------|---------|
| `src/hooks/useLearningFlow.ts` | `getRandomActivity()`, `getRandomTPR()` | 改为 API 查询 + 随机逻辑移到前端 |
| `src/components/learning/SessionSummary.tsx` | `englishParentActivities` 数组 | 改为 React Query hook |
| `src/components/learning/OfflineExtensionCard.tsx` | `ParentActivity` 类型 | 类型从 API types 导入 |
| `src/components/learning/ParentActivityCard.tsx` | `ParentActivity` 类型 | 同上 |
| `src/components/learning/TPRActivity.tsx` | `TPRCommand` 类型 | 类型从 API types 导入 |

### 2.5 新增 React Query Hooks

```typescript
// useParentActivities.ts
export function useParentActivities(nodeIds?: string[]) { ... }

// useTPRInstructions.ts
export function useTPRInstructions(category?: string) { ... }
```

---

## Phase 3: 课程大纲迁移到数据库

### 3.1 新增数据库表

**`curricula` 表（大纲主表）：**
```sql
CREATE TABLE api.curricula (
  id SERIAL PRIMARY KEY,
  grade_level VARCHAR(30) NOT NULL,
  subject VARCHAR(20) NOT NULL,
  version VARCHAR(20) NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT curricula_grade_subject_unique UNIQUE (grade_level, subject)
);
```

**`curriculum_modules` 表（模块/章节）：**
```sql
CREATE TABLE api.curriculum_modules (
  id VARCHAR(100) PRIMARY KEY,
  curriculum_id INTEGER NOT NULL REFERENCES api.curricula(id),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);
```

**`curriculum_nodes` 表（大纲知识点，含 AI 出题模板）：**
```sql
CREATE TABLE api.curriculum_nodes (
  id VARCHAR(100) PRIMARY KEY,
  module_id VARCHAR(100) NOT NULL REFERENCES api.curriculum_modules(id),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1,
  content_types JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB NOT NULL DEFAULT '[]',
  template_prompts JSONB NOT NULL DEFAULT '[]'
);
```

### 3.2 种子数据

将 21 份大纲 TS 文件（K-G6 × math/chinese/english）转为 SQL INSERT 语句。

### 3.3 前端改造

**受影响文件：**
| 文件 | 当前引用 | 改造方式 |
|------|---------|---------|
| `src/curriculum/index.ts` | `loadCurriculum()` 动态 import | 改为 API 查询 |
| `src/hooks/usePlacementTest.ts` | `loadCurriculum()` | 改为 React Query hook |
| `src/engine/placement-test-engine.ts` | `CurriculumModule` 类型 | 类型从 API types 导入 |

**保留 `src/curriculum/types.ts`** 作为前端类型定义（或迁移到 `src/services/api/types.ts`）。

### 3.4 新增 API + Hook

```typescript
// useCurriculum.ts
export function useCurriculum(gradeLevel: GradeLevel, subject: Subject) {
  return useQuery({
    queryKey: ['curriculum', gradeLevel, subject],
    queryFn: () => apiClient.getOne<Curriculum>('/curricula', {
      filters: [
        { column: 'gradeLevel', operator: 'eq', value: gradeLevel },
        { column: 'subject', operator: 'eq', value: subject },
      ],
      select: '*, curriculum_modules(*, curriculum_nodes(*))',
    }),
    staleTime: 24 * 60 * 60 * 1000, // 24小时缓存
  })
}
```

---

## Phase 4: 媒体文件服务器存储

### 4.1 新增数据库表

**`media_files` 表（媒体文件索引）：**
```sql
CREATE TABLE api.media_files (
  id SERIAL PRIMARY KEY,
  original_url TEXT NOT NULL,
  local_path TEXT,
  file_type VARCHAR(20) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  source VARCHAR(50) NOT NULL DEFAULT 'openmaic',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  downloaded_at TIMESTAMPTZ,
  CONSTRAINT media_files_url_unique UNIQUE (original_url)
);
```

### 4.2 Nginx 静态文件服务

```nginx
location /media/ {
    alias /data/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 4.3 媒体文件下载策略

在课堂生成完成后，后台异步扫描 Classroom JSON 中的 `imageUrl`/`audioUrl`：
1. 检查 `media_files` 表是否已存在
2. 不存在则下载到 `/data/media/{hash}.{ext}`
3. 更新 `media_files.local_path` 和 `status`
4. 前端渲染时优先使用 `/media/` 本地路径，fallback 到原始 URL

### 4.4 前端 URL 解析工具

```typescript
// src/utils/media-url.ts
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  // 如果已是本地路径，直接返回
  if (url.startsWith('/media/')) return url
  // 查缓存映射表（或直接返回原始URL作为fallback）
  return url
}
```

---

## 数据库表总结

| 新增表 | 用途 | RLS |
|--------|------|-----|
| `classroom_cache` | AI 课堂缓存持久化 | 通过 child_id 隔离 |
| `parent_activities` | 亲子活动数据 | 公共只读 |
| `tpr_instructions` | TPR 指令数据 | 公共只读 |
| `curricula` | 课程大纲主表 | 公共只读 |
| `curriculum_modules` | 大纲模块 | 公共只读 |
| `curriculum_nodes` | 大纲知识点 | 公共只读 |
| `media_files` | 媒体文件索引 | 公共只读 |

**总计新增 7 张表**，原有 15 张不变。

## 实施顺序和依赖

```
Phase 1 (课堂缓存)  ← 最高优先级，解决"刷新丢课堂"核心问题
     ↓
Phase 2 (活动/TPR)  ← 中优先级，结构简单
     ↓
Phase 3 (课程大纲)  ← 中优先级，数据量大但结构清晰
     ↓
Phase 4 (媒体文件)  ← 低优先级，需服务器端脚本支持
```
