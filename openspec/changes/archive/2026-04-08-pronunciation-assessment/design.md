# Design: 发音评分与纠音反馈

## Context

LittleStar 已有 TTS（CosyVoice 语音合成）和基础 STT（Paraformer 语音识别）能力，但缺少发音评估和纠音教学功能。本次变更在现有语音基础设施之上，新增发音评分服务层、纠音教学循环编排器、反馈模板系统和对应的 UI 组件。

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                      UI 层                           │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ VoiceRecorder│  │  PronunciationFeedback     │   │
│  │   (已有)     │  │  ├─ StarRating 星星评分     │   │
│  │              │  │  ├─ SyllableHighlight 音节  │   │
│  │              │  │  └─ TeacherFeedback 反馈语  │   │
│  └──────┬───────┘  └────────────┬───────────────┘   │
│         │                       │                    │
│  ┌──────┴───────────────────────┴────────────────┐   │
│  │       PronunciationDrill 纠音练习页面          │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
├─────────────────────┼────────────────────────────────┤
│                     ▼          服务层                 │
│  ┌───────────────────────────────────────────────┐   │
│  │    PronunciationCoordinator                   │   │
│  │    (纠音教学循环编排器 — 状态机)               │   │
│  │    ┌─ assess() → 发音评分                     │   │
│  │    ├─ retrySlow() → C2 慢速重试               │   │
│  │    ├─ drillSyllables() → C1 分音节教学        │   │
│  │    └─ generateFeedback() → 模板反馈拼接       │   │
│  └──────────────┬────────────────────────────────┘   │
│                 │                                     │
│  ┌──────────────▼────────────────────────────────┐   │
│  │  PronunciationAssessmentProvider (抽象接口)    │   │
│  │  ├─ scorePronunciation(audio, expectedText)    │   │
│  │  └─ checkAvailability()                        │   │
│  └──────────────┬────────────────────────────────┘   │
│                 │                                     │
├─────────────────┼────────────────────────────────────┤
│           后端适配层（可插拔 — 策略模式）              │
│  ┌─────────────┐  ┌────────────────────┐             │
│  │ 讯飞 ISE    │  │ TextMatch 降级     │             │
│  │(主方案)     │  │(兜底方案)          │             │
│  └─────────────┘  └────────────────────┘             │
│                                                       │
│           辅助模块                                     │
│  ┌─────────────┐  ┌────────────────────┐             │
│  │音节拆分引擎 │  │ 幼儿宽容评分策略   │             │
│  └─────────────┘  └────────────────────┘             │
└───────────────────────────────────────────────────────┘
```

## Tech Stack (新增)

| 层级 | 技术 | 说明 |
|------|------|------|
| 发音评测 | 讯飞口语评测 ISE | 音素级评分、幼儿模式 |
| 降级方案 | 文本匹配 + Levenshtein | STT 识别结果与期望文本比对 |
| 音节拆分 | 自定义规则引擎 | 基于英文音节规则的拆分算法 |

## Data Model

### 核心类型定义

```typescript
// ===== 发音评分结果 =====
interface PronunciationScore {
  overallScore: number;          // 0-100 总分
  stars: 1 | 2 | 3 | 4 | 5;     // 星级评定
  phonemeScores: PhonemeScore[];  // 音素级评分
  fluencyScore: number;           // 流利度 0-100
  completenessScore: number;      // 完整度 0-100
  feedback: TeacherFeedback;      // AI 老师反馈
}

// ===== 音素级评分 =====
interface PhonemeScore {
  phoneme: string;        // 音素符号 "/æ/"
  score: number;          // 0-100
  expected: string;       // 期望发音
  actual?: string;        // 实际发音（如可检测）
  syllableIndex: number;  // 所属音节索引
}

// ===== AI 老师反馈 =====
interface TeacherFeedback {
  teacherSay: string;       // 口头反馈（TTS 播报）
  encouragement: string;    // 鼓励语
  focusArea?: string;       // 薄弱环节提示
  nextAction: 'pass' | 'retry_slow' | 'drill_syllable' | 'final_encourage';
}

// ===== 音节拆分结果 =====
interface SyllableBreakdown {
  word: string;             // 完整单词
  syllables: string[];      // 音节数组 ["el", "e", "phant"]
  stressIndex: number;      // 重音音节索引
}

// ===== 纠音会话状态 =====
interface PronunciationSession {
  word: string;
  expectedText: string;
  currentPhase: 'initial' | 'c2_retry_1' | 'c2_retry_2' | 'c1_drill' | 'c1_final' | 'completed';
  attempts: PronunciationScore[];
  bestScore: number;
  finalStars: number;
}

// ===== 评估选项 =====
interface AssessmentOptions {
  ageGroup?: 'child' | 'teen' | 'adult';
  strictness?: 'lenient' | 'normal' | 'strict';
  enablePhonemeDetail?: boolean;
}
```

### 幼儿宽容评分策略

```typescript
const CHILD_SCORING_ADJUSTMENTS = {
  minAcceptableScore: 40,              // 低于 40 视为"没说"
  starThresholds: [40, 55, 70, 85, 95], // 1-5 星阈值
  passThreshold: 70,                    // ≥ 3 星算通过
  ignorePatterns: ['tone', 'stress', 'rhythm'],     // 忽略的评分维度
  focusPatterns: ['initial_consonant', 'vowel'],     // 重点评估维度
  neverZeroStars: true,                 // 永不给 0 星
  maxRetryCount: 2,                     // C2 最大重试次数
  c2SpeedFactors: [0.7, 0.5],          // C2 第1次/第2次语速
};
```

## Interface Design — 抽象接口层

```typescript
// ===== 发音评估 Provider 接口 =====
interface PronunciationAssessmentProvider {
  readonly name: string;

  checkAvailability(): Promise<boolean>;

  scorePronunciation(
    audio: Blob,
    expectedText: string,
    lang: 'en' | 'zh',
    options?: AssessmentOptions
  ): Promise<PronunciationScore>;
}

// ===== 两个实现 =====
// 1. IflytekISEProvider   — 讯飞口语评测（主方案）
// 2. TextMatchFallbackProvider — 文本匹配降级（兜底）

// ===== 服务工厂 =====
function createAssessmentProvider(
  config: AppConfig
): PronunciationAssessmentProvider {
  // 优先级：讯飞 ISE → 文本匹配降级
}
```

## 纠音教学循环（状态机）

```
                    ┌──────────┐
                    │  AI 示范  │ TTS 播放标准发音
                    └────┬─────┘
                         ▼
                    ┌──────────┐
                    │ 孩子跟读  │ 录音 3-5 秒
                    └────┬─────┘
                         ▼
                    ┌──────────┐
                    │  发音评分  │ PronunciationAssessmentProvider
                    └────┬─────┘
                         ▼
                   ╔═══════════╗
                   ║  ≥ 3 星？  ║
                   ╚═════╤═════╝
                    是 ↙     ↘ 否
                  ┌────┐    ┌─────────────────────┐
                  │通过│    │ 阶段 C2: 慢速重试    │ ← 最多 2 次
                  │🎉  │    │ TTS 语速 0.7x → 0.5x│
                  └────┘    └─────────┬───────────┘
                                      ▼
                                ╔═══════════╗
                                ║  ≥ 3 星？  ║
                                ╚═════╤═════╝
                                 是 ↙     ↘ 否（2次用完）
                               ┌────┐    ┌────────────────────┐
                               │通过│    │ 阶段 C1: 分音节     │
                               │🎉  │    │ 拆分 → 拍手节奏逐段 │
                               └────┘    │ → 合并完整跟读      │
                                         └─────────┬──────────┘
                                                   ▼
                                         ┌──────────────────┐
                                         │  最终评分 + 鼓励   │
                                         │  "你进步了！🌟"   │
                                         └──────────────────┘
```

### 状态机参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 通过阈值 | ≥ 3 星（≥ 70 分） | 幼儿宽容策略 |
| C2 重试次数 | 最多 2 次 | 注意力上限 |
| C2 语速 | 第 1 次 0.7x，第 2 次 0.5x | 逐步放慢 |
| C1 分段 | 自动按音节拆分 | 如 elephant → el·e·phant |
| C1 每段录音 | 2-3 秒 | 短音节更短 |
| 最低分 | 40 分（1 星） | 低于 40 视为"没说" |
| 保底评价 | 永远 ≥ 1 星 | 保护自信心 |

### 6 种终态

| # | 终态 | 星级 | 反馈示例 |
|---|------|:---:|---------|
| 1 | 首次通过 | ≥3⭐ | 「太棒了！你说得真好！」 |
| 2 | C2 第 1 次重试通过 | ≥3⭐ | 「哇，比刚才好多了！」 |
| 3 | C2 第 2 次重试通过 | ≥3⭐ | 「你看，慢慢说就能说好！」 |
| 4 | C1 分音节后通过 | ≥3⭐ | 「一个一个念就简单了对不对？」 |
| 5 | C1 后有进步但未通过 | 2⭐ | 「你进步了哦！下次一定更好！」 |
| 6 | 始终未通过 | 1⭐ | 「你很勇敢！我们下次再来练习！」 |

## 反馈模板系统

```typescript
const FEEDBACK_TEMPLATES = {
  // 按星级
  star5: {
    initial: ["哇！完美！你说得跟老师一样好！🌟🌟🌟🌟🌟"],
  },
  star4: {
    initial: ["说得真好！差一点点就完美啦！🌟🌟🌟🌟"],
  },
  star3: {
    initial: ["不错哦！继续加油！🌟🌟🌟"],
    afterRetry: ["比刚才好多了！你看，多练就有进步！🌟🌟🌟"],
  },
  star2: {
    encourageRetry: ["没关系，我们慢慢来～ 听我再说一遍好不好？"],
    afterDrill: ["你进步了哦！下次一定更好！🌟🌟"],
  },
  star1: {
    finalEncourage: ["你很勇敢！会说就很棒了！我们下次再练习！🌟"],
  },

  // 温和引导型（音素级）
  phonemeGuide: {
    template: "你的 {goodPart} 说得很好！我们来试试 {focusPart} 这个部分？跟我念——",
  },

  // 分音节教学引导
  syllableDrill: {
    intro: "我们来拍拍手，一个一个念！",
    perSyllable: "跟我念——{syllable}～",
    combine: "现在我们合在一起！{word}～",
    success: "太厉害了！一个一个念就简单了对不对？",
  },
};
```

## File Structure

```
src/
├── services/
│   └── voice/
│       ├── tts.ts                          (已有) TTS 语音合成
│       ├── stt.ts                          (已有) STT 语音识别
│       ├── web-speech-fallback.ts          (已有) Web Speech 降级
│       ├── pronunciation/                   🆕 发音评估模块
│       │   ├── index.ts                     统一导出
│       │   ├── types.ts                     类型定义
│       │   ├── assessment-provider.ts       抽象接口
│       │   ├── iflytek-ise-provider.ts      讯飞 ISE 实现
│       │   ├── text-match-fallback.ts       文本匹配降级
│       │   ├── child-scoring.ts             幼儿宽容评分策略
│       │   ├── syllable-splitter.ts         音节拆分引擎
│       │   ├── feedback-templates.ts        反馈模板库
│       │   └── pronunciation-coordinator.ts 纠音教学循环编排器
│       └── index.ts                        (修改) 添加新导出
├── components/
│   └── voice/
│       ├── VoicePlayer.tsx                 (已有) 播放组件
│       ├── VoiceRecorder.tsx               (已有) 录音组件
│       ├── PronunciationFeedback.tsx        🆕 评分反馈展示
│       ├── StarRating.tsx                   🆕 星星评分动画
│       ├── SyllableHighlight.tsx            🆕 音节高亮/分段
│       └── PronunciationDrill.tsx           🆕 纠音练习完整页面
├── types/
│   └── models.ts                           (修改) 添加发音评分类型
└── stores/
    └── uiStore.ts                          (修改) 添加发音练习状态
```

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 讯飞 ISE 作为第一个评测后端 | 国内教育场景经验丰富，有幼儿模式，中英文双语 |
| 2 | 策略模式 + Provider 接口 | 与现有 AI Provider 设计一致，后续可无缝切换后端 |
| 3 | 编排器模式管理纠音循环 | 状态机清晰，6 种终态覆盖所有路径，易于测试 |
| 4 | C2 + C1 渐进式纠音 | 先尝试简单方式（慢速），不行再深入（分音节），避免过早增加认知负担 |
| 5 | 拍手节奏游戏化 C1 | 4-5 岁不理解"音节"概念，用拍手游戏自然引导分段朗读 |
| 6 | 模板拼接反馈 | 延迟可控（<10ms），内容可审核，无 LLM 不确定性 |
| 7 | 40 分起算 + 永不 0 星 | 保护幼儿自信心，鼓励开口说的勇气 |
| 8 | Levenshtein + 置信度作为降级评分 | API 不可用时仍能提供基本反馈，不中断学习流程 |

## Implementation Notes (Phase 3)

### 实际技术决策与偏差

| # | 决策 | 说明 |
|---|------|------|
| 1 | 编排器使用简化的 ProviderScore 接口 | 编排器不直接依赖完整的 PronunciationScore 类型，而是使用简化的 `{ overall, accuracy, fluency, completeness, phonemes }` 结构，由编排器内部调用 child-scoring 转换为星级 |
| 2 | 反馈模板使用 4 个阶段（first_attempt/retry/after_drill/perfect） | 比设计文档中的模板结构更精细，每个星级×阶段组合至少 3 条模板，支持防重复机制 |
| 3 | 讯飞 ISE 使用 WebSocket 流式 API | 实现了完整的 HMAC-SHA256 鉴权、流式音频发送、XML/JSON 响应解析 |
| 4 | 音节词典覆盖 200+ 常用幼儿英语单词 | 分类覆盖：水果、动物、颜色、数字、身体部位、家庭、食物、学校、自然、交通、形容词等 |
| 5 | UI 组件使用 framer-motion 动画 | 与项目已有组件风格一致，星星逐个点亮、音节弹跳等动效 |
| 6 | createPronunciationRecord 集成函数 | 统一创建包含 pronunciationScore/pronunciationStars 的 LearningRecord，≥3 星视为正确 |
| 7 | uiStore 新增 pronunciationPhase 和 isRecordingPronunciation 状态 | 向后兼容，reset() 函数包含新状态初始值 |

### 测试覆盖

- 54 个测试文件，569 个测试用例，全部通过
- 新增 10 个发音评估专属测试文件
- 新增 4 个 UI 组件测试文件
- 全量回归测试零失败

## Risks and Mitigations

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 幼儿语音识别准确率低 | 评分不准确，误伤信心 | 宽容评分策略 + 40 分保底 + 永不 0 星 |
| 讯飞 API 延迟/不可用 | 跟读练习中断 | 文本匹配降级 + 超时自动降级（3s） |
| 分音节教学幼儿不理解 | 孩子困惑，丧失兴趣 | 拍手节奏游戏化包装，不提"音节"概念 |
| 音节拆分不准确 | C1 阶段拆分结果不自然 | 内置常用单词音节词典 + 规则引擎兜底 |
| 评分浮动大（同一发音不同分） | 用户困惑 | 取多次评分平均值 + 只显示星级不显示具体分数 |
