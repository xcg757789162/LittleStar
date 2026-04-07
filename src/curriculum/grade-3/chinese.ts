/**
 * 三年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-3',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g3-m1',
      name: '识字与写字（三年级）',
      description: '累计认识2500个常用汉字，书写1600个，学习查字典',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g3-dictionary',
          name: '查字典',
          description: '学习使用音序查字法和部首查字法',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-radicals'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用部首查字法查"{char}"字，应该先查什么部首，再查几画？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g3-char-recognition-3',
          name: '三年级识字',
          description: '认识三年级新增的约900个汉字',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g2-char-recognition-2', 'cn-g3-dictionary'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示汉字"{char}"，标注拼音、部首和组词。',
              constraints: { level: 'grade-3' },
            },
          ],
        },
        {
          id: 'cn-g3-char-writing-3',
          name: '三年级写字',
          description: '书写三年级新增的约800个汉字，注意间架结构',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['cn-g2-char-writing-2', 'cn-g3-char-recognition-3'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '请书写汉字：{char}。注意间架结构和笔画穿插。',
              constraints: { level: 'grade-3' },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g3-m2',
      name: '阅读理解（三年级）',
      description: '学习默读、预测、复述，体会关键词句',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g3-predict',
          name: '预测',
          description: '根据题目、插图等预测课文内容',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-silent-reading'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '看到这个题目"{title}"，你猜课文会写什么？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g3-key-words',
          name: '体会关键词句',
          description: '找出文中关键词句，体会作者表达的意思',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-questioning'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '文中"{sentence}"这句话说明了什么？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g3-retell',
          name: '复述故事',
          description: '能用自己的话复述课文的主要内容',
          difficulty: 5,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['cn-g3-key-words'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请用自己的话复述这个故事的主要内容。故事：{story}。',
              constraints: { maxLength: 200 },
            },
            {
              type: 'multiple-choice',
              prompt: '下面哪个选项最能概括这个故事的主要内容？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g3-m3',
      name: '习作入门',
      description: '从写话过渡到习作，学写观察日记和想象作文',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g3-observation',
          name: '观察日记',
          description: '学习观察事物并写下来',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['cn-g2-picture-writing'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '观察{object}（如一种植物或小动物），写一篇观察日记。包含：日期、观察对象、看到的样子、你的感受。不少于100字。',
              constraints: { minWords: 100, format: 'diary' },
            },
          ],
        },
        {
          id: 'cn-g3-imagination',
          name: '想象作文',
          description: '发挥想象写一个故事',
          difficulty: 6,
          contentTypes: ['writing'],
          prerequisites: ['cn-g3-retell', 'cn-g3-observation'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '以"{opening}"为开头，发挥想象，续写一个有趣的故事。不少于150字。',
              constraints: { minWords: 150, format: 'story' },
            },
          ],
        },
        {
          id: 'cn-g3-punctuation',
          name: '标点符号运用',
          description: '正确使用逗号、句号、问号、感叹号、冒号、引号',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-complete-sentence'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '给下面的句子加上正确的标点符号：{sentence}。提供4个选项。',
              constraints: { marks: ['，', '。', '？', '！', '：', '"'], optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
