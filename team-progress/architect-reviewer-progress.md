- [x] 评审 Task 3 迁移范围与验收标准
- [x] 审核 selector 与断言设计风险
- [x] 给出通过/不通过结论

## 工作内容
- 已审阅 `docs/核心学习闭环测试方案.md`、`e2e/tests/*`、`e2e/helpers/*`、`Home.tsx`、`NativeClassroom.tsx`、`LearningHistory.tsx`、`SessionSummary.tsx`、`ClassroomBridge.tsx`、`review-learning.ts` 等关键文件。
- 结论：迁移方向部分合理（先落 smoke + feature/lesson-picker，再推进 full），但 **Task 3 当前方案不通过**，不能直接按旧版 P1-P6 闭环脚本迁移为 Playwright `full` 用例。
- 核心原因 1：旧方案中的多个 selector / 断言已与真实 UI 漂移，包括 `cache-status`、`learning-session`、`session-progress`、`exit-button`、`classroom-view`、`nav-next`、`quiz-option` 等，继续沿用会制造大量假失败。
- 核心原因 2：真正的业务闭环尚未打通。`NativeClassroom` 目前只把 `onAnswer` 传给 `ClassroomBridge`，但 `ClassroomBridge` 并未向 Stage/Quiz 透传答题事件；因此真实课堂答题不会累计到 `learningStore.sessionStats`，完成后很可能写出 `questionsCompleted = 0` 的记录，而 `LearningHistory` 又会过滤 `questionsCompleted <= 0`，导致“完成课堂 → 历史可见”这条链路在当前实现下不稳定甚至不成立。
- 核心原因 3：复习路径未接通。`LearningHistory` 会带着 `reviewMode/historyId` 跳转 `/classroom`，但 `NativeClassroom` 的 `LocationState` 只识别 `subject`，没有消费 `reviewMode/historyId` 去加载历史课堂，因此 P5 不应纳入当前最小 full 验收。
- 建议的最小 full 验收范围：仅保留“登录/首页就绪 → 进入 `/classroom` → 选择已评测科目 → 出现课程选择器或空缓存 fallback → 进入一节课 → 手动完成课堂按钮可达 → 出现 `session-summary` → 关键写库接口有成功响应/新增记录”这一条最短路径；重登恢复、复习入口、继续新课应拆到后续 feature/regression。
- 设计建议：优先补 helper 和稳定锚点，再写 full spec。至少需要统一页面对象/助手层来封装首页状态、课堂页阶段识别、课程卡片选择、完成态校验、API 种子/校验；否则直接写 spec 会把当前文案和 DOM 细节硬编码进用例，维护成本很高。
- 2026-04-12 补充复核：planner 关于“内层确认框仍停留在默认 `z-50` 被父级设置弹窗遮住”的判断已过期。当前 `settings/index.tsx`、`provider-config-panel.tsx`、`model-edit-dialog.tsx`、`add-provider-dialog.tsx`、`general-settings.tsx`、`image-settings.tsx`、`video-settings.tsx` 都已经把二级 `Dialog/AlertDialog` 的 overlay/content 显式提升到 `z-[1200]` / `z-[1201]`，因此 **视觉层级不是当前更可能的 root cause**。
- 2026-04-12 补充复核：更高概率的真实交互风险来自 **共享 Radix modal 清理链**，不是局部样式层级。`ui/dialog.tsx` 与 `ui/alert-dialog.tsx` 仍保留默认 modal 行为、受控 `open` 关闭方式，以及 `data-closed:animate-out` 关闭动画；项目依赖 `radix-ui` `^1.4.3`，锁定的 `@radix-ui/react-dialog` / `@radix-ui/react-alert-dialog` 为 `1.1.15`。这类组合命中过往已知问题：关闭后 `body` 可能残留 `pointer-events: none`，导致页面看起来还在、但课堂或父弹窗整体不可点击。
- 2026-04-12 补充复核：从当前代码看，`focus` 恢复异常更像次生问题，不是首要根因。焦点回错最多造成键盘焦点异常，但**不会单独解释“鼠标点不动”**；若真实症状是关闭二级弹窗后父弹窗/课堂整体失去鼠标交互，应优先排查 `pointer-events` / inert 清理残留，而不是继续调 z-index。
- 2026-04-12 补充复核：最小修复边界应落在共享模态层，而不是每个 settings 业务文件继续堆补丁。优先级建议为：1）在 `ui/dialog.tsx` / `ui/alert-dialog.tsx` 做关闭后兜底清理与回归测试；2）对 settings 内的二级弹窗评估是否改成非模态 `modal={false}` 或避免多层同时受控挂载；3）最后才是具体业务弹窗调用点的微调。
- 2026-04-12 补充复核：验证重点应放在“状态清掉但交互仍被锁”的证据链，而不是只看视觉是否浮到最上层。建议验收时明确检查：关闭 reset/delete/model/add 等二级弹窗后，`document.body.style.pointerEvents` 不残留；父级 `SettingsDialog` 内按钮仍可点击；关闭整个设置弹窗后课堂 `Header` / quiz 区域可重新点击；重复开关不同二级弹窗顺序不会复现锁死。

## 环境信息
- worktree: `/Users/chenguoxie/CodeBuddy/OpenMAIC/.worktrees/playwright-e2e-runner-20260412`
- 角色: architect-reviewer

## 状态标记
- status: completed
