# Design: LittleStar Phase 2 — 渐进式年级解锁 + 学习报告 + 入学测评

## Context

Phase 1 构建了面向幼儿园中班/大班（4-6岁）的 AI 自适应学习平台。Phase 2 在此基础上新增：渐进式年级解锁（中班→六年级）、学习报告（周/月）、入学测评系统。

## Architecture Extension

```
┌─────────────────────────────────────────────────────┐
│                     PWA Shell                        │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │  学习界面 │ │ AI 对话  │ │家长仪表盘│ │学习报告│  │ ← NEW
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬────┘  │
│       │             │            │           │       │
│  ┌────┴─────────────┴────────────┴───────────┴───┐  │
│  │              Zustand 状态管理层                │  │
│  │  + gradeUnlockStore + reportStore              │  │ ← NEW stores
│  └──────────────────┬────────────────────────────┘  │
│       │              │             │          │      │
│  ┌────┴─────┐ ┌─────┴──────┐ ┌───┴────┐ ┌───┴───┐ │
│  │自适应引擎│ │ AI Service │ │年级解锁│ │测评引擎│ │ ← NEW
│  │+ 扩展年级│ │+ 扩展模板  │ │ Engine │ │Engine  │ │
│  └────┬─────┘ └─────┬──────┘ └───┬────┘ └───┬───┘ │
│       │              │            │           │      │
│  ┌────┴──────────────┴────────────┴───────────┴──┐  │
│  │          Dexie.js (IndexedDB) 数据层           │  │
│  │  + gradeUnlocks + placementTests + reportData  │  │ ← NEW tables
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │    知识点大纲库（按年级按需加载）              │   │ ← NEW
│  │    curriculum/grade-1/ grade-2/ ... grade-6/  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Data Model Extensions

### 年级类型扩展

```typescript
// Phase 1: 'middle-kindergarten' | 'senior-kindergarten'
// Phase 2: 扩展到完整年级体系
export type GradeLevel =
  | 'middle-kindergarten'   // 中班 (4-5岁)
  | 'senior-kindergarten'   // 大班 (5-6岁)
  | 'grade-1'              // 一年级 (6-7岁)
  | 'grade-2'              // 二年级 (7-8岁)
  | 'grade-3'              // 三年级 (8-9岁)
  | 'grade-4'              // 四年级 (9-10岁)
  | 'grade-5'              // 五年级 (10-11岁)
  | 'grade-6'              // 六年级 (11-12岁)

// 年级顺序（用于解锁判断）
export const GRADE_ORDER: GradeLevel[] = [
  'middle-kindergarten',
  'senior-kindergarten',
  'grade-1', 'grade-2', 'grade-3',
  'grade-4', 'grade-5', 'grade-6',
]
```

### 新增数据表

```typescript
/** 年级解锁记录 — 每个孩子每个科目独立追踪 */
interface GradeUnlock {
  id: string
  childId: string
  subject: Subject          // 'math' | 'chinese' | 'english'
  gradeLevel: GradeLevel    // 已解锁的年级
  unlockedAt: Date
  masteryAtUnlock: number   // 解锁时的掌握度
  placementTestId?: string  // 关联的入学测评 ID
}

/** 入学测评记录 */
interface PlacementTest {
  id: string
  childId: string
  subject: Subject
  gradeLevel: GradeLevel    // 测评的目标年级
  questions: PlacementQuestion[]
  startedAt: Date
  completedAt?: Date
  result: PlacementResult
}

interface PlacementQuestion {
  knowledgeNodeId: string
  questionId: string
  answer: unknown
  isCorrect: boolean
  timeSpent: number
}

interface PlacementResult {
  masteredNodes: string[]    // 已掌握的知识点 ID（跳过）
  startingNodes: string[]    // 建议的起始知识点 ID
  overallScore: number       // 0-100
}

/** 学习报告数据（聚合缓存） */
interface ReportData {
  id: string
  childId: string
  type: 'weekly' | 'monthly'
  gradeLevel: GradeLevel
  subject?: Subject          // null 表示全科
  periodStart: string        // YYYY-MM-DD
  periodEnd: string
  metrics: ReportMetrics
  generatedAt: Date
}

interface ReportMetrics {
  totalLearningMinutes: number
  dailyLearningMinutes: number[]   // 每天的学习时长
  knowledgeMastery: {
    nodeId: string
    nodeName: string
    startLevel: number
    endLevel: number
    trend: 'up' | 'down' | 'stable'
  }[]
  achievements: {
    name: string
    earnedAt: Date
  }[]
  weakPoints: {
    nodeId: string
    nodeName: string
    masteryLevel: number
    suggestion: string
  }[]
  gradeProgress: {
    totalNodes: number
    masteredNodes: number
    percentage: number
    estimatedCompletionDays?: number
  }
}
```

## 知识点大纲体系（参考课程标准）

### 数据来源

| 年级段 | 参考标准 |
|--------|---------|
| 中班/大班 | 《3-6岁儿童学习与发展指南》(2012) |
| 一至六年级（数学） | 《义务教育数学课程标准》(2022) |
| 一至六年级（语文） | 《义务教育语文课程标准》(2022) |
| 一至六年级（英语） | 《义务教育英语课程标准》(2022) |

### 各年级各科目核心知识点概要

#### 数学

| 年级 | 核心知识点 | 参考 |
|------|-----------|------|
| 中班(4-5岁) | 点数10以内、一一对应比多少、粗细厚薄轻重、数序 | 3-6岁指南 |
| 大班(5-6岁) | 10以内加减、量的相对性、简单统计图、形状空间 | 3-6岁指南 |
| 一年级 | 20以内加减法、100以内数的认识、认识物体图形、钟表、位置 | 2022课标 |
| 二年级 | 表内乘除法、100以内加减（进退位）、角、长度单位、万以内数 | 2022课标 |
| 三年级 | 多位数乘除一位数、分数/小数初识、周长面积、时分秒年月日 | 2022课标 |
| 四年级 | 大数认识、三位数乘两位数、小数运算、三角形、运算定律 | 2022课标 |
| 五年级 | 小数乘除、简易方程、多边形面积、因数倍数、分数加减 | 2022课标 |
| 六年级 | 分数乘除、百分数、圆、比例、圆柱圆锥、负数 | 2022课标 |

#### 语文

| 年级 | 核心知识点 | 参考 |
|------|-----------|------|
| 中班(4-5岁) | 听故事复述、简单汉字认识、看图说话、儿歌 | 3-6岁指南 |
| 大班(5-6岁) | 书写准备、阅读理解、语言表达、笔画认知 | 3-6岁指南 |
| 一年级 | 汉语拼音、800字认写、笔画笔顺、儿歌古诗、看图写话 | 2022课标 |
| 二年级 | 1600字认识/800字书写、查字典、阅读理解、标点符号 | 2022课标 |
| 三年级 | 2500字、段落阅读、习作入门、修辞初步 | 2022课标 |
| 四年级 | 3000字、篇章阅读、记叙文写作、阅读策略 | 2022课标 |
| 五年级 | 3500字、文体辨识、说明文写作、诗词鉴赏 | 2022课标 |
| 六年级 | 3500+字、综合阅读、议论文入门、文学常识 | 2022课标 |

#### 英语

| 年级 | 核心知识点 | 参考 |
|------|-----------|------|
| 中班(4-5岁) | 英语儿歌、基础问候语、颜色数字 | 启蒙阶段 |
| 大班(5-6岁) | 26字母、简单词汇（动物/水果）、日常表达 | 启蒙阶段 |
| 一年级 | 字母书写、自然拼读入门、50词、听说启蒙 | 预备级 |
| 二年级 | 自然拼读进阶、100词、简单句型、日常对话 | 预备级 |
| 三年级 | 200词、基础句型、日常话题（家庭/学校/食物）、听说读 | 1级(课标) |
| 四年级 | 400词、一般现在时、简单阅读、基础写句 | 1级(课标) |
| 五年级 | 600词、现在进行时/一般过去时、短文阅读、简单写作 | 2级(课标) |
| 六年级 | 800词、综合时态、篇章阅读、应用写作 | 2级(课标) |

### 大纲文件组织

```
src/
  curriculum/
    types.ts              # 大纲类型定义
    index.ts              # 按需加载入口
    kindergarten/          # 已有（Phase 1 种子数据迁移）
      math.ts
      chinese.ts
      english.ts
    grade-1/
      math.ts             # 一年级数学知识点 + 模板
      chinese.ts
      english.ts
    grade-2/
      math.ts
      chinese.ts
      english.ts
    ... (grade-3 到 grade-6 同结构)
```

## 年级解锁引擎设计

### 解锁流程

```
检查掌握度 → 达到阈值? → 触发解锁通知
                            ↓
                     加载下一年级大纲
                            ↓
                     启动入学测评
                            ↓
                     确定起始知识点
                            ↓
                     创建 KnowledgeNode + QuestionTemplate
                            ↓
                     记录 GradeUnlock
```

### 解锁条件（单科目）

```typescript
interface UnlockConfig {
  masteryThreshold: number    // 默认 80
  minNodesRequired: number    // 最少掌握的知识点数量
  minConsecutiveDays: number  // 最少连续学习天数（防止刷题速过）
}
```

当某科目当前年级所有知识点的**平均掌握度 ≥ 阈值**，且**已掌握知识点数 / 总知识点数 ≥ 80%**时，自动触发解锁。

## 入学测评引擎设计

### 测评流程

```
触发测评（首次/年级解锁）
    ↓
加载目标年级全部知识点
    ↓
选择 10-15 个代表性知识点
    ↓
为每个知识点生成 1 道测评题
    ↓
孩子作答（5-8分钟）
    ↓
分析结果：已掌握 / 未掌握
    ↓
输出：跳过已掌握、从未掌握的最前面开始
```

### 题目选择策略

- 覆盖该年级所有核心知识模块
- 每个模块选 1-2 个代表性知识点
- 题目难度取该知识点的中间值
- 自适应：前一题答对 → 后一题稍难；答错 → 稍易

## 学习报告设计

### 报告类型

| 类型 | 时间范围 | 生成时机 |
|------|---------|---------|
| 周报 | 周一到周日 | 每周一自动生成上周报告 |
| 月报 | 自然月 | 每月1日自动生成上月报告 |

### 报告模块

1. **学习时长统计**：柱状图，每天的学习时长
2. **知识点掌握趋势**：折线图，各知识点掌握度变化
3. **成就与里程碑**：列表，本周期获得的成就
4. **薄弱知识点提醒**：掌握度 < 60% 的知识点 + AI 建议
5. **年级进度**：进度条，当前年级完成百分比 + 预计完成时间

### 报告按年级维度

每个年级单独展示：
- "大班数学报告" / "一年级数学报告"
- 跨年级总览页面（各科目当前年级 + 进度）

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 单科独立解锁 | 允许发展不均衡，数学快的孩子不被语文拖住 |
| 2 | 掌握度阈值可配置（默认80%） | 家长可根据孩子调整 |
| 3 | 大纲按需加载 | 避免一次加载全部年级数据 |
| 4 | 入学测评确定起始点 | 跳过已掌握内容，避免重复 |
| 5 | 报告数据聚合缓存 | 避免每次查看报告都重新计算 |
| 6 | Recharts 图表库 | React 原生、声明式、TypeScript 友好 |
| 7 | 课标参考 | 教育部2022版课程标准 + 3-6岁发展指南 |

## Implementation Notes & Deviations

### 实现偏差

| # | 设计 | 实际实现 | 原因 |
|---|------|---------|------|
| 1 | `UnlockConfig.minNodesRequired` + `minConsecutiveDays` | 使用 `minMasteredRatio` (0.8) 替代 | 比例阈值更灵活，不依赖绝对数量；连续天数功能推迟到后续版本 |
| 2 | `generateWeeklyReport` / `generateMonthlyReport` 分开 | 统一为 `generateReport(input)` 通过 type 字段区分 | 减少代码重复，报告逻辑一致 |
| 3 | `getCachedReport` / `getReportsByGrade` | 由 `reportStore.getFilteredReports()` 替代 | 缓存逻辑交给 Zustand store，引擎保持纯计算 |
| 4 | 路由在 `src/App.tsx` 添加 | 路由在 `src/router/index.tsx` 添加 | 项目使用独立路由文件组织 |
| 5 | 入学测评自适应题目选择（前一题答对后一题稍难） | 自适应逻辑：答对→同模块下一更难题，答错→跳过该模块剩余题 | 基于模块的跳过策略更适合知识点级别测评 |

### 新增文件清单 (Task Group 5-6)

| 路径 | 用途 |
|------|------|
| `src/engine/report-engine.ts` | 报告引擎：计算指标、趋势、薄弱点、年级进度 |
| `src/engine/mastery-snapshot.ts` | 每日掌握度快照：生成+去重（每天每科只保存一次） |
| `src/stores/reportStore.ts` | 报告 Zustand store：列表、筛选、当前报告 |
| `src/components/charts/LearningTimeChart.tsx` | Recharts BarChart：每日学习时长柱状图 |
| `src/components/charts/MasteryTrendChart.tsx` | Recharts LineChart：知识点掌握趋势折线图 |
| `src/components/charts/GradeProgressChart.tsx` | CSS conic-gradient：年级进度环形图 |
| `src/pages/LearningReportPage.tsx` | 报告列表页：周报/月报切换 + 报告卡片列表 |
| `src/pages/ReportDetailPage.tsx` | 报告详情页：5 模块（时长、趋势、成就、薄弱、进度） |

### 修改文件清单 (Task Group 5-6)

| 路径 | 变更 |
|------|------|
| `src/router/index.tsx` | 添加 `/reports` 和 `/reports/:reportId` 路由 |
| `src/pages/ParentDashboard.tsx` | 添加 `useNavigate` 和"学习报告"入口按钮 |
| `src/stores/index.ts` | 导出 `useReportStore` + `SessionEndInfo` |
| `src/stores/learningStore.ts` | 添加 `onSessionEnd` 回调机制（`setOnSessionEnd`/`clearOnSessionEnd`） |
| `src/pages/__tests__/ParentDashboard.test.tsx` | 添加 `MemoryRouter` 包裹 + 报告入口按钮测试 |

### 测试统计

| 阶段 | 测试文件 | 测试数 | 累计总数 |
|------|---------|--------|---------|
| Phase 1 基线 | 25 | 254 | 254 |
| TG 1-2 (类型+大纲) | 27 | 267 | 267 |
| TG 3 (年级解锁) | 30 | 291 | 291 |
| TG 4 (入学测评) | 33 | 314 | 314 |
| TG 5 (学习报告) | 37 | 351 | 351 |
| TG 6 (端到端集成) | 38 | 358 | 358 |
