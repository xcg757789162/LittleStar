/**
 * React Query Hooks 统一导出
 *
 * 使用方式：
 *   import { useChildren, useCreateChild, useKnowledgeNodes } from '@/hooks/queries'
 */

// 孩子
export {
  useChildren,
  useChild,
  useCreateChild,
  useUpdateChild,
  useUpdateChildSettings,
  useDeleteChild,
  childrenKeys,
} from './useChildren'
export type { CreateChildInput, UpdateChildInput } from './useChildren'

// 知识点
export {
  useKnowledgeNodes,
  useKnowledgeNodesBySubject,
  useKnowledgeNode,
  knowledgeNodeKeys,
} from './useKnowledgeNodes'

// 学习记录
export {
  useLearningRecords,
  useLearningRecordsByNode,
  useCreateLearningRecord,
  learningRecordKeys,
} from './useLearningRecords'
export type { CreateLearningRecordInput } from './useLearningRecords'

// 掌握率记录
export {
  useMasteryRecords,
  useMasteryRecord,
  useUpsertMasteryRecord,
  useBatchUpsertMasteryRecords,
  masteryRecordKeys,
} from './useMasteryRecords'
export type { UpsertMasteryRecordInput } from './useMasteryRecords'

// 课堂历史
export {
  useClassroomHistoryList,
  useClassroomHistoryDetail,
  useCreateClassroomHistory,
  classroomHistoryKeys,
} from './useClassroomHistory'
export type {
  ClassroomHistoryItem,
  ClassroomHistoryDetail,
  CreateClassroomHistoryInput,
} from './useClassroomHistory'

// 题目
export {
  useQuestions,
  useQuestionsByNode,
  useQuestionsByNodeType,
  questionKeys,
} from './useQuestions'

// 入学测评
export {
  usePlacementTests,
  usePlacementTestBySubject,
  useCreatePlacementTest,
  useResetPlacement,
  placementTestKeys,
} from './usePlacementTests'
export type { CreatePlacementTestInput } from './usePlacementTests'

// 亲子活动
export {
  useParentActivities,
  useActivitiesByNodeIds,
  fetchRandomActivity,
  fetchOfflineExtensions,
} from './useParentActivities'

// TPR 指令
export {
  useTPRInstructions,
  fetchRandomTPRSequence,
  fetchRandomTPR,
} from './useTPRInstructions'

// 课程大纲
export {
  useCurriculum,
  useCurriculaList,
} from './useCurriculum'
