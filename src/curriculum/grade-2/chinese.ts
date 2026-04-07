/**
 * 二年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-2',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g2-m1',
      name: '识字与写字（二年级）',
      description: '累计认识1600个常用汉字，书写800个',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g2-radicals',
          name: '偏旁部首',
          description: '认识常用偏旁部首，利用偏旁归类识字',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g1-strokes', 'cn-g1-stroke-order'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示偏旁"{radical}"，说出它的名称和含义。如：氵（三点水，与水有关）。',
              constraints: { category: 'radicals' },
            },
            {
              type: 'multiple-choice',
              prompt: '下面哪个字含有"{radical}"偏旁？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g2-char-recognition-2',
          name: '二年级识字',
          description: '认识二年级新增的800个常用汉字',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g1-char-recognition', 'cn-g2-radicals'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示汉字"{char}"，标注拼音和偏旁部首，让孩子认读。',
              constraints: { level: 'grade-2', count: 800 },
            },
          ],
        },
        {
          id: 'cn-g2-char-writing-2',
          name: '二年级写字',
          description: '书写二年级新增的400个常用汉字，注意结构',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['cn-g1-char-writing', 'cn-g2-char-recognition-2'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '请书写汉字：{char}。注意结构（左右/上下/半包围）和占格。',
              constraints: { level: 'grade-2', count: 400 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g2-m2',
      name: '词语积累',
      description: '积累词语，学习近义词反义词',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g2-word-accumulation',
          name: '词语积累',
          description: '积累ABB、AABB、ABAB等形式的词语',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g2-char-recognition-2'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '学习{pattern}式词语：{word}。如 ABB式：绿油油、白花花。',
              constraints: { patterns: ['ABB', 'AABB', 'ABAB'] },
            },
          ],
        },
        {
          id: 'cn-g2-synonyms-antonyms',
          name: '近义词与反义词',
          description: '学习常用词语的近义词和反义词',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-word-accumulation'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '"{word}"的{type}是什么？选项提供4个词语。类型：近义词/反义词。',
              constraints: { types: ['近义词', '反义词'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g2-measure-words',
          name: '量词',
          description: '正确使用常用量词：一（ ）花、一（ ）书',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-word-accumulation'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '一（ ）{object}，应该填什么量词？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g2-m3',
      name: '阅读理解（二年级）',
      description: '默读课文，学习提问，了解段落',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g2-silent-reading',
          name: '默读',
          description: '学习默读，不指读，不出声',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g1-reading-aloud'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '默读以下短文，回答问题：{text}。问题：{question}。提供4个选项。',
              constraints: { maxLength: 100, optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g2-sequence',
          name: '了解事情经过',
          description: '读懂故事的起因、经过、结果',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-silent-reading'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读故事后，请把事件按顺序排列。故事：{story}。',
              constraints: { optionCount: 4, orderType: 'sequence' },
            },
          ],
        },
        {
          id: 'cn-g2-questioning',
          name: '学习提问',
          description: '读完课文能提出自己的问题',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g2-sequence'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '读完这段话后，以下哪个问题最值得讨论？文段：{text}。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g2-m4',
      name: '写话（二年级）',
      description: '能看图写话，写完整的句子',
      order: 4,
      knowledgeNodes: [
        {
          id: 'cn-g2-complete-sentence',
          name: '写完整句子',
          description: '用"谁在哪里干什么"写完整句子',
          difficulty: 4,
          contentTypes: ['writing'],
          prerequisites: ['cn-g1-write-sentence', 'cn-g2-char-writing-2'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '看图写话：观察图片{image}，用"谁+在哪里+干什么"的格式写1-2个完整的句子。',
              constraints: { minSentences: 1, maxSentences: 2, pattern: '主+地+谓' },
            },
          ],
        },
        {
          id: 'cn-g2-picture-writing',
          name: '看图写话',
          description: '观察多幅图写连贯的几句话',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['cn-g2-complete-sentence'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '观察这{count}幅图，写3-5句话描述图中发生的故事。注意使用标点符号。',
              constraints: { minSentences: 3, maxSentences: 5, imageCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
