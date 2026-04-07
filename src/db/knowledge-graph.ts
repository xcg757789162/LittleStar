import type { LittleStarDB } from './database'
import type { GradeLevel, KnowledgeNode, Subject } from '@/types/models'

/** 解锁所需的前置掌握率阈值（默认 80%） */
const UNLOCK_THRESHOLD = 80

/**
 * 知识图谱服务
 * 提供知识点查询、依赖关系解析、解锁判断等功能
 */
export class KnowledgeGraphService {
  constructor(private db: LittleStarDB) {}

  /** 获取所有知识点 */
  async getAllNodes(): Promise<KnowledgeNode[]> {
    return this.db.knowledgeNodes.toArray()
  }

  /** 按科目获取知识点 */
  async getNodesBySubject(subject: Subject): Promise<KnowledgeNode[]> {
    return this.db.knowledgeNodes.where('subject').equals(subject).toArray()
  }

  /** 按科目和年级获取知识点 */
  async getNodesBySubjectAndGrade(
    subject: Subject,
    gradeLevel: GradeLevel,
  ): Promise<KnowledgeNode[]> {
    return this.db.knowledgeNodes
      .where('[subject+gradeLevel]')
      .equals([subject, gradeLevel])
      .toArray()
  }

  /** 按 ID 获取知识点 */
  async getNodeById(id: string): Promise<KnowledgeNode | undefined> {
    return this.db.knowledgeNodes.get(id)
  }

  /** 按科目获取并按 order 排序 */
  async getNodesBySubjectOrdered(subject: Subject): Promise<KnowledgeNode[]> {
    const nodes = await this.getNodesBySubject(subject)
    return nodes.sort((a, b) => a.order - b.order)
  }

  /** 获取节点的前置依赖节点 */
  async getPrerequisites(nodeId: string): Promise<KnowledgeNode[]> {
    const node = await this.getNodeById(nodeId)
    if (!node || !node.prerequisites || node.prerequisites.length === 0) {
      return []
    }

    const prerequisites: KnowledgeNode[] = []
    for (const preId of node.prerequisites) {
      const preNode = await this.getNodeById(preId)
      if (preNode) {
        prerequisites.push(preNode)
      }
    }
    return prerequisites
  }

  /** 获取节点的后续节点 */
  async getNextNodes(nodeId: string): Promise<KnowledgeNode[]> {
    const node = await this.getNodeById(nodeId)
    if (!node || !node.nextNodes || node.nextNodes.length === 0) {
      return []
    }

    const nextNodes: KnowledgeNode[] = []
    for (const nextId of node.nextNodes) {
      const nextNode = await this.getNodeById(nextId)
      if (nextNode) {
        nextNodes.push(nextNode)
      }
    }
    return nextNodes
  }

  /**
   * 判断节点是否可以解锁
   * @param nodeId 要判断的节点 ID
   * @param masteryMap 掌握率映射 Map<knowledgeNodeId, masteryLevel>
   * @param threshold 解锁阈值，默认 80%
   */
  async canUnlock(
    nodeId: string,
    masteryMap: Map<string, number>,
    threshold: number = UNLOCK_THRESHOLD,
  ): Promise<boolean> {
    const node = await this.getNodeById(nodeId)
    if (!node) return false

    // 没有前置依赖的节点直接可解锁
    if (!node.prerequisites || node.prerequisites.length === 0) {
      return true
    }

    // 检查所有前置依赖的掌握率是否达标
    return node.prerequisites.every((preId) => {
      const mastery = masteryMap.get(preId) ?? 0
      return mastery >= threshold
    })
  }
}
