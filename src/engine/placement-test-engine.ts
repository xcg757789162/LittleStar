/**
 * 自适应评测引擎（Adaptive Assessment Engine）
 *
 * 可用于多种评测场景：
 * - 入学/初始水平测评（placement）
 * - 课后/阶段性考试（exam）
 * - 针对性练习：根据薄弱点强化训练（practice）
 *
 * 两阶段流程：摸底 → 分析 → 挑战/验证
 * 核心原则：阶段二永远触发！
 * - 阶段一表现好 → 阶段二出更难的题，找到真实上限
 * - 阶段一表现差 → 阶段二验证薄弱点
 * - 阶段一表现一般 → 阶段二混合模式（验证+挑战）
 */

import type { CurriculumModule, CurriculumKnowledgeNode } from '@/curriculum/types'
import type {
  PlacementResult,
  QuestionBankItem,
  AssessmentType,
  Phase1Analysis,
  Phase1AnswerSummary,
  Phase2Mode,
  Phase2QuestionContext,
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
const CHALLENGE_THRESHOLD = 0.8       // 正确率 >= 80% 进入挑战模式（找真实上限）
const MIXED_THRESHOLD = 0.6           // 正确率 >= 60% 进入混合模式（验证+挑战）
// 注意：阶段二永不跳过！评测的目的是精准定位孩子的真实水平

/** 超时时间（毫秒） */
const QUESTION_TIMEOUT_MS = 30_000

/** 根据评测场景生成各模式下的 purpose 文案 */
function buildPurposeText(type: AssessmentType) {
  const sceneLabel: Record<AssessmentType, string> = {
    placement: '入学摸底',
    exam: '考试',
    practice: '针对性练习',
  }
  const scene = sceneLabel[type]
  return {
    challengeBase: `${scene}中学生基础扎实，请出更有挑战性的题来探测真实能力上限`,
    verifyWeak: `${scene}中该模块表现薄弱，请出确认题验证是否真的不掌握`,
    verifyUncertain: `${scene}中学生在该知识点虽然答对但犹豫较久，请出题验证是否真正掌握`,
    verifyOverall: `${scene}中学生整体表现较弱，请出确认题验证该知识点的真实掌握程度`,
    mixedStrong: `${scene}中该模块表现优秀，适当出更难的题探测上限`,
  }
}

/**
 * 自适应评测引擎
 *
 * 适用于入学测评、课后考试、针对性练习等场景。
 * 调用方通过 assessmentType 参数告知引擎当前场景，
 * 引擎据此调整选题策略和 AI prompt 语境。
 */
export class AdaptiveAssessmentEngine {
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
        // 题库中没有 → 跳过该知识点（不展示占位题）
        // 后续补题逻辑会从其他知识点填充
        console.warn(
          `[PlacementEngine] 题库缺少知识点 "${targetNode.id}" (${targetNode.name}) 的题目，跳过`,
        )
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
   * 输出 Phase1Analysis，用于决定阶段二的模式。
   *
   * 核心原则：阶段二永远触发！评测的目的是精准定位孩子的真实水平。
   * - 表现差（<60%）→ 验证模式（确认薄弱点）
   * - 表现一般（60-80%）→ 混合模式（验证薄弱+挑战上限）
   * - 表现优秀（>=80%）→ 挑战模式（出更难的题，找到真实上限）
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

    // 根据表现决定阶段二模式（阶段二永远触发！）
    const scoreRatio = session.answers.length > 0
      ? totalCorrect / session.answers.length
      : 0

    let phase2Mode: Phase2Mode
    if (scoreRatio >= CHALLENGE_THRESHOLD) {
      // 表现优秀 → 挑战模式：出更难的题找到真实上限
      phase2Mode = 'challenge'
    } else if (scoreRatio >= MIXED_THRESHOLD) {
      // 表现一般 → 混合模式：验证薄弱点 + 适当挑战
      phase2Mode = 'mixed'
    } else {
      // 表现差 → 验证模式：确认具体薄弱环节
      phase2Mode = 'verify'
    }

    const answerSummaries: Phase1AnswerSummary[] = session.answers.map(answer => {
      const question = session.choiceQuestions.find(q => q.nodeId === answer.nodeId)
      return {
        nodeId: answer.nodeId,
        nodeName: question?.nodeName ?? answer.nodeId,
        moduleId: question?.moduleId ?? '',
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        timedOut: answer.timedOut ?? false,
      }
    })

    return {
      weakModules,
      uncertainNodes,
      overallPhase1Score,
      moduleScores,
      needsPhase2: true,
      phase2Mode,
      answerSummaries,
    }
  }

  /**
   * 生成阶段二计划
   *
   * 根据阶段一分析结果和 phase2Mode，生成 3-5 道不同目的的题目：
   *
   * - **verify（验证模式）**：针对薄弱/不确定区域出同难度或更简单的题，确认真实薄弱点
   * - **challenge（挑战模式）**：全模块出更难的题，找到孩子的真实能力上限
   * - **mixed（混合模式）**：薄弱模块出验证题 + 强项模块出挑战题
   *
   * AI 优先生成，降级到预设题库。
   *
   * @param phase1Analysis 阶段一分析结果
   * @param modules 课程模块列表
   * @param subject 科目
   * @param gradeLevel 年级
   * @param settings 孩子设置（用于 AI 生成）
   * @param assessmentType 评测场景（默认 placement），影响 AI prompt 语境
   * @returns 选择题列表
   */
  async generatePhase2Plan(
    phase1Analysis: Phase1Analysis,
    modules: CurriculumModule[],
    subject: string,
    gradeLevel: string,
    settings?: ChildSettings,
    assessmentType: AssessmentType = 'placement',
  ): Promise<ChoiceQuestion[]> {
    const plan: ChoiceQuestion[] = []
    const mode = phase1Analysis.phase2Mode || 'verify'

    // 加载预设题库
    const questionBank = await loadQuestionBank(
      subject as 'math' | 'chinese' | 'english',
      gradeLevel as Parameters<typeof loadQuestionBank>[1],
    )

    const phase1AnsweredNodeIds = new Set(
      phase1Analysis.answerSummaries.map(s => s.nodeId),
    )

    const purposeText = buildPurposeText(assessmentType)

    if (mode === 'challenge') {
      // ========== 挑战模式 ==========
      // Phase 1 表现优秀，从已答模块中选更高难度的未答节点来探测上限
      // 优先级：uncertain 模块 > 全对模块 > 其余模块
      const uncertainModuleIds = new Set(
        phase1Analysis.answerSummaries
          .filter(s => phase1Analysis.uncertainNodes.includes(s.nodeId))
          .map(s => s.moduleId),
      )
      const usedModuleIds = new Set<string>()

      type Candidate = { node: CurriculumKnowledgeNode; mod: CurriculumModule; priority: number }
      const candidates: Candidate[] = []

      for (const mod of modules) {
        const hardestFirst = [...mod.knowledgeNodes]
          .filter(n => !phase1AnsweredNodeIds.has(n.id))
          .sort((a, b) => b.difficulty - a.difficulty)
        if (hardestFirst.length === 0) continue

        const node = hardestFirst[0]
        const priority = uncertainModuleIds.has(mod.id) ? 0
          : (phase1Analysis.moduleScores[mod.id] ?? 0) >= 80 ? 1
          : 2
        candidates.push({ node, mod, priority })
      }

      candidates.sort((a, b) => a.priority - b.priority || b.node.difficulty - a.node.difficulty)

      const p2Ctx: Phase2QuestionContext = {
        assessmentType,
        phase2Mode: 'challenge',
        overallPhase1Score: phase1Analysis.overallPhase1Score,
        purpose: purposeText.challengeBase,
      }

      for (const { node, mod } of candidates) {
        if (plan.length >= PHASE2_MAX_QUESTIONS) break
        if (usedModuleIds.has(mod.id)) continue
        usedModuleIds.add(mod.id)

        const modPerf = phase1Analysis.answerSummaries
          .filter(s => s.moduleId === mod.id)
          .map(s => ({
            nodeName: s.nodeName,
            isCorrect: s.isCorrect,
            difficulty: mod.knowledgeNodes.find(n => n.id === s.nodeId)?.difficulty ?? 1,
          }))
        const ctx: Phase2QuestionContext = { ...p2Ctx, sameModulePerformance: modPerf }

        const question = await this.generateSingleQuestion(
          node, mod, questionBank, 'hard', gradeLevel, subject, settings, ctx,
        )
        if (question) plan.push(question)
      }
    } else if (mode === 'mixed') {
      // ========== 混合模式 ==========
      const weakNodeIds = new Set<string>()
      const buildModPerf = (mod: CurriculumModule) =>
        phase1Analysis.answerSummaries
          .filter(s => s.moduleId === mod.id)
          .map(s => ({
            nodeName: s.nodeName,
            isCorrect: s.isCorrect,
            difficulty: mod.knowledgeNodes.find(n => n.id === s.nodeId)?.difficulty ?? 1,
          }))

      // 1) 薄弱模块验证题（1-2题）
      for (const weakModId of phase1Analysis.weakModules) {
        if (plan.length >= Math.min(2, PHASE2_MAX_QUESTIONS)) break
        const mod = modules.find(m => m.id === weakModId)
        if (!mod) continue
        const nodes = mod.knowledgeNodes.filter(n => !phase1AnsweredNodeIds.has(n.id))
        for (const node of nodes) {
          if (plan.length >= 2) break
          weakNodeIds.add(node.id)
          const ctx: Phase2QuestionContext = {
            assessmentType,
            phase2Mode: 'mixed',
            overallPhase1Score: phase1Analysis.overallPhase1Score,
            sameModulePerformance: buildModPerf(mod),
            purpose: purposeText.verifyWeak,
          }
          const question = await this.generateSingleQuestion(
            node, mod, questionBank, 'hard', gradeLevel, subject, settings, ctx,
          )
          if (question) plan.push(question)
        }
      }

      // 2) 不确定知识点验证题
      for (const nodeId of phase1Analysis.uncertainNodes) {
        if (plan.length >= PHASE2_MAX_QUESTIONS - 1) break
        if (weakNodeIds.has(nodeId)) continue
        for (const mod of modules) {
          const node = mod.knowledgeNodes.find(n => n.id === nodeId)
          if (node) {
            const ctx: Phase2QuestionContext = {
              assessmentType,
              phase2Mode: 'mixed',
              overallPhase1Score: phase1Analysis.overallPhase1Score,
              sameModulePerformance: buildModPerf(mod),
              purpose: purposeText.verifyUncertain,
            }
            const question = await this.generateSingleQuestion(
              node, mod, questionBank, 'hard', gradeLevel, subject, settings, ctx,
            )
            if (question) plan.push(question)
            break
          }
        }
      }

      // 3) 强项模块挑战题（填满剩余名额）
      const usedNodeIds = new Set(plan.map(q => q.nodeId))
      const strongModules = modules.filter(
        m => !phase1Analysis.weakModules.includes(m.id)
          && (phase1Analysis.moduleScores[m.id] ?? 0) >= 80,
      )
      for (const mod of strongModules) {
        if (plan.length >= PHASE2_MAX_QUESTIONS) break
        const hardNodes = [...mod.knowledgeNodes]
          .filter(n => !phase1AnsweredNodeIds.has(n.id) && !usedNodeIds.has(n.id))
          .sort((a, b) => b.difficulty - a.difficulty)
        for (const node of hardNodes) {
          if (plan.length >= PHASE2_MAX_QUESTIONS) break
          const ctx: Phase2QuestionContext = {
            assessmentType,
            phase2Mode: 'mixed',
            overallPhase1Score: phase1Analysis.overallPhase1Score,
            sameModulePerformance: buildModPerf(mod),
            purpose: purposeText.mixedStrong,
          }
          const question = await this.generateSingleQuestion(
            node, mod, questionBank, 'hard', gradeLevel, subject, settings, ctx,
          )
          if (question) {
            plan.push(question)
            usedNodeIds.add(node.id)
          }
        }
      }
    } else {
      // ========== 验证模式 ==========
      const targetNodes: Array<{ node: CurriculumKnowledgeNode; mod: CurriculumModule }> = []

      for (const weakModId of phase1Analysis.weakModules) {
        const mod = modules.find(m => m.id === weakModId)
        if (!mod) continue
        for (const node of mod.knowledgeNodes) {
          if (plan.length + targetNodes.length >= PHASE2_MAX_QUESTIONS) break
          if (phase1AnsweredNodeIds.has(node.id)) continue
          targetNodes.push({ node, mod })
        }
      }

      for (const nodeId of phase1Analysis.uncertainNodes) {
        if (plan.length + targetNodes.length >= PHASE2_MAX_QUESTIONS) break
        if (targetNodes.some(t => t.node.id === nodeId)) continue
        for (const mod of modules) {
          const node = mod.knowledgeNodes.find(n => n.id === nodeId)
          if (node) {
            targetNodes.push({ node, mod })
            break
          }
        }
      }

      for (const { node, mod } of targetNodes) {
        if (plan.length >= PHASE2_MAX_QUESTIONS) break
        const modPerf = phase1Analysis.answerSummaries
          .filter(s => s.moduleId === mod.id)
          .map(s => ({
            nodeName: s.nodeName,
            isCorrect: s.isCorrect,
            difficulty: mod.knowledgeNodes.find(n => n.id === s.nodeId)?.difficulty ?? 1,
          }))
        const ctx: Phase2QuestionContext = {
          assessmentType,
          phase2Mode: 'verify',
          overallPhase1Score: phase1Analysis.overallPhase1Score,
          sameModulePerformance: modPerf,
          purpose: purposeText.verifyOverall,
        }
        const question = await this.generateSingleQuestion(
          node, mod, questionBank, 'hard', gradeLevel, subject, settings, ctx,
        )
        if (question) plan.push(question)
      }
    }

    // 确保至少 PHASE2_MIN_QUESTIONS 道题
    if (plan.length < PHASE2_MIN_QUESTIONS) {
      const usedNodeIds = new Set(plan.map(q => q.nodeId))
      // 挑战模式下补充高难度题，其他模式补充任意题
      const difficultyPref = mode === 'challenge' ? 'hard' : undefined
      for (const mod of modules) {
        if (plan.length >= PHASE2_MIN_QUESTIONS) break
        const nodes = mode === 'challenge'
          ? [...mod.knowledgeNodes].sort((a, b) => b.difficulty - a.difficulty)
          : mod.knowledgeNodes
        for (const node of nodes) {
          if (plan.length >= PHASE2_MIN_QUESTIONS) break
          if (usedNodeIds.has(node.id)) continue

          const bankItem = getQuestionFromBank(questionBank, node.id, difficultyPref)
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

  /**
   * 为单个知识点生成一道题（AI 优先，题库降级）
   */
  private async generateSingleQuestion(
    node: CurriculumKnowledgeNode,
    mod: CurriculumModule,
    questionBank: Map<string, QuestionBankItem[]>,
    difficulty: 'easy' | 'hard',
    gradeLevel: string,
    subject: string,
    settings?: ChildSettings,
    phase2Context?: Phase2QuestionContext,
  ): Promise<ChoiceQuestion | null> {
    if (settings?.llmApiKey && settings?.llmModel) {
      const aiResult = await generateQuestion(
        { id: node.id, name: node.name, description: node.description },
        gradeLevel,
        subject,
        settings,
        phase2Context,
      )
      if (aiResult) {
        return this.bankItemToChoiceQuestion(aiResult, node, mod, 'ai')
      }
    }

    const bankItem = getQuestionFromBank(questionBank, node.id, difficulty)
    if (bankItem) {
      return this.bankItemToChoiceQuestion(bankItem, node, mod, 'preset')
    }

    return null
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

/** @deprecated 使用 AdaptiveAssessmentEngine 代替 */
export const PlacementTestEngine = AdaptiveAssessmentEngine
