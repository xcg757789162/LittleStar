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

  // 页面状态
  const [phase, setPhase] = useState<Phase>(locationState?.subject ? 'lesson-picker' : 'subject-select');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(locationState?.subject ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedLessons, setCachedLessons] = useState<CacheListItem[]>([]);
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{ questionsCompleted: number; correctCount: number; accuracy: number; subject: Subject } | null>(null);

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
        syncSettingsToOpenMAIC(currentChild.settings);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetBridge();
    };
  }, [resetBridge]);

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
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', color: T.textMedium, fontFamily: T.fontDisplay, fontWeight: 600 }}>
              📚 选择课程
            </span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleExit}
              style={{ padding: '8px 18px', borderRadius: '16px', border: '2px solid #FFE8D6', backgroundColor: T.cardBg, fontSize: '14px', cursor: 'pointer', color: T.textMedium, fontWeight: 600 }}>
              ← 退出
            </motion.button>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px', width: '100%', maxWidth: '720px', justifyItems: 'center' }}>
                {cachedLessons.map((lesson, idx) => (
                  <LessonCard key={`${lesson.knowledgeNodeId}::${lesson.date}`}
                    title={lesson.classroomTitle}
                    thumbnailUrl={lesson.thumbnailUrl}
                    subject={selectedSubject ?? 'english'}
                    isLocked={false}
                    index={idx}
                    onTap={() => handleStartLesson(lesson.knowledgeNodeId, lesson.date)}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 32px', background: T.cardBg, borderRadius: T.cardRadius, boxShadow: T.cardShadow, maxWidth: '400px', width: '100%', margin: '0 auto' }}>
              <span style={{ fontSize: '56px' }}>🌱</span>
              <p style={{ fontSize: '18px', fontWeight: 700, color: T.textDark, fontFamily: T.fontDisplay, textAlign: 'center' }}>课程准备中...</p>
              <p style={{ fontSize: '14px', color: T.textLight, textAlign: 'center' }}>AI 老师正在为你准备课程，请稍等片刻再试</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => selectedSubject && loadLessons(selectedSubject)}
                  style={{ padding: '12px 32px', borderRadius: T.btnRadius, border: 'none', background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`, color: T.textWhite, fontSize: '16px', fontWeight: 'bold', fontFamily: T.fontDisplay, cursor: 'pointer' }}>
                  🔄 重新加载
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
