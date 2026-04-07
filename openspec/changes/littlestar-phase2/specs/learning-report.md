# Spec: 学习报告系统

## Overview

为家长提供按年级维度的周/月学习报告，包含学习时长统计、知识点掌握趋势图、成就里程碑、薄弱知识点提醒和年级进度。

## Requirements

### R1: 报告数据模型

- 新增 `reportData` 表到 Dexie.js（聚合缓存）
- `ReportData` 和 `ReportMetrics` 类型（见 design.md）
- 索引：`[childId+type+periodStart]`，`childId`

### R2: 报告生成引擎

```typescript
class ReportEngine {
  /** 生成周报 */
  generateWeeklyReport(childId: string, weekStart: string): ReportData

  /** 生成月报 */
  generateMonthlyReport(childId: string, month: string): ReportData

  /** 获取缓存的报告（如有） */
  getCachedReport(childId: string, type: 'weekly' | 'monthly', period: string): ReportData | null

  /** 获取某年级的报告列表 */
  getReportsByGrade(childId: string, gradeLevel: GradeLevel): ReportData[]
}
```

### R3: 报告指标计算

#### 3.1 学习时长统计
- 数据源：`DailySession` 表
- 指标：
  - 本周期总学习时长（分钟）
  - 每天学习时长（柱状图数据）
  - 与上一周期对比（增加/减少 X 分钟）
  - 日均学习时长

#### 3.2 知识点掌握趋势
- 数据源：`MasteryRecord` 表的历史快照
- 新增 `masteryHistory` 表记录每日掌握度快照
- 指标：
  - 每个知识点的起始掌握度 → 结束掌握度
  - 趋势标记：上升 / 下降 / 稳定
  - 按科目分组展示

#### 3.3 成就与里程碑
- 数据源：`Achievement` 表
- 本周期内获得的所有成就
- 特别标注：年级解锁成就

#### 3.4 薄弱知识点提醒
- 条件：`masteryLevel < 60` 且 `totalAttempts > 3`
- 排序：掌握度从低到高
- AI 建议：针对每个薄弱点给出练习建议

#### 3.5 年级进度
- 数据源：`KnowledgeNode` + `MasteryRecord`
- 指标：
  - 总知识点数
  - 已掌握知识点数（masteryLevel ≥ 80）
  - 完成百分比
  - 预计完成天数（基于当前学习速度）

### R4: 报告 UI 组件

#### 4.1 报告列表页
- 按年级分 Tab（"大班" / "一年级" / ...）
- 每个 Tab 下按时间倒序列出周报/月报
- 支持切换周报/月报视图

#### 4.2 报告详情页

布局（从上到下）：
1. **头部**：报告类型 + 时间范围 + 孩子名称
2. **学习时长卡片**：总时长 + 日均 + 与上期对比（柱状图）
3. **知识掌握趋势**：折线图（横轴：日期，纵轴：掌握度，多条线=多知识点）
4. **成就里程碑**：横向卡片滚动
5. **薄弱知识点**：列表 + 进度条 + AI 建议
6. **年级进度**：大进度环 + 预计完成时间

#### 4.3 图表组件（Recharts）
- `LearningTimeChart`：柱状图（每日学习时长）
- `MasteryTrendChart`：折线图（掌握度趋势）
- `GradeProgressChart`：环形进度图

### R5: 掌握度历史记录

- 新增 `masterySnapshots` 表
- 每天学习结束时自动保存当日各知识点的掌握度快照
- 结构：`{ childId, date, snapshots: { nodeId, masteryLevel }[] }`

### R6: 报告 Store

- 新增 `reportStore`（Zustand）
- 状态：当前报告、报告列表、加载状态、筛选条件（年级/科目/周月）
- Actions：`generateReport`、`loadReports`、`setFilter`

## Edge Cases

- 某周没有学习数据 → 显示"本周还没有学习记录"
- 新解锁年级还没有学习数据 → 显示"刚解锁，开始学习后将生成报告"
- 报告数据量大 → 分页加载，最多展示最近 12 周 / 6 个月

## Acceptance Criteria

- [ ] 周报/月报自动生成
- [ ] 按年级维度展示
- [ ] 5 个指标模块完整：时长、趋势、成就、薄弱点、进度
- [ ] 图表可视化（柱状图 + 折线图 + 环形图）
- [ ] 掌握度历史快照每日记录
- [ ] 家长可查看历史报告
