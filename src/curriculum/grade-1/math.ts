/**
 * 一年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-1',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g1-m1',
      name: '1-5的认识和加减法',
      description: '认识数字1到5，学习5以内的加减法',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g1-num-1-5',
          name: '1-5的认识',
          description: '认识数字1到5，理解数量对应关系',
          difficulty: 1,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个物体（苹果/星星/小动物），让孩子识别数字{n}。范围：1-5。',
              constraints: { min: 1, max: 5 },
            },
            {
              type: 'multiple-choice',
              prompt: '图片中有几个{object}？请选择正确的数字。选项为3个相邻数字。范围：1-5。',
              constraints: { min: 1, max: 5, optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g1-add-within-5',
          name: '5以内加法',
          description: '学习5以内的加法运算',
          difficulty: 2,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-num-1-5'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} = ?，其中 a 和 b 为正整数，a + b ≤ 5。提供3个选项。',
              constraints: { maxSum: 5, optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g1-sub-within-5',
          name: '5以内减法',
          description: '学习5以内的减法运算',
          difficulty: 2,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-num-1-5'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} - {b} = ?，其中 a ≤ 5，b ≤ a。提供3个选项。',
              constraints: { maxMinuend: 5, optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g1-m2',
      name: '6-10的认识和加减法',
      description: '认识数字6到10，学习10以内的加减法',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g1-num-6-10',
          name: '6-10的认识',
          description: '认识数字6到10，理解数量对应关系',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-num-1-5'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个物体，让孩子识别数字{n}。范围：6-10。',
              constraints: { min: 6, max: 10 },
            },
          ],
        },
        {
          id: 'math-g1-add-within-10',
          name: '10以内加法',
          description: '学习10以内的加法运算',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-add-within-5', 'math-g1-num-6-10'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} = ?，其中 a + b ≤ 10。提供4个选项。',
              constraints: { maxSum: 10, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g1-sub-within-10',
          name: '10以内减法',
          description: '学习10以内的减法运算',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-sub-within-5', 'math-g1-num-6-10'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} - {b} = ?，其中 a ≤ 10。提供4个选项。',
              constraints: { maxMinuend: 10, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g1-m3',
      name: '11-20各数的认识',
      description: '认识11到20的数，理解十位和个位的概念',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g1-num-11-20',
          name: '11-20各数的认识',
          description: '认识11到20，理解"十几"的概念',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-num-6-10'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '用计数棒展示{n}，让孩子理解1个十和几个一。范围：11-20。',
              constraints: { min: 11, max: 20 },
            },
          ],
        },
        {
          id: 'math-g1-add-within-20',
          name: '20以内加法',
          description: '学习20以内的加法，包括进位加法',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-add-within-10', 'math-g1-num-11-20'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} = ?，其中 a + b ≤ 20。提供4个选项。',
              constraints: { maxSum: 20, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g1-sub-within-20',
          name: '20以内退位减法',
          description: '学习20以内的退位减法',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-sub-within-10', 'math-g1-num-11-20'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} - {b} = ?，其中 a ≤ 20，需要退位。提供4个选项。',
              constraints: { maxMinuend: 20, requireBorrow: true, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g1-m4',
      name: '100以内数的认识',
      description: '认识100以内的数，理解数位概念',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g1-num-100',
          name: '100以内数的认识',
          description: '认识100以内的数，理解十位和个位',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-num-11-20'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '用计数器展示{n}，让孩子说出十位和个位分别是什么。范围：21-100。',
              constraints: { min: 21, max: 100 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g1-m5',
      name: '认识图形',
      description: '认识基本的立体和平面图形',
      order: 5,
      knowledgeNodes: [
        {
          id: 'math-g1-shapes-3d',
          name: '认识立体图形',
          description: '认识长方体、正方体、圆柱、球',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{shape}的图片和实物，让孩子认识并命名。图形：长方体/正方体/圆柱/球。',
              constraints: { shapes: ['长方体', '正方体', '圆柱', '球'] },
            },
          ],
        },
        {
          id: 'math-g1-shapes-2d',
          name: '认识平面图形',
          description: '认识长方形、正方形、三角形、圆',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-shapes-3d'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '这是什么图形？展示{shape}，提供4个选项。图形：长方形/正方形/三角形/圆。',
              constraints: { shapes: ['长方形', '正方形', '三角形', '圆'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g1-m6',
      name: '认识钟表与位置',
      description: '认识整时和半时，理解上下前后左右',
      order: 6,
      knowledgeNodes: [
        {
          id: 'math-g1-clock',
          name: '认识钟表',
          description: '认识整时和半时，会看钟表',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-num-11-20'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '钟面上显示的是几点？展示{time}的钟面图片，提供3个选项。',
              constraints: { timeTypes: ['整时', '半时'], optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g1-position',
          name: '位置（上下前后左右）',
          description: '理解上下、前后、左右的位置关系',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{object_a}在{object_b}的哪个方向？选项：上/下/前/后/左/右。',
              constraints: { directions: ['上', '下', '前', '后', '左', '右'] },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
