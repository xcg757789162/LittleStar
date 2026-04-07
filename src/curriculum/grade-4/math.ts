/**
 * 四年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-4',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g4-m1',
      name: '大数的认识与运算',
      description: '认识万以上的数，掌握三位数乘两位数',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g4-large-numbers',
          name: '大数的认识',
          description: '认识万、十万、百万、千万、亿，掌握大数的读写',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g2-num-10000'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '读出数字{n}，注意每四位一级的读法规则。范围：万~亿。',
              constraints: { min: 10000, max: 100000000 },
            },
            {
              type: 'multiple-choice',
              prompt: '{n} 读作什么？或 {chinese_num} 写作什么？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-multiply-3by2',
          name: '三位数乘两位数',
          description: '掌握三位数乘两位数的笔算方法',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-multiply-2digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} × {b} = ?，其中 a 为三位数，b 为两位数。提供4个选项。',
              constraints: { minMultiplicand: 100, maxMultiplicand: 999, minMultiplier: 10, maxMultiplier: 99, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-divide-2digit',
          name: '除数是两位数的除法',
          description: '掌握除数是两位数的除法笔算，试商方法',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-divide-1digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} ÷ {b} = ?，其中 b 为两位数。提供4个选项。',
              constraints: { maxDividend: 9999, minDivisor: 10, maxDivisor: 99, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g4-m2',
      name: '运算律与简便计算',
      description: '加法交换律结合律，乘法交换律结合律分配律',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g4-add-laws',
          name: '加法运算律',
          description: '掌握加法交换律和结合律，运用简便计算',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['math-g3-add-3digit'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用简便方法计算：{expression}。提示：运用加法交换律或结合律。提供4个选项。',
              constraints: { laws: ['交换律', '结合律'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-multiply-laws',
          name: '乘法运算律',
          description: '掌握乘法交换律、结合律和分配律',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-multiply-3by2'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '用简便方法计算：{expression}。提示：运用乘法分配律。提供4个选项。',
              constraints: { laws: ['交换律', '结合律', '分配律'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-four-operations',
          name: '四则混合运算',
          description: '掌握含括号的四则混合运算顺序',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-add-laws', 'math-g4-multiply-laws'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '按正确顺序计算：{expression}。注意先乘除后加减，有括号先算括号。提供4个选项。',
              constraints: { operations: 3, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g4-m3',
      name: '小数',
      description: '小数的意义和性质，小数加减法',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g4-decimal-concept',
          name: '小数的意义',
          description: '理解小数的意义，掌握小数的读写和比较',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g3-fraction-concept'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '0.{n} 表示十分之{n}，0.0{m} 表示百分之{m}。用图形展示小数的含义。',
              constraints: { maxDecimalPlaces: 2 },
            },
            {
              type: 'multiple-choice',
              prompt: '比较 {a} 和 {b} 的大小（两个小数）。提供3个选项（>、=、<）。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'math-g4-decimal-add-sub',
          name: '小数加减法',
          description: '掌握小数加法和减法的笔算方法',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-decimal-concept'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '竖式计算 {a} + {b} = ? 或 {a} - {b} = ?（小数运算，注意小数点对齐）。提供4个选项。',
              constraints: { maxDecimalPlaces: 2, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-decimal-multiply',
          name: '小数乘法',
          description: '掌握小数乘整数和小数乘小数',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g4-decimal-add-sub', 'math-g4-multiply-3by2'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a} × {b} = ?（至少一个是小数）。注意确定积的小数点位置。提供4个选项。',
              constraints: { maxDecimalPlaces: 2, optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g4-m4',
      name: '图形与角',
      description: '角的度量，平行四边形和梯形',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g4-angle',
          name: '角的度量',
          description: '认识量角器，测量和画指定度数的角',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g3-perimeter'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '这个角是多少度？用量角器测量。角的类型：锐角(<90°)/直角(90°)/钝角(>90°)/平角(180°)。',
              constraints: { maxDegree: 180 },
            },
            {
              type: 'multiple-choice',
              prompt: '一个角是{degree}度，它是什么角？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-parallel-perpendicular',
          name: '平行与垂直',
          description: '认识平行线和垂线，掌握画法',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g4-angle'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '下面哪组线是互相平行的？哪组是互相垂直的？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g4-quadrilateral',
          name: '平行四边形和梯形',
          description: '认识平行四边形和梯形的特征',
          difficulty: 5,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['math-g4-parallel-perpendicular'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '下面哪个图形是平行四边形/梯形？说出它的特征。提供4个选项。',
              constraints: { shapes: ['平行四边形', '梯形', '长方形', '正方形'], optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
