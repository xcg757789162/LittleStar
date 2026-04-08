## Context

小星辰是一个幼儿 AI 自适应学习平台（React + TypeScript + Vite）。Phase 1 和 Phase 2 已建成完整的底层（9 个引擎 + 5 个 Store + Dexie.js 数据库 + 24 个大纲模块 + 358 测试），但 UI 层仅有静态占位页面，未与任何引擎交互。

**当前架构图**：

```
[引擎层 ✅] AdaptiveRouter / MasteryCalculator / RuleEngine / ReviewScheduler / AchievementEngine / ...
[Store 层 ✅] learningStore / childStore / uiStore / gradeUnlockStore / reportStore
[组件层 ✅] FlashCard / MultipleChoice / WritingPad / FeedbackAnimation / AIChat
[AI 服务 ✅] QwenProvider / QuestionGenerator / AITeacher
[数据库 ✅] Dexie.js (LittleStarDB) — 12 张表
[页面层 ❌] Home / LearningSession / StarMap / ParentDashboard / ParentSettings — 全部断裂
```

Phase 3 的核心任务是补上页面层 → 引擎层/Store 层/组件层的连接。

## Goals / Non-Goals

**Goals:**

1. 实现完整的学习主循环（选科目 → 出题 → 答题 → 反馈 → 掌握率更新 → 下一题 → 会话结束）
2. 学习数据持久化到 IndexedDB，刷新不丢失
3. 所有页面显示真实数据（非 mock/硬编码）
4. 全局布局 + 底部导航，完整的 App 导航体验
5. AI 出题：有 API Key 时调千问，无 Key 时优雅 fallback 到种子题库

**Non-Goals:**

- ❌ PlacementTestPage 真实题目渲染（当前"我会/不太会"按钮够用）
- ❌ Store ↔ IndexedDB 实时双向同步（只需写入 + 启动加载）
- ❌ 离线支持 / PWA Service Worker 真实化
- ❌ 路由懒加载（React.lazy）
- ❌ PIN 码路由守卫
- ❌ 新增外部依赖

## Decisions

### D1: 学习主循环放在 Hook 而非页面组件

**决策**：新建 `useLearningFlow` Hook 封装整个学习编排逻辑，`LearningSession.tsx` 只负责 UI 渲染。

**理由**：
- 关注点分离：编排逻辑（引擎调用顺序、状态机）与渲染逻辑解耦
- 可测试性：Hook 可以独立单元测试
- 已有 `useLearningStore` 管理状态，Hook 在此之上编排引擎调用

### D2: 渐进式 7 步实现

**决策**：7 个步骤，每步完成后 App 都比上一步多一个可用功能。

**理由**：
- 每步可独立验证和演示
- 降低回归风险
- 步骤间依赖链清晰：Step1(导航) → Step2(学习循环) → Step3(AI出题) → Step4(持久化) → Step5(星图) → Step6(家长) → Step7(布局)

### D3: App 初始化策略

**决策**：新建 `useInitializeApp` Hook，App 启动时从 Dexie.js 加载数据到 Store。如果没有孩子记录，自动创建一个默认孩子（跳过 onboarding 流程）。

**理由**：
- 简化首次使用体验（Phase 3 重点是集成，不是 onboarding UX）
- 默认孩子可后续在 ParentSettings 修改

### D4: 题目组件动态渲染策略

**决策**：根据 `Question.type` 字段动态选择渲染组件：
- `multiple_choice` → `<MultipleChoice />`
- `flash_card` → `<FlashCard />`
- `writing` → `<WritingPad />`

**理由**：三个组件已全部实现并测试通过，只需根据类型映射渲染。

### D5: AI 出题降级策略

**决策**：检测 `import.meta.env.VITE_QWEN_API_KEY`，有值时初始化 QwenProvider 调 AI 出题；无值或 API 调用失败时 fallback 到 QuestionGenerator 内置的 3 道种子题/科目。

**理由**：QuestionGenerator 已内置 fallback 逻辑（`isFallback: true`），只需正确初始化即可。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| useLearningFlow Hook 复杂度高 | 串联 5+ 引擎，调试困难 | 分层：Hook 只做编排，每个引擎独立调用可追踪 |
| Dexie.js 启动加载可能慢 | 首屏白屏 | useInitializeApp 加 loading 状态 |
| AI API Key 泄露风险 | 通过 env 暴露在前端 | env 变量仅在 dev 环境使用，生产环境需后端代理 |
| 测试可能因 IndexedDB 依赖失败 | 测试环境无真实 DB | 使用 fake-indexeddb 或 mock Dexie |

## Implementation Notes

### Zustand 响应式模式

代码审查中发现了一个 Important 级别问题：`useLearningFlow` 初始实现中使用 `useLearningStore.getState().currentQuestion` 返回非响应式快照。**修复**：UI 绑定的状态必须使用选择器 `useLearningStore((s) => s.currentQuestion)`，仅 useEffect/回调中的一次性读取可用 `getState()`。

同时移除了不必要的 store 解构（`questionQueue`, `sessionStats`, `currentIndex`），避免任何 store 字段变化都触发 Hook 重渲染。

### 测试模式

- 所有构造器型模块（`AdaptiveRouter`, `QuestionGenerator`, `RuleEngine` 等）使用 `class` 语法 mock，而非 `vi.fn().mockImplementation()`
- `vi.hoisted()` 用于在 mock 提升前声明跟踪变量
- Dexie.js 统一使用 `vi.mock('@/db/database')` 返回链式调用 mock

### AI 鼓励语集成

`handleAnswer` 中的鼓励语生成是 fire-and-forget 模式（`.then()/.catch()`），不阻塞 UI 反馈流程。鼓励语异步到达后更新 `encouragement` state。

### e2e-flow 测试适配

App.tsx 集成 `useInitializeApp` 后，e2e-flow 测试需要 mock 该 Hook 返回 `{ isInitialized: true }`，否则渲染的是加载状态而非 app-root。

### 星空地图科目推断

StarMap.tsx 通过知识点 ID 前缀推断科目（`math-` → 数学, `chinese-` → 语文, `english-` → 英语）。这是一个轻量方案，未来可考虑在 MasteryRecord 上增加 subject 字段。

### PreCI 检查

worktree 目录需要单独执行 `preci init` 才能正常扫描。扫描结果：无告警。
