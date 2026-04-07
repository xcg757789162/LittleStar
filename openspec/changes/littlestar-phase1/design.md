# Design: LittleStar Phase 1

## Context

LittleStar 是一个面向幼儿园中班（4-5岁）和大班（5-6岁）的 AI 自适应学习平台。本文档记录技术架构决策和实现细节。

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    PWA Shell                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  学习界面  │  │ AI 对话  │  │  家长仪表盘   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │            │
│  ┌────┴──────────────┴───────────────┴────────┐  │
│  │           Zustand 状态管理层                │  │
│  └────────────────────┬───────────────────────┘  │
│       │               │              │            │
│  ┌────┴─────┐  ┌─────┴──────┐ ┌────┴──────────┐│
│  │自适应引擎│  │ AI Service │ │ 成就系统      ││
│  │- 规则引擎│  │- 千问 API  │ │- 星球收集     ││
│  │- 掌握率  │  │- CosyVoice│ │- 奖励计算     ││
│  │- 调度器  │  │- Paraformer│ │- 连续学习     ││
│  │- 知识图谱│  │- 出题模板  │ │               ││
│  └────┬─────┘  └─────┬──────┘ └────┬──────────┘│
│       │               │              │            │
│  ┌────┴──────────────┴───────────────┴────────┐  │
│  │         Dexie.js (IndexedDB) 数据层         │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │         Service Worker (离线支持)           │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Tech Stack

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 语言 | TypeScript | 5.x |
| 构建 | Vite | 5.x |
| 状态管理 | Zustand | 4.x |
| 本地存储 | Dexie.js | 4.x |
| 路由 | React Router | 6.x |
| UI 动画 | Framer Motion | 11.x |
| 手写板 | 自定义 Canvas 组件 |  |
| AI 对话 | 通义千问 (Qwen) | OpenAI 兼容 API |
| TTS | CosyVoice | 阿里云 API |
| STT | Paraformer | 阿里云 API |
| 测试 | Vitest + Testing Library | |
| PWA | Workbox | 7.x |

## Data Model (Dexie.js / IndexedDB)

### Core Tables

```typescript
// 用户（孩子）
interface Child {
  id: string;
  name: string;
  avatar: string;
  age: number;
  gradeLevel: 'middle-kindergarten' | 'senior-kindergarten';
  createdAt: Date;
  settings: ChildSettings;
}

// 知识点
interface KnowledgeNode {
  id: string;
  subject: 'math' | 'chinese' | 'english';
  gradeLevel: string;
  name: string;
  description: string;
  prerequisites: string[];  // 前置知识点 ID
  nextNodes: string[];      // 后续知识点 ID
  difficulty: number;       // 1-10
  contentType: 'flashcard' | 'quiz' | 'writing' | 'voice';
}

// 学习记录
interface LearningRecord {
  id: string;
  childId: string;
  knowledgeNodeId: string;
  questionId: string;
  answer: any;
  isCorrect: boolean;
  timeSpent: number;
  attemptCount: number;
  timestamp: Date;
}

// 掌握率
interface MasteryRecord {
  id: string;
  childId: string;
  knowledgeNodeId: string;
  masteryLevel: number;      // 0-100
  lastPracticed: Date;
  nextReviewDate: Date;
  consecutiveCorrect: number;
  totalAttempts: number;
  totalCorrect: number;
}

// 题目
interface Question {
  id: string;
  knowledgeNodeId: string;
  type: 'flashcard' | 'multiple-choice' | 'handwriting' | 'voice';
  content: QuestionContent;
  answer: any;
  difficulty: number;
  isAIGenerated: boolean;
  templateId?: string;
}

// AI 出题模板
interface QuestionTemplate {
  id: string;
  subject: string;
  gradeLevel: string;
  knowledgeNodeId: string;
  templateType: string;
  prompt: string;           // 千问出题 prompt 模板
  constraints: object;      // 数字范围、词汇限制等
  validationRules: object;  // 答案验证规则
}

// 成就
interface Achievement {
  id: string;
  childId: string;
  type: string;
  earnedAt: Date;
  metadata: object;
}

// 每日学习会话
interface DailySession {
  id: string;
  childId: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  questionsCompleted: number;
  correctCount: number;
  subjects: string[];
  streak: number;
}
```

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Provider 抽象层统一 AI 接口 | 支持未来切换到其他 LLM，一行配置即可替换 |
| 2 | 知识图谱前置/后续节点设计 | 支持自动解锁后续年级内容，无需硬编码年级边界 |
| 3 | 三层内容策略（种子+AI扩展+实时） | 种子保质量，AI 保数量，平衡质量和可扩展性 |
| 4 | 掌握率平滑过渡而非年级硬切 | 孩子水平超前可提前进入下一级，个性化程度更高 |
| 5 | Dexie.js 而非 localStorage | 结构化查询、大容量、事务支持，适合复杂学习数据 |
| 6 | PWA + Service Worker | 离线可用，弱网环境也能学习 |
| 7 | Canvas 自定义手写板 | 完全控制手写交互体验，适配幼儿大字书写 |
| 8 | API Key 存 .env | 安全性，不进版本控制 |

## Deviations from Original Design

- 目标用户从 5-12 岁（小学）调整为 4-6 岁（幼儿园中班+大班）
- 内容设计全面适配幼儿认知水平：更大按钮、更多图片动画、更少文字、更多语音引导
- AI 老师人设从"学习伙伴"调整为"温暖陪伴型"，更注重鼓励和游戏化

## Implementation Notes (Phase 1 Complete)

### 已完成模块清单

| 模块 | 文件数 | 测试数 | 状态 |
|------|--------|--------|------|
| 数据模型 (Dexie.js) | 4 | 30 | ✅ |
| 知识图谱 | 1 | 12 | ✅ |
| 种子数据 | 4 | 17 | ✅ |
| Zustand Stores | 3 | 26 | ✅ |
| 掌握率引擎 | 1 | 13 | ✅ |
| 复习调度器 | 1 | 12 | ✅ |
| 自适应路由 | 1 | 9 | ✅ |
| 规则引擎 | 1 | 20 | ✅ |
| 学习组件 (FlashCard/MultipleChoice/WritingPad) | 3 | 26 | ✅ |
| 反馈动画 | 1 | 6 | ✅ |
| AI Provider + Teacher + QuestionGenerator | 4 | 19 | ✅ |
| AI 对话组件 | 1 | 7 | ✅ |
| TTS/STT 语音 | 4 | 10 | ✅ |
| 语音交互组件 | 2 | 8 | ✅ |
| PIN 验证 | 1 | 6 | ✅ |
| 家长仪表盘 + 设置 | 2 | 9 | ✅ |
| 成就引擎 | 1 | 6 | ✅ |
| 星空地图 | 1 | 3 | ✅ |
| PWA 离线 (CacheManager + SyncManager) | 2 | 6 | ✅ |
| 路由 + App + E2E | 4 | 7 | ✅ |
| 全局样式 + 主题 | 2 | — | ✅ |
| **总计** | **~80** | **246** | **✅** |

### 质量指标

- TypeScript 严格模式：`tsc --noEmit` 零错误
- ESLint：零错误、零警告
- 测试覆盖：27 个测试文件、246 个测试用例全部通过
- 构建产物：273KB (gzip 88KB)
- 开发模式 TDD：所有引擎和组件均采用测试驱动开发

### 关键实现决策

| # | 决策 | 说明 |
|---|------|------|
| 9 | 掌握率公式：0.6正确率 + 0.2连续正确 + 0.2遗忘衰减 | 综合三个维度，半衰期 7 天 |
| 10 | SM-2 变体：答对 EF+0.1 / 答错 EF-0.2 | 基于间隔重复科学研究 |
| 11 | 自适应路由：新60% / 复习40% 混合 | 平衡探索和巩固 |
| 12 | 规则引擎：连续4对+85%→升难度 / 连续2错或<60%→降难度 | 避免挫败感 |
| 13 | AI 安全：UNSAFE_KEYWORDS 硬过滤 + 默认降级消息 | 双重保护幼儿内容安全 |
| 14 | 离线支持：内存缓存实现（Phase 2 切换 Service Worker） | Phase 1 验证架构 |
