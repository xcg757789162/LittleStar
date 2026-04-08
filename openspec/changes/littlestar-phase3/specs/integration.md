## ADDED Requirements

### Requirement: home-navigation

首页"开始学习"按钮应导航到学习页面。

#### Scenario: click-start-learning
- **WHEN** 用户在首页点击"开始学习"按钮
- **THEN** 页面导航到 `/learn`（LearningSession 页面）

---

### Requirement: learning-main-loop

完整的学习主循环：选科目 → 引擎推荐 → 出题 → 答题 → 反馈 → 掌握率更新 → 下一题/结束。

#### Scenario: select-subject-and-start
- **WHEN** 用户在 LearningSession 页面选择一个科目并点击"开始学习"
- **THEN** 系统调用 AdaptiveRouter 推荐知识点，QuestionGenerator 生成题目，显示第一道题

#### Scenario: answer-question-correctly
- **WHEN** 用户回答一道题目（正确）
- **THEN** 显示正确反馈动画（FeedbackAnimation），2 秒后显示下一道题；learningStore 记录 correctCount +1

#### Scenario: answer-question-wrong
- **WHEN** 用户回答一道题目（错误）
- **THEN** 显示错误反馈提示（FeedbackAnimation），2 秒后显示下一道题

#### Scenario: session-complete
- **WHEN** 题目队列耗尽或 RuleEngine 建议停止（疲劳/时限）
- **THEN** 显示会话总结（题数、正确率），提供"回到首页"按钮

#### Scenario: dynamic-component-rendering
- **WHEN** 题目类型为 `multiple_choice`
- **THEN** 渲染 MultipleChoice 组件
- **WHEN** 题目类型为 `flash_card`
- **THEN** 渲染 FlashCard 组件
- **WHEN** 题目类型为 `writing`
- **THEN** 渲染 WritingPad 组件

---

### Requirement: ai-question-generation

AI 出题集成，支持降级到种子题库。

#### Scenario: ai-enabled
- **WHEN** 环境变量 `VITE_QWEN_API_KEY` 已配置
- **THEN** 使用 QwenProvider 调用千问 API 生成题目

#### Scenario: ai-fallback
- **WHEN** 环境变量未配置或 API 调用失败
- **THEN** 自动 fallback 到 QuestionGenerator 内置种子题库（isFallback: true）

#### Scenario: ai-encouragement
- **WHEN** 用户答题后
- **THEN** AITeacher 生成个性化鼓励语（有 AI 时调 API，无 AI 时使用默认鼓励语）

---

### Requirement: data-persistence

学习数据持久化到 IndexedDB。

#### Scenario: save-on-session-end
- **WHEN** 学习会话结束
- **THEN** LearningRecord、MasteryRecord 写入 Dexie.js；AchievementEngine 检测成就；generateDailySnapshot 保存快照

#### Scenario: load-on-startup
- **WHEN** App 启动
- **THEN** 从 Dexie.js 加载孩子数据到 childStore；如果没有孩子记录，自动创建默认孩子

#### Scenario: refresh-preserves-data
- **WHEN** 用户刷新页面后再次进入
- **THEN** 之前的学习数据（成就、掌握率、孩子信息）仍然可见

---

### Requirement: star-map-real-data

星空地图显示真实成就数据。

#### Scenario: planet-lit-on-mastery
- **WHEN** 某科目平均掌握率 ≥ 80%
- **THEN** 该科目星球点亮（opacity: 1 + 发光效果）

#### Scenario: progress-display
- **WHEN** 用户进入星空地图
- **THEN** 显示真实的"已点亮 X/3 颗星球"

---

### Requirement: parent-dashboard-real-data

家长面板显示真实学习统计。

#### Scenario: today-stats
- **WHEN** 家长进入仪表盘
- **THEN** 显示今日学习时长、完成题数、正确率（从 Dexie.js 查询 DailySession）

#### Scenario: parent-settings-connected
- **WHEN** 家长进入设置页
- **THEN** 显示真实孩子信息（从 childStore 读取），学习时长和科目偏好可修改

---

### Requirement: global-layout

全局布局和底部导航栏。

#### Scenario: bottom-navigation
- **WHEN** 用户在非学习页面
- **THEN** 底部显示导航栏（首页/星空/家长），可在页面间切换

#### Scenario: hide-nav-during-learning
- **WHEN** 用户在学习进行中
- **THEN** 底部导航栏隐藏，避免误触
