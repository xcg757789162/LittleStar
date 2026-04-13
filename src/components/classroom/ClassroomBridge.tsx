/**
 * ClassroomBridge — 桥接 LittleStar 预生成缓存和 OpenMAIC 原生 Stage 组件
 *
 * 职责:
 * 1. 从 useClassroomBridgeStore 获取已加载的课堂数据
 * 2. 渲染 OpenMAIC 的 Stage 组件
 * 3. 监听课堂事件（答题、完成等）
 * 4. 向上层页面报告课堂状态
 */

import { useEffect, useCallback, useRef } from 'react';
import { Stage } from '@/components/openmaic/stage';
import { useClassroomBridgeStore } from '@/stores/openmaic/classroom-bridge';
import { useStageStore } from '@/lib/openmaic/store/stage';
import { ThemeProvider } from '@/lib/openmaic/hooks/use-theme';
import { motion } from 'motion/react';

const AUTO_COMPLETE_DELAY_MS = 5000;

interface ClassroomBridgeProps {
  /** 课堂完成回调 */
  onComplete?: () => void;
  /** 答题回调 */
  onAnswer?: (isCorrect: boolean) => void;
  /** 退出课堂回调 */
  onExit?: () => void;
}

export function ClassroomBridge({ onComplete, onAnswer, onExit }: ClassroomBridgeProps) {
  const status = useClassroomBridgeStore((s) => s.status);
  const error = useClassroomBridgeStore((s) => s.error);
  const completeClassroom = useClassroomBridgeStore((s) => s.completeClassroom);

  const scenes = useStageStore((s) => s.scenes);
  const currentSceneId = useStageStore((s) => s.currentSceneId);

  const completedQuizScenesRef = useRef<Set<string>>(new Set());
  const autoCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoCompletedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (hasAutoCompletedRef.current) return;
    hasAutoCompletedRef.current = true;
    if (autoCompleteTimerRef.current) {
      clearTimeout(autoCompleteTimerRef.current);
      autoCompleteTimerRef.current = null;
    }
    completeClassroom();
    onComplete?.();
  }, [completeClassroom, onComplete]);

  const scheduleAutoComplete = useCallback(() => {
    if (hasAutoCompletedRef.current) return;

    const { scenes: allScenes, currentSceneId: curId } = useStageStore.getState();
    if (allScenes.length === 0 || !curId) return;

    const lastScene = allScenes[allScenes.length - 1];
    if (curId !== lastScene.id) {
      if (autoCompleteTimerRef.current) {
        clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTimerRef.current = null;
      }
      return;
    }

    const quizScenes = allScenes.filter((s) => s.type === 'quiz');
    const allQuizzesDone =
      quizScenes.length === 0 ||
      quizScenes.every((s) => completedQuizScenesRef.current.has(s.id));

    if (!allQuizzesDone) return;

    if (!autoCompleteTimerRef.current) {
      autoCompleteTimerRef.current = setTimeout(handleComplete, AUTO_COMPLETE_DELAY_MS);
    }
  }, [handleComplete]);

  // Relay quiz answers to learningStore AND track completed quiz scenes for auto-complete
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        sceneId: string;
        results: { questionId: string; isCorrect: boolean }[];
      };
      if (detail?.results && onAnswer) {
        for (const result of detail.results) {
          onAnswer(result.isCorrect);
        }
        console.log('[ClassroomBridge] Relayed', detail.results.length, 'quiz answers to learningStore');
      }
      if (detail?.sceneId) {
        completedQuizScenesRef.current.add(detail.sceneId);
      }
      scheduleAutoComplete();
    };

    window.addEventListener('quiz-answer-results', handler);
    return () => window.removeEventListener('quiz-answer-results', handler);
  }, [onAnswer, scheduleAutoComplete]);

  // Re-evaluate auto-complete whenever the current scene changes
  useEffect(() => {
    scheduleAutoComplete();
  }, [currentSceneId, scenes, scheduleAutoComplete]);

  useEffect(() => {
    return () => {
      if (autoCompleteTimerRef.current) clearTimeout(autoCompleteTimerRef.current);
    };
  }, []);

  if (status === 'error') {
    return (
      <div className="openmaic-classroom flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-6xl">😢</div>
        <h2 className="text-xl font-bold text-gray-700">课堂加载失败</h2>
        <p className="text-gray-500 text-center max-w-md">{error || '未知错误'}</p>
        <button
          onClick={onExit}
          className="px-6 py-2 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="openmaic-classroom flex flex-col items-center justify-center h-full gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          ⭐
        </motion.div>
        <p className="text-gray-500 font-medium">正在准备课堂...</p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="openmaic-classroom flex flex-col items-center justify-center h-full gap-4 p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-7xl"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-700">课堂完成！</h2>
        <p className="text-gray-500">太棒了，你完成了今天的学习！</p>
        <button
          onClick={onExit}
          className="px-8 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-full font-bold text-lg hover:shadow-lg transition-all"
        >
          返回首页
        </button>
      </div>
    );
  }

  // status === 'ready' || status === 'playing'
  return (
    <div className="openmaic-classroom relative flex h-full w-full min-h-0 overflow-hidden">
      <ThemeProvider>
        <div className="flex-1 min-h-0 w-full">
          <Stage />
        </div>
      </ThemeProvider>
    </div>
  );
}
