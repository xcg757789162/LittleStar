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
  useKnowledgeNodesBySubjectGrade,
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

// 每日会话
export {
  useDailySessions,
  useDailySessionByDate,
  useCreateDailySession,
  dailySessionKeys,
} from './useDailySessions'
export type { CreateDailySessionInput } from './useDailySessions'

// 成就
export {
  useAchievements,
  useAchievementsByType,
  useCreateAchievement,
  achievementKeys,
} from './useAchievements'
export type { CreateAchievementInput } from './useAchievements'

// 年级解锁
export {
  useGradeUnlocks,
  useGradeUnlocksBySubject,
  useCreateGradeUnlock,
  gradeUnlockKeys,
} from './useGradeUnlocks'
export type { CreateGradeUnlockInput } from './useGradeUnlocks'

// 入学测评
export {
  usePlacementTests,
  usePlacementTestBySubjectGrade,
  useCreatePlacementTest,
  placementTestKeys,
} from './usePlacementTests'
export type { CreatePlacementTestInput } from './usePlacementTests'

// 学习报告
export {
  useReportData,
  useReportDataByType,
  useCreateReportData,
  reportDataKeys,
} from './useReportData'
export type { CreateReportDataInput } from './useReportData'

// 掌握度快照
export {
  useMasterySnapshots,
  useMasterySnapshotsBySubjectGrade,
  useCreateMasterySnapshot,
  masterySnapshotKeys,
} from './useMasterySnapshots'
export type { CreateMasterySnapshotInput } from './useMasterySnapshots'
