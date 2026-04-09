## Phase 1: 课堂缓存持久化（最高优先级）

- [x] 1.1 在 `01-schema.sql` 中新增 `classroom_cache` 表（DDL + 索引 + UNIQUE 约束），包含 child_id、knowledge_node_id、date、cache_key、classroom_data(JSONB)、cached_at、expires_at
- [x] 1.2 在 `03-rls.sql` 中为 `classroom_cache` 添加 RLS 策略（通过 child_id → children.user_id 隔离），GRANT SELECT/INSERT/UPDATE/DELETE TO authenticated
- [x] 1.3 创建 `src/services/openmaic/postgres-cache-store.ts` — 实现 `CacheStore` 接口，所有 6 个方法（get/set/delete/entries/clear/size）通过 `apiClient` 调用 PostgREST API
- [x] 1.4 更新 `src/services/openmaic/index.ts` — 导出 `PostgresCacheStore`
- [x] 1.5 改造 `src/hooks/useLearningFlow.ts` — `ClassroomCache` 注入 `PostgresCacheStore(childId)` 替代默认内存 Map
- [x] 1.6 改造 `src/pages/Home.tsx` — `ClassroomCache` 注入 `PostgresCacheStore(childId)`
- [x] 1.7 改造 `src/pages/ParentDashboard.tsx` — `ClassroomCache` 注入 `PostgresCacheStore(childId)`
- [x] 1.8 更新 `src/services/openmaic/cache.ts` 注释 — 文档改为"默认内存 Map（测试用），生产环境使用 PostgresCacheStore"

## Phase 2: 亲子活动 + TPR 数据入库

- [x] 2.1 在 `01-schema.sql` 中新增 `parent_activities` 表（id、related_node_ids(JSONB)、task_description、parent_guide、guidance_card、offline_extension、type、estimated_minutes、subject、is_active）
- [x] 2.2 在 `01-schema.sql` 中新增 `tpr_instructions` 表（id、command、translation、action、emoji、difficulty、category、animation_type、is_active）
- [x] 2.3 在 `03-rls.sql` 中为两张新表添加公共只读 RLS（GRANT SELECT TO anon, authenticated）
- [x] 2.4 创建 `docker/postgresql/init/05-seed-activities.sql` — 将 `english-parent-activities.ts` 的 15 条数据转为 INSERT 语句
- [x] 2.5 在 `05-seed-activities.sql` 中追加 — 将 `english-tpr.ts` 的 20 条 TPR 指令转为 INSERT 语句
- [x] 2.6 在 `05-seed-activities.sql` 中追加 — 将 `english-tpr.ts` 的 4 个 TPR 知识点 INSERT 到 `knowledge_nodes` 表
- [x] 2.7 在 `05-seed-activities.sql` 中追加 — 将 `english-tpr.ts` 的 12 道 TPR 题目 INSERT 到 `questions` 表
- [x] 2.8 创建 `src/hooks/queries/useParentActivities.ts` — `useParentActivities(nodeIds?)` 查询 + `fetchRandomActivity(excludeIds?)` 随机获取
- [x] 2.9 创建 `src/hooks/queries/useTPRInstructions.ts` — `useTPRInstructions(category?)` 查询 + `fetchRandomTPR()` 随机获取
- [x] 2.10 在 `src/services/api/types.ts` 中新增 `ParentActivity` 和 `TPRInstruction` API 类型定义
- [x] 2.11 改造 `src/hooks/useLearningFlow.ts` — 删除 `english-parent-activities` 和 `english-tpr` import，改用 API hooks（getRandomActivity → fetchRandomActivity、getRandomTPR → fetchRandomTPR）
- [x] 2.12 改造 `src/components/learning/SessionSummary.tsx` — 删除 `englishParentActivities` import，改为 `useParentActivities()` React Query hook
- [x] 2.13 改造 `src/components/learning/OfflineExtensionCard.tsx` + `ParentActivityCard.tsx` — `ParentActivity` 类型从 `@/services/api/types` 导入
- [x] 2.14 改造 `src/components/learning/TPRActivity.tsx` — `TPRCommand`/`TPRAnimationType` 类型从 `@/services/api/types` 导入
- [x] 2.15 删除 `src/data/seed/english-parent-activities.ts` 和 `src/data/seed/english-tpr.ts`（确认无其他引用后）

## Phase 3: 课程大纲迁移到数据库

- [x] 3.1 在 `01-schema.sql` 中新增 `curricula` 表（grade_level、subject、version、reference、is_active，UNIQUE(grade_level, subject)）
- [x] 3.2 在 `01-schema.sql` 中新增 `curriculum_modules` 表（id、curriculum_id FK、name、description、order_index）
- [x] 3.3 在 `01-schema.sql` 中新增 `curriculum_nodes` 表（id、module_id FK、name、description、difficulty、content_types(JSONB)、prerequisites(JSONB)、template_prompts(JSONB)）
- [x] 3.4 在 `03-rls.sql` 中为三张大纲表添加公共只读 RLS（GRANT SELECT TO anon, authenticated）
- [x] 3.5 创建 `docker/postgresql/init/06-seed-curricula.sql` — 将 21 份大纲 TS 文件（kindergarten + grade-1~6 × math/chinese/english）转为 SQL INSERT 语句（curricula → curriculum_modules → curriculum_nodes 三级）
- [x] 3.6 创建 `src/hooks/queries/useCurriculum.ts` — `useCurriculum(gradeLevel, subject)` 查询，含 PostgREST 嵌套 select（curricula → modules → nodes），staleTime 24h
- [x] 3.7 重写 `src/curriculum/index.ts` 的 `loadCurriculum()` — 从动态 import TS 文件改为调用 API（通过 apiClient 查询数据库），保持 Map 缓存兼容
- [x] 3.8 更新 `src/curriculum/types.ts` 类型定义 — 确保与数据库字段对齐（或在 `src/services/api/types.ts` 中定义新类型并在 types.ts 中 re-export）
- [x] 3.9 确认 `src/hooks/usePlacementTest.ts` 和 `src/engine/placement-test-engine.ts` 不需改动（它们用 `loadCurriculum()` 间接调用，改了 index.ts 即透明升级）
- [x] 3.10 删除 `src/curriculum/kindergarten/`、`src/curriculum/grade-1/` 到 `grade-6/` 共 21 个大纲 TS 数据文件（保留 `index.ts`、`types.ts`、`__tests__/`）

## Phase 4: 媒体文件服务器存储

- [x] 4.1 在 `01-schema.sql` 中新增 `media_files` 表（original_url UNIQUE、local_path、file_type、file_size、mime_type、source、status、downloaded_at）
- [x] 4.2 在 `03-rls.sql` 中为 `media_files` 添加公共只读 RLS
- [x] 4.3 更新 `docker/nginx/nginx.conf` — 添加 `/media/` 静态文件路由（alias /data/media/，expires 30d）
- [x] 4.4 更新 `docker/openmaic/docker-compose.yml` — 为 Nginx 添加 `/data/media` volume 映射
- [x] 4.5 创建 `src/utils/media-url.ts` — `resolveMediaUrl(url)` 工具函数：本地路径直接返回，否则 fallback 原始 URL
- [x] 4.6 改造课堂渲染组件（使用 imageUrl/audioUrl 的地方）— 用 `resolveMediaUrl()` 包裹 URL

## Phase 5: PreCI + 验证

- [x] 5.1 TypeScript 编译检查通过（0 新增错误）
- [x] 5.2 ESLint 检查通过（0 新增错误）
- [x] 5.3 确认无已删除文件的残留 import
- [x] 5.4 更新 `openspec/changes/postgresql-full-migration/tasks.md` 记录新增任务
- [x] 5.5 更新 `.codebuddy/project-index.md` — 新增 7 张表、新增文件索引
