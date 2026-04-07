/**
 * 六年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-6',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g6-m1',
      name: '阅读理解（六年级）',
      description: '有一定速度地阅读，揣摩文章表达顺序和写作方法',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g6-writing-order',
          name: '揣摩表达顺序',
          description: '分析文章的表达顺序：时间顺序、空间顺序、逻辑顺序',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-extract-info'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '这篇文章采用了什么表达顺序？{text}。提供4个选项。',
              constraints: { orders: ['时间顺序', '空间顺序', '逻辑顺序', '事件发展顺序'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g6-writing-technique',
          name: '分析写作方法',
          description: '分析借景抒情、托物言志、以小见大等写作方法',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-expression-method'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '这篇文章运用了什么写作方法？{text}。提供4个选项。',
              constraints: { techniques: ['借景抒情', '托物言志', '以小见大', '先抑后扬'], optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g6-critical-reading',
          name: '评价与鉴赏',
          description: '对文章内容和写法发表自己的看法',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g6-writing-technique'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '你对文中{character/event}有什么看法？以下哪个评价最恰当？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g6-m2',
      name: '习作（六年级）',
      description: '写议论性文字、想象文、读后感',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g6-argumentative',
          name: '简单议论',
          description: '学习表达自己的观点并说明理由',
          difficulty: 8,
          contentTypes: ['writing'],
          prerequisites: ['cn-g5-narrative-detail', 'cn-g6-critical-reading'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '对于"{topic}"，你怎么看？请写出你的观点，并用2-3个理由支持。不少于300字。',
              constraints: { minWords: 300, format: 'argumentative' },
            },
          ],
        },
        {
          id: 'cn-g6-book-review',
          name: '读后感',
          description: '写读后感，表达阅读感受和思考',
          difficulty: 7,
          contentTypes: ['writing'],
          prerequisites: ['cn-g6-critical-reading', 'cn-g5-revision'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '读完《{book}》后，写一篇读后感。要求：简介内容+深入感受+联系实际。不少于350字。',
              constraints: { minWords: 350, format: 'book-review' },
            },
          ],
        },
        {
          id: 'cn-g6-creative-writing',
          name: '创意写作',
          description: '发挥想象，写科幻故事或童话',
          difficulty: 8,
          contentTypes: ['writing'],
          prerequisites: ['cn-g5-descriptive-writing', 'cn-g6-argumentative'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '以"{opening}"为开头，写一个{genre}故事。要求情节完整、想象丰富。不少于400字。',
              constraints: { minWords: 400, genres: ['科幻', '童话', '冒险'], format: 'creative' },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g6-m3',
      name: '综合素养',
      description: '古文阅读、口语交际、信息整合',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g6-classical-chinese',
          name: '简单文言文阅读',
          description: '借助注释理解简单的文言文',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-ancient-poetry'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读文言文：{text}。"{word}"在文中的意思是什么？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g6-oral-expression',
          name: '口语交际',
          description: '能围绕话题有条理地表达观点',
          difficulty: 6,
          contentTypes: ['voice'],
          prerequisites: ['cn-g5-extract-info'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请围绕"{topic}"发表你的看法，说清楚你的观点和理由（1-2分钟）。',
              constraints: { maxMinutes: 2 },
            },
          ],
        },
        {
          id: 'cn-g6-info-integration',
          name: '信息整合',
          description: '综合多种材料提取和整合信息',
          difficulty: 8,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-extract-info', 'cn-g6-critical-reading'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读以下两则材料，{material_a} 和 {material_b}，综合判断以下哪个结论正确。提供4个选项。',
              constraints: { materialCount: 2, optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
