# Spec: 入学测评系统

## Overview

在首次使用和每次解锁新年级时自动触发入学测评，通过 10-15 道题/科目评估孩子已有水平，确定新年级的起始知识点，跳过已掌握内容。

## Requirements

### R1: 测评数据模型

- 新增 `placementTests` 表到 Dexie.js
- `PlacementTest` 类型（见 design.md）
- 索引：`[childId+subject+gradeLevel]`，`childId`

### R2: 测评引擎

```typescript
class PlacementTestEngine {
  /** 为指定年级科目生成测评题目 */
  generateTest(gradeLevel: GradeLevel, subject: Subject): PlacementQuestion[]

  /** 提交答案并获取下一题（自适应） */
  submitAnswer(testId: string, answer: unknown): {
    isCorrect: boolean
    nextQuestion: PlacementQuestion | null  // null = 测评结束
    progress: number  // 0-100
  }

  /** 完成测评，计算结果 */
  completeTest(testId: string): PlacementResult

  /** 根据测评结果初始化知识点掌握度 */
  applyResult(testId: string): void
}
```

### R3: 题目选择策略

1. 从目标年级的大纲中获取所有知识模块
2. 每个模块选取 1-2 个代表性知识点
3. 总计 10-15 题
4. 自适应调整：
   - 前一题答对 → 跳到同模块更难的知识点（如有）
   - 前一题答错 → 跳到下一个模块的基础知识点
5. 题目类型：以选择题为主（速度快，适合测评场景）

### R4: 结果分析

- **已掌握**：该知识点答对 → masteryLevel 初始化为 70
- **未掌握**：该知识点答错 → masteryLevel 初始化为 0
- **起始知识点**：第一个未掌握的知识点（按知识图谱顺序）
- 未覆盖到的知识点：
  - 在已掌握知识点之前的 → 默认已掌握（masteryLevel = 60）
  - 在起始知识点之后的 → 默认未掌握（masteryLevel = 0）

### R5: 测评 UI

- 友好的测评开始页面："让我们看看你已经学会了什么！🌟"
- 进度条显示当前进度（3/15）
- 每题作答后有简单反馈（对/错），但不详细讲解（避免干扰测评节奏）
- 测评完成后展示结果摘要："你已经掌握了 X 个知识点，太棒了！"
- 显示跳过的知识点列表和即将开始学习的知识点

### R6: 触发时机

- **首次使用**：创建孩子档案后，各科目进入当前年级测评
- **年级解锁**：解锁新年级后自动进入该年级测评
- **手动触发**：家长可在设置中手动重新测评某个年级

### R7: 测评时限

- 每道题最多 30 秒（超时视为不会）
- 整体不超过 8 分钟/科目
- 显示倒计时（温和提示，不给孩子压力）

## Edge Cases

- 孩子全部答对 → 所有知识点标记为已掌握，学习从最后的知识点继续复习
- 孩子全部答错 → 从第一个知识点开始
- 中途退出 → 保存已答题目，下次进入继续
- 网络问题（AI 生成题目失败）→ 使用预置的测评题目

## Acceptance Criteria

- [ ] 10-15 题/科目，5-8 分钟完成
- [ ] 自适应题目选择（答对稍难，答错换模块）
- [ ] 结果准确确定起始知识点
- [ ] 已掌握知识点跳过
- [ ] 测评进度可保存、可恢复
- [ ] 首次使用和年级解锁时自动触发
