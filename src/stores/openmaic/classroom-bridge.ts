/**
 * Classroom Bridge Store (v2)
 *
 * 桥接 LittleStar 预生成数据 (Classroom JSON) 和 OpenMAIC 原生 Stage 组件。
 *
 * v2 变更：
 * - Pipeline Client 现在直接保存 OpenMAIC 原始 Scene/Action 数据
 * - Classroom.stage 包含预构建的 Stage 元数据
 * - Scene.content 直接就是 SceneContent（SlideContent | QuizContent 等）
 * - 不再需要从 slides[] 反向构造 content
 *
 * 数据流:
 *   LittleStar ClassroomCache → ClassroomBridge → useStageStore → Stage 组件
 */

import { create } from 'zustand';
import type { Stage, Scene } from '@/types/openmaic/stage';
import type { Classroom } from '@/services/openmaic/types';
import { isNativeScene } from '@/services/openmaic/types';
import { useStageStore } from '@/lib/openmaic/store/stage';
import { createLogger } from '@/lib/openmaic/logger';

const log = createLogger('ClassroomBridge');

type BridgeStatus =
  | 'idle'        // 未加载
  | 'loading'     // 正在转换数据
  | 'ready'       // Stage 已注入，可以播放
  | 'playing'     // 正在播放
  | 'completed'   // 播放完成
  | 'error';      // 加载/转换出错

interface ClassroomBridgeState {
  // ── 状态 ──
  status: BridgeStatus;
  error: string | null;

  // ── 原始数据 ──
  classroom: Classroom | null;
  knowledgeNodeId: string | null;

  // ── 课堂统计 ──
  answerCount: number;
  correctCount: number;

  // ── Actions ──
  /**
   * 加载 LittleStar Classroom JSON 并注入 Stage Store
   * @param classroom LittleStar 缓存的课堂数据
   * @param knowledgeNodeId 关联的知识点 ID
   */
  loadClassroom: (classroom: Classroom, knowledgeNodeId?: string) => void;

  /**
   * 记录一次答题
   */
  recordAnswer: (isCorrect: boolean) => void;

  /**
   * 标记课堂播放完成
   */
  completeClassroom: () => void;

  /**
   * 清理状态（退出课堂时调用）
   */
  reset: () => void;
}

export const useClassroomBridgeStore = create<ClassroomBridgeState>()((set) => ({
  status: 'idle',
  error: null,
  classroom: null,
  knowledgeNodeId: null,
  answerCount: 0,
  correctCount: 0,

  loadClassroom: (classroom, knowledgeNodeId) => {
    log.info('加载课堂:', classroom.id, 'title:', classroom.title, 'nodeId:', knowledgeNodeId);
    set({ status: 'loading', error: null, classroom, knowledgeNodeId });

    try {
      // 1. 构建 Stage 元数据
      // v2: 优先使用 Classroom.stage（Pipeline 预构建），否则从 Classroom 字段构造
      const stage: Stage = classroom.stage ?? {
        id: `ls-${classroom.id || Date.now()}`,
        name: classroom.title || '课堂',
        description: classroom.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: classroom.language || 'zh-CN',
      };

      // 2. 将 Classroom.scenes 转换为 OpenMAIC Scene[]
      const scenes: Scene[] = (classroom.scenes || []).map((rawScene, index) => {
        if (isNativeScene(rawScene)) {
          // v2 原生格式：直接映射，OpenMAIC Scene 字段完全可用
          return {
            id: rawScene.id || `scene-${index}`,
            stageId: rawScene.stageId || stage.id,
            type: mapSceneType(rawScene.type),
            title: rawScene.title || `场景 ${index + 1}`,
            order: rawScene.order ?? index,
            content: rawScene.content!,
            actions: rawScene.actions || [],
            whiteboards: rawScene.whiteboards,
            multiAgent: rawScene.multiAgent,
            createdAt: rawScene.createdAt || Date.now(),
            updatedAt: rawScene.updatedAt || Date.now(),
          };
        } else {
          // v1 旧格式兼容：从 slides[] 构建基本的 SlideContent
          // 旧缓存中 scene.slides 是简化的 Slide[]，构建一个空 canvas fallback
          return {
            id: rawScene.id || `scene-${index}`,
            stageId: stage.id,
            type: mapSceneType(rawScene.type),
            title: rawScene.title || `场景 ${index + 1}`,
            order: rawScene.order ?? index,
            content: { type: 'slide' as const, canvas: {} as never },
            actions: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      });

      // 3. 注入到 Stage Store
      const stageStore = useStageStore.getState();
      stageStore.clearStore();
      stageStore.setStage(stage);
      stageStore.setScenes(scenes);
      stageStore.setMode('playback');

      // 自动选中第一个场景
      if (scenes.length > 0) {
        stageStore.setCurrentSceneId(scenes[0].id);
      }

      set({ status: 'ready', answerCount: 0, correctCount: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ClassroomBridge] Failed to load classroom:', message);
      set({ status: 'error', error: message });
    }
  },

  recordAnswer: (isCorrect) => {
    set((s) => ({
      answerCount: s.answerCount + 1,
      correctCount: s.correctCount + (isCorrect ? 1 : 0),
    }));
  },

  completeClassroom: () => {
    set({ status: 'completed' });
  },

  reset: () => {
    // 清理 Stage Store
    try {
      useStageStore.getState().clearStore();
    } catch {
      // 忽略清理错误
    }
    set({
      status: 'idle',
      error: null,
      classroom: null,
      knowledgeNodeId: null,
      answerCount: 0,
      correctCount: 0,
    });
  },
}));

/**
 * 映射 LittleStar 场景类型到 OpenMAIC 场景类型
 */
function mapSceneType(type?: string): Scene['type'] {
  switch (type) {
    case 'slide':
    case 'teaching':
    case 'content':
      return 'slide';
    case 'quiz':
      return 'quiz';
    case 'interactive':
      return 'interactive';
    case 'pbl':
      return 'pbl';
    default:
      return 'slide';
  }
}
