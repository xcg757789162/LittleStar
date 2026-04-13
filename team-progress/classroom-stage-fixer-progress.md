# classroom-stage-fixer 进度记录

## TODO 清单
- [x] 定位 `/classroom` 首屏崩溃根因与影响范围
- [x] 对 `src/components/openmaic/stage.tsx` 做最小安全修复
- [x] 检查相邻媒体 bootstrap 逻辑是否还有同类未声明引用
- [x] 做定向静态验证并记录残留风险
- [x] 更新 `.codebuddy/project-index.md` 并向 `main` 汇报

## 工作内容
- **根因确认**：`src/components/openmaic/stage.tsx` 的媒体 bootstrap `useEffect` 直接访问未声明的 `stage` / `outlines`，同时漏掉 `useMediaGenerationStore` 与 `generateMediaForOutlines` 的 import，进入 `/classroom` 时会在 `const stageId = stage?.id` 处触发 `ReferenceError: stage is not defined`。
- **最小修复**：
  - 给 `Stage` 组件补上 `useStageStore.use.stage()` 与 `useStageStore.use.outlines()` 订阅；
  - 补上 `useMediaGenerationStore` 与 `generateMediaForOutlines` import；
  - 未改动 effect 行为、播放逻辑或其他课堂链路。
- **相邻检查结论**：同一 effect 内的未声明/未导入引用已全部补齐；未继续扩散修改到无关逻辑。
- **索引同步**：已在 `.codebuddy/project-index.md` 顶部“最后更新”与“课堂媒体兼容主链修复”记录中补充本次 `/classroom` 首屏崩溃热修复。

## 验证结果
- **`read_lints`**：`src/components/openmaic/stage.tsx` 无新增诊断。
- **定向 eslint**：
  - `export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npx eslint src/components/openmaic/stage.tsx`
  - 输出的 3 个错误均为文件内既有 `@typescript-eslint/no-unused-vars`（`_sceneId`、`_fromAgentId`、`_prompt`），与本次修复无关；
  - 在临时关闭该规则后再次执行 `npx eslint src/components/openmaic/stage.tsx --rule '{"@typescript-eslint/no-unused-vars":"off"}'`，无其余错误输出。
- **运行态复核**：
  - 初次在 `http://localhost:8080/classroom` 点击数学课程卡后，浏览器仍命中旧 bundle `index-CYLCRq-M.js`，控制台复现 `ReferenceError: stage is not defined`，错误边界显示 `stage is not defined`；
  - 之后执行 `export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && npx vite build` 重新生成前端资源；
  - `curl http://localhost:8080/classroom | head` 显示入口已切到新 bundle `index-mEUSCHSt.js`；
  - Playwright 复测路径：`/classroom` → `数学` → `数字王国探险开始啦！`，页面成功进入 Stage，快照可见 `当前场景`、标题 `数字王国探险开始啦！`、播放控制条与 `✅ 完成课堂` 按钮；同轮 `browser_console_messages(level=error, all=false)` 返回 0 条错误。

## 环境信息
- **时间**：2026-04-13 11:51 左右开始处理
- **系统**：macOS / zsh
- **工作区**：`/Users/chenguoxie/CodeBuddy/OpenMAIC`

## 当前状态
- **状态**：已完成代码修复、索引同步、前端重建与浏览器级 `/classroom` 实机回归；当前 `http://localhost:8080/classroom` 已可进入真实 Stage。
- **残留风险**：本次仅修复并验证了 `stage/outlines/import` 缺失导致的首屏崩溃链，未继续扩改媒体恢复链的其他业务逻辑；若后续课堂数据本身异常，仍需主链联调继续观察。
