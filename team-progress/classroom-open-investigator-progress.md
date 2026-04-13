# classroom-open-investigator 进度记录

## 当前结论
- **`/classroom` 打不开的最可能根因**：`src/components/openmaic/stage.tsx` 新增的媒体恢复副作用里直接引用了**未声明变量** `stage`（同时也引用了未声明/未导入的 `outlines`、`useMediaGenerationStore`、`generateMediaForOutlines`）。浏览器在执行 `const stageId = stage?.id;` 时会抛出 `ReferenceError: stage is not defined`，与用户截图高度一致。
- **回归判断**：这是**最近回归**，不是长期问题。`git blame -L 360,386 src/components/openmaic/stage.tsx` 显示该段代码由提交 `4134c0d6`（2026-04-13 11:26）引入；`.codebuddy/project-index.md` 同日也记录了“`stage.tsx` 课堂加载后执行 `restoreFromDB(stageId)` + `generateMediaForOutlines()`”这条新链路。
- **最小修复点**：`src/components/openmaic/stage.tsx` 顶部 store 取值处与 import 区。至少需要把 `stage` / `outlines` 正确从 `useStageStore` 取出，并补齐 `useMediaGenerationStore` / `generateMediaForOutlines` 的 import，才能让这段副作用可执行。

## 1. `/classroom` 路由与数据流
1. `src/pages/NativeClassroom.tsx:159-188`
   - 课程卡点击后执行 `handleStartLesson()`。
   - 从 `ClassroomCache.getClassroom(knowledgeNodeId, date)` 取课堂。
   - 调 `syncSettingsToOpenMAIC(currentChild.settings)` 同步孩子设置。
   - 调 `startSession(subject)` 启动学习会话。
   - 调 `loadClassroom(classroom, knowledgeNodeId)` 把课堂注入桥接 store。
2. `src/stores/openmaic/classroom-bridge.ts:69-136`
   - `loadClassroom()` 先构建 `stage` 元数据（优先 `classroom.stage`，否则从课堂字段兜底构造）。
   - 然后把 `classroom.scenes` 转成 OpenMAIC `Scene[]`。
   - 再调用 `useStageStore.getState()`：依次 `clearStore()` → `setStage(stage)` → `setScenes(scenes)` → `setOutlines(...)` → `setMode('playback')` → `setCurrentSceneId(...)`。
3. `src/components/classroom/ClassroomBridge.tsx:124-143`
   - 桥接 store 状态到 `ready` 后开始渲染 `<Stage />`。
4. `src/components/openmaic/stage.tsx`
   - `Stage` 组件 mount 后执行多个副作用；其中 4 月 13 日新增的“媒体恢复”副作用在运行第一行就触发 `stage is not defined`。

## 2. 直接命中的根因位置
### A. 未声明的 `stage`
- `src/components/openmaic/stage.tsx:47-52`
  - 当前只从 `useStageStore()` 解构了 `mode, getCurrentScene, scenes, currentSceneId, setCurrentSceneId, generatingOutlines`。
  - **没有**取出 `stage`，也**没有**取出 `outlines`。
- `src/components/openmaic/stage.tsx:360-386`
  - 新增副作用直接写了：
    - `const stageId = stage?.id;`
    - `if (!disposed && outlines.length > 0) { ... }`
    - `await useMediaGenerationStore.getState().restoreFromDB(stageId);`
    - `await generateMediaForOutlines(outlines, stageId, abortController.signal);`
  - 但本文件中：
    - 没有 `const stage = ...`
    - 没有 `const outlines = ...`
    - 没有 `useMediaGenerationStore` import
    - 没有 `generateMediaForOutlines` import
- 因此浏览器进入该 effect 时，第一句 `stage?.id` 就会直接抛 `ReferenceError`。

### B. 这是最近引入的回归，不是老问题
- `git log -- src/components/openmaic/stage.tsx` 只显示最近一条相关提交：`4134c0d fix: stabilize classroom settings and pipeline sync`。
- `git show 4134c0d -- src/components/openmaic/stage.tsx` 显示本次正是**新增**了 `useEffect(() => { const stageId = stage?.id; ... }, [stage?.id, outlines])` 整段代码。
- `git blame -L 360,386 src/components/openmaic/stage.tsx` 也全部归属于 `4134c0d6`（2026-04-13 11:26:43 +0800）。
- `.codebuddy/project-index.md:531-546` 同日记录了“课堂媒体兼容主链修复”，其中明确写到：
  - `src/components/openmaic/stage.tsx` 新增“课堂加载后执行 `restoreFromDB(stageId)`，并基于 `outlines` 调 `generateMediaForOutlines()`”。
- 结论：**`stage is not defined` 基本可判定为 4 月 13 日新引入的媒体恢复链回归。**

## 3. 与截图日志的对应调用链
### 3.1 `Store cleared`
- `src/stores/openmaic/classroom-bridge.ts:104-110`
  - `loadClassroom()` 在正式注入课堂前先调用 `stageStore.clearStore()`。
- `src/lib/openmaic/store/stage.ts:308-321`
  - `clearStore()` 会输出 `log.info('Store cleared')`。
- 这与截图里的 `Store cleared` 完全对应。

### 3.2 `stage is not defined`
- `src/components/classroom/ClassroomBridge.tsx:124-143` 渲染 `<Stage />`。
- `src/components/openmaic/stage.tsx:360-386` 的新增 effect 在 mount 时执行。
- 因为 `stage` 未声明，`const stageId = stage?.id;` 直接抛出运行时异常，页面中断。
- 这与截图主报错 **`stage is not defined`** 完全对应。

### 3.3 `Cannot save: stage_id is required`（仓库内最接近日志为 `stage.id`）
- 仓库内最接近且同一链路的日志在 `src/lib/openmaic/store/stage.ts:250-255`：`log.warn('Cannot save: stage.id is required')`。
- `setStage()` / `setScenes()` / `setCurrentSceneId()` 都会触发同一个 500ms `debouncedSave()`（`src/lib/openmaic/store/stage.ts:114-131, 182-189, 327-335`）。
- **高概率链路**：
  1. `loadClassroom()` 刚把课堂写进 stage store，并排队了 debounce 保存；
  2. `Stage` mount 后立刻因 `stage is not defined` 崩溃；
  3. 页面/边界随后执行清理（`NativeClassroom` 卸载时 `resetBridge()`，见 `src/pages/NativeClassroom.tsx:341-355`）；
  4. store 被清空后，之前排队的 debounced save 才执行，此时 `stage` 已是 `null`，于是出现 `Cannot save: stage.id is required`。
- 截图里是 `stage_id`（下划线）而仓库现字面量是 `stage.id`（点号），**但来源链路和语义高度吻合**，很可能是截图口述/控制台转写差异，或来自同一问题的相邻分支构建产物。

## 4. 是否建议修复
- **建议立即修复。**
- 这是一个 P0 级前端回归：一旦进入 `Stage` 组件就会在 mount effect 首行崩溃，导致 `/classroom` 主路径不可用。
- 而且同一段新代码还缺失 `outlines` / `useMediaGenerationStore` / `generateMediaForOutlines`，说明这不是偶发脏数据，而是**提交时漏接了整段依赖**。

## 5. 最小修复建议（仅建议，不改代码）
1. 在 `src/components/openmaic/stage.tsx` 的顶部 state 读取处，把 `stage`、`outlines` 明确从 `useStageStore` 取出。
2. 补齐 `useMediaGenerationStore` 与 `generateMediaForOutlines` 的 import。
3. 再验证：进入 `/classroom` 后不再抛 `stage is not defined`，且控制台不再出现后续 `Cannot save: stage.id is required` 连锁日志。

## 结论摘要（给 main）
- **根因文件/函数/位置**：`src/components/openmaic/stage.tsx`，`Stage()` 组件内 2026-04-13 新增的媒体恢复 `useEffect`（约 360-386 行）。
- **根因性质**：最近提交 `4134c0d6` 引入的前端回归；代码直接使用未声明变量 `stage`，并且还漏了 `outlines`/相关 import。
- **与截图一致性**：`Store cleared` ← `ClassroomBridge.loadClassroom -> stageStore.clearStore()`；`stage is not defined` ← `Stage` mount effect；`Cannot save...stage_id/stage.id is required` ← 崩溃后清空 store 与延迟保存相撞的次生日志。
