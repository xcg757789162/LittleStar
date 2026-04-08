import type { KnowledgeNode, Question } from '@/types/models'

/**
 * TPR (Total Physical Response) 全身反应互动数据包
 * 通过听指令做动作学英语，适合 4-5 岁孩子的运动型学习
 */

/** TPR 指令定义 */
export interface TPRInstruction {
  id: string
  /** 英文指令 */
  command: string
  /** 中文翻译 */
  translation: string
  /** 动作描述 */
  action: string
  /** 对应的 emoji */
  emoji: string
  /** 难度 1-3 */
  difficulty: number
  /** 分类 */
  category: 'body' | 'move' | 'face' | 'object'
}

/** TPR 指令库 */
export const tprInstructions: TPRInstruction[] = [
  // 身体动作
  { id: 'tpr-stand-up', command: 'Stand up!', translation: '站起来！', action: '从座位上站起来', emoji: '🧍', difficulty: 1, category: 'body' },
  { id: 'tpr-sit-down', command: 'Sit down!', translation: '坐下！', action: '坐回座位', emoji: '🪑', difficulty: 1, category: 'body' },
  { id: 'tpr-clap-hands', command: 'Clap your hands!', translation: '拍拍手！', action: '双手拍在一起', emoji: '👏', difficulty: 1, category: 'body' },
  { id: 'tpr-stomp-feet', command: 'Stomp your feet!', translation: '跺跺脚！', action: '用脚使劲跺地板', emoji: '🦶', difficulty: 1, category: 'body' },
  { id: 'tpr-raise-hand', command: 'Raise your hand!', translation: '举手！', action: '把手举高', emoji: '🙋', difficulty: 1, category: 'body' },

  // 运动动作
  { id: 'tpr-jump', command: 'Jump!', translation: '跳！', action: '向上跳一下', emoji: '🦘', difficulty: 1, category: 'move' },
  { id: 'tpr-turn-around', command: 'Turn around!', translation: '转一圈！', action: '原地转一圈', emoji: '🔄', difficulty: 1, category: 'move' },
  { id: 'tpr-walk', command: 'Walk!', translation: '走！', action: '在原地踏步走', emoji: '🚶', difficulty: 1, category: 'move' },
  { id: 'tpr-run', command: 'Run in place!', translation: '原地跑！', action: '在原地快速跑步', emoji: '🏃', difficulty: 2, category: 'move' },
  { id: 'tpr-spin', command: 'Spin around!', translation: '转圈圈！', action: '快速转几圈', emoji: '💫', difficulty: 2, category: 'move' },

  // 面部表情
  { id: 'tpr-smile', command: 'Smile!', translation: '笑一笑！', action: '露出微笑', emoji: '😊', difficulty: 1, category: 'face' },
  { id: 'tpr-open-mouth', command: 'Open your mouth!', translation: '张嘴！', action: '把嘴巴张开', emoji: '😮', difficulty: 1, category: 'face' },
  { id: 'tpr-close-eyes', command: 'Close your eyes!', translation: '闭上眼睛！', action: '闭上双眼', emoji: '😌', difficulty: 1, category: 'face' },
  { id: 'tpr-blink', command: 'Blink your eyes!', translation: '眨眨眼！', action: '快速眨眼', emoji: '😉', difficulty: 2, category: 'face' },
  { id: 'tpr-make-face', command: 'Make a funny face!', translation: '做鬼脸！', action: '做一个搞笑的表情', emoji: '🤪', difficulty: 2, category: 'face' },

  // 指向物体
  { id: 'tpr-touch-head', command: 'Touch your head!', translation: '摸摸头！', action: '用手摸自己的头', emoji: '🤯', difficulty: 1, category: 'object' },
  { id: 'tpr-touch-nose', command: 'Touch your nose!', translation: '摸摸鼻子！', action: '用手指碰鼻子', emoji: '👃', difficulty: 1, category: 'object' },
  { id: 'tpr-touch-ears', command: 'Touch your ears!', translation: '摸摸耳朵！', action: '用手摸自己的耳朵', emoji: '👂', difficulty: 1, category: 'object' },
  { id: 'tpr-point-up', command: 'Point up!', translation: '指向上面！', action: '用手指指向天花板', emoji: '☝️', difficulty: 2, category: 'object' },
  { id: 'tpr-wave', command: 'Wave your hands!', translation: '挥挥手！', action: '举手左右挥动', emoji: '👋', difficulty: 1, category: 'object' },
]

/** TPR 知识点 */
export const tprKnowledgeNodes: KnowledgeNode[] = [
  {
    id: 'english-tpr-body',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'TPR 身体动作指令',
    description: '听懂并做出身体动作指令：Stand up, Sit down, Clap your hands, Stomp your feet',
    prerequisites: [],
    nextNodes: ['english-tpr-move'],
    difficulty: 1,
    contentType: 'voice',
    order: 301,
  },
  {
    id: 'english-tpr-move',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'TPR 运动指令',
    description: '听懂并做出运动指令：Jump, Turn around, Walk, Run',
    prerequisites: ['english-tpr-body'],
    nextNodes: ['english-tpr-face'],
    difficulty: 1,
    contentType: 'voice',
    order: 302,
  },
  {
    id: 'english-tpr-face',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'TPR 表情指令',
    description: '听懂并做出表情指令：Smile, Open your mouth, Close your eyes, Blink',
    prerequisites: ['english-tpr-body'],
    nextNodes: ['english-tpr-touch'],
    difficulty: 1,
    contentType: 'voice',
    order: 303,
  },
  {
    id: 'english-tpr-touch',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'TPR 触摸指令',
    description: '听懂并做出触摸指令：Touch your head, Touch your nose, Point up, Wave',
    prerequisites: ['english-tpr-face'],
    nextNodes: [],
    difficulty: 2,
    contentType: 'voice',
    order: 304,
  },
]

/** TPR 题目 */
export const tprQuestions: Question[] = [
  // ===== 身体动作 =====
  {
    id: 'en-tpr-body-001',
    knowledgeNodeId: 'english-tpr-body',
    type: 'voice',
    content: {
      text: '🧍 听指令做动作！Stand up! 站起来！',
      hint: '快快站起来！然后说 "I can stand up!"',
    },
    answer: 'Stand up',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-body-002',
    knowledgeNodeId: 'english-tpr-body',
    type: 'multiple-choice',
    content: {
      text: '老师说 "Clap your hands!"，你应该做什么？👏',
      options: [
        { id: 'a', text: '跺跺脚', isCorrect: false },
        { id: 'b', text: '拍拍手', isCorrect: true },
        { id: 'c', text: '摇摇头', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-body-003',
    knowledgeNodeId: 'english-tpr-body',
    type: 'multiple-choice',
    content: {
      text: '你想让朋友坐下来，应该说？🪑',
      options: [
        { id: 'a', text: 'Stand up!', isCorrect: false },
        { id: 'b', text: 'Jump!', isCorrect: false },
        { id: 'c', text: 'Sit down!', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== 运动指令 =====
  {
    id: 'en-tpr-move-001',
    knowledgeNodeId: 'english-tpr-move',
    type: 'voice',
    content: {
      text: '🦘 Jump! Jump! Jump! 跳三下！',
      hint: '蹦蹦蹦！说 "I can jump!"',
    },
    answer: 'Jump',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-move-002',
    knowledgeNodeId: 'english-tpr-move',
    type: 'multiple-choice',
    content: {
      text: '"Turn around" 是什么意思？🔄',
      options: [
        { id: 'a', text: '跳起来', isCorrect: false },
        { id: 'b', text: '转一圈', isCorrect: true },
        { id: 'c', text: '坐下来', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-move-003',
    knowledgeNodeId: 'english-tpr-move',
    type: 'multiple-choice',
    content: {
      text: '小兔子🐰最喜欢做什么动作？',
      options: [
        { id: 'a', text: 'Jump! 跳跳跳！', isCorrect: true },
        { id: 'b', text: 'Sit down! 坐下！', isCorrect: false },
        { id: 'c', text: 'Sleep! 睡觉！', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== 表情指令 =====
  {
    id: 'en-tpr-face-001',
    knowledgeNodeId: 'english-tpr-face',
    type: 'voice',
    content: {
      text: '😊 Smile! 笑一笑！给我看看你最灿烂的笑容！',
      hint: '露出大大的笑容！说 "I am happy!"',
    },
    answer: 'Smile',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-face-002',
    knowledgeNodeId: 'english-tpr-face',
    type: 'multiple-choice',
    content: {
      text: '老师说 "Close your eyes!"，你应该做什么？',
      options: [
        { id: 'a', text: '张开嘴巴 😮', isCorrect: false },
        { id: 'b', text: '闭上眼睛 😌', isCorrect: true },
        { id: 'c', text: '做鬼脸 🤪', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-face-003',
    knowledgeNodeId: 'english-tpr-face',
    type: 'multiple-choice',
    content: {
      text: '"Open your mouth" 是什么意思？',
      options: [
        { id: 'a', text: '闭上嘴巴', isCorrect: false },
        { id: 'b', text: '张开嘴巴', isCorrect: true },
        { id: 'c', text: '眨眨眼', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== 触摸指令 =====
  {
    id: 'en-tpr-touch-001',
    knowledgeNodeId: 'english-tpr-touch',
    type: 'voice',
    content: {
      text: '👃 Touch your nose! 摸摸你的鼻子！',
      hint: '用手指碰碰鼻子！说 "This is my nose!"',
    },
    answer: 'Touch your nose',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-touch-002',
    knowledgeNodeId: 'english-tpr-touch',
    type: 'multiple-choice',
    content: {
      text: '老师说 "Touch your head!"，你应该摸哪里？',
      options: [
        { id: 'a', text: '摸头 🤯', isCorrect: true },
        { id: 'b', text: '摸鼻子 👃', isCorrect: false },
        { id: 'c', text: '摸耳朵 👂', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-tpr-touch-003',
    knowledgeNodeId: 'english-tpr-touch',
    type: 'multiple-choice',
    content: {
      text: '用英语说"挥挥手"应该怎么说？👋',
      options: [
        { id: 'a', text: 'Clap your hands!', isCorrect: false },
        { id: 'b', text: 'Touch your head!', isCorrect: false },
        { id: 'c', text: 'Wave your hands!', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 2,
    isAIGenerated: false,
  },
]

/** TPR 动画类型（与 TPRActivity 组件对齐） */
export type TPRAnimationType = 'up' | 'down' | 'jump' | 'clap' | 'turn' | 'touch' | 'wave'

/** TPR 指令命令（供 TPRActivity 组件使用） */
export interface TPRCommand {
  id: string
  command: string
  chineseHint: string
  emoji: string
  animationType: TPRAnimationType
}

/** 分类到动画类型的映射 */
const CATEGORY_ANIMATION: Record<TPRInstruction['category'], TPRAnimationType> = {
  body: 'clap',
  move: 'jump',
  face: 'touch',
  object: 'wave',
}

/** 指令到动画类型的精确映射 */
const COMMAND_ANIMATION: Record<string, TPRAnimationType> = {
  'tpr-stand-up': 'up',
  'tpr-sit-down': 'down',
  'tpr-jump': 'jump',
  'tpr-clap-hands': 'clap',
  'tpr-turn-around': 'turn',
  'tpr-touch-head': 'touch',
  'tpr-touch-nose': 'touch',
  'tpr-touch-ears': 'touch',
  'tpr-wave': 'wave',
  'tpr-point-up': 'up',
  'tpr-spin': 'turn',
}

/** 将 TPRInstruction 转换为 TPRCommand */
function toTPRCommand(instruction: TPRInstruction): TPRCommand {
  return {
    id: instruction.id,
    command: instruction.command,
    chineseHint: instruction.translation,
    emoji: instruction.emoji,
    animationType: COMMAND_ANIMATION[instruction.id] ?? CATEGORY_ANIMATION[instruction.category],
  }
}

/**
 * 获取随机 TPR 指令序列（用于 TPR 活动组件）
 * @param count 指令数量
 * @param category 可选分类过滤
 */
export function getRandomTPRSequence(
  count: number,
  category?: TPRInstruction['category'],
): TPRInstruction[] {
  const pool = category
    ? tprInstructions.filter((i) => i.category === category)
    : tprInstructions

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * 获取单个随机 TPR 指令（供 useLearningFlow 使用）
 */
export function getRandomTPR(): TPRCommand {
  const idx = Math.floor(Math.random() * tprInstructions.length)
  return toTPRCommand(tprInstructions[idx])
}
