/**
 * 二年级英语知识点大纲
 * 参考《义务教育英语课程标准（2022年版）》预备级
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'grade-2',
  subject: 'english',
  version: '2022-v1',
  reference: '《义务教育英语课程标准（2022年版）》预备级',
  modules: [
    {
      id: 'en-g2-m1',
      name: '自然拼读进阶',
      description: '长元音、辅音组合、常见拼读规则',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-g2-phonics-long-vowels',
          name: '长元音发音',
          description: '学习 a_e, i_e, o_e, u_e, ee, ea 等长元音规则',
          difficulty: 3,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: ['en-g1-phonics-cvc'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '单词"{word}"中的元音是长元音还是短元音？请跟读。如 cake(长a), cat(短a)。',
              constraints: { category: 'long-vowels' },
            },
          ],
        },
        {
          id: 'en-g2-phonics-blends',
          name: '辅音组合',
          description: '学习 bl, cl, fl, br, cr, fr, st, sp 等辅音组合',
          difficulty: 4,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: ['en-g1-phonics-consonants'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请拼读含辅音组合的单词：{word}。如 blue(bl), green(gr), star(st)。',
              constraints: { category: 'consonant-blends' },
            },
          ],
        },
        {
          id: 'en-g2-phonics-digraphs',
          name: '字母组合发音',
          description: '学习 sh, ch, th, wh, ck 等字母组合的发音',
          difficulty: 4,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g2-phonics-blends'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '"{digraph}"在单词"{word}"中发什么音？如 sh-ship, ch-chair, th-think。',
              constraints: { category: 'digraphs' },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g2-m2',
      name: '主题词汇拓展',
      description: '学习100个主题词汇（动物、食物、家庭、学校）',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-g2-vocab-animals',
          name: '动物词汇',
          description: '学习 cat, dog, bird, fish, rabbit, monkey, elephant 等动物词汇',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice', 'quiz'],
          prerequisites: ['en-g1-vocab-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{animal}的图片和英文"{word}"，配合发音。让孩子说：I like {word}s。',
              constraints: { category: 'animals', count: 15 },
            },
          ],
        },
        {
          id: 'en-g2-vocab-food',
          name: '食物词汇',
          description: '学习 apple, banana, cake, milk, rice, bread, egg 等食物词汇',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice', 'quiz'],
          prerequisites: ['en-g1-vocab-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{food}的图片和英文"{word}"。引导说：I like {word}. / I don\'t like {word}.',
              constraints: { category: 'food', count: 15 },
            },
          ],
        },
        {
          id: 'en-g2-vocab-family',
          name: '家庭成员词汇',
          description: '学习 father, mother, brother, sister, grandpa, grandma 等家庭成员词汇',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-g1-vocab-body'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示家庭成员图片，教孩子说：This is my {member}。',
              constraints: { members: ['father', 'mother', 'brother', 'sister', 'grandpa', 'grandma'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g2-m3',
      name: '简单句型',
      description: '学习基础句型 I have / I like / It is',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-g2-sentence-i-have',
          name: 'I have... 句型',
          description: '学习用 I have... 描述拥有的事物',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g2-vocab-animals', 'en-g2-vocab-food'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '看图说话：I have a {object}. 如 I have a cat. I have two apples.',
              constraints: { pattern: 'I have + noun' },
            },
            {
              type: 'multiple-choice',
              prompt: '看图选择正确的句子描述图片内容。提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-g2-sentence-i-like',
          name: 'I like... 句型',
          description: '学习用 I like... 表达喜好',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g2-vocab-animals', 'en-g2-vocab-food'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '表达你的喜好：I like {noun}. / I don\'t like {noun}.',
              constraints: { pattern: 'I like/don\'t like + noun' },
            },
          ],
        },
        {
          id: 'en-g2-sentence-it-is',
          name: 'It is... 句型',
          description: '学习用 It is... 描述事物特征',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g1-vocab-colors'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '描述图片中的事物：It is {adjective}. 如 It is big. It is red.',
              constraints: { pattern: 'It is + adjective' },
            },
            {
              type: 'multiple-choice',
              prompt: '选择正确的描述：It is ___. 提供3个选项。',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-g2-m4',
      name: '听说对话',
      description: '简单日常对话练习',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-g2-dialogue-intro',
          name: '自我介绍',
          description: '学习用英语做简单的自我介绍',
          difficulty: 3,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g1-greetings', 'en-g2-vocab-family'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请用英语介绍自己：My name is ___. I am ___ years old. I like ___.',
              constraints: { pattern: 'self-introduction' },
            },
          ],
        },
        {
          id: 'en-g2-dialogue-daily',
          name: '日常对话',
          description: '学习购物、问路、点餐等简单场景对话',
          difficulty: 4,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-g2-dialogue-intro', 'en-g2-sentence-i-like'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '角色扮演：在{scenario}场景中进行对话。A: {lineA} B: {lineB}',
              constraints: { scenarios: ['购物', '问候', '点餐'] },
            },
          ],
        },
        {
          id: 'en-g2-songs-chants',
          name: '英语歌曲与韵文',
          description: '学唱英语儿歌，感受韵律',
          difficulty: 2,
          contentTypes: ['voice'],
          prerequisites: ['en-g1-greetings'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱英语儿歌：{song}。注意节奏和发音。',
              constraints: { category: 'nursery-rhymes' },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
