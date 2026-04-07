/**
 * 入学测评引擎
 * 生成自适应测评题目、提交答案、完成测评、应用结果
 */

import type { CurriculumModule, CurriculumKnowledgeNode } from '@/curriculum/types'
import type { PlacementResult } from '@/types/models'

/** 测评计划中的一个题目 */
export interface TestPlanItem {
  nodeId: string
  nodeName: string
  moduleId: string
  moduleOrder: number
  difficulty: number
}

/** 答题记录 */
export interface AnswerRecord {
  nodeId: string
  isCorrect: boolean
  timeSpent: number
}

/** 测评会话 */
export interface TestSession {
  questions: TestPlanItem[]
  currentIndex: number
  answers: AnswerRecord[]
}

/** 提交答案返回结果 */
export interface SubmitResult {
  isCorrect: boolean
  nextQuestion: TestPlanItem | null
  progress: number
}

/** 默认配置 */
const MAX_QUESTIONS = 15
const MASTERY_CORRECT = 70
const MASTERY_WRONG = 0
const MASTERY_INFERRED_BEFORE = 60

/**
 * 入学测评引擎
 */
export class PlacementTestEngine {
  /**
   * 生成测评计划
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
   * 创建测评会话
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
   * 提交答案（自适应选题）
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

  /**
   * 完成测评，计算结果
   */
  completeTest(session: TestSession, modules: CurriculumModule[]): PlacementResult {
    const correctNodes = new Set<string>()
    const wrongNodes = new Set<string>()

    for (const answer of session.answers) {
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
      session.answers.length > 0
        ? Math.round(
            (session.answers.filter((a) => a.isCorrect).length / session.answers.length) * 100,
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
  applyResult(session: TestSession, modules: CurriculumModule[]): Map<string, number> {
    const masteryMap = new Map<string, number>()

    const correctNodes = new Set<string>()
    const wrongNodes = new Set<string>()
    for (const answer of session.answers) {
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

  /** 获取按模块顺序排列的全部知识点 */
  private getAllNodesOrdered(modules: CurriculumModule[]): CurriculumKnowledgeNode[] {
    return [...modules]
      .sort((a, b) => a.order - b.order)
      .flatMap((m) =>
        [...m.knowledgeNodes].sort((a, b) => a.difficulty - b.difficulty),
      )
  }
}
