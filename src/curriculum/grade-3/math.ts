/**
 * 三年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-3',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g3-m1',
      name: '万以内加减法',
      description: '三位数加减法笔算，连续进位和退位',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g3-add-3digit',
          name: '三位数加法（连续进位）',
          description: '掌握三位数加法笔算，包括连续进位',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-add-within-100'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} + {b} = ?，其中 a, b 为三位数。提供4个选项。',
              constraints: { min: 100, max: 999, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-sub-3digit',
          name: '三位数减法（连续退位）',
          description: '掌握三位数减法笔算，包括连续退位',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-sub-within-100'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} - {b} = ?，其中 a 为三位数。提供4个选项。',
              constraints: { minMinuend: 100, maxMinuend: 999, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-estimation',
          name: '估算',
          description: '用估算检验计算结果的合理性',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-add-3digit', 'math-g3-sub-3digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{a} + {b} 大约等于多少？用估算法选择最接近的答案。提供4个选项。',
              constraints: { optionCount: 4, method: 'estimation' },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g3-m2',
      name: '多位数乘法与除法',
      description: '多位数乘一位数、两三位数除以一位数',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g3-multiply-1digit',
          name: '多位数乘一位数',
          description: '掌握两三位数乘一位数的笔算',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-times-table-6-9'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} × {b} = ?，其中 a 为两三位数，b 为一位数。提供4个选项。',
              constraints: { maxMultiplicand: 999, maxMultiplier: 9, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-divide-1digit',
          name: '两三位数除以一位数',
          description: '掌握两三位数除以一位数的笔算',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g2-divide-within-table'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} ÷ {b} = ?，其中 a 为两三位数，b 为一位数。提供4个选项。',
              constraints: { maxDividend: 999, maxDivisor: 9, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-multiply-2digit',
          name: '两位数乘两位数',
          description: '掌握两位数乘两位数的笔算',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-multiply-1digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} × {b} = ?，其中 a, b 均为两位数。提供4个选项。',
              constraints: { min: 10, max: 99, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g3-m3',
      name: '分数的初步认识',
      description: '认识简单分数，比较同分母分数大小',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g3-fraction-concept',
          name: '分数的认识',
          description: '理解分数的含义，认识分子和分母',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g3-divide-1digit'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '把一个{shape}平均分成{n}份，取其中{m}份，用分数表示为 {m}/{n}。',
              constraints: { maxDenominator: 10 },
            },
            {
              type: 'multiple-choice',
              prompt: '图中涂色部分用分数怎样表示？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-fraction-compare',
          name: '分数比大小',
          description: '比较同分母分数或同分子分数的大小',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-fraction-concept'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '比较 {a}/{c} 和 {b}/{c}，哪个更大？同分母分数比较。提供3个选项。',
              constraints: { optionCount: 3, sameDenominator: true },
            },
          ],
        },
        {
          id: 'math-g3-fraction-add-sub',
          name: '同分母分数加减法',
          description: '计算同分母分数的加法和减法',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-fraction-compare'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a}/{c} + {b}/{c} = ? 或 {a}/{c} - {b}/{c} = ?，同分母运算。提供4个选项。',
              constraints: { maxDenominator: 10, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g3-m4',
      name: '图形与测量',
      description: '周长的认识与计算，面积的初步认识',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g3-perimeter',
          name: '周长',
          description: '理解周长的含义，计算长方形和正方形的周长',
          difficulty: 4,
          contentTypes: ['quiz'],
          prerequisites: ['math-g1-shapes-2d', 'math-g3-add-3digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '长方形的长是{length}厘米，宽是{width}厘米，周长是多少厘米？提供4个选项。',
              constraints: { maxSide: 50, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g3-area-concept',
          name: '面积的认识',
          description: '理解面积的含义，认识平方厘米、平方分米、平方米',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g3-perimeter'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示1平方{unit}的大小，让孩子感受面积单位。单位：厘米/分米/米。',
              constraints: { units: ['厘米', '分米', '米'] },
            },
          ],
        },
        {
          id: 'math-g3-area-rect',
          name: '长方形和正方形的面积',
          description: '计算长方形和正方形的面积',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-area-concept', 'math-g3-multiply-1digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '长方形的长是{length}厘米，宽是{width}厘米，面积是多少平方厘米？提供4个选项。',
              constraints: { maxSide: 30, optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
