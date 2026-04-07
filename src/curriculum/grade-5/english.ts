/**
 * 五年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》2级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-5',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》2级',
  modules: [
    {
      id: 'en-g5-m1',
      name: '词汇拓展（500词）',
      description: '学习500个核心词汇，涵盖日常生活各场景',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g5-vocab-daily',
          name: '日常生活词汇',
          description: '学习购物、旅行、健康等日常主题词汇',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g4-vocab-time', 'en-g4-vocab-occupation'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '学习词汇：{word}。在句子中练习：{sentence}。',
              constraints: { level: 2, count: 500 },
            },
          ],
        },
        {
          id: 'en-g5-vocab-adjective',
          name: '形容词与副词',
          description: '学习更多形容词和副词，描述事物和动作的特征',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g4-present-tense'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '选择正确的词填空：The rabbit runs ___. (quick/quickly) 提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g5-m2',
      name: '语法进阶',
      description: '现在进行时、一般过去时、特殊疑问句',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g5-present-continuous',
          name: '现在进行时',
          description: '学习 be + doing 表达正在进行的动作',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['en-g4-present-tense'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用现在进行时填空：Look! He ___ (read) a book. 提供4个选项。',
              constraints: { optionCount: 4, tense: 'present-continuous' },
            },
          ],
        },
        {
          id: 'en-g5-past-tense',
          name: '一般过去时',
          description: '学习一般过去时的构成和用法，规则与不规则动词变化',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['en-g5-present-continuous'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用一般过去时改写：I ___ (go) to school yesterday. 提供4个选项。',
              constraints: { optionCount: 4, tense: 'past-simple' },
            },
          ],
        },
        {
          id: 'en-g5-wh-questions',
          name: '特殊疑问句',
          description: '学习 What/Where/When/Who/Why/How 引导的特殊疑问句',
          difficulty: 6,
          contentTypes: ['quiz', 'voice'],
          prerequisites: ['en-g4-present-tense', 'en-g3-yes-no-questions'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '选择正确的疑问词：___ did you go yesterday? (What/Where/When) 提供4个选项。',
              constraints: { words: ['What', 'Where', 'When', 'Who', 'Why', 'How'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g5-m3',
      name: '阅读理解',
      description: '150词短文阅读，理解主旨大意',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g5-reading-150',
          name: '短文阅读理解',
          description: '阅读120-150词的英文短文，理解主旨和细节',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['en-g4-reading-100', 'en-g5-past-tense'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: 'Read the passage and answer: {passage}。Question: {question}。提供4个选项。',
              constraints: { maxWords: 150, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g5-m4',
      name: '写作',
      description: '写短文和日记',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g5-diary',
          name: '写英语日记',
          description: '用英语写简单的日记，记录日常活动',
          difficulty: 6,
          contentTypes: ['writing'],
          prerequisites: ['en-g4-writing-paragraph', 'en-g5-past-tense'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '用英语写一篇日记，记录今天的活动。格式：Date: ___\nDear Diary,\n...\n写5-8句。',
              constraints: { minSentences: 5, maxSentences: 8, format: 'diary' },
            },
          ],
        },
        {
          id: 'en-g5-composition',
          name: '短文写作',
          description: '围绕主题写50-80词的英文短文',
          difficulty: 7,
          contentTypes: ['writing'],
          prerequisites: ['en-g5-diary', 'en-g5-wh-questions'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '以 "{topic}" 为题写一篇50-80词的英文短文。注意使用正确时态和标点。',
              constraints: { minWords: 50, maxWords: 80 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
