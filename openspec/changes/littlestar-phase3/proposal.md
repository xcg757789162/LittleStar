## Why

小星辰（LittleStar）已完成 Phase 1（核心引擎 + 组件）和 Phase 2（年级解锁 + 入学测评 + 学习报告），共 9 个引擎、5 个 Store、24 个大纲模块、38 个测试文件 / 358 个测试全部通过。

**核心问题**：UI 层与引擎层完全断裂。所有页面要么是静态 mock 数据，要么核心流程缺失：

- `Home.tsx`："开始学习"按钮无 onClick / 无导航
- `LearningSession.tsx`：选择科目后只显示"学习进行中..."，不调用任何引擎
- `StarMap.tsx`：硬编码"已点亮 0/3"，所有星球 opacity: 0.5
- `ParentDashboard.tsx`：硬编码"0分/0题/0%"
- `ParentSettings.tsx`：孩子信息硬编码"小明/5岁"
- 所有 Zustand Store 纯内存，无 IndexedDB 持久化
- 无全局布局 / 底部导航栏

## What Changes

**Phase 3：端到端集成**——将现有引擎、Store、组件串联成完整可用的学习 App。

1. **首页导航**：Home → `/learn` 路由跳转
2. **学习主循环**：新建 `useLearningFlow` Hook，串联 AdaptiveRouter → QuestionGenerator → 组件渲染 → 答题 → FeedbackAnimation → RuleEngine → MasteryCalculator → 下一题/结束
3. **AI 出题集成**：QwenProvider + QuestionGenerator 真实调用，无 Key 时 fallback
4. **Store 持久化 + 成就检测**：学习数据写入 Dexie.js，App 启动时从 DB 加载，AchievementEngine 自动检测
5. **星空地图真实数据**：StarMap 从 DB 读取掌握率，达标星球点亮
6. **家长面板真实数据**：ParentDashboard 显示真实统计，ParentSettings 连接 childStore
7. **全局布局**：AppLayout + BottomNav 底部导航栏

## Impact

**新建文件**：
- `src/hooks/useLearningFlow.ts` — 学习主循环编排 Hook
- `src/hooks/useInitializeApp.ts` — App 启动初始化 Hook
- `src/components/layout/AppLayout.tsx` — 全局布局容器
- `src/components/layout/BottomNav.tsx` — 底部导航栏

**修改文件**：
- `src/pages/Home.tsx` — 添加导航
- `src/pages/LearningSession.tsx` — 重写核心逻辑
- `src/pages/StarMap.tsx` — 连接真实数据
- `src/pages/ParentDashboard.tsx` — 连接真实数据
- `src/pages/ParentSettings.tsx` — 连接 childStore
- `src/router/index.tsx` — AppLayout 包裹
- `src/App.tsx` — 调用 useInitializeApp

**依赖**：无新增外部依赖，全部使用已安装的 zustand / dexie / framer-motion / react-router-dom
