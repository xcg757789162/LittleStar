/**
 * 四年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》1级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-4',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》1级',
  modules: [
    {
      id: 'en-g4-m1',
      name: '词汇拓展（300词）',
      description: '学习时间、季节、职业、交通等主题词汇',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g4-vocab-time',
          name: '时间词汇',
          description: '学习 Monday-Sunday, January-December, morning/afternoon/evening 等时间词汇',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g3-vocab-school'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '学习时间词汇：{word}。练习：Today is {day}. / It is {month}.',
              constraints: { categories: ['weekdays', 'months', 'time-of-day'] },
            },
          ],
        },
        {
          id: 'en-g4-vocab-seasons',
          name: '季节与活动词汇',
          description: '学习 spring, summer, autumn, winter 及对应活动',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g3-vocab-weather'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{season}的图片和词汇。练习：I like {season}. In {season}, I can {activity}.',
              constraints: { seasons: ['spring', 'summer', 'autumn', 'winter'] },
            },
          ],
        },
        {
          id: 'en-g4-vocab-occupation',
          name: '职业词汇',
          description: '学习 teacher, doctor, nurse, farmer, driver, cook, policeman 等职业词汇',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g3-vocab-school'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{occupation}的图片和英文。练习：He/She is a {word}.',
              constraints: { category: 'occupations', count: 15 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g4-m2',
      name: '语法进阶',
      description: '一般现在时、there be 句型、名词复数',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g4-present-tense',
          name: '一般现在时',
          description: '学习一般现在时的用法和第三人称单数变化',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['en-g3-be-verb', 'en-g3-can'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '选择正确的动词形式：He {verb} every day. 如 plays/play/playing。提供3个选项。',
              constraints: { optionCount: 3, focus: 'third-person-singular' },
            },
          ],
        },
        {
          id: 'en-g4-there-be',
          name: 'There be 句型',
          description: '学习 There is/are... 表达"有"',
          difficulty: 5,
          contentTypes: ['quiz', 'voice'],
          prerequisites: ['en-g3-be-verb'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '看图填空：There ___ {quantity} {noun} on the table. 选 is 还是 are。提供3个选项。',
              constraints: { optionCount: 3 },
            },
            {
              type: 'voice',
              prompt: '看图说话：用 There is/are 描述图片中有什么。',
              constraints: { pattern: 'There be + noun + location' },
            },
          ],
        },
        {
          id: 'en-g4-plural-nouns',
          name: '名词复数',
          description: '学习名词复数规则变化（-s, -es, -ies）和常见不规则变化',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['en-g3-vocab-school'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{noun} 的复数形式是什么？提供4个选项。',
              constraints: { optionCount: 4, rules: ['-s', '-es', '-ies', 'irregular'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g4-m3',
      name: '阅读与对话',
      description: '100词短文阅读，场景对话',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g4-reading-100',
          name: '短文阅读理解',
          description: '阅读80-100词的英文短文并回答问题',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['en-g3-reading-simple', 'en-g4-present-tense'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读短文后回答问题。Passage: {passage}。Question: {question}。提供4个选项。',
              constraints: { maxWords: 100, optionCount: 4 },
            },
          ],
        },
        {
          id: 'en-g4-dialogue-shopping',
          name: '场景对话（购物等）',
          description: '在购物、问路、看病等场景中进行英语对话',
          difficulty: 5,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g4-vocab-occupation', 'en-g4-there-be'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '角色扮演{scenario}场景对话：A: {lineA} B: {lineB}。',
              constraints: { scenarios: ['shopping', 'seeing-doctor', 'asking-way'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g4-m4',
      name: '书写',
      description: '正确书写句子和短文',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g4-writing-paragraph',
          name: '写简短段落',
          description: '仿照范文写3-5句的短段落',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['en-g3-writing-sentence', 'en-g4-present-tense'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '仿照范文写一个关于{topic}的短段落（3-5句话）。范文：{example}。',
              constraints: { minSentences: 3, maxSentences: 5 },
            },
          ],
        },
        {
          id: 'en-g4-letter-writing',
          name: '写简单信件',
          description: '学习英文信件/贺卡的格式',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['en-g4-writing-paragraph'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '给{person}写一封简短的英文信/贺卡。格式：Dear ___,\n正文\nYours, ___',
              constraints: { format: 'letter', minSentences: 3 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
