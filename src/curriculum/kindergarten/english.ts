/**
 * 幼儿园英语知识点大纲（中班+大班）
 * 英语启蒙阶段
 * 参考《3-6岁儿童学习与发展指南》(2012) 及幼儿英语启蒙教育理念
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'middle-kindergarten',
  subject: 'english',
  version: '2012-v1',
  reference: '幼儿英语启蒙阶段',
  modules: [
    {
      id: 'en-kg-m1',
      name: '英语儿歌与基础问候',
      description: '通过儿歌和歌曲接触英语，学习基础问候语',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-kg-greetings',
          name: '基础问候语',
          description: '学习 Hello, Hi, Goodbye, Thank you 等基础问候语',
          difficulty: 1,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请跟读：{greeting}。问候语：Hello / Hi / Goodbye / Thank you / Please。',
              constraints: { greetings: ['Hello', 'Hi', 'Goodbye', 'Thank you', 'Please'] },
            },
            {
              type: 'flashcard',
              prompt: '展示问候场景图片，让孩子说出合适的问候语。',
              constraints: { category: 'greetings' },
            },
          ],
        },
        {
          id: 'en-kg-songs',
          name: '英语儿歌',
          description: '学唱 ABC Song, Twinkle Twinkle Little Star 等英文儿歌',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱英文儿歌：{song}。感受英语的韵律和节奏。',
              constraints: { songs: ['ABC Song', 'Twinkle Twinkle', 'Head Shoulders', 'Old MacDonald'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m2',
      name: '基础词汇启蒙',
      description: '学习颜色、数字、动物等30个基础词汇',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-kg-colors',
          name: '颜色词汇',
          description: '学习 red, blue, green, yellow 等基础颜色词汇',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{color}色块，让孩子跟读英文：{word}。',
              constraints: { colors: ['red', 'blue', 'green', 'yellow', 'black', 'white'] },
            },
          ],
        },
        {
          id: 'en-kg-numbers-1-5',
          name: '数字 1-5',
          description: '学习数字 one, two, three, four, five 的英文',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个物体和英文数字"{word}"，一起数：one, two, three...',
              constraints: { min: 1, max: 5 },
            },
          ],
        },
        {
          id: 'en-kg-animals',
          name: '动物词汇',
          description: '学习 cat, dog, fish, bird, rabbit 等常见动物英文',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-kg-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{animal}的可爱图片和英文"{word}"。引导说：It\'s a {word}!',
              constraints: { animals: ['cat', 'dog', 'fish', 'bird', 'rabbit'] },
            },
          ],
        },
        {
          id: 'en-kg-fruits',
          name: '水果词汇',
          description: '学习 apple, banana, orange, grape 等水果英文',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-kg-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{fruit}的图片和英文"{word}"。练习：I like {word}s!',
              constraints: { fruits: ['apple', 'banana', 'orange', 'grape', 'watermelon'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m3',
      name: '简单指令与互动',
      description: '听懂并执行简单英语指令',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-kg-tpr',
          name: '全身反应指令',
          description: '听懂 Stand up, Sit down, Clap your hands 等指令并做动作',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '听指令并做动作：{instruction}！指令：Stand up / Sit down / Clap your hands / Jump / Turn around。',
              constraints: { instructions: ['Stand up', 'Sit down', 'Clap your hands', 'Jump', 'Turn around'] },
            },
          ],
        },
        {
          id: 'en-kg-simple-response',
          name: '简单应答',
          description: '能用 Yes/No, I like... 进行简单回应',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-greetings', 'en-kg-animals'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '回答问题：Do you like {item}? 用 Yes, I do. / No, I don\'t. 回答。',
              constraints: { category: 'simple-response' },
            },
            {
              type: 'multiple-choice',
              prompt: '老师问 "Do you like {item}?"，你想说"是的"，应该怎么回答？提供2个选项。',
              constraints: { optionCount: 2 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
