- [x] 梳理家长 AI 设置相关组件与入口
- [x] 复核最近变更与重置流程代码
- [x] 判断可能的状态/遮罩来源并给出结论

## 工作内容
- 入口在 `src/pages/ParentSettings.tsx`，点击“打开 AI 设置面板”后渲染 `src/components/openmaic/settings/index.tsx` 的 `SettingsDialog`。
- 真正的“重置”逻辑在 `src/components/openmaic/settings/provider-config-panel.tsx`：点击“重置”只会把 `showResetDialog` 设为 `true`，随后弹出嵌套的 `AlertDialog`；确认后调用父层 `onResetToDefault()`，而父层 `handleResetProvider()` 仅重置内置 provider 的 `models` 列表并弹 toast，不会设置任何全页 loading、disabled 或业务锁定状态。
- 最近改动主要集中在 `settings/index.tsx` 与 `provider-config-panel.tsx` 的 UI 重构（侧栏头图、footer、模型卡片按钮样式、重置按钮区域样式），没有给 reset 新增异步请求或新的全页禁用状态。
- 之前“`AlertDialogContent` 仍停留默认 `z-50`”这一判断已过期。当前代码里 `provider-config-panel.tsx` 和 `settings/index.tsx` 的确认框都明确写成了 `<AlertDialogContent overlayClassName="z-[1200]" className="z-[1201]">`，所以旧结论确实是基于早期版本观察，不适用于当前代码。
- 已在真实浏览器完成一轮注册 → 创建孩子 → 打开家长 AI 设置 → 点击 `Reset` → 点击 `Confirm Reset` 的复现。运行态证据如下：1) 外层 `SettingsDialog` 打开时，`body` 会被 Radix 设成 `pointer-events: none` 且带 `data-scroll-locked`，此时仅存在一层 `dialog-overlay(z=1100)` 与一层 `dialog-content(z=1101)`；2) 打开重置确认框后，会新增 `alert-dialog-overlay(z=1200)` 与 `alert-dialog-content(z=1201)`，同时外层 `dialog-content` 的 `pointer-events` 变成 `none`，这是嵌套模态的正常表现；3) 点击 `Confirm Reset` 后，`alert-dialog-*` 会正确移除，页面回到只有外层 `dialog-overlay/dialog-content` 的状态，外层 `dialog-content` 的 `pointer-events` 恢复为 `auto`，没有残留第二层遮罩；4) 此时继续点击弹层内部 `Image Generation` 与 `Close` 都成功，说明“确认重置后设置弹层内部整页不可点击”在当前代码下**未复现**。
- 当前更准确的结论是：`body` 上的 `pointer-events: none` 是 Radix modal 的正常机制，用来禁止点击底页；如果用户感觉“整页都点不动”，更像是**底层家长设置页在 AI 设置弹层未关闭时本来就不可点**，而不是 reset 后遗留了一层没释放的遮罩。按我这轮复现，重置确认框关闭后没有发现 overlay 残留、`body` 锁定泄漏或外层 dialog 假死。若线上仍有问题，更像是特定浏览器/交互路径的瞬时状态问题，下一步应直接抓用户复现场景的录屏或 DevTools Elements/Computed 截图，而不是继续沿用旧的 z-index 推断。

## Task 3 现状补充（课堂路径）
- 已与 `executor` 对齐最新运行态证据：当前真实业务阻塞是课堂路径布局塌高，不是 `ThemeProvider`，也不是简单点击伪失败。
- 具体链路为 `Stage -> CanvasArea -> SceneRenderer -> QuizView` 挂在 `ClassroomBridge` 容器下时，多层祖先宽高为 `0`，导致 `quiz-start-button` 命中区域异常，无法顺利切到 answering。
- 在页面里临时注入 `height: 100%` / `width: 100%` 后，`option-0` 立即可见，说明 quiz 内容本身可渲染，真正缺的是容器尺寸沿祖先链正确传递。
- 因此 Task 3 现阶段应优先排查 `ClassroomBridge` 及其下游容器的高度继承与布局撑满，再继续验证答题、`onAnswer` 回传和 history 落库链路。
- 此前关于 `ThemeProvider` 的判断应降级为历史噪音，更可能与旧服务 / `reuseExistingServer` 复用旧 bundle 有关，不再作为当前主结论。

## 待执行验收清单（收到布局修复后立即复核）
- 课堂入口：从 lesson picker 进入 `/classroom` 后，不允许再出现 `quiz-start-button` 可见但实际无法命中的情况；需确认课堂主容器与 `Stage -> CanvasArea -> SceneRenderer -> QuizView` 祖先链已经拿到非 0 宽高。
- Quiz 交互：按真实点击路径完成 `quiz-start-button -> option-0 -> submit`，不能使用 `force: true` 掩盖命中问题；需要看到明确的 answering / submit / review 阶段切换信号。
- 课堂完成：review 后可继续推进到 `✅ 完成课堂` 或等价完成态，证明最小学习闭环恢复。
- 统计回传：确认 `QuizView` 结果能沿 `SceneRenderer -> CanvasArea -> Stage -> ClassroomBridge` 上行，最终触发外层 `onAnswer(...)`，并使 `learningStore.sessionStats.questionsCompleted` 实际增长。
- 历史落库：完成课堂后检查 `/classroom_history` 新记录满足 `questionsCompleted > 0` 且 `correctCount === 1`，避免只修复前台交互、未修复 persistence。
- 索引补充：仅在以上链路稳定通过后，才更新 `.codebuddy/project-index.md` 与必要的已知问题记录，避免把中间态或错误 root cause 写入索引。

## 环境信息
- workspace: `/Users/chenguoxie/CodeBuddy/OpenMAIC`
- 角色: planner

## 状态标记
- status: completed
