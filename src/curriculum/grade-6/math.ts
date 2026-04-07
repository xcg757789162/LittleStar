/**
 * 六年级数学知识点大纲
 * 参考《义务教育数学课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-6',
  subject: 'math',
  version: '2022-v1',
  reference: '《义务教育数学课程标准（2022年版）》',
  modules: [
    {
      id: 'math-g6-m1',
      name: '分数乘除法',
      description: '分数乘法、分数除法、分数混合运算',
      order: 1,
      knowledgeNodes: [
        {
          id: 'math-g6-fraction-multiply',
          name: '分数乘法',
          description: '掌握分数乘整数和分数乘分数',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-fraction-add-sub-diff'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a}/{b} × {c}/{d} = ?。先约分再计算。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-fraction-divide',
          name: '分数除法',
          description: '掌握分数除法——除以一个数等于乘它的倒数',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-fraction-multiply'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {a}/{b} ÷ {c}/{d} = ?。化为乘以倒数再计算。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-fraction-mixed',
          name: '分数混合运算',
          description: '含分数的四则混合运算，运用运算律简便计算',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-fraction-divide', 'math-g4-four-operations'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '计算 {expression}（含分数的混合运算）。提供4个选项。',
              constraints: { optionCount: 4, operations: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g6-m2',
      name: '比和比例',
      description: '比的意义、比例、正比例与反比例',
      order: 2,
      knowledgeNodes: [
        {
          id: 'math-g6-ratio',
          name: '比的意义',
          description: '理解比的意义，化简比和求比值',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-fraction-divide'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '化简比 {a}:{b}。/ {a}:{b} 的比值是多少？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-proportion',
          name: '比例',
          description: '理解比例的意义，解比例',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-ratio'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '解比例：{a}:{b} = {c}:x，求 x。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-direct-inverse',
          name: '正比例与反比例',
          description: '判断两个量是正比例还是反比例关系',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-proportion'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{quantity_a} 和 {quantity_b} 成什么关系？如：速度一定，路程和时间成正比例。提供3个选项。',
              constraints: { options: ['正比例', '反比例', '不成比例'], optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g6-m3',
      name: '百分数',
      description: '百分数的意义和应用',
      order: 3,
      knowledgeNodes: [
        {
          id: 'math-g6-percent-concept',
          name: '百分数的意义',
          description: '理解百分数的意义，百分数与分数小数的互化',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-ratio', 'math-g5-decimal-multiply'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '把 {value} 化为百分数。/ 把 {percent}% 化为分数和小数。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-percent-application',
          name: '百分数应用题',
          description: '解决折扣、利率、成数等实际问题',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-percent-concept'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '{word_problem}（涉及百分数的应用题）。提供4个选项。',
              constraints: { types: ['折扣', '利率', '成数', '利润'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'math-g6-m4',
      name: '圆与统计',
      description: '圆的周长和面积，扇形统计图',
      order: 4,
      knowledgeNodes: [
        {
          id: 'math-g6-circle',
          name: '圆的周长和面积',
          description: '掌握圆的周长（C=πd）和面积（S=πr²）公式',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g5-parallelogram-area', 'math-g5-decimal-multiply'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '圆的半径是 {r} cm，周长是多少？面积是多少？（π取3.14）提供4个选项。',
              constraints: { maxRadius: 20, pi: 3.14, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-cylinder-cone',
          name: '圆柱和圆锥体积',
          description: '计算圆柱的表面积和体积、圆锥的体积',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-circle', 'math-g5-cuboid-volume'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '圆柱底面半径 {r}cm，高 {h}cm，体积是多少？（π取3.14）提供4个选项。',
              constraints: { maxRadius: 10, maxHeight: 20, optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-pie-chart',
          name: '扇形统计图',
          description: '认读扇形统计图，解决简单统计问题',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-percent-concept', 'math-g6-circle'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '根据扇形统计图回答：{category}占总数的百分之几？是多少？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'math-g6-algebra-intro',
          name: '用字母表示数',
          description: '用字母表示数量关系，解简易方程',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['math-g6-fraction-mixed'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '解方程：{equation}。提供4个选项。',
              constraints: { maxUnknowns: 1, optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
