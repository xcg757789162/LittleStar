/**
 * 幼儿园英语知识点大纲（中班+大班）
 * 英语启蒙阶段
 * 参考《3-6岁儿童学习与发展指南》(2012) 及幼儿英语启蒙教育理念
 */

import type { GradeCurriculum } from '../types'

const curriculum: GradeCurriculum = {
  gradeLevel: 'middle-kindergarten',
  subject: 'english',
  version: '2012-v1',
  reference: '幼儿英语启蒙阶段',
  modules: [
    {
      id: 'en-kg-m1',
      name: '英语儿歌与基础问候',
      description: '通过儿歌和歌曲接触英语，学习基础问候语',
      order: 1,
      knowledgeNodes: [
        {
          id: 'en-kg-greetings',
          name: '基础问候语',
          description: '学习 Hello, Hi, Goodbye, Thank you 等基础问候语',
          difficulty: 1,
          contentTypes: ['voice', 'flashcard'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '请跟读：{greeting}。问候语：Hello / Hi / Goodbye / Thank you / Please。',
              constraints: { greetings: ['Hello', 'Hi', 'Goodbye', 'Thank you', 'Please'] },
            },
            {
              type: 'flashcard',
              prompt: '展示问候场景图片，让孩子说出合适的问候语。',
              constraints: { category: 'greetings' },
            },
          ],
        },
        {
          id: 'en-kg-songs',
          name: '英语儿歌',
          description: '学唱 ABC Song, Twinkle Twinkle Little Star 等英文儿歌',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱英文儿歌：{song}。感受英语的韵律和节奏。',
              constraints: { songs: ['ABC Song', 'Twinkle Twinkle', 'Head Shoulders', 'Old MacDonald'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m2',
      name: '基础词汇启蒙',
      description: '学习颜色、数字、动物等30个基础词汇',
      order: 2,
      knowledgeNodes: [
        {
          id: 'en-kg-colors',
          name: '颜色词汇',
          description: '学习 red, blue, green, yellow 等基础颜色词汇',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{color}色块，让孩子跟读英文：{word}。',
              constraints: { colors: ['red', 'blue', 'green', 'yellow', 'black', 'white'] },
            },
          ],
        },
        {
          id: 'en-kg-numbers-1-5',
          name: '数字 1-5',
          description: '学习数字 one, two, three, four, five 的英文',
          difficulty: 1,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{n}个物体和英文数字"{word}"，一起数：one, two, three...',
              constraints: { min: 1, max: 5 },
            },
          ],
        },
        {
          id: 'en-kg-animals',
          name: '动物词汇',
          description: '学习 cat, dog, fish, bird, rabbit 等常见动物英文',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-kg-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{animal}的可爱图片和英文"{word}"。引导说：It\'s a {word}!',
              constraints: { animals: ['cat', 'dog', 'fish', 'bird', 'rabbit'] },
            },
          ],
        },
        {
          id: 'en-kg-fruits',
          name: '水果词汇',
          description: '学习 apple, banana, orange, grape 等水果英文',
          difficulty: 2,
          contentTypes: ['flashcard', 'voice'],
          prerequisites: ['en-kg-colors'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示{fruit}的图片和英文"{word}"。练习：I like {word}s!',
              constraints: { fruits: ['apple', 'banana', 'orange', 'grape', 'watermelon'] },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m3',
      name: '简单指令与互动',
      description: '听懂并执行简单英语指令',
      order: 3,
      knowledgeNodes: [
        {
          id: 'en-kg-tpr',
          name: '全身反应指令',
          description: '听懂 Stand up, Sit down, Clap your hands 等指令并做动作',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '听指令并做动作：{instruction}！指令：Stand up / Sit down / Clap your hands / Jump / Turn around。',
              constraints: { instructions: ['Stand up', 'Sit down', 'Clap your hands', 'Jump', 'Turn around'] },
            },
          ],
        },
        {
          id: 'en-kg-simple-response',
          name: '简单应答',
          description: '能用 Yes/No, I like... 进行简单回应',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-greetings', 'en-kg-animals'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '回答问题：Do you like {item}? 用 Yes, I do. / No, I don\'t. 回答。',
              constraints: { category: 'simple-response' },
            },
            {
              type: 'multiple-choice',
              prompt: '老师问 "Do you like {item}?"，你想说"是的"，应该怎么回答？提供2个选项。',
              constraints: { optionCount: 2 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m4',
      name: '字母认读 A-Z',
      description: '系统认识 26 个英文字母大小写，从 A 到 Z 逐步学习',
      order: 4,
      knowledgeNodes: [
        {
          id: 'en-kg-letters-phase1',
          name: '字母 A-H（第一阶段）',
          description: '认识字母 A-H 的大小写，学习代表单词',
          difficulty: 1,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示字母 {letter} 的大小写和代表单词 {word}，配合 emoji 帮助记忆。',
              constraints: { letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
            },
            {
              type: 'multiple-choice',
              prompt: '哪个是字母 {letter}？/ 字母 {letter} 的下一个字母是什么？',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-kg-letters-phase2',
          name: '字母 I-Z（第二阶段）',
          description: '认识字母 I-Z 的大小写，完成全部 26 个字母学习',
          difficulty: 2,
          contentTypes: ['flashcard', 'quiz'],
          prerequisites: ['en-kg-letters-phase1'],
          templatePrompts: [
            {
              type: 'flashcard',
              prompt: '展示字母 {letter} 的大小写和代表单词 {word}，配合 emoji 帮助记忆。',
              constraints: { letters: ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] },
            },
            {
              type: 'multiple-choice',
              prompt: '哪个是字母 {letter}？/ 大写 {letter} 的小写是什么？',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m5',
      name: '英语儿歌磨耳朵',
      description: '通过 5 首经典英文儿歌培养语感和韵律感',
      order: 5,
      knowledgeNodes: [
        {
          id: 'en-kg-song-abc',
          name: 'ABC Song 字母歌',
          description: '学唱 ABC Song，通过旋律记住字母顺序',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱 ABC Song：A B C D E F G, H I J K L M N O P, Q R S T U V, W X Y and Z。',
              constraints: { song: 'ABC Song' },
            },
          ],
        },
        {
          id: 'en-kg-song-twinkle',
          name: 'Twinkle Twinkle Little Star',
          description: '学唱一闪一闪小星星英文版',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱 Twinkle Twinkle Little Star，感受英语韵律。',
              constraints: { song: 'Twinkle Twinkle Little Star' },
            },
          ],
        },
        {
          id: 'en-kg-song-macdonald',
          name: 'Old MacDonald Had a Farm',
          description: '学唱老麦克唐纳有个农场，认识动物叫声',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱 Old MacDonald Had a Farm，模仿各种动物叫声。',
              constraints: { song: 'Old MacDonald Had a Farm' },
            },
          ],
        },
        {
          id: 'en-kg-song-head-shoulders',
          name: 'Head, Shoulders, Knees and Toes',
          description: '学唱 TPR 儿歌，边唱边指身体部位',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱 Head, Shoulders, Knees and Toes，边唱边指对应身体部位。',
              constraints: { song: 'Head, Shoulders, Knees and Toes' },
            },
          ],
        },
        {
          id: 'en-kg-song-happy',
          name: 'If You\'re Happy and You Know It',
          description: '学唱互动儿歌，通过动作表达情感',
          difficulty: 1,
          contentTypes: ['voice'],
          prerequisites: [],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟唱 If You\'re Happy and You Know It，做对应动作（拍手、跺脚等）。',
              constraints: { song: 'If You\'re Happy and You Know It' },
            },
          ],
        },
      ],
    },
    {
      id: 'en-kg-m6',
      name: '日常对话场景',
      description: '5 个日常生活场景的英语对话练习',
      order: 6,
      knowledgeNodes: [
        {
          id: 'en-kg-dialogue-greetings',
          name: '打招呼 Greetings',
          description: '学习日常问候：Hello! How are you? I\'m fine, thank you!',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-greetings'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟读对话：Hello! How are you? I\'m fine, thank you!',
              constraints: { scenario: 'greetings' },
            },
            {
              type: 'multiple-choice',
              prompt: '别人说 {greeting}，你应该怎么回答？',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-kg-dialogue-colors',
          name: '颜色对话 Colors',
          description: '学习询问和回答颜色：What color is it? It\'s red!',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-colors'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟读对话：What color is it? It\'s {color}!',
              constraints: { colors: ['red', 'blue', 'green', 'yellow'] },
            },
            {
              type: 'multiple-choice',
              prompt: '看到 {color_emoji}，用英文怎么说这个颜色？',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-kg-dialogue-numbers',
          name: '数字对话 Numbers',
          description: '学习数数和回答数量：How many? One, two, three...',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-numbers-1-5'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟读数数：One, two, three, four, five! How many {item}?',
              constraints: { min: 1, max: 5 },
            },
            {
              type: 'multiple-choice',
              prompt: 'How many {item}? 数一数，一共有几个？',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-kg-dialogue-family',
          name: '家庭成员对话 Family',
          description: '学习介绍家人：This is my mom/dad/sister/brother.',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-dialogue-greetings'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟读：This is my {family_member}. I love my family!',
              constraints: { members: ['mom', 'dad', 'sister', 'brother'] },
            },
            {
              type: 'multiple-choice',
              prompt: '{family_member_cn} 用英文怎么说？',
              constraints: { optionCount: 3 },
            },
          ],
        },
        {
          id: 'en-kg-dialogue-food',
          name: '食物对话 Food',
          description: '学习表达食物偏好：I like apples. Do you like bananas?',
          difficulty: 2,
          contentTypes: ['voice', 'quiz'],
          prerequisites: ['en-kg-dialogue-colors', 'en-kg-dialogue-numbers'],
          templatePrompts: [
            {
              type: 'voice',
              prompt: '跟读对话：I like {food}! Do you like {food}?',
              constraints: { foods: ['apples', 'bananas', 'oranges', 'milk', 'bread'] },
            },
            {
              type: 'multiple-choice',
              prompt: '别人问 Do you like {food}?，你喜欢的话怎么回答？',
              constraints: { optionCount: 3 },
            },
          ],
        },
      ],
    },
  ],
}

export default curriculum
