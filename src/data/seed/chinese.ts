import type { KnowledgeNode, Question } from '@/types/models'

/** 语文知识点 ID 常量 */
const CHINESE_IDS = {
  INITIALS: 'chinese-initials',
  FINALS: 'chinese-finals',
  PINYIN_READ: 'chinese-pinyin-read',
  COMMON_CHARS_1: 'chinese-common-chars-1',
  COMMON_CHARS_2: 'chinese-common-chars-2',
  NURSERY_RHYMES: 'chinese-nursery-rhymes',
}

/** 语文知识点 */
export const chineseKnowledgeNodes: KnowledgeNode[] = [
  {
    id: CHINESE_IDS.INITIALS,
    subject: 'chinese',
    gradeLevel: 'middle-kindergarten',
    name: '声母认读',
    description: '认识拼音声母 b p m f d t n l',
    prerequisites: [],
    nextNodes: [CHINESE_IDS.FINALS],
    difficulty: 1,
    contentType: 'voice',
    order: 1,
  },
  {
    id: CHINESE_IDS.FINALS,
    subject: 'chinese',
    gradeLevel: 'middle-kindergarten',
    name: '韵母认读',
    description: '认识拼音韵母 a o e i u ü',
    prerequisites: [CHINESE_IDS.INITIALS],
    nextNodes: [CHINESE_IDS.PINYIN_READ],
    difficulty: 2,
    contentType: 'voice',
    order: 2,
  },
  {
    id: CHINESE_IDS.PINYIN_READ,
    subject: 'chinese',
    gradeLevel: 'senior-kindergarten',
    name: '拼读练习',
    description: '声母+韵母拼读，如 ba ma',
    prerequisites: [CHINESE_IDS.FINALS],
    nextNodes: [CHINESE_IDS.COMMON_CHARS_1],
    difficulty: 3,
    contentType: 'voice',
    order: 3,
  },
  {
    id: CHINESE_IDS.COMMON_CHARS_1,
    subject: 'chinese',
    gradeLevel: 'senior-kindergarten',
    name: '常见汉字（一）',
    description: '认读常见汉字：大、小、上、下、人、口、手',
    prerequisites: [CHINESE_IDS.PINYIN_READ],
    nextNodes: [CHINESE_IDS.COMMON_CHARS_2],
    difficulty: 3,
    contentType: 'flashcard',
    order: 4,
  },
  {
    id: CHINESE_IDS.COMMON_CHARS_2,
    subject: 'chinese',
    gradeLevel: 'senior-kindergarten',
    name: '常见汉字（二）',
    description: '认读常见汉字：日、月、水、火、山、石、田',
    prerequisites: [CHINESE_IDS.COMMON_CHARS_1],
    nextNodes: [CHINESE_IDS.NURSERY_RHYMES],
    difficulty: 4,
    contentType: 'flashcard',
    order: 5,
  },
  {
    id: CHINESE_IDS.NURSERY_RHYMES,
    subject: 'chinese',
    gradeLevel: 'senior-kindergarten',
    name: '儿歌欣赏',
    description: '听儿歌、念儿歌，培养语感',
    prerequisites: [CHINESE_IDS.COMMON_CHARS_2],
    nextNodes: [],
    difficulty: 2,
    contentType: 'voice',
    order: 6,
  },
]

/** 语文题目 */
export const chineseQuestions: Question[] = [
  // 声母认读
  {
    id: 'cn-q-001',
    knowledgeNodeId: CHINESE_IDS.INITIALS,
    type: 'flashcard',
    content: { text: '声母 b', hint: '像收音机的 b' },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-002',
    knowledgeNodeId: CHINESE_IDS.INITIALS,
    type: 'multiple-choice',
    content: {
      text: '🎵 听一听，这是哪个声母？（播放 "m" 的发音）',
      options: [
        { id: 'a', text: 'b', isCorrect: false },
        { id: 'b', text: 'm', isCorrect: true },
        { id: 'c', text: 'f', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-003',
    knowledgeNodeId: CHINESE_IDS.INITIALS,
    type: 'multiple-choice',
    content: {
      text: '"爸爸"的"爸"的声母是？',
      options: [
        { id: 'a', text: 'b', isCorrect: true },
        { id: 'b', text: 'p', isCorrect: false },
        { id: 'c', text: 'd', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },
  // 韵母认读
  {
    id: 'cn-q-004',
    knowledgeNodeId: CHINESE_IDS.FINALS,
    type: 'flashcard',
    content: { text: '韵母 a', hint: '张大嘴巴 aaa' },
    answer: 'a',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-005',
    knowledgeNodeId: CHINESE_IDS.FINALS,
    type: 'multiple-choice',
    content: {
      text: '圆圆嘴巴是哪个韵母？',
      options: [
        { id: 'a', text: 'a', isCorrect: false },
        { id: 'b', text: 'o', isCorrect: true },
        { id: 'c', text: 'e', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
  // 拼读练习
  {
    id: 'cn-q-006',
    knowledgeNodeId: CHINESE_IDS.PINYIN_READ,
    type: 'multiple-choice',
    content: {
      text: 'b + a = ?',
      options: [
        { id: 'a', text: 'ba', isCorrect: true },
        { id: 'b', text: 'pa', isCorrect: false },
        { id: 'c', text: 'da', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 3,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-007',
    knowledgeNodeId: CHINESE_IDS.PINYIN_READ,
    type: 'multiple-choice',
    content: {
      text: '"妈妈"用拼音怎么写？',
      options: [
        { id: 'a', text: 'bà ba', isCorrect: false },
        { id: 'b', text: 'mā ma', isCorrect: true },
        { id: 'c', text: 'nǎ nai', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 3,
    isAIGenerated: false,
  },
  // 常见汉字（一）
  {
    id: 'cn-q-008',
    knowledgeNodeId: CHINESE_IDS.COMMON_CHARS_1,
    type: 'flashcard',
    content: { text: '大', hint: '张开双臂，表示大' },
    answer: '大',
    difficulty: 3,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-009',
    knowledgeNodeId: CHINESE_IDS.COMMON_CHARS_1,
    type: 'multiple-choice',
    content: {
      text: '🏔️ 这个图片用哪个字表示？',
      options: [
        { id: 'a', text: '大', isCorrect: false },
        { id: 'b', text: '上', isCorrect: true },
        { id: 'c', text: '下', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 3,
    isAIGenerated: false,
  },
  // 常见汉字（二）
  {
    id: 'cn-q-010',
    knowledgeNodeId: CHINESE_IDS.COMMON_CHARS_2,
    type: 'flashcard',
    content: { text: '日', hint: '太阳 ☀️' },
    answer: '日',
    difficulty: 4,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-011',
    knowledgeNodeId: CHINESE_IDS.COMMON_CHARS_2,
    type: 'multiple-choice',
    content: {
      text: '🌙 这是哪个字？',
      options: [
        { id: 'a', text: '日', isCorrect: false },
        { id: 'b', text: '月', isCorrect: true },
        { id: 'c', text: '星', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 4,
    isAIGenerated: false,
  },
  // 儿歌
  {
    id: 'cn-q-012',
    knowledgeNodeId: CHINESE_IDS.NURSERY_RHYMES,
    type: 'voice',
    content: { text: '🎵 跟我念：小星星，亮晶晶，好像天上许多小眼睛', hint: '小星星儿歌' },
    answer: '小星星亮晶晶',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'cn-q-013',
    knowledgeNodeId: CHINESE_IDS.NURSERY_RHYMES,
    type: 'voice',
    content: { text: '🎵 跟我念：两只老虎，两只老虎，跑得快', hint: '两只老虎儿歌' },
    answer: '两只老虎',
    difficulty: 2,
    isAIGenerated: false,
  },
]
