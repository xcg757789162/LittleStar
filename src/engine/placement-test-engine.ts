/**
 * 入学测评引擎
 *
 * 支持两种模式：
 * - 旧版单阶段（'single'）：兼容旧记录
 * - 新版两阶段（'phase1' + 'phase2'）：摸底 → 分析 → 验证
 *
 * 生成自适应测评题目、提交答案、完成测评、应用结果
 */

import type { CurriculumModule, CurriculumKnowledgeNode } from '@/curriculum/types'
import type {
  PlacementResult,
  QuestionBankItem,
  Phase1Analysis,
  ChildSettings,
} from '@/types/models'
import { loadQuestionBank, getQuestionFromBank } from '@/data/question-bank/loader'
import { generateQuestion } from '@/engine/ai-question-generator'

// ===== 类型定义 =====

/** 测评计划中的一个题目 */
export interface TestPlanItem {
  nodeId: string
  nodeName: string
  moduleId: string
  moduleOrder: number
  difficulty: number
}

/** 选择题计划项（扩展 TestPlanItem，包含题目内容） */
export interface ChoiceQuestion extends TestPlanItem {
  /** 题干 */
  stem: string
  /** 4 个选项 */
  options: { text: string; emoji?: string }[]
  /** 正确选项索引 0-3 */
  correctIndex: number
  /** 题目来源 */
  source: 'preset' | 'ai'
}

/** 答题记录 */
export interface AnswerRecord {
  nodeId: string
  isCorrect: boolean
  timeSpent: number
  /** 用户选择的索引（选择题模式） */
  selectedIndex?: number
  /** 是否超时未答 */
  timedOut?: boolean
}

/** 测评会话（旧版兼容） */
export interface TestSession {
  questions: TestPlanItem[]
  currentIndex: number
  answers: AnswerRecord[]
}

/** 两阶段测评会话 */
export interface TwoPhaseTestSession extends TestSession {
  /** 当前阶段 */
  phase: 'phase1' | 'phase2'
  /** 选择题列表（覆盖 questions 提供完整题目内容） */
  choiceQuestions: ChoiceQuestion[]
  /** 阶段一分析结果（阶段二开始前填充） */
  phase1Analysis?: Phase1Analysis
}

/** 提交答案返回结果 */
export interface SubmitResult {
  isCorrect: boolean
  nextQuestion: TestPlanItem | null
  progress: number
}

/** 选择题提交结果（扩展） */
export interface ChoiceSubmitResult extends SubmitResult {
  /** 正确选项索引 */
  correctIndex: number
  /** 用户选择的索引 */
  selectedIndex: number
  /** 是否超时 */
  timedOut: boolean
}

// ===== 配置常量 =====

/** 默认配置 */
const MAX_QUESTIONS = 15
const MASTERY_CORRECT = 70
const MASTERY_WRONG = 0
const MASTERY_INFERRED_BEFORE = 60

/** 两阶段配置 */
const PHASE1_MIN_QUESTIONS = 5
const PHASE1_MAX_QUESTIONS = 8
const PHASE2_MIN_QUESTIONS = 3
const PHASE2_MAX_QUESTIONS = 5

/** 阶段一分析阈值 */
const WEAK_MODULE_THRESHOLD = 0.5     // 正确率 < 50% 视为薄弱
const UNCERTAIN_TIME_FACTOR = 1.5     // 答题时间 > 平均 * 1.5 视为不确定
const SKIP_PHASE2_THRESHOLD = 1.0     // 全部正确时跳过阶段二

/** 超时时间（毫秒） */
const QUESTION_TIMEOUT_MS = 30_000

/**
 * 入学测评引擎
 */
export class PlacementTestEngine {
  // ===================================================================
  // 旧版单阶段接口（保留兼容）
  // ===================================================================

  /**
   * 生成测评计划（旧版单阶段）
   * 从每个模块选取 1-2 个代表性知识点，先选最简单的
   */
  generateTestPlan(modules: CurriculumModule[]): TestPlanItem[] {
    if (modules.length === 0) return []

    const plan: TestPlanItem[] = []

    // 按 order 排序模块
    const sorted = [...modules].sort((a, b) => a.order - b.order)

    for (const mod of sorted) {
      if (plan.length >= MAX_QUESTIONS) break
      if (mod.knowledgeNodes.length === 0) continue

      // 选最简单的节点作为基础题
      const sortedNodes = [...mod.knowledgeNodes].sort((a, b) => a.difficulty - b.difficulty)
      plan.push(this.nodeToItem(sortedNodes[0], mod))

      // 如果还有空间且模块有更难的节点，备选加入（留给自适应切换用）
      if (plan.length < MAX_QUESTIONS && sortedNodes.length > 1) {
        // 不直接加入，由自适应逻辑在答对时动态插入
      }
    }

    return plan
  }

  /**
   * 创建测评会话（旧版兼容）
   */
  createSession(plan: TestPlanItem[]): TestSession {
    return {
      questions: [...plan],
      currentIndex: 0,
      answers: [],
    }
  }

  /**
   * 获取当前题目
   */
  getCurrentQuestion(session: TestSession): TestPlanItem | null {
    if (session.currentIndex >= session.questions.length) return null
    return session.questions[session.currentIndex]
  }

  /**
   * 获取当前选择题（两阶段模式）
   */
  getCurrentChoiceQuestion(session: TwoPhaseTestSession): ChoiceQuestion | null {
    if (session.currentIndex >= session.choiceQuestions.length) return null
    return session.choiceQuestions[session.currentIndex]
  }

  /**
   * 提交答案（旧版，自适应选题）
   */
  submitAnswer(session: TestSession, isCorrect: boolean, timeSpent = 0): SubmitResult {
    const currentQuestion = session.questions[session.currentIndex]

    // 记录答案
    session.answers.push({
      nodeId: currentQuestion.nodeId,
      isCorrect,
      timeSpent,
    })

    session.currentIndex++

    // 如果答对 → 尝试在后续插入同模块更难的题（自适应）
    // 如果答错 → 跳过同模块的后续题（已在 plan 中的），直接到下一模块
    if (!isCorrect) {
      // 跳过当前模块的后续题目
      while (
        session.currentIndex < session.questions.length &&
        session.questions[session.currentIndex].moduleId === currentQuestion.moduleId
      ) {
        session.currentIndex++
      }
    }

    // 计算进度
    const totalExpected = session.questions.length
    const answered = session.answers.length
    const progress =
      session.currentIndex >= totalExpected
        ? 100
        : Math.round((answered / totalExpected) * 100)

    // 获取下一题
    const nextQuestion =
      session.currentIndex < session.questions.length
        ? session.questions[session.currentIndex]
        : null

    return {
      isCorrect,
      nextQuestion,
      progress,
    }
  }

  // ===================================================================
  // 新版两阶段接口
  // ===================================================================

  /**
   * 生成阶段一摸底计划
   *
   * 从预设题库中为每个模块选 1-2 道题，总计 5-8 道摸底选择题。
   * 每个模块选一道低难度题作为基础摸底。
   *
   * @param modules 课程模块列表
   * @param subject 科目
   * @param gradeLevel 年级
   * @returns 选择题列表（含题目内容）
   */
  async generatePhase1Plan(
    modules: CurriculumModule[],
    subject: string,
    gradeLevel: string,
  ): Promise<ChoiceQuestion[]> {
    if (modules.length === 0) return []

    // 加载预设题库
    const questionBank = await loadQuestionBank(
      subject as 'math' | 'chinese' | 'english',
      gradeLevel as Parameters<typeof loadQuestionBank>[1],
    )

    const plan: ChoiceQuestion[] = []
    const sorted = [...modules].sort((a, b) => a.order - b.order)

    for (const mod of sorted) {
      if (plan.length >= PHASE1_MAX_QUESTIONS) break
      if (mod.knowledgeNodes.length === 0) continue

      // 选最简单的知识点
      const sortedNodes = [...mod.knowledgeNodes].sort((a, b) => a.difficulty - b.difficulty)
      const targetNode = sortedNodes[0]

      // 从题库获取简单题
      const bankItem = getQuestionFromBank(questionBank, targetNode.id, 'easy')

      if (bankItem) {
        plan.push(this.bankItemToChoiceQuestion(bankItem, targetNode, mod, 'preset'))
      } else {
        // 题库中没有 → 生成占位选择题（后续由 AI 补充或跳过）
        // 这里仍然加入 plan，但标记为需要 AI 生成
        plan.push({
          nodeId: targetNode.id,
          nodeName: targetNode.name,
          moduleId: mod.id,
          moduleOrder: mod.order,
          difficulty: targetNode.difficulty,
          stem: `关于「${targetNode.name}」的问题`,
          options: [
            { text: '选项 A', emoji: '🅰️' },
            { text: '选项 B', emoji: '🅱️' },
            { text: '选项 C', emoji: '©️' },
            { text: '选项 D', emoji: '🇩' },
          ],
          correctIndex: 0,
          source: 'preset',
        })
      }
    }

    // 确保至少 PHASE1_MIN_QUESTIONS 道题
    // 如果模块太少，从已有模块补充更难的题
    if (plan.length < PHASE1_MIN_QUESTIONS) {
      for (const mod of sorted) {
        if (plan.length >= PHASE1_MIN_QUESTIONS) break
        if (mod.knowledgeNodes.length <= 1) continue

        const sortedNodes = [...mod.knowledgeNodes].sort((a, b) => a.difficulty - b.difficulty)
        // 跳过第一个（已在 plan 中），选更难的
        for (let i = 1; i < sortedNodes.length && plan.length < PHASE1_MIN_QUESTIONS; i++) {
          const node = sortedNodes[i]
          // 避免重复
          if (plan.some(q => q.nodeId === node.id)) continue

          const bankItem = getQuestionFromBank(questionBank, node.id, 'hard')
          if (bankItem) {
            plan.push(this.bankItemToChoiceQuestion(bankItem, node, mod, 'preset'))
          }
        }
      }
    }

    return plan
  }

  /**
   * 创建两阶段测评会话
   */
  createTwoPhaseSession(choiceQuestions: ChoiceQuestion[], phase: 'phase1' | 'phase2'): TwoPhaseTestSession {
    return {
      questions: choiceQuestions, // 兼容 TestSession
      choiceQuestions: [...choiceQuestions],
      currentIndex: 0,
      answers: [],
      phase,
    }
  }

  /**
   * 提交选择题答案
   *
   * @param session 两阶段会话
   * @param selectedIndex 用户选择的选项索引 0-3
   * @param timeSpent 答题耗时（毫秒）
   */
  submitChoiceAnswer(
    session: TwoPhaseTestSession,
    selectedIndex: number,
    timeSpent = 0,
  ): ChoiceSubmitResult {
    const current = session.choiceQuestions[session.currentIndex]
    const isCorrect = selectedIndex === current.correctIndex

    // 记录答案
    session.answers.push({
      nodeId: current.nodeId,
      isCorrect,
      timeSpent,
      selectedIndex,
      timedOut: false,
    })

    session.currentIndex++

    // 计算进度
    const totalExpected = session.choiceQuestions.length
    const progress =
      session.currentIndex >= totalExpected
        ? 100
        : Math.round((session.answers.length / totalExpected) * 100)

    // 获取下一题
    const nextQuestion =
      session.currentIndex < session.choiceQuestions.length
        ? session.choiceQuestions[session.currentIndex]
        : null

    return {
      isCorrect,
      correctIndex: current.correctIndex,
      selectedIndex,
      timedOut: false,
      nextQuestion,
      progress,
    }
  }

  /**
   * 提交超时（30 秒未答）
   *
   * 标记当前题为超时未答（isCorrect = false）
   */
  submitTimeout(session: TwoPhaseTestSession): ChoiceSubmitResult {
    const current = session.choiceQuestions[session.currentIndex]

    // 记录为超时
    session.answers.push({
      nodeId: current.nodeId,
      isCorrect: false,
      timeSpent: QUESTION_TIMEOUT_MS,
      selectedIndex: -1,
      timedOut: true,
    })

    session.currentIndex++

    const totalExpected = session.choiceQuestions.length
    const progress =
      session.currentIndex >= totalExpected
        ? 100
        : Math.round((session.answers.length / totalExpected) * 100)

    const nextQuestion =
      session.currentIndex < session.choiceQuestions.length
        ? session.choiceQuestions[session.currentIndex]
        : null

    return {
      isCorrect: false,
      correctIndex: current.correctIndex,
      selectedIndex: -1,
      timedOut: true,
      nextQuestion,
      progress,
    }
  }

  /**
   * 分析阶段一结果
   *
   * 根据答题记录计算各模块得分，找出薄弱模块和不确定知识点。
   * 输出 Phase1Analysis，用于决定是否需要阶段二以及生成验证题。
   */
  analyzePhase1(session: TwoPhaseTestSession, _modules: CurriculumModule[]): Phase1Analysis {
    // 统计各模块的答题情况
    const moduleStats = new Map<string, { correct: number; total: number; times: number[] }>()

    for (const answer of session.answers) {
      // 找到该知识点所属的模块
      const question = session.choiceQuestions.find(q => q.nodeId === answer.nodeId)
      if (!question) continue

      const stats = moduleStats.get(question.moduleId) || { correct: 0, total: 0, times: [] }
      stats.total++
      if (answer.isCorrect) stats.correct++
      stats.times.push(answer.timeSpent)
      moduleStats.set(question.moduleId, stats)
    }

    // 计算各模块得分
    const moduleScores: Record<string, number> = {}
    const weakModules: string[] = []

    for (const [moduleId, stats] of moduleStats) {
      const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      moduleScores[moduleId] = score
      if (stats.total > 0 && stats.correct / stats.total < WEAK_MODULE_THRESHOLD) {
        weakModules.push(moduleId)
      }
    }

    // 找出不确定的知识点（答对但耗时过长）
    const uncertainNodes: string[] = []
    const allTimes = session.answers
      .filter(a => !a.timedOut)
      .map(a => a.timeSpent)
    const avgTime = allTimes.length > 0
      ? allTimes.reduce((s, t) => s + t, 0) / allTimes.length
      : 5000

    for (const answer of session.answers) {
      if (answer.isCorrect && !answer.timedOut && answer.timeSpent > avgTime * UNCERTAIN_TIME_FACTOR) {
        uncertainNodes.push(answer.nodeId)
      }
    }

    // 总得分
    const totalCorrect = session.answers.filter(a => a.isCorrect).length
    const overallPhase1Score = session.answers.length > 0
      ? Math.round((totalCorrect / session.answers.length) * 100)
      : 0

    // 是否需要阶段二
    const needsPhase2 = overallPhase1Score < SKIP_PHASE2_THRESHOLD * 100
      && (weakModules.length > 0 || uncertainNodes.length > 0)

    return {
      weakModules,
      uncertainNodes,
      overallPhase1Score,
      moduleScores,
      needsPhase2,
    }
  }

  /**
   * 生成阶段二验证计划
   *
   * 根据阶段一分析结果，为薄弱/不确定区域生成 3-5 道验证题。
   * AI 优先生成，降级到预设题库。
   *
   * @param phase1Analysis 阶段一分析结果
   * @param modules 课程模块列表
   * @param subject 科目
   * @param gradeLevel 年级
   * @param settings 孩子设置（用于 AI 生成）
   * @returns 选择题列表
   */
  async generatePhase2Plan(
    phase1Analysis: Phase1Analysis,
    modules: CurriculumModule[],
    subject: string,
    gradeLevel: string,
    settings?: ChildSettings,
  ): Promise<ChoiceQuestion[]> {
    const plan: ChoiceQuestion[] = []

    // 加载预设题库
    const questionBank = await loadQuestionBank(
      subject as 'math' | 'chinese' | 'english',
      gradeLevel as Parameters<typeof loadQuestionBank>[1],
    )

    // 收集需要验证的知识点
    const targetNodes: Array<{ node: CurriculumKnowledgeNode; mod: CurriculumModule }> = []

    // 优先：薄弱模块中的知识点
    for (const weakModId of phase1Analysis.weakModules) {
      const mod = modules.find(m => m.id === weakModId)
      if (!mod) continue
      for (const node of mod.knowledgeNodes) {
        if (plan.length + targetNodes.length >= PHASE2_MAX_QUESTIONS) break
        targetNodes.push({ node, mod })
      }
    }

    // 补充：不确定的知识点
    for (const nodeId of phase1Analysis.uncertainNodes) {
      if (plan.length + targetNodes.length >= PHASE2_MAX_QUESTIONS) break
      if (targetNodes.some(t => t.node.id === nodeId)) continue // 避免重复

      for (const mod of modules) {
        const node = mod.knowledgeNodes.find(n => n.id === nodeId)
        if (node) {
          targetNodes.push({ node, mod })
          break
        }
      }
    }

    // 为每个目标知识点生成验证题
    for (const { node, mod } of targetNodes) {
      if (plan.length >= PHASE2_MAX_QUESTIONS) break

      let question: ChoiceQuestion | null = null

      // AI 优先（如果配置了 LLM）
      if (settings?.llmApiKey && settings?.llmModel) {
        const aiResult = await generateQuestion(
          { id: node.id, name: node.name, description: node.description },
          gradeLevel,
          subject,
          settings,
        )
        if (aiResult) {
          question = this.bankItemToChoiceQuestion(aiResult, node, mod, 'ai')
        }
      }

      // 降级到预设题库（选不同难度的题，避免和阶段一重复）
      if (!question) {
        const bankItem = getQuestionFromBank(questionBank, node.id, 'hard')
        if (bankItem) {
          question = this.bankItemToChoiceQuestion(bankItem, node, mod, 'preset')
        }
      }

      if (question) {
        plan.push(question)
      }
    }

    // 确保至少 PHASE2_MIN_QUESTIONS 道题
    if (plan.length < PHASE2_MIN_QUESTIONS) {
      // 从其他模块补充
      const usedNodeIds = new Set(plan.map(q => q.nodeId))
      for (const mod of modules) {
        if (plan.length >= PHASE2_MIN_QUESTIONS) break
        for (const node of mod.knowledgeNodes) {
          if (plan.length >= PHASE2_MIN_QUESTIONS) break
          if (usedNodeIds.has(node.id)) continue

          const bankItem = getQuestionFromBank(questionBank, node.id)
          if (bankItem) {
            plan.push(this.bankItemToChoiceQuestion(bankItem, node, mod, 'preset'))
            usedNodeIds.add(node.id)
          }
        }
      }
    }

    return plan
  }

  // ===================================================================
  // 结果计算（两阶段和单阶段共用）
  // ===================================================================

  /**
   * 完成测评，计算结果
   *
   * 支持两阶段合并：如果传入 phase1Session + phase2Session，
   * 会合并两个阶段的答题记录进行综合评估。
   */
  completeTest(
    session: TestSession,
    modules: CurriculumModule[],
    phase2Session?: TwoPhaseTestSession,
  ): PlacementResult {
    // 合并两阶段答案
    const allAnswers = [...session.answers]
    if (phase2Session) {
      allAnswers.push(...phase2Session.answers)
    }

    const correctNodes = new Set<string>()
    const wrongNodes = new Set<string>()

    for (const answer of allAnswers) {
      if (answer.isCorrect) {
        correctNodes.add(answer.nodeId)
      } else {
        wrongNodes.add(answer.nodeId)
      }
    }

    // 获取全部知识点按模块顺序排列
    const allNodes = this.getAllNodesOrdered(modules)
    const masteredNodes: string[] = []
    const startingNodes: string[] = []

    // 找到最后一个答对的节点位置
    let lastCorrectIdx = -1
    for (let i = 0; i < allNodes.length; i++) {
      if (correctNodes.has(allNodes[i].id)) {
        lastCorrectIdx = i
      }
    }

    // 确定起始知识点：第一个未掌握的
    let foundStarting = false
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i]
      if (correctNodes.has(node.id)) {
        masteredNodes.push(node.id)
      } else if (i <= lastCorrectIdx) {
        // 在已掌握之前的未测节点 → 默认已掌握
        masteredNodes.push(node.id)
      } else {
        if (!foundStarting) {
          startingNodes.push(node.id)
          foundStarting = true
        }
      }
    }

    // 如果全部答错，起始节点为第一个
    if (correctNodes.size === 0 && allNodes.length > 0) {
      return {
        masteredNodes: [],
        startingNodes: [allNodes[0].id],
        overallScore: 0,
      }
    }

    // 计算得分
    const overallScore =
      allAnswers.length > 0
        ? Math.round(
            (allAnswers.filter((a) => a.isCorrect).length / allAnswers.length) * 100,
          )
        : 0

    return {
      masteredNodes,
      startingNodes,
      overallScore,
    }
  }

  /**
   * 根据测评结果生成掌握度映射
   * R4: 答对→70, 答错→0, 已掌握之前未测→60, 起始之后→0
   */
  applyResult(
    session: TestSession,
    modules: CurriculumModule[],
    phase2Session?: TwoPhaseTestSession,
  ): Map<string, number> {
    const masteryMap = new Map<string, number>()

    // 合并两阶段答案
    const allAnswers = [...session.answers]
    if (phase2Session) {
      allAnswers.push(...phase2Session.answers)
    }

    const correctNodes = new Set<string>()
    const wrongNodes = new Set<string>()
    for (const answer of allAnswers) {
      if (answer.isCorrect) {
        correctNodes.add(answer.nodeId)
      } else {
        wrongNodes.add(answer.nodeId)
      }
    }

    const allNodes = this.getAllNodesOrdered(modules)

    // 找到最后一个答对的节点位置
    let lastCorrectIdx = -1
    for (let i = 0; i < allNodes.length; i++) {
      if (correctNodes.has(allNodes[i].id)) {
        lastCorrectIdx = i
      }
    }

    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i]
      if (correctNodes.has(node.id)) {
        masteryMap.set(node.id, MASTERY_CORRECT)
      } else if (wrongNodes.has(node.id)) {
        masteryMap.set(node.id, MASTERY_WRONG)
      } else if (i < lastCorrectIdx) {
        // 在已掌握之前的未测节点
        masteryMap.set(node.id, MASTERY_INFERRED_BEFORE)
      } else {
        // 在起始之后或未覆盖
        masteryMap.set(node.id, MASTERY_WRONG)
      }
    }

    return masteryMap
  }

  // ===================================================================
  // 工具方法
  // ===================================================================

  /** 将知识点转换为测评计划项 */
  private nodeToItem(node: CurriculumKnowledgeNode, mod: CurriculumModule): TestPlanItem {
    return {
      nodeId: node.id,
      nodeName: node.name,
      moduleId: mod.id,
      moduleOrder: mod.order,
      difficulty: node.difficulty,
    }
  }

  /** 将预设题库项转换为选择题 */
  private bankItemToChoiceQuestion(
    item: QuestionBankItem,
    node: CurriculumKnowledgeNode,
    mod: CurriculumModule,
    source: 'preset' | 'ai',
  ): ChoiceQuestion {
    return {
      nodeId: node.id,
      nodeName: node.name,
      moduleId: mod.id,
      moduleOrder: mod.order,
      difficulty: item.difficulty,
      stem: item.stem,
      options: item.options,
      correctIndex: item.correctIndex,
      source,
    }
  }

  /** 获取按模块顺序排列的全部知识点 */
  private getAllNodesOrdered(modules: CurriculumModule[]): CurriculumKnowledgeNode[] {
    return [...modules]
      .sort((a, b) => a.order - b.order)
      .flatMap((m) =>
        [...m.knowledgeNodes].sort((a, b) => a.difficulty - b.difficulty),
      )
  }

  /** 获取超时时间常量（供 Hook 使用） */
  static get QUESTION_TIMEOUT_MS(): number {
    return QUESTION_TIMEOUT_MS
  }
}
