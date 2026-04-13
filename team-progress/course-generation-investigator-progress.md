# course-generation-investigator

- 状态: 已完成调查
- 当前任务: 定位“英语评测后未生成课程”与“点击英语开始学习后长时间停在课程准备中”的根因
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 流程: Plan -> Review -> Investigate -> Report

## 任务拆分
- [x] 梳理预生成/水位线/课程准备页数据流
- [x] 解释“明明无英语课却判断无需生成”
- [x] 确认“AudioContext 预激活成功”后卡住的等待条件
- [x] 输出根因、关键证据和最小修复点

## 关键结论
- **主根因 1：预生成水位线按全局缓存总数判断，不按学科判断。** `usePreGeneration.ts` 先根据“已完成评测科目数”算出最小水位线，再用 `cache.getCacheSize()` 读取该孩子的**全量可渲染课堂数**；只要总数达到阈值，就直接返回“缓存已达水位线，无需生成”。因此即使英语 0 节，只要数学/语文合计已有 4 节，也会跳过英语补货。
- **主根因 2：英语课程页空列表不会触发补货，也不会轮询进度。** `NativeClassroom.tsx` 选中英语后只做一次 `cache.listCachedClassrooms(undefined, 'english')`；如果结果为空，就渲染静态“课程准备中...”页面，仅提供“重新加载/返回首页”，没有调用 `usePreGeneration`、没有自动补货、没有进度订阅。
- **“AudioContext 预激活成功”不是卡点，只是用户点击英语时最先发生的同步动作。** 真正卡住的是英语课程列表的等待条件：`isLoading === false && cachedLessons.length === 0`。如果已成功进入 `ClassroomBridge`，才会进入另一个“正在准备课堂...”等待态；当前问题大概率还没走到那一步。
- **`/pre_generation_tasks 404` 不是当前源码主链路径。** 全仓搜索无 `pre_generation_tasks` / `/pre_generation_tasks` 引用；当前活跃实现统一使用 `generation_tasks` 表和 `/api/pre-generate` 路由。若运行态仍出现该 404，更像旧 bundle / 旧浏览器缓存 / 历史代码残留请求。

## 关键证据
- `src/hooks/usePreGeneration.ts`
  - `getMinCacheSizeForCompletedSubjects()` 只返回 0~3 的全局阈值。
  - `runPreGeneration()` 中先查 `placement_tests` 得到 `completedSubjects`，再调用 `cache.getCacheSize()`；若 `existingSize >= requiredCacheSize` 就直接 `setStatus('completed')` 并返回。
- `src/services/openmaic/cache.ts`
  - `getCacheSize()` 只统计该 child 的**全部有效缓存**，没有 `subject` 过滤。
  - `listCachedClassrooms(date?, subject?)` 才支持按学科过滤，说明“计数逻辑”和“课程页展示逻辑”口径不一致。
- `src/pages/Home.tsx`
  - 首页“已准备好啦”和“开始学习”只看 `cachedCount > 0` / `hasPlacementTest`，不校验每个已评测学科是否都有课。
  - 点击“开始学习”直接 `navigate('/classroom')`，没有把“缺哪一科课”显式暴露给用户。
- `src/pages/NativeClassroom.tsx`
  - `handleSubjectSelect()` 会先 `activateAudio()`，因此控制台先打印 `[useAudioActivation] AudioContext 预激活成功`。
  - 随后 `loadLessons(subject)` 只执行 `cache.listCachedClassrooms(undefined, subject)`；若空数组，则页面进入“课程准备中... / AI 老师正在为你准备课程，请稍等片刻再试”。
- `src/hooks/useAudioActivation.ts`
  - 这里只是创建/恢复共享 `AudioContext` 并打印成功日志，不参与课程查询、任务触发或状态推进。
- `src/server/index.ts` + `docker/postgresql/init/01-schema.sql` + `docker/postgresql/init/09-generation-tasks.sql`
  - 当前后端真实使用的是 `generation_tasks` 和 `/api/pre-generate`；并不存在 `pre_generation_tasks` 活跃定义。

## 数据流梳理
1. **评测完成后自动补货链**：`usePlacementTest` 触发 `placement-test-completed` 事件 -> `usePreGeneration.runPreGeneration()` -> 查 `placement_tests` -> 用 `ClassroomCache.getCacheSize()` 做全局水位判断 -> 若不足才规划任务并 POST `/api/pre-generate` -> 后端 `generation_tasks` -> `task-processor` 生成后写入 `classroom_cache`。
2. **点击“开始学习”链**：`Home.tsx` 直接进 `/classroom` -> `NativeClassroom` 先选科目 -> 点击英语后 `activateAudio()` -> `loadLessons('english')` -> `listCachedClassrooms(undefined, 'english')` -> 为空则停在“课程准备中...”。
3. **真正进入课堂链**：只有在拿到具体 `classroom` 后，`handleStartLesson()` 才会 `loadClassroom()` -> `ClassroomBridgeStore.status` 从 `loading` 变 `ready`；否则根本不会进入 Stage。

## 对四个判断项的答复
1. **预生成/水位线/课程准备页数据流已定位清楚**：见上方“数据流梳理”。
2. **为什么明明无英语课却判断无需生成**：因为水位线比较的是“该孩子的全局缓存总数”而不是“英语缓存数”；4 节其他学科课也会让英语被误判为“无需生成”。
3. **更偏向哪类问题**：主因是**按全局水位线而非按学科水位线**；其次叠加**课程页缺少状态同步/补货触发**。不像后端路由主因，因为当前源码并没有 `pre_generation_tasks` 活跃路径。
4. **“AudioContext 预激活成功”后卡住与哪个等待条件相关**：与 `NativeClassroom.tsx` 的空课程列表等待相关，即 `cachedLessons.length === 0`；不是 AudioContext 本身，也不是 `ClassroomBridge` 的 Stage 加载等待。

## 最小修复点（按优先级）
1. **`usePreGeneration.ts`**：把水位判断从 `cache.getCacheSize()` 改成“按已完成学科逐科检查是否有缓存”，至少保证每个已评测学科都有 >=1 节课后才允许跳过补货。
2. **`NativeClassroom.tsx`**：在某学科 `cachedLessons.length === 0` 时，不要只显示静态空态；至少要触发补货/跳到进度页/订阅预生成状态三者之一，否则用户会一直卡在“课程准备中”。
3. **`Home.tsx`**：首页 ready/CTA 文案应改成按学科显示，避免“全局有 4 节课”掩盖“英语 0 节课”的事实。
4. **运行态排查项**：若浏览器仍出现 `/pre_generation_tasks 404`，需做一次强制刷新或确认当前前端 bundle 版本，排除旧资源缓存；但这不是当前源码主根因。

## 最新协同状态（2026-04-13 12:09）
- `placement-pregen-fixer` 已落地两处关键修复：
  1. `cache.getCacheSize(subject?)` 已支持按学科统计。
  2. `usePreGeneration.getSubjectsMissingCache()` 已改为按“已评测学科逐科检查”，只为缺课学科补货。
  3. `NativeClassroom` 在学科无课时也已接入动态检查/生成状态，不再只是静态空等待页。
- 因此，**“全局缓存掩盖英语 0 课”这一主根因已进入修复态/已修复态**，后续给 `main` 的表述应更新为：
  - 历史回归根因：全局水位线 + 课堂页空等待。
  - 当前代码状态：修复已落地，需重点验证英语评测完成后是否会即时补货，以及英语无课时是否能自动进入生成中状态。
  - 残余风险：`Home.tsx` 首页 ready/CTA 口径若仍偏全局缓存展示，可能继续误导用户对“各学科是否都有课”的判断。
