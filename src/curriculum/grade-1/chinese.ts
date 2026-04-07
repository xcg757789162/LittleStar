/**
 * 一年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-1',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g1-m1',
      name: '汉语拼音',
      description: '学习声母、韵母、声调，掌握拼读方法',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g1-pinyin-initials',
          name: '声母',
          description: '学习23个声母的发音和书写',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示声母"{letter}"，让孩子跟读发音。声母：b p m f d t n l g k h j q x zh ch sh r z c s y w。',
              constraints: { category: 'initials' },
            },
            {
              type: 'voice',
              prompt: '请跟读这个声母：{letter}。',
              constraints: { category: 'initials' },
            },
          ],
        },
        {
          id: 'cn-g1-pinyin-finals',
          name: '韵母',
          description: '学习24个韵母的发音和书写',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['cn-g1-pinyin-initials'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示韵母"{letter}"，让孩子跟读发音。韵母：a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong。',
              constraints: { category: 'finals' },
            },
          ],
        },
        {
          id: 'cn-g1-pinyin-tones',
          name: '声调',
          description: '学习四个声调和轻声',
          difficulty: 3,
          contentTypes: ['flashcard', 'voice', 'quiz'],
          prerequisites: ['cn-g1-pinyin-initials', 'cn-g1-pinyin-finals'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '听一听，这个音节的声调是第几声？音节：{syllable}。选项：一声/二声/三声/四声。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g1-pinyin-spelling',
          name: '拼读',
          description: '学习声母和韵母的拼读规则',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['cn-g1-pinyin-tones'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请拼读这个音节：{syllable}。',
              constraints: { category: 'spelling' },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g1-m2',
      name: '识字与写字',
      description: '认识800个常用汉字，书写400个',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g1-strokes',
          name: '基本笔画',
          description: '学习横、竖、撇、捺、点等基本笔画',
          difficulty: 2,
          contentTypes: ['flashcard', 'writing'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示笔画"{stroke}"的写法，让孩子认识并命名。笔画：横/竖/撇/捺/点/折/钩。',
              constraints: { strokes: ['横', '竖', '撇', '捺', '点', '折', '钩'] },
            },
            {
              type: 'handwriting',
              prompt: '请写出笔画：{stroke}。',
              constraints: { category: 'strokes' },
            },
          ],
        },
        {
          id: 'cn-g1-stroke-order',
          name: '笔顺规则',
          description: '学习"先横后竖、从上到下、从左到右"等笔顺规则',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g1-strokes'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '"{char}"字的第{n}笔是什么？选项提供4种笔画。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g1-char-recognition',
          name: '常用汉字认读',
          description: '认识一年级800个常用汉字',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-g1-pinyin-spelling'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示汉字"{char}"，标注拼音，让孩子认读。',
              constraints: { level: 'grade-1', count: 800 },
            },
          ],
        },
        {
          id: 'cn-g1-char-writing',
          name: '汉字书写',
          description: '书写一年级400个常用汉字',
          difficulty: 4,
          contentTypes: ['writing'],
          prerequisites: ['cn-g1-stroke-order', 'cn-g1-char-recognition'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '请书写汉字：{char}。注意笔顺。',
              constraints: { level: 'grade-1', count: 400 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g1-m3',
      name: '阅读',
      description: '朗读课文，理解词句，欣赏儿歌童谣古诗',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g1-reading-aloud',
          name: '朗读课文',
          description: '学习正确、流利地朗读课文',
          difficulty: 3,
          contentTypes: ['voice'],
          prerequisites: ['cn-g1-pinyin-spelling', 'cn-g1-char-recognition'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请朗读以下课文片段：{text}。注意读准字音，不加字不丢字。',
              constraints: { maxLength: 50 },
            },
          ],
        },
        {
          id: 'cn-g1-word-understanding',
          name: '理解词句',
          description: '结合上下文理解词语的意思',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g1-reading-aloud'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '在"{sentence}"中，"{word}"的意思是什么？提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g1-m4',
      name: '写话',
      description: '学习写自己想说的话',
      order: 4,
      knowledgeNodes: [
        {
          id: 'cn-g1-write-sentence',
          name: '写话',
          description: '用拼音和已学汉字写自己想说的话',
          difficulty: 5,
          contentTypes: ['writing'],
          prerequisites: ['cn-g1-char-writing', 'cn-g1-word-understanding'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '看图写话：观察图片{image}，用1-2句话描述你看到了什么。可以用拼音代替不会写的字。',
              constraints: { minSentences: 1, maxSentences: 2 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
