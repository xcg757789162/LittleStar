import type { KnowledgeNode, Question } from '@/types/models'

/**
 * 英语日常对话数据包
 * 5 个生活场景（打招呼、自我介绍、点餐、购物、问路），每个场景 3 道题
 */

/** 对话知识点 */
export const dialogueKnowledgeNodes: KnowledgeNode[] = [
  {
    id: 'english-dialogue-greeting',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '打招呼 Hello & Goodbye',
    description: '学习用英语打招呼和告别：Hello! Hi! Good morning! Goodbye! See you!',
    prerequisites: [],
    nextNodes: ['english-dialogue-intro'],
    difficulty: 1,
    contentType: 'voice',
    order: 201,
  },
  {
    id: 'english-dialogue-intro',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '自我介绍 My Name Is...',
    description: '学习用英语做简单的自我介绍：My name is... I am ... years old.',
    prerequisites: ['english-dialogue-greeting'],
    nextNodes: ['english-dialogue-food'],
    difficulty: 1,
    contentType: 'voice',
    order: 202,
  },
  {
    id: 'english-dialogue-food',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '点餐 I Want...',
    description: '学习用英语表达想要什么食物：I want... Can I have...? Thank you!',
    prerequisites: ['english-dialogue-intro'],
    nextNodes: ['english-dialogue-shopping'],
    difficulty: 2,
    contentType: 'voice',
    order: 203,
  },
  {
    id: 'english-dialogue-shopping',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '购物 How Much?',
    description: '学习用英语购物：How much? I want this one. Here you are!',
    prerequisites: ['english-dialogue-food'],
    nextNodes: ['english-dialogue-direction'],
    difficulty: 2,
    contentType: 'voice',
    order: 204,
  },
  {
    id: 'english-dialogue-direction',
    subject: 'english',
    gradeLevel: 'middle-kindergarten',
    name: '问路 Where Is...?',
    description: '学习用英语问路：Where is...? It\'s over there! Turn left/right.',
    prerequisites: ['english-dialogue-shopping'],
    nextNodes: [],
    difficulty: 2,
    contentType: 'voice',
    order: 205,
  },
]

/** 对话题目 */
export const dialogueQuestions: Question[] = [
  // ===== 打招呼 Hello & Goodbye =====
  {
    id: 'en-dialogue-greet-001',
    knowledgeNodeId: 'english-dialogue-greeting',
    type: 'voice',
    content: {
      text: '👋 早上好！用英语和小星老师打招呼吧！',
      hint: '说 "Good morning!" 或 "Hello!"',
    },
    answer: 'Good morning',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-greet-002',
    knowledgeNodeId: 'english-dialogue-greeting',
    type: 'multiple-choice',
    content: {
      text: '你在早上见到老师，应该说什么？☀️',
      options: [
        { id: 'a', text: 'Good morning!', isCorrect: true },
        { id: 'b', text: 'Good night!', isCorrect: false },
        { id: 'c', text: 'Goodbye!', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-greet-003',
    knowledgeNodeId: 'english-dialogue-greeting',
    type: 'multiple-choice',
    content: {
      text: '放学了要和小朋友告别，你会说什么？🏫',
      options: [
        { id: 'a', text: 'Hello!', isCorrect: false },
        { id: 'b', text: 'Goodbye! See you!', isCorrect: true },
        { id: 'c', text: 'Thank you!', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== 自我介绍 My Name Is... =====
  {
    id: 'en-dialogue-intro-001',
    knowledgeNodeId: 'english-dialogue-intro',
    type: 'voice',
    content: {
      text: '🌟 介绍一下你自己吧！说 "My name is..."',
      hint: '说 "My name is [你的名字]. I am [你的年龄] years old."',
    },
    answer: 'My name is',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-intro-002',
    knowledgeNodeId: 'english-dialogue-intro',
    type: 'multiple-choice',
    content: {
      text: '别人问你 "What\'s your name?"，你应该说什么？🤗',
      options: [
        { id: 'a', text: 'I am five.', isCorrect: false },
        { id: 'b', text: 'My name is...', isCorrect: true },
        { id: 'c', text: 'Thank you!', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 1,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-intro-003',
    knowledgeNodeId: 'english-dialogue-intro',
    type: 'multiple-choice',
    content: {
      text: '别人问 "How old are you?"，你今年 5 岁，应该说什么？🎂',
      options: [
        { id: 'a', text: 'I am five years old.', isCorrect: true },
        { id: 'b', text: 'My name is five.', isCorrect: false },
        { id: 'c', text: 'I like five.', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 1,
    isAIGenerated: false,
  },

  // ===== 点餐 I Want... =====
  {
    id: 'en-dialogue-food-001',
    knowledgeNodeId: 'english-dialogue-food',
    type: 'voice',
    content: {
      text: '🍕 你想吃什么？用英语说出来！',
      hint: '说 "I want pizza, please!" 或 "Can I have an apple?"',
    },
    answer: 'I want',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-food-002',
    knowledgeNodeId: 'english-dialogue-food',
    type: 'multiple-choice',
    content: {
      text: '你想要一个苹果 🍎，应该怎么说？',
      options: [
        { id: 'a', text: 'I want a banana.', isCorrect: false },
        { id: 'b', text: 'Can I have an apple, please?', isCorrect: true },
        { id: 'c', text: 'Goodbye apple!', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-food-003',
    knowledgeNodeId: 'english-dialogue-food',
    type: 'multiple-choice',
    content: {
      text: '服务员给你端来了食物，你应该说什么？🍽️',
      options: [
        { id: 'a', text: 'Sorry!', isCorrect: false },
        { id: 'b', text: 'Hello!', isCorrect: false },
        { id: 'c', text: 'Thank you!', isCorrect: true },
      ],
    },
    answer: 'c',
    difficulty: 2,
    isAIGenerated: false,
  },

  // ===== 购物 How Much? =====
  {
    id: 'en-dialogue-shop-001',
    knowledgeNodeId: 'english-dialogue-shopping',
    type: 'voice',
    content: {
      text: '🛒 你在商店里看到了一个漂亮的玩具！问问多少钱吧！',
      hint: '说 "How much is this?" 或 "I want this one!"',
    },
    answer: 'How much',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-shop-002',
    knowledgeNodeId: 'english-dialogue-shopping',
    type: 'multiple-choice',
    content: {
      text: '你想问这个东西多少钱，应该说什么？💰',
      options: [
        { id: 'a', text: 'Where is it?', isCorrect: false },
        { id: 'b', text: 'How much is it?', isCorrect: true },
        { id: 'c', text: 'What is it?', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-shop-003',
    knowledgeNodeId: 'english-dialogue-shopping',
    type: 'multiple-choice',
    content: {
      text: '店员说 "Here you are!"（给你！），这时候你应该说？🎁',
      options: [
        { id: 'a', text: 'Thank you!', isCorrect: true },
        { id: 'b', text: 'How much?', isCorrect: false },
        { id: 'c', text: 'Goodbye!', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 2,
    isAIGenerated: false,
  },

  // ===== 问路 Where Is...? =====
  {
    id: 'en-dialogue-dir-001',
    knowledgeNodeId: 'english-dialogue-direction',
    type: 'voice',
    content: {
      text: '🗺️ 你找不到厕所了！用英语问路吧！',
      hint: '说 "Excuse me, where is the bathroom?" 或 "Where is the restroom?"',
    },
    answer: 'Where is',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-dir-002',
    knowledgeNodeId: 'english-dialogue-direction',
    type: 'multiple-choice',
    content: {
      text: '你想找厕所 🚻，应该怎么问？',
      options: [
        { id: 'a', text: 'Where is the bathroom?', isCorrect: true },
        { id: 'b', text: 'How much is the bathroom?', isCorrect: false },
        { id: 'c', text: 'I want a bathroom.', isCorrect: false },
      ],
    },
    answer: 'a',
    difficulty: 2,
    isAIGenerated: false,
  },
  {
    id: 'en-dialogue-dir-003',
    knowledgeNodeId: 'english-dialogue-direction',
    type: 'multiple-choice',
    content: {
      text: '别人说 "Turn left!"（往左转），你应该往哪边走？⬅️➡️',
      options: [
        { id: 'a', text: '往右走 →', isCorrect: false },
        { id: 'b', text: '往左走 ←', isCorrect: true },
        { id: 'c', text: '往前走 ↑', isCorrect: false },
      ],
    },
    answer: 'b',
    difficulty: 2,
    isAIGenerated: false,
  },
]
