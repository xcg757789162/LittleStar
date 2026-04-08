import type { KnowledgeNode, Question } from '@/types/models'

/**
 * 英语儿歌数据包
 * 5 首经典英文儿歌，每首 3 道题（1 跟唱 + 2 选择题）
 */

/** 儿歌知识点 */
export const songKnowledgeNodes: KnowledgeNode[] = [
  {
    id: 'english-song-abc',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'ABC Song 字母歌',
    description: '学唱经典字母歌 ABC Song，通过旋律记住 26 个字母的顺序',
    prerequisites: [],
    nextNodes: ['english-song-twinkle'],
    difficulty: 1,
    contentType: 'voice',
    order: 101,
  },
  {
    id: 'english-song-twinkle',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'Twinkle Twinkle Little Star 一闪一闪小星星',
    description: '学唱 Twinkle Twinkle Little Star，感受英语的韵律和节奏',
    prerequisites: [],
    nextNodes: ['english-song-old-macdonald'],
    difficulty: 1,
    contentType: 'voice',
    order: 102,
  },
  {
    id: 'english-song-old-macdonald',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'Old MacDonald Had a Farm 老麦克唐纳有个农场',
    description: '学唱 Old MacDonald Had a Farm，认识各种农场动物的英文叫声',
    prerequisites: [],
    nextNodes: ['english-song-head-shoulders'],
    difficulty: 1,
    contentType: 'voice',
    order: 103,
  },
  {
    id: 'english-song-head-shoulders',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'Head, Shoulders, Knees and Toes 头肩膝脚趾',
    description: '学唱 TPR 儿歌 Head, Shoulders, Knees and Toes，边唱边指身体部位',
    prerequisites: [],
    nextNodes: ['english-song-happy'],
    difficulty: 1,
    contentType: 'voice',
    order: 104,
  },
  {
    id: 'english-song-happy',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: 'If You\'re Happy and You Know It 如果感到快乐你就拍拍手',
    description: '学唱互动儿歌 If You\'re Happy and You Know It，通过动作表达情感',
    prerequisites: [],
    nextNodes: [],
    difficulty: 1,
    contentType: 'voice',
    order: 105,
  },
]

/** 儿歌题目 */
export const songQuestions: Question[] = [
  // ===== ABC Song =====
  {
    id: 'en-song-abc-001',
    knowledgeNodeId: 'english-song-abc',
    type: 'voice',
    content: {
      text: '🎵 跟我一起唱 ABC Song！',
      hint: '🎶 A B C D E F G, H I J K L M N O P, Q R S T U V, W X Y and Z. Now I know my ABCs, next time won\'t you sing with me?',
    },
    answer: 'ABC Song',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-abc-002',
    knowledgeNodeId: 'english-song-abc',
    type: 'multiple-choice',
    content: {
      text: '在 ABC Song 里，A B C 后面唱的是哪个字母？',
      options: [
        { id: 'a', text: 'E', isCorrect: false },
        { id: 'b', text: 'D', isCorrect: true },
        { id: 'c', text: 'F', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-abc-003',
    knowledgeNodeId: 'english-song-abc',
    type: 'multiple-choice',
    content: {
      text: 'ABC Song 一共唱了多少个字母？',
      options: [
        { id: 'a', text: '24 个', isCorrect: false },
        { id: 'b', text: '26 个', isCorrect: true },
        { id: 'c', text: '28 个', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== Twinkle Twinkle Little Star =====
  {
    id: 'en-song-twinkle-001',
    knowledgeNodeId: 'english-song-twinkle',
    type: 'voice',
    content: {
      text: '🌟 跟我一起唱 Twinkle Twinkle Little Star！',
      hint: '🎶 Twinkle, twinkle, little star, how I wonder what you are! Up above the world so high, like a diamond in the sky. Twinkle, twinkle, little star, how I wonder what you are!',
    },
    answer: 'Twinkle Twinkle Little Star',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-twinkle-002',
    knowledgeNodeId: 'english-song-twinkle',
    type: 'multiple-choice',
    content: {
      text: '歌里的小星星像什么一样闪闪发光？🌟',
      options: [
        { id: 'a', text: 'a diamond 钻石', isCorrect: true },
        { id: 'b', text: 'a flower 花朵', isCorrect: false },
        { id: 'c', text: 'a ball 球', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-twinkle-003',
    knowledgeNodeId: 'english-song-twinkle',
    type: 'multiple-choice',
    content: {
      text: '"Twinkle" 是什么意思？✨',
      options: [
        { id: 'a', text: '跳舞', isCorrect: false },
        { id: 'b', text: '闪烁', isCorrect: true },
        { id: 'c', text: '飞翔', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== Old MacDonald Had a Farm =====
  {
    id: 'en-song-macdonald-001',
    knowledgeNodeId: 'english-song-old-macdonald',
    type: 'voice',
    content: {
      text: '🐄 跟我一起唱 Old MacDonald Had a Farm！',
      hint: '🎶 Old MacDonald had a farm, E-I-E-I-O! And on his farm he had a cow, E-I-E-I-O! With a moo moo here, and a moo moo there, here a moo, there a moo, everywhere a moo moo! Old MacDonald had a farm, E-I-E-I-O!',
    },
    answer: 'Old MacDonald Had a Farm',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-macdonald-002',
    knowledgeNodeId: 'english-song-old-macdonald',
    type: 'multiple-choice',
    content: {
      text: 'Old MacDonald 的农场上有什么动物会 "moo moo" 叫？🐄',
      options: [
        { id: 'a', text: 'pig 猪', isCorrect: false },
        { id: 'b', text: 'cow 牛', isCorrect: true },
        { id: 'c', text: 'duck 鸭', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-macdonald-003',
    knowledgeNodeId: 'english-song-old-macdonald',
    type: 'multiple-choice',
    content: {
      text: '小鸭子 duck 怎么叫？🦆',
      options: [
        { id: 'a', text: 'moo moo', isCorrect: false },
        { id: 'b', text: 'oink oink', isCorrect: false },
        { id: 'c', text: 'quack quack', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== Head, Shoulders, Knees and Toes =====
  {
    id: 'en-song-head-001',
    knowledgeNodeId: 'english-song-head-shoulders',
    type: 'voice',
    content: {
      text: '🙋 跟我一起唱 Head, Shoulders, Knees and Toes！',
      hint: '🎶 Head, shoulders, knees and toes, knees and toes! Head, shoulders, knees and toes, knees and toes! And eyes and ears and mouth and nose. Head, shoulders, knees and toes, knees and toes!',
    },
    answer: 'Head Shoulders Knees and Toes',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-head-002',
    knowledgeNodeId: 'english-song-head-shoulders',
    type: 'multiple-choice',
    content: {
      text: '"Shoulders" 是什么意思？指一指你的 shoulders！',
      options: [
        { id: 'a', text: '头 head', isCorrect: false },
        { id: 'b', text: '肩膀 shoulders', isCorrect: true },
        { id: 'c', text: '脚趾 toes', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-head-003',
    knowledgeNodeId: 'english-song-head-shoulders',
    type: 'multiple-choice',
    content: {
      text: '歌里面 "knees" 后面唱的是什么？🦵',
      options: [
        { id: 'a', text: 'and toes', isCorrect: true },
        { id: 'b', text: 'and nose', isCorrect: false },
        { id: 'c', text: 'and ears', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== If You're Happy and You Know It =====
  {
    id: 'en-song-happy-001',
    knowledgeNodeId: 'english-song-happy',
    type: 'voice',
    content: {
      text: '😊 跟我一起唱 If You\'re Happy and You Know It！',
      hint: '🎶 If you\'re happy and you know it, clap your hands! 👏👏 If you\'re happy and you know it, clap your hands! 👏👏 If you\'re happy and you know it, then your face will surely show it. If you\'re happy and you know it, clap your hands! 👏👏',
    },
    answer: 'If You Are Happy',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-happy-002',
    knowledgeNodeId: 'english-song-happy',
    type: 'multiple-choice',
    content: {
      text: '如果你感到高兴（happy），歌里说要做什么？😊',
      options: [
        { id: 'a', text: 'clap your hands 拍拍手', isCorrect: true },
        { id: 'b', text: 'close your eyes 闭上眼', isCorrect: false },
        { id: 'c', text: 'touch your nose 摸鼻子', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-song-happy-003',
    knowledgeNodeId: 'english-song-happy',
    type: 'multiple-choice',
    content: {
      text: '"Happy" 是什么意思？',
      options: [
        { id: 'a', text: '伤心的', isCorrect: false },
        { id: 'b', text: '高兴的', isCorrect: true },
        { id: 'c', text: '困的', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
]
