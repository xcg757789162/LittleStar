/**
 * 六年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》2级
 * 六年级为小学英语最终年级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-6',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》2级',
  modules: [
    {
      id: 'en-g6-m1',
      name: '词汇巩固（600+词）',
      description: '巩固和拓展核心词汇至600词以上',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g6-vocab-600',
          name: '核心词汇巩固',
          description: '巩固600个核心词汇，学习词性变化和词组搭配',
          difficulty: 6,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g5-vocab-daily', 'en-g5-vocab-adjective'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '选择正确的词填空：{sentence}。提供4个选项。',
              constraints: { level: 2, count: 600, optionCount: 4 },
            },
          ],
        },
        {
          id: 'en-g6-word-formation',
          name: '构词法初步',
          description: '了解常见前缀 un-/re- 和后缀 -er/-ly/-ful 的含义',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['en-g5-vocab-adjective'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '加上前缀/后缀后单词的意思：un+happy=unhappy(不高兴)。{word}+{affix}=? 提供4个选项。',
              constraints: { prefixes: ['un-', 're-'], suffixes: ['-er', '-ly', '-ful'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g6-m2',
      name: '语法综合',
      description: '一般将来时、比较级最高级、综合时态运用',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g6-future-tense',
          name: '一般将来时',
          description: '学习 will/be going to 表达将来计划',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['en-g5-past-tense'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用一般将来时填空：I ___ (visit) my grandpa next Sunday. 提供4个选项。',
              constraints: { optionCount: 4, tense: 'future' },
            },
          ],
        },
        {
          id: 'en-g6-comparative',
          name: '比较级与最高级',
          description: '学习形容词的比较级和最高级：taller, tallest; more beautiful, most beautiful',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['en-g5-vocab-adjective'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{adjective} 的比较级/最高级是什么？/ Tom is ___ than Jack. 提供4个选项。',
              constraints: { optionCount: 4, rules: ['-er/-est', 'more/most', 'irregular'] },
            },
          ],
        },
        {
          id: 'en-g6-tense-review',
          name: '综合时态运用',
          description: '综合运用一般现在时、现在进行时、一般过去时、一般将来时',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['en-g6-future-tense', 'en-g5-past-tense', 'en-g5-present-continuous'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '根据时间状语选择正确时态填空：{sentence}。提供4个选项。',
              constraints: { tenses: ['present', 'present-continuous', 'past', 'future'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g6-m3',
      name: '阅读与写作',
      description: '200词短文阅读，写80-100词短文',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g6-reading-200',
          name: '短文阅读理解',
          description: '阅读150-200词的英文短文，理解主旨、细节和推理',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['en-g5-reading-150', 'en-g6-tense-review'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: 'Read the passage and answer: {passage}。Question: {question}。提供4个选项。',
              constraints: { maxWords: 200, questionTypes: ['main-idea', 'detail', 'inference'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'en-g6-writing-100',
          name: '短文写作（80-100词）',
          description: '围绕主题写80-100词的英文短文',
          difficulty: 7,
          contentTypes: ['writing'],
          prerequisites: ['en-g5-composition', 'en-g6-tense-review'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '以 "{topic}" 为题写一篇80-100词的英文短文。要求：语法正确，条理清晰，时态恰当。',
              constraints: { minWords: 80, maxWords: 100 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g6-m4',
      name: '综合语言运用',
      description: '小升初衔接，综合听说读写',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g6-comprehensive-listening',
          name: '综合听力理解',
          description: '听懂日常对话和简短独白，获取关键信息',
          difficulty: 7,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g5-wh-questions', 'en-g6-tense-review'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '听对话/独白，回答问题。Audio: {audio_description}。Question: {question}。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'en-g6-oral-presentation',
          name: '口语表达',
          description: '围绕话题进行简短的口头表达（1-2分钟）',
          difficulty: 7,
          contentTypes: ['voice'],
          prerequisites: ['en-g6-comprehensive-listening', 'en-g6-comparative'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请用1-2分钟介绍 "{topic}"。包含：描述、感受和原因。',
              constraints: { maxMinutes: 2 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
