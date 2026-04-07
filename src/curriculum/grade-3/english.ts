/**
 * 三年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》1级
 * 三年级为正式英语课程起始年级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-3',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》1级',
  modules: [
    {
      id: 'en-g3-m1',
      name: '字母与语音系统化',
      description: '系统学习26个字母及其在单词中的发音',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g3-letter-sounds',
          name: '字母在单词中的发音',
          description: '系统掌握每个字母在常见单词中的发音',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g2-phonics-long-vowels'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '字母"{letter}"在以下单词中的发音：{word1}, {word2}, {word3}。请跟读。',
              constraints: { category: 'letter-sounds' },
            },
          ],
        },
        {
          id: 'en-g3-sight-words',
          name: '高频词（Sight Words）',
          description: '掌握100个一级高频词：the, is, are, have, can 等',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g2-phonics-digraphs'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '认读高频词：{word}。在句子中练习：{sentence}。',
              constraints: { level: 1, count: 100 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g3-m2',
      name: '核心词汇（200词）',
      description: '学习学校、日常生活、天气等主题词汇',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g3-vocab-school',
          name: '学校相关词汇',
          description: '学习 classroom, teacher, student, desk, chair, pencil, eraser 等学校词汇',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g2-vocab-animals', 'en-g2-vocab-food'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{item}的图片和英文"{word}"。引导造句：There is a {word} in the classroom.',
              constraints: { category: 'school', count: 20 },
            },
          ],
        },
        {
          id: 'en-g3-vocab-weather',
          name: '天气词汇',
          description: '学习 sunny, rainy, cloudy, windy, snowy, hot, cold 等天气词汇',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g2-vocab-animals'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{weather}的图片和英文"{word}"。练习：It is {word} today.',
              constraints: { category: 'weather' },
            },
          ],
        },
        {
          id: 'en-g3-vocab-actions',
          name: '动作词汇',
          description: '学习 run, jump, swim, read, write, sing, dance, eat, drink 等动作词汇',
          difficulty: 3,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-g1-classroom'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示动作图片和英文"{word}"。练习：I can {word}.',
              constraints: { category: 'actions', count: 20 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g3-m3',
      name: '基础句型与语法',
      description: '学习 be 动词、can、一般疑问句',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g3-be-verb',
          name: 'be 动词用法',
          description: '学习 I am / You are / He is / She is / It is / We are / They are',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['en-g2-sentence-it-is'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '选择正确的 be 动词填空：{subject} ___ {adjective/noun}. 提供3个选项（am/is/are）。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-g3-can',
          name: 'can 句型',
          description: '学习用 can/can\'t 表达能力：I can swim. Can you dance?',
          difficulty: 4,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g3-vocab-actions'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '用 can 造句：I can {action}. / I can\'t {action}. / Can you {action}?',
              constraints: { pattern: 'can + verb' },
            },
            {
              type: 'multiple-choice',
              prompt: '看图回答：Can he/she {action}? Yes, he/she can. / No, he/she can\'t. 提供2个选项。',
              constraints: { optionCount: 2 },
            },
          ],
        },
        {
          id: 'en-g3-yes-no-questions',
          name: '一般疑问句',
          description: '学习 Is this...? Do you like...? 等一般疑问句及回答',
          difficulty: 5,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g3-be-verb', 'en-g3-can'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '将陈述句改为一般疑问句：{statement} → ？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g3-m4',
      name: '听说读写综合',
      description: '简单阅读理解和仿写练习',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g3-reading-simple',
          name: '简单阅读理解',
          description: '阅读50-80词的短文并回答问题',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['en-g3-sight-words', 'en-g3-yes-no-questions'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读短文后回答问题：{passage}。Question: {question}。提供4个选项。',
              constraints: { maxWords: 80, optionCount: 4 },
            },
          ],
        },
        {
          id: 'en-g3-writing-sentence',
          name: '仿写句子',
          description: '仿照例句写简单的英文句子',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['en-g3-be-verb', 'en-g3-can'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '仿照例句写一个句子。例句：{example}。请写一个类似的句子。',
              constraints: { pattern: 'imitation' },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
