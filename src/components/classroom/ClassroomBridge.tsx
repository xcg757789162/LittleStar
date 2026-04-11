/**
 * ClassroomBridge — 桥接 LittleStar 预生成缓存和 OpenMAIC 原生 Stage 组件
 *
 * 职责:
 * 1. 从 useClassroomBridgeStore 获取已加载的课堂数据
 * 2. 渲染 OpenMAIC 的 Stage 组件
 * 3. 监听课堂事件（答题、完成等）
 * 4. 向上层页面报告课堂状态
 */

import { useEffect, useCallback } from 'react';
import { Stage } from '@/components/openmaic/stage';
import { useClassroomBridgeStore } from '@/stores/openmaic/classroom-bridge';
import { useStageStore } from '@/lib/openmaic/store/stage';
import { motion } from 'motion/react';

interface ClassroomBridgeProps {
  /** 课堂完成回调 */
  onComplete?: () => void;
  /** 答题回调 */
  onAnswer?: (isCorrect: boolean) => void;
  /** 退出课堂回调 */
  onExit?: () => void;
}

export function ClassroomBridge({ onComplete, onAnswer: _onAnswer, onExit }: ClassroomBridgeProps) {
  const status = useClassroomBridgeStore((s) => s.status);
  const error = useClassroomBridgeStore((s) => s.error);
  const completeClassroom = useClassroomBridgeStore((s) => s.completeClassroom);

  // 监听 Stage 播放完成
  const scenes = useStageStore((s) => s.scenes);
  const currentSceneId = useStageStore((s) => s.currentSceneId);

  const handleComplete = useCallback(() => {
    completeClassroom();
    onComplete?.();
  }, [completeClassroom, onComplete]);

  // 如果播放到最后一个场景并完成，触发课堂完成
  useEffect(() => {
    if (scenes.length > 0 && currentSceneId) {
      // 这里只做状态监控，实际完成由用户操作触发
      // 可扩展：scenes.findIndex((s) => s.id === currentSceneId) 获取当前场景索引
    }
  }, [scenes, currentSceneId]);

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
    <div className="openmaic-classroom h-full w-full relative">
      {/* OpenMAIC 原生 Stage 组件 */}
      <Stage />

      {/* 完成课堂按钮 */}
      <div className="absolute bottom-4 right-4 z-50">
        <button
          onClick={handleComplete}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-white hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
        >
          ✅ 完成课堂
        </button>
      </div>
    </div>
  );
}
