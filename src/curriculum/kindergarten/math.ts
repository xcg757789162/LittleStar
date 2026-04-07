/**
 * 幼儿园数学知识点大纲（中班+大班）
 * 参考《3-6岁儿童学习与发展指南》(2012)
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'middle-kindergarten',
  subject: 'math',
  version: '2012-v1',
  reference: '《3-6岁儿童学习与发展指南》(2012)',
  modules: [
    {
      id: 'math-kg-m1',
      name: '数字认知',
      description: '认识数字1-10，理解数量对应关系',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-kg-num-1-5',
          name: '数字认知 1-5',
          description: '认识数字1到5，理解数字的含义',
          difficulty: 1,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个可爱的小动物，让孩子点数并说出数字{n}。范围：1-5。用生动有趣的方式引导。',
              constraints: { min: 1, max: 5 },
            },
          ],
        },
        {
          id: 'math-kg-num-6-10',
          name: '数字认知 6-10',
          description: '认识数字6到10，理解数字的含义',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-kg-num-1-5'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个物体，让孩子点数并识别数字{n}。范围：6-10。',
              constraints: { min: 6, max: 10 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-kg-m2',
      name: '数量比较',
      description: '一一对应比多少，理解粗细厚薄轻重',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-kg-counting',
          name: '点数与唱数',
          description: '手口一致地点数物体',
          difficulty: 1,
          contentTypes: ['flashcard'],
          prerequisites: ['math-kg-num-1-5'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '请帮孩子一边指一边数：这里有几个{object}？引导手口一致点数。',
              constraints: { max: 10 },
            },
          ],
        },
        {
          id: 'math-kg-compare',
          name: '比多少',
          description: '通过一一对应比较两组物体的多少',
          difficulty: 2,
          contentTypes: ['quiz'],
          prerequisites: ['math-kg-counting'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '哪一组的{object}更多？展示两组物体（数量{a}和{b}），让孩子选择更多的一组。',
              constraints: { maxDiff: 3, optionCount: 2 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-kg-m3',
      name: '简单运算',
      description: '10以内的加减法',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-kg-add-within-5',
          name: '5以内加法',
          description: '用实物操作理解加法概念',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['math-kg-num-1-5', 'math-kg-compare'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '小明有{a}个苹果，妈妈又给了{b}个，现在有几个？a+b≤5。用实物图辅助。',
              constraints: { maxSum: 5, optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-kg-add-within-10',
          name: '10以内加法',
          description: '10以内的加法运算',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-kg-add-within-5', 'math-kg-num-6-10'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} = ?，a+b≤10。配合实物图。',
              constraints: { maxSum: 10, optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-kg-m4',
      name: '形状与空间',
      description: '认识基本形状，理解空间关系',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-kg-shapes',
          name: '认识基本形状',
          description: '认识圆形、三角形、正方形、长方形',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '这是什么形状？展示{shape}，让孩子命名。形状：圆形/三角形/正方形/长方形。',
              constraints: { shapes: ['圆形', '三角形', '正方形', '长方形'] },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
