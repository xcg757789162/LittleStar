# settings-executor progress

- 状态: 已完成（`ClassroomSettings` runtime 竞态已修，reviewer 点名的 3 条 TypeScript 编译 blocker 也已清零，等待 focused review 复核）
- 负责任务: 修复服务端 agent id 分叉、`userNickname/userBio` 生成链路缺失，以及 `ClassroomSettings` 的角色/音色/轮数持久化与跨孩子串写/丢写风险
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

## TODO
- [x] 让 `headers-builder-server.ts` 直接复用当前 `PRESET_AGENTS` / 新 agent id 体系
- [x] 将 `selfIntroduction` / nickname 接进 `usePreGeneration -> task-processor -> pipeline-executor` 的 `UserRequirements.userBio/userNickname`
- [x] 修复 `ClassroomSettings.tsx` 的角色/音色/轮数持久化与自我介绍 debounce 跨孩子串写风险
- [x] 修复 `ClassroomSettings.tsx` 课堂字段 debounce 在切孩子/离页时的丢写竞态
- [x] 补充对应回归测试草案（服务端 headers builder、task requirements、pre-generation payload、ClassroomSettings 持久化）
- [x] 更新 `team-progress/settings-executor-progress.md` 与 `team-progress.md`

## 工作内容
- `src/server/services/headers-builder-server.ts` 已直接复用 `src/types/models.ts` 里的 `PRESET_AGENTS`，服务端 `x-agent-profiles` 不再沿用旧 `student-*` id；新增 `src/server/services/__tests__/headers-builder-server.test.ts` 锁定 teacher/assistant/showoff/curious/thinker 这套新 id 与音色回退规则。
- `src/hooks/usePreGeneration.ts` 新增 `buildPreGenerationChildSettings()`，提交任务时会把 `child.name` 收口为 `userNickname`、把 `selfIntroduction`（兼容读取）收口为 `userBio` 一起带进 `childSettings`；`src/server/services/task-processor.ts` 新增 `buildTaskRequirements()`，真正把这两个字段传给 `PipelineExecutor` 的 `UserRequirements`。
- `src/server/services/__tests__/task-processor-user-requirements.test.ts` 与 `src/server/services/__tests__/pipeline-executor.test.ts` 已补充对 `userNickname/userBio` 透传的回归约束；`src/hooks/__tests__/usePreGeneration.test.ts` 也补了 pre-generation 提交载荷测试。
- `src/pages/ClassroomSettings.tsx` 现在把课堂设置 debounce 从“共享单 timer”改成“按孩子维度缓存待写入快照”：`pendingClassroomSettingsRef`/`classroomSettingsTimersRef` 以 `childId` 为键保存待落库 payload；切换孩子时会立即 `flushClassroomSettingsToDb(previousChildId)`，组件卸载时也会遍历 flush 所有 pending child，避免课堂模式/角色/老师音色/轮数在 250ms 窗口内被切孩或离页直接取消。
- 同一文件的课堂设置 effect 现在会在 `currentChild.id` 变化的那个 render 周期**主动跳过调度**，先等 `syncChildToOpenMAIC(currentChild)` 把新孩子的 runtime settings 同步完成后，再针对当前孩子调度新的 debounce，避免把旧孩子的 runtime 快照错写到新孩子身上。
- `src/pages/__tests__/ClassroomSettings.persistence.test.tsx` 现在一共补齐了四类课堂字段回归：1) 正常修改后应写库并回写 `childStore`；2) 快速连续编辑时只能落库最后一次快照并回写 `childStore`；3) 在 250ms 窗口内切孩子后仍应写回原孩子且不串到新孩子；4) 组件卸载时应立即 flush 未落库的 debounce。原有正常持久化用例也补了显式 `advanceTimersByTime(250)`，避免假定定时器会自动触发。

## 验证 / 阻塞
- `read_lints` 已检查 `src/pages/ClassroomSettings.tsx`、`src/pages/__tests__/ClassroomSettings.persistence.test.tsx` 以及本次更新的进度文件，当前无新增 lint 错误。
- 已再次尝试按 `regression-auditor` 固定口径运行最短命令：`cd /Users/chenguoxie/CodeBuddy/OpenMAIC && npx vitest run --watch=false src/pages/__tests__/ClassroomSettings.persistence.test.tsx`
  - 真实结果：退出码 `1`，Vitest 输出 `Test Files no tests / Errors 1 error`，根因仍是仓库既有 worker 启动失败：`[vitest-pool]: Failed to start forks worker...`，并伴随 `html-encoding-sniffer` → `@exodus/bytes/encoding-lite.js` 的 `ERR_REQUIRE_ESM`。
- 也尝试了现有 workaround：
  - `PATH=/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH NODE_OPTIONS=--experimental-require-module npx vitest run --watch=false src/pages/__tests__/ClassroomSettings.persistence.test.tsx`
  - `PATH=/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH NODE_OPTIONS=--experimental-require-module npx vitest run --watch=false --pool=threads src/pages/__tests__/ClassroomSettings.persistence.test.tsx`
  - 结果：仍在 worker 启动前失败，但报错从 `ERR_REQUIRE_ESM` 收敛成 `RangeError: Maximum call stack size exceeded`，说明基础设施问题仍早于用例执行。
- 手工竞态验证结论（基于当前真实代码路径复核）：
  - 快速连续编辑：同一 `childId` 的 pending payload 始终只保留在 `pendingClassroomSettingsRef.current.set(childId, persistedSettings)` 的最后一次快照里，旧 timer 会被清掉重建，因此 250ms 内连改只会有最后一份设置进入 `apiClient.patch`，随后同一份 payload 被 `updateChildSettings(childId, persistedSettings)` 回写到 `childStore`。
  - 切孩子：`currentChild.id` 变更时先 `flushClassroomSettingsToDb(previousChildId)`，随后立刻 `return`，所以不会把旧孩子 runtime 快照错写给新孩子；新孩子要等 `syncChildToOpenMAIC(currentChild)` 推动 runtime 同步后，才会进入下一轮 debounce。
  - 卸载：cleanup 不再清掉课堂设置 timer，而是遍历 `pendingClassroomSettingsRef.current.keys()` 做 flush，因此不会出现“OpenMAIC store 已变但数据库没写”的离页丢写。
- 已按 reviewer 的原命令复跑 TypeScript 定向检查：`export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && cd /Users/chenguoxie/CodeBuddy/OpenMAIC && npx tsc --noEmit --pretty false 2>&1 | grep "ClassroomSettings.tsx" | cat`
  - 当前结果：**无输出，退出码 0**，说明 `src/pages/ClassroomSettings.tsx` 的 3 条 TypeScript 编译错误已清零。
- `reviewer` 最新 focused review 已确认：三条 gate（服务端 `PRESET_AGENTS`、`userNickname/userBio` 透传链、`ClassroomSettings.tsx` runtime+TS 修复）在其复核范围内均为 **ready**；其复跑的 `grep "ClassroomSettings.tsx"` 定向命令同样为无输出、`exitCode 0`。
- 当前可确认的验证结论：本轮相关文件无新增 lint 问题；代码路径上已消除 reviewer 指出的共享 timer 取消/卸载丢写竞态，并补齐了正常写库、连续编辑、切孩子、卸载四类回归测试；`ClassroomSettings.tsx` 的三条 TypeScript blocker 也已修掉；当前仅剩 `regression-auditor` 的最终增量验收结论待回收。

## 环境信息
- Node PATH: `/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin`
- 本次为主仓直接修改，无额外 worktree
