/**
 * 四年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-4',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g4-m1',
      name: '识字与词语（四年级）',
      description: '累计认识3000个汉字，词语理解与运用',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g4-char-recognition-4',
          name: '四年级识字',
          description: '认识四年级新增约500个汉字，重视在阅读中识字',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g3-char-recognition-3'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '在语境中学习汉字"{char}"：{sentence}。说出读音和意思。',
              constraints: { level: 'grade-4' },
            },
          ],
        },
        {
          id: 'cn-g4-idioms',
          name: '成语积累',
          description: '学习常用成语，理解成语的含义和用法',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g3-char-recognition-3', 'cn-g2-synonyms-antonyms'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '学习成语"{idiom}"：意思是{meaning}。造句：{sentence}。',
              constraints: { category: 'idioms' },
            },
            {
              type: 'multiple-choice',
              prompt: '下面哪个句子中成语"{idiom}"的使用是正确的？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g4-context-meaning',
          name: '联系上下文理解词语',
          description: '学会联系上下文和生活经验理解词语意思',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g3-key-words'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '在"{sentence}"中，"{word}"的意思最接近哪个？联系上下文判断。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g4-m2',
      name: '阅读理解（四年级）',
      description: '学习提问策略、把握文章主要内容',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g4-questioning-strategy',
          name: '提问策略',
          description: '学习从不同角度提出有价值的问题',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g3-predict', 'cn-g3-key-words'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读这段话后，以下哪个问题最有思考价值？{text}。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g4-main-idea',
          name: '把握主要内容',
          description: '学习概括文章的主要内容和中心思想',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g3-retell'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '这篇文章的主要内容是什么？{text}。提供4个选项。',
              constraints: { optionCount: 4, maxLength: 300 },
            },
          ],
        },
        {
          id: 'cn-g4-character-feeling',
          name: '体会人物情感',
          description: '通过人物的语言、动作、神态体会情感',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g4-main-idea'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '从"{quote}"这句话中，你能感受到{character}怎样的心情？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g4-m3',
      name: '习作（四年级）',
      description: '学习写叙事文和说明文，注意段落',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g4-narrative',
          name: '写叙事文',
          description: '学习按事情发展顺序写一件事',
          difficulty: 6,
          contentTypes: ['writing'],
          prerequisites: ['cn-g3-observation', 'cn-g3-imagination'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '写一件{theme}的事。要求：按事情的起因、经过、结果来写，注意写清楚时间、地点、人物。不少于200字。',
              constraints: { minWords: 200, format: 'narrative' },
            },
          ],
        },
        {
          id: 'cn-g4-expository',
          name: '写说明文',
          description: '学习介绍一种事物，用上说明方法',
          difficulty: 6,
          contentTypes: ['writing'],
          prerequisites: ['cn-g3-observation', 'cn-g4-main-idea'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '请介绍一种{object}（如水果、动物、玩具）。要写清它的外形、特点和用途。不少于200字。',
              constraints: { minWords: 200, format: 'expository' },
            },
          ],
        },
        {
          id: 'cn-g4-paragraph-structure',
          name: '段落结构',
          description: '学习总分、并列、递进等段落结构',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g4-narrative'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '这段话是什么结构？{paragraph}。选项：总分/分总/并列/递进。提供4个选项。',
              constraints: { structures: ['总分', '分总', '并列', '递进'], optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
