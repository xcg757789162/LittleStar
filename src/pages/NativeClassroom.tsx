/**
 * NativeClassroom — 原生课堂页面（v2）
 *
 * 集成 OpenMAIC 原生 Stage 组件直接渲染课堂内容，
 * 完全替代 LearningSession 页面的 iframe 嵌入方案。
 *
 * 页面流程:
 *   1. 科目选择（评测完成的科目）
 *   2. 课程选择器（从 ClassroomCache 加载缓存课程列表）
 *   3. 课堂渲染（ClassroomBridge → OpenMAIC Stage 组件）
 *   4. 完成总结（答题统计 + 庆祝动画）
 *
 * 路由: /classroom
 * 数据流:
 *   ClassroomCache → loadClassroom → ClassroomBridgeStore → Stage 组件
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ClassroomBridge } from '@/components/classroom/ClassroomBridge';
import { useClassroomBridgeStore } from '@/stores/openmaic/classroom-bridge';
import { syncSettingsToOpenMAIC } from '@/stores/openmaic/settings-sync';
import { ClassroomCache, type CacheListItem } from '@/services/openmaic/cache';
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store';
import { usePlacementTests } from '@/hooks/queries';
import { usePreGeneration, buildPreGenerationChildSettings } from '@/hooks/usePreGeneration';
import { useChildStore } from '@/stores/childStore';
import { useLearningStore } from '@/stores/learningStore';
import { SessionSummary } from '@/components/learning/SessionSummary';
import { LessonCard } from '@/components/learning/LessonCard';
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAudioActivation } from '@/hooks/useAudioActivation';
import { apiClient } from '@/services/api';
import type { Subject, MasteryRecord, Achievement } from '@/types/models';
import type { Classroom } from '@/services/openmaic/types';
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation';

/* ═══════════════════════════════════════════
   设计 Token — Sunny Playground 风格
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  sunOrange: '#FF8C42',
  candyPink: '#FF6B9D',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  mathColor: '#FF8C42',
  mathBg: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
  mathShadow: 'rgba(255, 140, 66, 0.3)',
  chineseColor: '#2EC4B6',
  chineseBg: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
  chineseShadow: 'rgba(46, 196, 182, 0.3)',
  englishColor: '#5BC0EB',
  englishBg: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
  englishShadow: 'rgba(91, 192, 235, 0.3)',
};

const SUBJECTS: { key: Subject; label: string; emoji: string; color: string; bg: string; shadow: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: T.mathColor, bg: T.mathBg, shadow: T.mathShadow },
  { key: 'chinese', label: '语文', emoji: '📖', color: T.chineseColor, bg: T.chineseBg, shadow: T.chineseShadow },
  { key: 'english', label: '英语', emoji: '🔤', color: T.englishColor, bg: T.englishBg, shadow: T.englishShadow },
];

interface LocationState {
  subject?: Subject;
}

/** 页面阶段 */
type Phase = 'subject-select' | 'lesson-picker' | 'playing' | 'complete';

export function NativeClassroom() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const currentChild = useChildStore((s) => s.currentChild);
  const childId = currentChild?.id;

  const { data: placementTests } = usePlacementTests(childId);
  const completedSubjects = useMemo(() => {
    if (!placementTests) return new Set<Subject>();
    return new Set(placementTests.map((t) => t.subject as Subject));
  }, [placementTests]);
  const hasPlacementTest = placementTests ? placementTests.length > 0 : null;

  // 页面状态
  const [phase, setPhase] = useState<Phase>(locationState?.subject ? 'lesson-picker' : 'subject-select');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(locationState?.subject ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedLessons, setCachedLessons] = useState<CacheListItem[]>([]);
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{ questionsCompleted: number; correctCount: number; accuracy: number; subject: Subject } | null>(null);

  // 选择模式（用于重新生成）
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Bridge Store
  const loadClassroom = useClassroomBridgeStore((s) => s.loadClassroom);
  const resetBridge = useClassroomBridgeStore((s) => s.reset);

  // Learning Store
  const startSession = useLearningStore((s) => s.startSession);
  const endSession = useLearningStore((s) => s.endSession);
  const recordAnswer = useLearningStore((s) => s.recordAnswer);

  const { playLevelUp } = useSoundEffects();
  const { activateAudio } = useAudioActivation();

  // Cache instance
  const cacheRef = useRef<ClassroomCache | null>(null);
  if (!cacheRef.current) {
    cacheRef.current = childId
      ? new ClassroomCache(new PostgresCacheStore(Number(childId)))
      : new ClassroomCache();
  }

  const preGeneration = usePreGeneration(
    childId,
    hasPlacementTest,
    cachedLessons.length,
    completedSubjects.size,
  );

  // 追踪当前课堂
  const currentNodeIdRef = useRef<string>('');
  const currentDateRef = useRef<string>('');

  // 如果从 Home 页带了科目进来，自动加载课程列表
  useEffect(() => {
    if (locationState?.subject && phase === 'lesson-picker') {
      void loadLessons(locationState.subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === 课程加载 ===

  const loadLessons = useCallback(async (subject: Subject) => {
    setIsLoading(true);
    try {
      const list = await cacheRef.current!.listCachedClassrooms(undefined, subject);
      setCachedLessons(list);
      setPhase('lesson-picker');
    } catch {
      setCachedLessons([]);
      setPhase('lesson-picker');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubjectSelect = useCallback(async (subject: Subject) => {
    activateAudio();
    setSelectedSubject(subject);
    await loadLessons(subject);
  }, [loadLessons, activateAudio]);

  const handleStartLesson = useCallback(async (knowledgeNodeId: string, date: string) => {
    if (!selectedSubject) return;
    setIsLoading(true);

    try {
      // 记录当前课堂信息
      currentNodeIdRef.current = knowledgeNodeId;
      currentDateRef.current = date;

      // 从缓存加载课堂
      const classroom = await cacheRef.current!.getClassroom(knowledgeNodeId, date);
      if (!classroom) {
        setCachedLessons([]);
        setIsLoading(false);
        return;
      }

      // 同步设置到 OpenMAIC Settings Store
      if (currentChild?.settings) {
        syncSettingsToOpenMAIC(currentChild.settings, currentChild.id ? String(currentChild.id) : undefined);
      }

      // 启动学习会话
      startSession(selectedSubject);
      setCurrentClassroom(classroom);

      // 加载到 Bridge Store
      loadClassroom(classroom, knowledgeNodeId);

      setPhase('playing');
    } catch (err) {
      console.error('[NativeClassroom] 加载课堂失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, currentChild, startSession, loadClassroom]);

  // === 课堂交互 ===

  const handleAnswer = useCallback((isCorrect: boolean) => {
    recordAnswer(isCorrect);
  }, [recordAnswer]);

  const handleComplete = useCallback(async () => {
    const stats = useLearningStore.getState().sessionStats;
    const subject = selectedSubject ?? 'math';

    // 结束会话
    endSession();

    // 计算统计
    const accuracy = stats.questionsCompleted > 0
      ? Math.round((stats.correctCount / stats.questionsCompleted) * 100)
      : 0;
    setSessionSummary({
      questionsCompleted: stats.questionsCompleted,
      correctCount: stats.correctCount,
      accuracy,
      subject,
    });

    // 显示庆祝
    playLevelUp();
    setPhase('complete');
    requestAnimationFrame(() => setShowCompleteCelebration(true));

    // 异步写入 DB
    try {
      const child = useChildStore.getState().currentChild;
      if (!child) return;
      const numChildId = Number(child.id);
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // 写入 DailySession
      await apiClient.post('/daily_sessions', {
        childId: numChildId,
        date: dateStr,
        startTime: today.toISOString(),
        questionsCompleted: stats.questionsCompleted,
        correctCount: stats.correctCount,
        subjects: [subject],
        streak: 1,
      });

      // 写入 classroom_history
      if (currentClassroom) {
        const knowledgeNodeId = currentNodeIdRef.current || currentClassroom.id || 'unknown';
        const existingHistory = await apiClient.get<{ id: number }>('/classroom_history', {
          filters: [
            { column: 'childId', operator: 'eq', value: numChildId },
            { column: 'knowledgeNodeId', operator: 'eq', value: knowledgeNodeId },
          ],
          select: 'id',
        });
        const round = existingHistory.length + 1;

        const historyRecord = await apiClient.post<{ id: number }>('/classroom_history', {
          childId: numChildId,
          knowledgeNodeId,
          knowledgeNodeName: currentClassroom.title ?? knowledgeNodeId,
          subject,
          classroomId: currentClassroom.id,
          classroomTitle: currentClassroom.title ?? '',
          date: dateStr,
          completedAt: today.toISOString(),
          round,
          isReview: false,
          questionsCompleted: stats.questionsCompleted,
          correctCount: stats.correctCount,
          accuracy,
        });

        if (historyRecord?.id) {
          await apiClient.post('/classroom_snapshots', {
            historyId: historyRecord.id,
            classroomData: currentClassroom,
          });
        }

        // Upsert mastery_records
        const correctRate = stats.questionsCompleted > 0 ? stats.correctCount / stats.questionsCompleted : 0;
        const masteryDelta = correctRate >= 0.8 ? 15 : correctRate >= 0.5 ? 5 : -5;
        const existingMastery = await apiClient.get<MasteryRecord>('/mastery_records', {
          filters: [
            { column: 'childId', operator: 'eq', value: numChildId },
            { column: 'knowledgeNodeId', operator: 'eq', value: knowledgeNodeId },
          ],
        });
        const baseMastery = 50;
        const currentMastery = existingMastery.length > 0 ? existingMastery[0].masteryLevel : baseMastery;
        const newMastery = Math.max(0, Math.min(100, currentMastery + masteryDelta));
        const nextReview = new Date(today.getTime() + (newMastery >= 80 ? 7 : newMastery >= 60 ? 3 : 1) * 24 * 60 * 60 * 1000);

        await apiClient.upsert('/mastery_records', {
          childId: numChildId,
          knowledgeNodeId,
          masteryLevel: newMastery,
          lastPracticed: today.toISOString(),
          nextReviewDate: nextReview.toISOString(),
          consecutiveCorrect: correctRate >= 0.8 ? stats.correctCount : 0,
          totalAttempts: (existingMastery[0]?.totalAttempts ?? 0) + stats.questionsCompleted,
          totalCorrect: (existingMastery[0]?.totalCorrect ?? 0) + stats.correctCount,
        }, 'child_id,knowledge_node_id');
      }

      // 删除已消费的缓存
      const nodeId = currentNodeIdRef.current;
      const cacheDate = currentDateRef.current;
      if (nodeId && cacheDate && cacheRef.current) {
        await cacheRef.current.deleteClassroom(nodeId, cacheDate).catch(() => {});
      }

      // 触发新一轮预生成
      window.dispatchEvent(new CustomEvent('classroom-completed', {
        detail: { subject, knowledgeNodeId: nodeId },
      }));

      // 检查成就（先预查 mastery_records，后续可用于成就判定扩展）
      await apiClient.get<MasteryRecord>('/mastery_records', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
      });
      const existingAchievements = await apiClient.get<Achievement>('/achievements', {
        filters: [{ column: 'childId', operator: 'eq', value: numChildId }],
      });

      // 简化的成就检查（里程碑）
      if (stats.questionsCompleted >= 10 && !existingAchievements.some(a => a.name === '答题达人')) {
        await apiClient.post('/achievements', {
          childId: numChildId,
          type: 'milestone',
          name: '答题达人',
          description: '单次课堂回答 10 个以上问题',
          earnedAt: new Date().toISOString(),
          metadata: {},
        });
      }
    } catch (error) {
      console.error('[NativeClassroom] DB 写入失败:', error);
    }
  }, [currentClassroom, selectedSubject, endSession, playLevelUp]);

  const handleExit = useCallback(() => {
    if (phase === 'playing') {
      // 中途退出
      endSession();
      resetBridge();
    }
    navigate('/');
  }, [phase, endSession, resetBridge, navigate]);

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) setSelectedKeys(new Set());
      return !prev;
    });
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedKeys.size === cachedLessons.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(cachedLessons.map((l) => `${l.knowledgeNodeId}::${l.date}`)));
    }
  }, [cachedLessons, selectedKeys.size]);

  const handleRegenerate = useCallback(async () => {
    if (selectedKeys.size === 0 || !childId || !currentChild) return;
    setIsRegenerating(true);

    try {
      const numChildId = Number(childId);
      const lessonsToRegen = cachedLessons.filter(
        (l) => selectedKeys.has(`${l.knowledgeNodeId}::${l.date}`),
      );

      // 1. Delete selected caches
      for (const lesson of lessonsToRegen) {
        await cacheRef.current!.deleteClassroom(lesson.knowledgeNodeId, lesson.date).catch(() => {});
      }

      // 2. Build backend tasks
      const tasks = lessonsToRegen.map((lesson) => ({
        knowledgeNodeId: lesson.knowledgeNodeId,
        date: lesson.date,
        requirement: `为一位 ${currentChild.age} 岁的 ${currentChild.gradeLevel} 学生重新生成关于「${lesson.classroomTitle}」的课堂。包含教学和测验环节，以趣味互动为主。`,
        language: 'zh-CN',
      }));

      // 3. Submit to backend
      const childSettings = buildPreGenerationChildSettings(currentChild);
      await fetch('/api/pre-generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: numChildId, childSettings, tasks }),
      });

      // 4. Exit select mode and reload lessons
      setSelectMode(false);
      setSelectedKeys(new Set());
      if (selectedSubject) await loadLessons(selectedSubject);

      // 5. Trigger polling to track progress
      preGeneration.triggerGeneration();
    } catch (err) {
      console.error('[NativeClassroom] 重新生成失败:', err);
    } finally {
      setIsRegenerating(false);
    }
  }, [selectedKeys, childId, currentChild, cachedLessons, selectedSubject, loadLessons, preGeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetBridge();
    };
  }, [resetBridge]);

  useEffect(() => {
    if (phase === 'lesson-picker' && selectedSubject && preGeneration.status === 'completed') {
      void loadLessons(selectedSubject);
    }
  }, [phase, selectedSubject, preGeneration.status, loadLessons]);

  const isSubjectPending =
    cachedLessons.length === 0 &&
    (preGeneration.status === 'checking' || preGeneration.status === 'generating');
  const emptyStateTitle = preGeneration.status === 'failed'
    ? '课程准备出了点小问题'
    : isSubjectPending
      ? '正在检查这门课的课堂缓存...'
      : '课程准备中...';
  const emptyStateDescription = preGeneration.error
    ? preGeneration.error
    : isSubjectPending
      ? preGeneration.stageText || 'AI 老师正在为你准备课程，请稍等片刻'
      : 'AI 老师正在为你准备课程，请稍等片刻再试';
  const emptyStateActionLabel = preGeneration.status === 'failed'
    ? '🔁 重新生成'
    : isSubjectPending
      ? '🔄 刷新列表'
      : '🚀 检查课程';

  return (
    <div style={{
      minHeight: '100vh',
      background: phase === 'playing' ? '#1a1a2e' : T.bgGradient,
      fontFamily: T.fontBody,
    }}>
      {/* ═══ 科目选择 ═══ */}
      {phase === 'subject-select' && (
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', color: T.textMedium, fontFamily: T.fontDisplay, fontWeight: 600 }}>
              🌈 选择要学习的科目
            </span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/')}
              style={{ padding: '8px 18px', borderRadius: '16px', border: '2px solid #FFE8D6', backgroundColor: T.cardBg, fontSize: '14px', cursor: 'pointer', color: T.textMedium, fontWeight: 600 }}>
              ← 返回
            </motion.button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: T.textDark, fontFamily: T.fontDisplay }}>
              今天想学什么？
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%', maxWidth: '480px' }}>
              {SUBJECTS.map((subject) => {
                const isCompleted = completedSubjects.has(subject.key);
                const isSelected = selectedSubject === subject.key;
                return (
                  <motion.button key={subject.key}
                    onClick={() => { if (isCompleted) void handleSubjectSelect(subject.key); }}
                    whileTap={isCompleted ? { scale: 0.93 } : undefined}
                    whileHover={isCompleted ? { scale: 1.05 } : undefined}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '24px 12px', borderRadius: '24px',
                      border: isSelected ? `3px solid ${subject.color}` : '3px solid transparent',
                      background: isCompleted ? subject.bg : '#F5F5F5',
                      cursor: isCompleted ? 'pointer' : 'not-allowed',
                      boxShadow: isSelected ? `0 8px 24px ${subject.shadow}` : 'none',
                      opacity: isCompleted ? 1 : 0.45,
                    }}>
                    <span style={{ fontSize: '48px' }}>{subject.emoji}</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: isCompleted ? subject.color : T.textLight, marginTop: '10px', fontFamily: T.fontDisplay }}>
                      {subject.label}
                    </span>
                    {!isCompleted && (
                      <span style={{ fontSize: '11px', color: T.sunOrange, marginTop: '4px', fontWeight: 600 }}>🔒 未评测</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 课程选择器 ═══ */}
      {phase === 'lesson-picker' && (
        <div style={{ padding: '24px', paddingBottom: selectMode ? '100px' : '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', color: T.textMedium, fontFamily: T.fontDisplay, fontWeight: 600 }}>
              📚 选择课程
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {cachedLessons.length > 0 && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={toggleSelectMode}
                  style={{ padding: '8px 18px', borderRadius: '16px', border: selectMode ? `2px solid ${T.sunOrange}` : '2px solid #FFE8D6', backgroundColor: selectMode ? '#FFF3E7' : T.cardBg, fontSize: '14px', cursor: 'pointer', color: selectMode ? T.sunOrange : T.textMedium, fontWeight: 600 }}>
                  {selectMode ? '✕ 取消' : '🔄 管理'}
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleExit}
                style={{ padding: '8px 18px', borderRadius: '16px', border: '2px solid #FFE8D6', backgroundColor: T.cardBg, fontSize: '14px', cursor: 'pointer', color: T.textMedium, fontWeight: 600 }}>
                ← 退出
              </motion.button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px' }}>
              <motion.span style={{ fontSize: '48px' }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>🌟</motion.span>
              <p style={{ fontSize: '18px', color: T.textMedium, fontFamily: T.fontDisplay }}>正在加载课程...</p>
            </div>
          ) : cachedLessons.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: T.textDark, fontFamily: T.fontDisplay }}>📚 今日课程</h2>
                <p style={{ fontSize: '14px', color: T.textMedium }}>选择一节课开始学习 ✨</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', width: '100%', maxWidth: '1080px', justifyItems: 'center' }}>
                {cachedLessons.map((lesson, idx) => {
                  const key = `${lesson.knowledgeNodeId}::${lesson.date}`;
                  return (
                    <LessonCard key={key}
                      title={lesson.classroomTitle}
                      thumbnailUrl={lesson.thumbnailUrl}
                      slide={lesson.firstSlideCanvas}
                      subject={selectedSubject ?? 'english'}
                      isLocked={false}
                      index={idx}
                      onTap={() => handleStartLesson(lesson.knowledgeNodeId, lesson.date)}
                      selectable={selectMode}
                      selected={selectedKeys.has(key)}
                      onToggleSelect={() => toggleSelect(key)}
                    />
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 32px', background: T.cardBg, borderRadius: T.cardRadius, boxShadow: T.cardShadow, maxWidth: '420px', width: '100%', margin: '0 auto' }}>
              <span style={{ fontSize: '56px' }}>{preGeneration.status === 'failed' ? '⚠️' : isSubjectPending ? '🛠️' : '🌱'}</span>
              <p style={{ fontSize: '18px', fontWeight: 700, color: T.textDark, fontFamily: T.fontDisplay, textAlign: 'center' }}>{emptyStateTitle}</p>
              <p style={{ fontSize: '14px', color: T.textLight, textAlign: 'center', lineHeight: 1.6 }}>{emptyStateDescription}</p>
              {(preGeneration.status === 'checking' || preGeneration.status === 'generating') && (
                <div style={{ width: '100%', marginTop: '4px' }}>
                  {/* 整体进度条 */}
                  <div style={{ height: '10px', width: '100%', borderRadius: '999px', background: '#F5E6DC', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(preGeneration.generationProgress, 5)}%` }}
                      transition={{ duration: 0.4 }}
                      style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})` }}
                    />
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '13px', color: T.textDark, textAlign: 'center', fontWeight: 600 }}>
                    整体进度 {preGeneration.generationProgress}%
                  </p>

                  {/* 每堂课的进度明细 */}
                  {preGeneration.taskDetails.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {preGeneration.taskDetails.map((task, idx) => {
                        const statusEmoji = task.status === 'completed' ? '✅'
                          : task.status === 'running' ? '⚙️'
                          : task.status === 'failed' ? '❌'
                          : '⏳';
                        const barColor = task.status === 'completed' ? T.grassGreen
                          : task.status === 'running' ? T.skyBlue
                          : task.status === 'failed' ? '#E74C3C'
                          : '#D5D5D5';
                        return (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', flexShrink: 0 }}>{statusEmoji}</span>
                            <span style={{ fontSize: '12px', color: T.textMedium, minWidth: '60px', flexShrink: 0 }}>
                              课堂 {idx + 1}
                            </span>
                            <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#F0E8E0', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                transition={{ duration: 0.3 }}
                                style={{ height: '100%', borderRadius: '999px', background: barColor }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: T.textLight, minWidth: '32px', textAlign: 'right', flexShrink: 0 }}>
                              {task.progress}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (preGeneration.status === 'failed' || preGeneration.status === 'idle' || preGeneration.status === 'completed') {
                      preGeneration.triggerGeneration();
                    }
                    if (selectedSubject) {
                      void loadLessons(selectedSubject);
                    }
                  }}
                  style={{ padding: '12px 32px', borderRadius: T.btnRadius, border: 'none', background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`, color: T.textWhite, fontSize: '16px', fontWeight: 'bold', fontFamily: T.fontDisplay, cursor: 'pointer' }}>
                  {emptyStateActionLabel}
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleExit}
                  style={{ padding: '12px 32px', borderRadius: '18px', border: '2px solid #FFE8D6', backgroundColor: T.cardBg, fontSize: '16px', cursor: 'pointer', color: T.textMedium }}>
                  返回首页
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══ 选择模式底部操作栏 ═══ */}
      <AnimatePresence>
        {phase === 'lesson-picker' && selectMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px 24px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid #FFE8D6',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={toggleSelectAll}
                style={{
                  padding: '8px 16px', borderRadius: '14px',
                  border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
                  fontSize: '13px', cursor: 'pointer', color: T.textMedium, fontWeight: 600,
                }}>
                {selectedKeys.size === cachedLessons.length ? '取消全选' : '全选'}
              </motion.button>
              <span style={{ fontSize: '13px', color: T.textMedium, fontWeight: 600 }}>
                已选 {selectedKeys.size} / {cachedLessons.length} 节课
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRegenerate}
              disabled={selectedKeys.size === 0 || isRegenerating}
              style={{
                padding: '10px 28px', borderRadius: '18px', border: 'none',
                background: selectedKeys.size === 0
                  ? '#DDD'
                  : `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                color: T.textWhite, fontSize: '15px', fontWeight: 'bold',
                fontFamily: T.fontDisplay, cursor: selectedKeys.size === 0 ? 'not-allowed' : 'pointer',
                opacity: isRegenerating ? 0.7 : 1,
              }}
            >
              {isRegenerating ? '⏳ 提交中...' : `🔄 重新生成 (${selectedKeys.size})`}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 课堂播放（OpenMAIC Stage 组件） ═══ */}
      {phase === 'playing' && (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
          <ClassroomBridge
            onComplete={handleComplete}
            onAnswer={handleAnswer}
            onExit={handleExit}
          />
        </div>
      )}

      {/* ═══ 完成总结 ═══ */}
      {phase === 'complete' && sessionSummary && (
        <div style={{ padding: '24px' }}>
          <AnimatePresence>
            {showCompleteCelebration && (
              <CelebrationAnimation
                visible={showCompleteCelebration}
                level={'complete' as CelebrationLevel}
                message="学习完成！你太棒了！🎉"
                onComplete={() => setShowCompleteCelebration(false)}
                duration={3500}
              />
            )}
          </AnimatePresence>

          {!showCompleteCelebration && (
            <SessionSummary
              summary={sessionSummary}
              subject={sessionSummary.subject}
              onGoHome={() => navigate('/')}
              onViewHistory={() => navigate('/history')}
            />
          )}
        </div>
      )}
    </div>
  );
}
