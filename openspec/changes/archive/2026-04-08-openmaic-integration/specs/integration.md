## ADDED Requirements

### Requirement: OpenMAIC Docker 部署与验证

OpenMAIC 必须能通过 Docker 在本机部署并正常运行，提供课堂生成 API。

#### Scenario: Docker 服务启动成功
- **WHEN** 执行 `docker-compose up` 启动 OpenMAIC 服务
- **THEN** OpenMAIC 在 `localhost:3000` 可访问，`/api/generate-classroom` 端点返回 200

#### Scenario: 环境变量配置
- **WHEN** 配置 Qwen API Key 和相关环境变量
- **THEN** OpenMAIC 能成功调用 Qwen API 生成课堂大纲和场景

---

### Requirement: OpenMAIC API Client 封装

提供对 OpenMAIC API 的完整封装，包括课堂生成、状态轮询、数据拉取和缓存管理。

#### Scenario: 提交课堂生成请求
- **WHEN** 教导处提交一个 requirement 文本
- **THEN** Client 调用 `/api/generate-classroom`，返回 classroomId，开始异步生成

#### Scenario: 轮询生成状态
- **WHEN** 课堂正在生成中
- **THEN** Client 定期轮询 `/api/classroom/[id]`，直到状态为 completed

#### Scenario: 课堂数据缓存
- **WHEN** 课堂生成完成
- **THEN** 完整课堂 JSON 通过 `CacheStore` 抽象接口存储（默认内存 Map，生产环境可注入 IndexedDB 等持久化实现），按知识点 ID + 日期索引

#### Scenario: 生成失败重试
- **WHEN** 课堂生成失败（网络错误/API 错误）
- **THEN** 自动重试最多 3 次，间隔递增（5s → 15s → 30s），全部失败后标记该知识点为"待生成"

---

### Requirement: 教导处课程规划

教导处根据课程体系、学习进度和复习计划，规划未来 3 天的课程内容。

#### Scenario: 首次进入应用
- **WHEN** 用户首次打开应用且无缓存课程
- **THEN** 教导处规划未来 3 天课程（每天 3-5 个知识点），批量提交 OpenMAIC 生成

#### Scenario: 每日检查补充
- **WHEN** 用户每天首次打开应用
- **THEN** 教导处检查未来 3 天缓存是否充足，不足则补充生成

#### Scenario: Requirement 生成
- **WHEN** 教导处选定一个知识点需要生成课堂
- **THEN** 根据知识点信息（name、description、templatePrompts、prerequisites）、孩子画像（年龄、年级）、掌握率生成结构化 requirement 文本

#### Scenario: 动态调整 — 加固
- **WHEN** 孩子完成一堂课后掌握率低于 0.5
- **THEN** 教导处为该知识点生成加固课（requirement 中标注"加固复习"），插入课程队列

#### Scenario: 动态调整 — 跳过
- **WHEN** 孩子某知识点掌握率已达 0.8 以上且未开始对应课堂
- **THEN** 教导处可跳过该知识点，推进到下一个

---

### Requirement: 课堂渲染器

在 LittleStar 中解析并渲染 OpenMAIC 生成的课堂 JSON，UI 风格对齐 OpenMAIC。

#### Scenario: 渲染教学幻灯片
- **WHEN** 场景类型为 teaching，幻灯片包含 title、content、imageUrl、audioUrl
- **THEN** 渲染大图卡片 + 标题 + 教学文本 + 自动播放 TTS 语音

#### Scenario: 渲染互动测验
- **WHEN** 场景类型为 quiz，幻灯片包含 question、options、correctAnswer
- **THEN** 渲染配图选择题，选择后即时反馈（复用已有反馈动画系统），答题数据回写 MasteryTracker

#### Scenario: 渲染 TPR 活动
- **WHEN** 场景类型为 interactive，幻灯片包含 tprInstruction
- **THEN** 渲染动作指令卡片 + 动画引导 + TTS 朗读指令

#### Scenario: 渲染拟声词/音频
- **WHEN** 幻灯片包含 onomatopoeia 或 audioUrl
- **THEN** 播放对应音频，文字以大号字体高亮展示

#### Scenario: 课堂进度与导航
- **WHEN** 用户在课堂中浏览
- **THEN** 顶部显示进度条（当前场景/总场景），底部支持上一张/下一张/自动播放

#### Scenario: UI 风格对齐
- **WHEN** 渲染任何课堂组件
- **THEN** 使用渐变柔和背景、大字号少文字、圆润触摸友好按钮（≥48px）、学科配色（数学蓝、语文红、英语绿）

---

### Requirement: 学习流程重构

重构核心学习流程，从教导处选课到课堂播放到答题回写。

#### Scenario: 进入学习页面
- **WHEN** 孩子从首页点击某学科"开始学习"
- **THEN** 从本地缓存（通过 CacheStore 接口）加载该学科下一个待学知识点的缓存课堂，进入课堂渲染器

#### Scenario: 缓存为空
- **WHEN** 对应知识点的课堂缓存不存在
- **THEN** 显示"课程准备中，请稍后再试"提示页，不降级到旧 QuestionGenerator

#### Scenario: 答题数据回写
- **WHEN** 孩子在课堂测验中完成答题
- **THEN** 答题结果（knowledgeNodeId、isCorrect、responseTime）回写 MasteryTracker，更新掌握率和复习队列

#### Scenario: 课堂完成
- **WHEN** 所有场景播放完毕
- **THEN** 显示课堂总结页（正确率、星星奖励），触发教导处动态调整评估

---

### Requirement: 家长面板分层配置

家长面板提供基础展示和密码保护的高级配置。

#### Scenario: 基础展示层
- **WHEN** 家长进入面板（无需密码）
- **THEN** 展示：今日学习时长、完成课程数、各学科掌握率、OpenMAIC 服务状态、已缓存课程数、课程日历预览

#### Scenario: 高级配置解锁
- **WHEN** 家长点击"高级设置"
- **THEN** 弹出 PIN 码/手势密码验证，验证通过后显示高级配置区域

#### Scenario: LLM API 配置
- **WHEN** 家长在高级配置中修改 API Key 或模型选择
- **THEN** 配置保存到本地存储，展示连接测试结果和 Token 使用统计

#### Scenario: OpenMAIC 服务配置
- **WHEN** 家长修改 OpenMAIC 服务地址
- **THEN** 执行连接测试，展示服务状态（在线/离线）

#### Scenario: 课程手动调整
- **WHEN** 家长在课程日历中对某知识点选择"加固练习"
- **THEN** 教导处为该知识点生成加固课，插入课程队列并提交 OpenMAIC 生成

---

### Requirement: 废弃旧模块

完全移除 QuestionGenerator 及相关旧组件。

#### Scenario: 删除旧代码
- **WHEN** 新架构全部就位且测试通过
- **THEN** 删除 `question-generator.ts`、`FlashCard.tsx`、`MultipleChoice.tsx` 及其测试文件

#### Scenario: 清理引用
- **WHEN** 旧模块删除后
- **THEN** 所有 import 引用更新，无编译错误，无未使用的依赖
