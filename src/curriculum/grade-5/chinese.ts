/**
 * 五年级语文知识点大纲
 * 参考《义务教育语文课程标准（2022年版）》
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-5',
  subject: 'chinese',
  version: '2022-v1',
  reference: '《义务教育语文课程标准（2022年版）》',
  modules: [
    {
      id: 'cn-g5-m1',
      name: '阅读理解（五年级）',
      description: '提高阅读速度，学习提取信息、体会表达方法',
      order: 1,
      knowledgeNodes: [
        {
          id: 'cn-g5-speed-reading',
          name: '提高阅读速度',
          description: '用较快速度默读，每分钟不少于300字',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g4-main-idea'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '快速阅读以下文章（约300字），回答问题。{text}。问题：{question}。提供4个选项。',
              constraints: { wordsPerMinute: 300, optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g5-extract-info',
          name: '提取关键信息',
          description: '从文章中提取关键信息，列出要点',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-speed-reading'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '阅读短文，下列哪项是文中提到的关键信息？{text}。提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g5-expression-method',
          name: '体会表达方法',
          description: '体会比喻、拟人、排比等修辞手法的效果',
          difficulty: 7,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g4-character-feeling'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '"{sentence}"运用了什么修辞手法？有什么表达效果？提供4个选项。',
              constraints: { methods: ['比喻', '拟人', '排比', '夸张'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g5-m2',
      name: '习作（五年级）',
      description: '写记叙文、写景文，学习修改作文',
      order: 2,
      knowledgeNodes: [
        {
          id: 'cn-g5-descriptive-writing',
          name: '写景状物',
          description: '学习描写景物，运用修辞手法使文章生动',
          difficulty: 7,
          contentTypes: ['writing'],
          prerequisites: ['cn-g4-narrative', 'cn-g5-expression-method'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '以"{title}"为题，写一篇写景文。要求：运用比喻或拟人手法，按一定顺序描写。不少于300字。',
              constraints: { minWords: 300, format: 'descriptive' },
            },
          ],
        },
        {
          id: 'cn-g5-narrative-detail',
          name: '记叙文细节描写',
          description: '学习通过动作、语言、心理描写刻画人物',
          difficulty: 7,
          contentTypes: ['writing'],
          prerequisites: ['cn-g4-narrative', 'cn-g4-character-feeling'],
          templatePrompts: [
            {
              type: 'handwriting',
              prompt: '写一个你印象深刻的人。要求：通过一两件事表现人物特点，注意动作和语言描写。不少于300字。',
              constraints: { minWords: 300, format: 'narrative-with-detail' },
            },
          ],
        },
        {
          id: 'cn-g5-revision',
          name: '修改作文',
          description: '学习修改自己的作文，增删改调',
          difficulty: 6,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g5-descriptive-writing'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '下面这段话有什么问题？应该怎样修改？{paragraph}。提供4个选项。',
              constraints: { problems: ['用词不当', '语序不通', '内容重复', '缺少过渡'], optionCount: 4 },
            },
          ],
        },
      ],
    },
    {
      id: 'cn-g5-m3',
      name: '古诗文与文学常识',
      description: '背诵古诗，了解古诗意思，积累文学常识',
      order: 3,
      knowledgeNodes: [
        {
          id: 'cn-g5-ancient-poetry',
          name: '古诗背诵与理解',
          description: '背诵指定古诗，理解诗意和诗人情感',
          difficulty: 6,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['cn-g4-character-feeling'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请背诵古诗《{title}》，作者{author}。',
              constraints: { level: 'grade-5' },
            },
            {
              type: 'multiple-choice',
              prompt: '古诗《{title}》中，"{line}"表达了诗人怎样的情感？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
        {
          id: 'cn-g5-literary-knowledge',
          name: '文学常识',
          description: '了解四大名著、常见作家作品等文学常识',
          difficulty: 5,
          contentTypes: ['quiz'],
          prerequisites: ['cn-g4-main-idea'],
          templatePrompts: [
            {
              type: 'multiple-choice',
              prompt: '《{book}》的作者是谁？/ {character} 是哪部名著中的人物？提供4个选项。',
              constraints: { optionCount: 4 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
