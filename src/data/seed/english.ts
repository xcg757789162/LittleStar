import type { KnowledgeNode, Question } from '@/types/models'

/** 英语知识点 ID 常量 */
const ENGLISH_IDS = {
  LETTERS_AZ: 'english-letters-az',
  ANIMALS: 'english-animals',
  COLORS: 'english-colors',
  FRUITS: 'english-fruits',
  NUMBERS: 'english-numbers',
}

/** 英语知识点 */
export const englishKnowledgeNodes: KnowledgeNode[] = [
  {
    id: ENGLISH_IDS.LETTERS_AZ,
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '26个字母认知',
    description: '认识26个英文字母大小写',
    prerequisites: [],
    nextNodes: [ENGLISH_IDS.ANIMALS, ENGLISH_IDS.COLORS],
    difficulty: 1,
    contentType: 'flashcard',
    order: 1,
  },
  {
    id: ENGLISH_IDS.ANIMALS,
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '动物单词',
    description: '学习常见动物的英文名：cat, dog, fish, bird, rabbit',
    prerequisites: [ENGLISH_IDS.LETTERS_AZ],
    nextNodes: [ENGLISH_IDS.FRUITS],
    difficulty: 2,
    contentType: 'flashcard',
    order: 2,
  },
  {
    id: ENGLISH_IDS.COLORS,
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '颜色单词',
    description: '学习颜色的英文名：red, blue, green, yellow, pink',
    prerequisites: [ENGLISH_IDS.LETTERS_AZ],
    nextNodes: [ENGLISH_IDS.FRUITS],
    difficulty: 2,
    contentType: 'flashcard',
    order: 3,
  },
  {
    id: ENGLISH_IDS.FRUITS,
    subject: 'english',
    gradeLevel: 'senior-kindergarten',
    name: '水果单词',
    description: '学习水果的英文名：apple, banana, orange, grape, watermelon',
    prerequisites: [ENGLISH_IDS.ANIMALS, ENGLISH_IDS.COLORS],
    nextNodes: [ENGLISH_IDS.NUMBERS],
    difficulty: 3,
    contentType: 'flashcard',
    order: 4,
  },
  {
    id: ENGLISH_IDS.NUMBERS,
    subject: 'english',
    gradeLevel: 'senior-kindergarten',
    name: '数字单词',
    description: '学习数字的英文名：one, two, three ... ten',
    prerequisites: [ENGLISH_IDS.FRUITS],
    nextNodes: [],
    difficulty: 3,
    contentType: 'flashcard',
    order: 5,
  },
]

/** 英语题目 */
export const englishQuestions: Question[] = [
  // 26个字母
  {
    id: 'en-q-001',
    knowledgeNodeId: ENGLISH_IDS.LETTERS_AZ,
    type: 'flashcard',
    content: { text: 'A a', hint: 'Apple starts with A 🍎' },
    answer: 'A',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-q-002',
    knowledgeNodeId: ENGLISH_IDS.LETTERS_AZ,
    type: 'multiple-choice',
    content: {
      text: 'Which letter is this? 🅱️',
      options: [
        { id: 'a', text: 'A', isCorrect: false },
        { id: 'b', text: 'B', isCorrect: true },
        { id: 'c', text: 'D', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-q-003',
    knowledgeNodeId: ENGLISH_IDS.LETTERS_AZ,
    type: 'multiple-choice',
    content: {
      text: 'What comes after C?',
      options: [
        { id: 'a', text: 'B', isCorrect: false },
        { id: 'b', text: 'D', isCorrect: true },
        { id: 'c', text: 'E', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  // 动物单词
  {
    id: 'en-q-004',
    knowledgeNodeId: ENGLISH_IDS.ANIMALS,
    type: 'flashcard',
    content: { text: '🐱 Cat', hint: '猫咪 — Cat' },
    answer: 'cat',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-q-005',
    knowledgeNodeId: ENGLISH_IDS.ANIMALS,
    type: 'multiple-choice',
    content: {
      text: '🐶 This is a ...?',
      options: [
        { id: 'a', text: 'Cat', isCorrect: false },
        { id: 'b', text: 'Dog', isCorrect: true },
        { id: 'c', text: 'Fish', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-q-006',
    knowledgeNodeId: ENGLISH_IDS.ANIMALS,
    type: 'multiple-choice',
    content: {
      text: '🐰 What animal is this?',
      options: [
        { id: 'a', text: 'Bird', isCorrect: false },
        { id: 'b', text: 'Fish', isCorrect: false },
        { id: 'c', text: 'Rabbit', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 2,
    isAIGenerated: false,
  },
  // 颜色单词
  {
    id: 'en-q-007',
    knowledgeNodeId: ENGLISH_IDS.COLORS,
    type: 'flashcard',
    content: { text: '🔴 Red', hint: '红色 — Red' },
    answer: 'red',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-q-008',
    knowledgeNodeId: ENGLISH_IDS.COLORS,
    type: 'multiple-choice',
    content: {
      text: '🔵 What color is this?',
      options: [
        { id: 'a', text: 'Red', isCorrect: false },
        { id: 'b', text: 'Blue', isCorrect: true },
        { id: 'c', text: 'Green', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-q-009',
    knowledgeNodeId: ENGLISH_IDS.COLORS,
    type: 'multiple-choice',
    content: {
      text: '🌿 Grass is ...?',
      options: [
        { id: 'a', text: 'Yellow', isCorrect: false },
        { id: 'b', text: 'Blue', isCorrect: false },
        { id: 'c', text: 'Green', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 2,
    isAIGenerated: false,
  },
  // 水果单词
  {
    id: 'en-q-010',
    knowledgeNodeId: ENGLISH_IDS.FRUITS,
    type: 'flashcard',
    content: { text: '🍎 Apple', hint: '苹果 — Apple' },
    answer: 'apple',
    difficulty: 3,
    isAIGenerated: false,
  },
  {
    id: 'en-q-011',
    knowledgeNodeId: ENGLISH_IDS.FRUITS,
    type: 'multiple-choice',
    content: {
      text: '🍌 What fruit is this?',
      options: [
        { id: 'a', text: 'Apple', isCorrect: false },
        { id: 'b', text: 'Banana', isCorrect: true },
        { id: 'c', text: 'Orange', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 3,
    isAIGenerated: false,
  },
  // 数字单词
  {
    id: 'en-q-012',
    knowledgeNodeId: ENGLISH_IDS.NUMBERS,
    type: 'flashcard',
    content: { text: '1 — One', hint: '一 — One' },
    answer: 'one',
    difficulty: 3,
    isAIGenerated: false,
  },
  {
    id: 'en-q-013',
    knowledgeNodeId: ENGLISH_IDS.NUMBERS,
    type: 'multiple-choice',
    content: {
      text: 'How do you say "三" in English?',
      options: [
        { id: 'a', text: 'Two', isCorrect: false },
        { id: 'b', text: 'Three', isCorrect: true },
        { id: 'c', text: 'Four', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 3,
    isAIGenerated: false,
  },
]
