/**
 * 一年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》预备级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-1',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》预备级',
  modules: [
    {
      id: 'en-g1-m1',
      name: '26个字母',
      description: '26个英文字母的认读与书写',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g1-alphabet-upper',
          name: '大写字母认读',
          description: '认识并朗读26个大写英文字母 A-Z',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示大写字母"{letter}"，让孩子认读并跟读发音。配合字母歌辅助记忆。',
              constraints: { case: 'upper' },
            },
            {
              type: 'voice',
              prompt: '请跟读这个字母：{letter}。',
              constraints: { case: 'upper' },
            },
          ],
        },
        {
          id: 'en-g1-alphabet-lower',
          name: '小写字母认读',
          description: '认识并朗读26个小写英文字母 a-z',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-g1-alphabet-upper'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示小写字母"{letter}"及对应大写，让孩子配对认读。',
              constraints: { case: 'lower' },
            },
          ],
        },
        {
          id: 'en-g1-alphabet-writing',
          name: '字母书写',
          description: '在四线三格中正确书写大小写字母',
          difficulty: 2,
          contentTypes: ['writing'],
          prerequisites: ['en-g1-alphabet-lower'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '请在四线三格中写出字母"{letter}"的大写和小写。注意笔顺和占格。',
              constraints: { format: 'four-line-three-grid' },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g1-m2',
      name: '自然拼读入门',
      description: '辅音+短元音的基础拼读规则',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g1-phonics-consonants',
          name: '辅音字母发音',
          description: '学习常见辅音字母 b c d f g h j k l m n p r s t v w x y z 的基本发音',
          difficulty: 2,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: ['en-g1-alphabet-lower'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '字母"{letter}"在单词"{word}"开头的发音是什么？请跟读。如 b-ball, c-cat。',
              constraints: { category: 'consonants' },
            },
          ],
        },
        {
          id: 'en-g1-phonics-short-vowels',
          name: '短元音发音',
          description: '学习 a e i o u 的短元音发音',
          difficulty: 3,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: ['en-g1-phonics-consonants'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '字母"{letter}"的短元音发音是什么？配合单词示例：a-cat, e-bed, i-pig, o-dog, u-cup。',
              constraints: { vowels: ['a', 'e', 'i', 'o', 'u'] },
            },
          ],
        },
        {
          id: 'en-g1-phonics-cvc',
          name: 'CVC 拼读',
          description: '辅音+元音+辅音 简单拼读（如 cat, dog, pen）',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g1-phonics-short-vowels'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请拼读这个单词：{word}。先分开读每个音，再拼在一起：c-a-t → cat。',
              constraints: { pattern: 'CVC' },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g1-m3',
      name: '基础词汇',
      description: '50个基础词汇（数字、颜色、身体部位）',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g1-vocab-numbers',
          name: '数字 1-10',
          description: '学习数字1到10的英文 one-ten',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice', 'quiz'],
          prerequisites: ['en-g1-alphabet-lower'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示数字{n}和对应英文"{word}"，配合图片和发音。',
              constraints: { min: 1, max: 10 },
            },
            {
              type: 'multiple-choice',
              prompt: '数字 {n} 用英文怎么说？选项提供3个数字英文。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-g1-vocab-colors',
          name: '颜色词汇',
          description: '学习基本颜色 red, blue, green, yellow, black, white, orange, pink',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g1-alphabet-lower'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{color}色块和英文"{word}"，让孩子跟读。',
              constraints: { colors: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink'] },
            },
          ],
        },
        {
          id: 'en-g1-vocab-body',
          name: '身体部位词汇',
          description: '学习 head, eyes, ears, nose, mouth, hands, feet 等身体部位词汇',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-g1-alphabet-lower'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '指着身体部位图片，教孩子说：This is my {bodyPart}。',
              constraints: { bodyParts: ['head', 'eyes', 'ears', 'nose', 'mouth', 'hands', 'feet'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g1-m4',
      name: '听说启蒙',
      description: '课堂用语和简单问候',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g1-classroom',
          name: '课堂用语',
          description: '学习 Stand up, Sit down, Open your book 等课堂指令',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '听指令并做动作：{instruction}。课堂用语：Stand up / Sit down / Open your book / Close your book。',
              constraints: { category: 'classroom' },
            },
          ],
        },
        {
          id: 'en-g1-greetings',
          name: '简单问候',
          description: '学习 Hello, Hi, Good morning, Goodbye, Thank you 等日常问候',
          difficulty: 1,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请跟读并练习对话：A: {greeting_a}  B: {greeting_b}。',
              constraints: { category: 'greetings' },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
