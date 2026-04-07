/**
 * 幼儿园语文知识点大纲（中班+大班）
 * 参考《3-6岁儿童学习与发展指南》(2012)
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'middle-kindergarten',
  subject: 'chinese',
  version: '2012-v1',
  reference: '《3-6岁儿童学习与发展指南》(2012)',
  modules: [
    {
      id: 'cn-kg-m1',
      name: '听说能力',
      description: '听故事复述，简单对话，表达自己的想法',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-kg-listen-story',
          name: '听故事复述',
          description: '能安静听完故事并简单复述主要情节',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '听一个简短的故事：{story}。听完后，请用自己的话讲一讲这个故事。',
              constraints: { maxWords: 100 },
            },
          ],
        },
        {
          id: 'cn-kg-daily-dialogue',
          name: '日常对话',
          description: '用普通话进行简单的日常对话，表达需求',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '和{person}打招呼并进行对话：如"你好！""谢谢！""请帮我……"',
              constraints: { category: 'daily' },
            },
          ],
        },
        {
          id: 'cn-kg-express',
          name: '表达想法',
          description: '能说出完整的句子，表达自己的想法和感受',
          difficulty: 2,
          contentTypes: ['voice'],
          prerequisites: ['cn-kg-daily-dialogue'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '看图片{image}，说说你看到了什么？你觉得怎么样？',
              constraints: { minSentences: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-kg-m2',
      name: '阅读兴趣',
      description: '喜欢听故事和看图画书，培养阅读习惯',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-kg-picture-book',
          name: '看图画书',
          description: '能根据图画内容猜测故事情节',
          difficulty: 1,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '看这幅图{image}，猜猜接下来会发生什么？',
              constraints: { category: 'picture-book' },
            },
            {
              type: 'multiple-choice',
              prompt: '看这几幅图，它们讲了一个什么故事？提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'cn-kg-nursery-rhyme',
          name: '儿歌童谣',
          description: '学唱儿歌童谣，感受语言的韵律美',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱儿歌：{rhyme}。注意节奏和韵律。',
              constraints: { category: 'nursery-rhyme' },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-kg-m3',
      name: '前书写准备',
      description: '涂鸦画画，练习握笔，为书写做准备',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-kg-pencil-grip',
          name: '握笔姿势',
          description: '学习正确的握笔姿势和坐姿',
          difficulty: 1,
          contentTypes: ['flashcard'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示正确的握笔姿势，让孩子模仿练习。',
              constraints: { category: 'fine-motor' },
            },
          ],
        },
        {
          id: 'cn-kg-trace-lines',
          name: '描线练习',
          description: '描画直线、曲线、圆圈等基本线条',
          difficulty: 2,
          contentTypes: ['writing'],
          prerequisites: ['cn-kg-pencil-grip'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '沿虚线描画{shape}：直线/波浪线/圆圈/锯齿线。',
              constraints: { shapes: ['直线', '波浪线', '圆圈', '锯齿线'] },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-kg-m4',
      name: '认字启蒙',
      description: '认识常见汉字和标识',
      order: 4,
      knowledgeNodes: [
        {
          id: 'cn-kg-name-recognition',
          name: '认识自己的名字',
          description: '能认识并指出自己名字中的汉字',
          difficulty: 2,
          contentTypes: ['flashcard'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '这是你的名字"{name}"，指出其中的每个字。',
              constraints: { category: 'name' },
            },
          ],
        },
        {
          id: 'cn-kg-common-signs',
          name: '认识常见标识',
          description: '认识"男""女""出口""安全出口"等常见汉字标识',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['cn-kg-name-recognition'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '这个标识上写的是"{sign}"，你在哪里见过它？',
              constraints: { signs: ['男', '女', '出口', '入口', '停'] },
            },
            {
              type: 'multiple-choice',
              prompt: '这个标识表示什么意思？提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
