/**
 * 动态调整器
 *
 * 根据答题结果动态调整课程计划：
 * - 掌握率低 (< reinforceThreshold) → 生成加固课
 * - 掌握率高 (>= skipThreshold) → 可跳过该知识点
 * - 中间范围 → 继续正常流程
 */

import type { RequirementMode } from './requirement-generator'

// ============================================================
// 类型定义
// ============================================================

/** 调整动作 */
export type AdjustmentAction = 'reinforce' | 'skip' | 'continue'

/** 调整器配置 */
export interface AdjusterConfig {
  /** 触发加固的掌握率阈值（默认 50） */
  reinforceThreshold?: number
  /** 触发跳过的掌握率阈值（默认 80） */
  skipThreshold?: number
}

/** 调整输入 */
export interface AdjustmentInput {
  /** 知识点 ID */
  knowledgeNodeId: string
  /** 知识点名称 */
  knowledgeNodeName: string
  /** 当前掌握率 (0-100) */
  currentMastery: number
  /** 本次会话正确率 (0-1) */
  sessionCorrectRate: number
  /** 总答题次数 */
  totalAttempts: number
}

/** 调整结果 */
export interface AdjustmentResult {
  /** 知识点 ID */
  knowledgeNodeId: string
  /** 建议动作 */
  action: AdjustmentAction
  /** 建议原因 */
  reason: string
  /** 如需生成新课堂的模式（仅 reinforce 时有值） */
  requirementMode?: RequirementMode
}

// ============================================================
// DynamicAdjuster
// ============================================================

export class DynamicAdjuster {
  private readonly reinforceThreshold: number
  private readonly skipThreshold: number

  constructor(config?: AdjusterConfig) {
    this.reinforceThreshold = config?.reinforceThreshold ?? 50
    this.skipThreshold = config?.skipThreshold ?? 80
  }

  /**
   * 评估单个知识点的调整建议
   *
   * 决策逻辑：
   * 1. mastery < reinforceThreshold → reinforce
   * 2. mastery >= skipThreshold
   *    - 如果 sessionCorrectRate >= 0.8 且 totalAttempts >= 3 → skip（充分验证后可跳过）
   *    - 否则 → continue（掌握率高但本次验证不充分，继续巩固）
   * 3. 中间范围
   *    - 如果 totalAttempts >= 5 且 sessionCorrectRate >= 0.8 → skip（大量练习+高正确率可提前推进）
   *    - 否则 → continue
   */
  evaluate(input: AdjustmentInput): AdjustmentResult {
    const { knowledgeNodeId, knowledgeNodeName, currentMastery, sessionCorrectRate, totalAttempts } = input

    if (currentMastery < this.reinforceThreshold) {
      return {
        knowledgeNodeId,
        action: 'reinforce',
        reason: `知识点「${knowledgeNodeName}」掌握率为 ${currentMastery}%（低于 ${this.reinforceThreshold}%），` +
          `本次正确率 ${Math.round(sessionCorrectRate * 100)}%（共 ${totalAttempts} 题），建议生成加固复习课。`,
        requirementMode: 'reinforcement',
      }
    }

    if (currentMastery >= this.skipThreshold) {
      // I4+I5: 掌握率高，但需要 sessionCorrectRate 和 totalAttempts 共同确认
      if (sessionCorrectRate >= 0.8 && totalAttempts >= 3) {
        return {
          knowledgeNodeId,
          action: 'skip',
          reason: `知识点「${knowledgeNodeName}」掌握率为 ${currentMastery}%（已达 ${this.skipThreshold}%），` +
            `本次正确率 ${Math.round(sessionCorrectRate * 100)}%（共 ${totalAttempts} 题），可跳过，推进到下一个知识点。`,
        }
      }
      return {
        knowledgeNodeId,
        action: 'continue',
        reason: `知识点「${knowledgeNodeName}」掌握率为 ${currentMastery}%（已达 ${this.skipThreshold}%），` +
          `但本次验证不充分（正确率 ${Math.round(sessionCorrectRate * 100)}%，共 ${totalAttempts} 题），继续巩固。`,
      }
    }

    // 中间范围：大量练习+高正确率可提前推进
    if (totalAttempts >= 5 && sessionCorrectRate >= 0.8) {
      return {
        knowledgeNodeId,
        action: 'skip',
        reason: `知识点「${knowledgeNodeName}」掌握率为 ${currentMastery}%，` +
          `但本次表现优异（正确率 ${Math.round(sessionCorrectRate * 100)}%，共 ${totalAttempts} 题），可提前推进。`,
      }
    }

    return {
      knowledgeNodeId,
      action: 'continue',
      reason: `知识点「${knowledgeNodeName}」掌握率为 ${currentMastery}%，` +
        `本次正确率 ${Math.round(sessionCorrectRate * 100)}%（共 ${totalAttempts} 题），处于正常范围，继续当前学习计划。`,
    }
  }

  /**
   * 批量评估多个知识点
   */
  evaluateBatch(inputs: AdjustmentInput[]): AdjustmentResult[] {
    return inputs.map((input) => this.evaluate(input))
  }
}
