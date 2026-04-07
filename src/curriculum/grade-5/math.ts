/**
 * 五年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-5',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g5-m1',
      name: '小数乘除法',
      description: '小数乘法、小数除法、循环小数',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g5-decimal-multiply',
          name: '小数乘小数',
          description: '掌握小数乘小数的计算方法，确定积的小数位数',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-decimal-multiply'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} × {b} = ?（两个小数相乘）。提供4个选项。',
              constraints: { maxDecimalPlaces: 3, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-decimal-divide',
          name: '小数除法',
          description: '掌握除数是小数的除法，理解循环小数',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-decimal-multiply', 'math-g4-divide-2digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} ÷ {b} = ?（除数为小数，先转化）。提供4个选项。',
              constraints: { maxDecimalPlaces: 2, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-recurring-decimal',
          name: '循环小数',
          description: '认识循环小数，学会用简写表示',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-decimal-divide'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{a} ÷ {b} 的商是循环小数吗？如果是，循环节是什么？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g5-m2',
      name: '因数与倍数',
      description: '因数和倍数、质数合数、公因数公倍数',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g5-factor-multiple',
          name: '因数和倍数',
          description: '理解因数和倍数的概念，找一个数的因数和倍数',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-multiply-3by2'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{n} 的所有因数有哪些？/ {n} 的倍数中最小的三个是？提供4个选项。',
              constraints: { max: 100, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-prime-composite',
          name: '质数与合数',
          description: '判断质数和合数，分解质因数',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-factor-multiple'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{n} 是质数还是合数？/ 在 {list} 中找出所有质数。提供4个选项。',
              constraints: { max: 100, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-gcf-lcm',
          name: '最大公因数和最小公倍数',
          description: '求两个数的最大公因数和最小公倍数',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-prime-composite'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{a} 和 {b} 的最大公因数是？最小公倍数是？提供4个选项。',
              constraints: { max: 100, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g5-m3',
      name: '分数的意义和运算',
      description: '真分数假分数、分数基本性质、异分母分数加减法',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g5-fraction-types',
          name: '真分数、假分数和带分数',
          description: '理解真分数、假分数概念，掌握假分数与带分数互化',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-fraction-concept'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '将假分数 {a}/{b} 化为带分数。/ 将带分数化为假分数。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-fraction-property',
          name: '分数基本性质',
          description: '分数的分子分母同乘或同除以一个数（不为0），分数大小不变',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-fraction-types', 'math-g5-gcf-lcm'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '将 {a}/{b} 化为最简分数。/ 将 {a}/{b} 化为分母是 {n} 的分数。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-fraction-add-sub-diff',
          name: '异分母分数加减法',
          description: '先通分再计算异分母分数的加减法',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-fraction-property'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a}/{b} + {c}/{d} = ? 或 {a}/{b} - {c}/{d} = ?（异分母）。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g5-m4',
      name: '图形面积与体积',
      description: '三角形和平行四边形面积、长方体正方体体积',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g5-triangle-area',
          name: '三角形面积',
          description: '推导并运用三角形面积公式：底×高÷2',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-area-rect'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '三角形底 {base}cm，高 {height}cm，面积是多少？提供4个选项。',
              constraints: { maxSide: 50, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-parallelogram-area',
          name: '平行四边形和梯形面积',
          description: '推导并运用平行四边形和梯形面积公式',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-triangle-area', 'math-g4-quadrilateral'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '梯形上底 {a}cm，下底 {b}cm，高 {h}cm，面积是多少？提供4个选项。',
              constraints: { maxSide: 30, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g5-cuboid-volume',
          name: '长方体和正方体体积',
          description: '认识体积单位，计算长方体和正方体的体积',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-parallelogram-area', 'math-g5-decimal-multiply'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '长方体长 {l}cm，宽 {w}cm，高 {h}cm，体积是多少立方厘米？提供4个选项。',
              constraints: { maxSide: 20, optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
