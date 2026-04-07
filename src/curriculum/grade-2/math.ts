/**
 * 二年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-2',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g2-m1',
      name: '100以内加减法',
      description: '掌握100以内的加减法，包括进位和退位',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g2-add-within-100',
          name: '100以内加法（进位）',
          description: '学习100以内的进位加法',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-add-within-20'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} = ?，其中 a + b ≤ 100，需要进位。提供4个选项。',
              constraints: { maxSum: 100, requireCarry: true, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-sub-within-100',
          name: '100以内减法（退位）',
          description: '学习100以内的退位减法',
          difficulty: 3,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-sub-within-20'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} - {b} = ?，其中 a ≤ 100，需要退位。提供4个选项。',
              constraints: { maxMinuend: 100, requireBorrow: true, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-add-sub-mixed',
          name: '加减混合运算',
          description: '两步以内的加减混合运算',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-add-within-100', 'math-g2-sub-within-100'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} + {b} - {c} = ? 或 {a} - {b} + {c} = ?，结果在100以内。提供4个选项。',
              constraints: { maxResult: 100, steps: 2, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g2-m2',
      name: '表内乘法',
      description: '学习乘法的含义和1-9的乘法口诀',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g2-multiply-concept',
          name: '乘法的认识',
          description: '理解乘法的含义，"几个几"',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-add-within-100'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{groups}组，每组{count}个物体，引导理解 {groups}×{count} 的含义。',
              constraints: { maxGroups: 9, maxCount: 9 },
            },
            {
              type: 'multiple-choice',
              prompt: '{groups}个{count}相加，可以用乘法怎样表示？提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g2-times-table-1-5',
          name: '1-5的乘法口诀',
          description: '背诵和运用1-5的乘法口诀',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-multiply-concept'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '乘法口诀：{a}×{b}={product}。其中 a, b ∈ [1,5]。',
              constraints: { min: 1, max: 5 },
            },
            {
              type: 'multiple-choice',
              prompt: '{a} × {b} = ?，其中 a, b ∈ [1,5]。提供4个选项。',
              constraints: { min: 1, max: 5, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-times-table-6-9',
          name: '6-9的乘法口诀',
          description: '背诵和运用6-9的乘法口诀',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-times-table-1-5'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '乘法口诀：{a}×{b}={product}。其中至少有一个因数 ∈ [6,9]。',
              constraints: { min: 1, max: 9, atLeastOneAbove: 5 },
            },
            {
              type: 'multiple-choice',
              prompt: '{a} × {b} = ?，至少一个因数在6-9之间。提供4个选项。',
              constraints: { min: 1, max: 9, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g2-m3',
      name: '表内除法',
      description: '学习除法的含义，用乘法口诀求商',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g2-divide-concept',
          name: '除法的认识',
          description: '理解除法的含义——平均分',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-times-table-1-5'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '把{total}个{object}平均分给{groups}个小朋友，每人分几个？引导理解除法。',
              constraints: { maxTotal: 45 },
            },
            {
              type: 'multiple-choice',
              prompt: '{total} ÷ {divisor} = ?，利用乘法口诀求商。提供4个选项。',
              constraints: { maxDividend: 81, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-divide-within-table',
          name: '用口诀求商',
          description: '运用乘法口诀快速求商',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-divide-concept', 'math-g2-times-table-6-9'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{a} ÷ {b} = ?，想口诀 {b}×(?)={a}。提供4个选项。',
              constraints: { maxDividend: 81, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-divide-with-remainder',
          name: '有余数的除法',
          description: '理解余数的含义，计算有余数的除法',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-divide-within-table'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{a} ÷ {b} = ? ... ?，求商和余数。注意余数要小于除数。提供4个选项。',
              constraints: { maxDividend: 50, hasRemainder: true, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g2-m4',
      name: '万以内数的认识',
      description: '认识千位，掌握万以内数的读写和比较',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g2-num-1000',
          name: '1000以内数的认识',
          description: '认识百位和千位，掌握三位数的读写',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-num-100'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '用计数器展示{n}，让孩子说出百位、十位、个位分别是什么。范围：100-999。',
              constraints: { min: 100, max: 999 },
            },
          ],
        },
        {
          id: 'math-g2-num-10000',
          name: '万以内数的认识',
          description: '认识万以内的数，掌握四位数的读写',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-num-1000'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示数字{n}，让孩子读出来并写出来。范围：1000-9999。注意中间有0的读法。',
              constraints: { min: 1000, max: 9999 },
            },
            {
              type: 'multiple-choice',
              prompt: '下面哪个数最大/最小？展示4个万以内的数进行比较。',
              constraints: { max: 9999, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g2-m5',
      name: '长度与时间',
      description: '认识厘米和米，认识时间单位',
      order: 5,
      knowledgeNodes: [
        {
          id: 'math-g2-length',
          name: '厘米和米',
          description: '认识厘米和米，建立长度观念',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{object}，估计它大约有多长？选择合适的单位（厘米或米）。',
              constraints: { units: ['厘米', '米'] },
            },
            {
              type: 'multiple-choice',
              prompt: '1米 = ? 厘米。提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g2-time',
          name: '认识时间',
          description: '认识时、分、秒，掌握简单时间计算',
          difficulty: 4,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g1-clock'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '钟面上显示的是{hour}时{minute}分，用数字怎么表示？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g2-mass',
          name: '克和千克',
          description: '认识克和千克，感受物体的轻重',
          difficulty: 3,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '一个{object}大约重多少？选择合适的答案（用克或千克）。',
              constraints: { units: ['克', '千克'], optionCount: 3 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
