# Spec: 渐进式年级解锁系统

## Overview

实现单科目独立的渐进式年级解锁，从中班到小学六年级。孩子在某科目达到掌握度阈值后自动解锁下一年级，按需加载新年级知识点大纲。

## Requirements

### R1: GradeLevel 类型扩展

- 扩展 `GradeLevel` 联合类型，增加 `'grade-1'` 到 `'grade-6'`
- 新增 `GRADE_ORDER` 常量数组定义年级顺序
- 新增 `GRADE_LABELS` 映射表（中文名称）
- 新增 `getNextGrade(current: GradeLevel): GradeLevel | null` 工具函数
- 新增 `getGradeIndex(grade: GradeLevel): number` 工具函数
- 更新所有引用 GradeLevel 的模块兼容新值

### R2: 年级解锁数据模型

- 新增 `gradeUnlocks` 表到 Dexie.js 数据库
- 新增 `GradeUnlock` 类型：`{ childId, subject, gradeLevel, unlockedAt, masteryAtUnlock, placementTestId? }`
- 索引：`[childId+subject]`，`childId`
- 初始数据：每个孩子创建时自动插入当前年级的解锁记录

### R3: 解锁配置

- 新增 `UnlockConfig` 到 `ChildSettings`
- 字段：`masteryThreshold`（默认 80）、`minMasteredRatio`（默认 0.8）
- 家长设置页面新增"年级解锁条件"配置项

### R4: 解锁引擎

- `GradeUnlockEngine` 类
- `checkUnlockEligibility(childId, subject): UnlockEligibility` — 检查某科目是否满足解锁条件
- `triggerUnlock(childId, subject): GradeUnlock` — 执行解锁流程
- `getCurrentGrade(childId, subject): GradeLevel` — 获取当前年级
- `getUnlockProgress(childId, subject): UnlockProgress` — 获取解锁进度（百分比）
- 解锁触发时机：每次学习完成后自动检查

### R5: 解锁通知与动画

- 解锁时弹出庆祝动画（星球解锁效果）
- 通知文案："{科目}升级到{年级}啦！🎉"
- 自动跳转到入学测评

### R6: 大纲按需加载

- `CurriculumLoader` 模块
- `loadGradeCurriculum(grade, subject): KnowledgeNode[]` — 懒加载年级大纲
- 加载后写入 IndexedDB 的 `knowledgeNodes` 和 `questionTemplates` 表
- 使用动态 import 实现代码分割

## Edge Cases

- 孩子所有年级都已解锁（六年级之后无下一级）→ 显示"全部完成"成就
- 家长降低阈值后已满足条件 → 不自动解锁，需下次学习完成后触发
- 多科目同时满足条件 → 分别触发，每个科目独立弹窗

## Acceptance Criteria

- [ ] GradeLevel 支持 8 个等级
- [ ] 单科目解锁不影响其他科目
- [ ] 掌握度达到阈值时自动触发
- [ ] 解锁后自动跳转入学测评
- [ ] 家长可配置解锁阈值
- [ ] 大纲按需加载，不一次全部加载
