/**
 * 英语亲子互动活动数据
 * 涵盖字母、儿歌、日常对话、数字、综合等多种类型
 */

/** 亲子活动类型 */
export type ParentActivityType = 'sing' | 'find' | 'play' | 'draw' | 'talk'

/** 亲子活动定义 */
export interface ParentActivity {
  id: string
  /** 关联的知识点 ID 或 subject */
  relatedNodeIds: string[]
  /** 亲子小任务描述（面向孩子） */
  taskDescription: string
  /** 任务指导（面向家长） */
  parentGuide: string
  /** 家长指导卡片内容 */
  guidanceCard: string
  /** 线下延伸建议 */
  offlineExtension: string
  /** 活动类型 */
  type: ParentActivityType
  /** 预估时间（分钟） */
  estimatedMinutes: number
}

/** 英语亲子活动列表 */
export const englishParentActivities: ParentActivity[] = [
  // ===== 字母类 =====
  {
    id: 'pa-letter-find-home',
    relatedNodeIds: ['english-letter-a', 'english-letter-b', 'english-letter-c'],
    taskDescription: '和爸爸妈妈一起，找找家里以 A 开头的东西！Apple、Ant...你能找到几个？',
    parentGuide: '引导孩子在家中寻找以特定字母开头的物品，用英语说出名称。可以从 A 开始，每次换一个字母。',
    guidanceCard: '🏠 字母寻宝游戏：和孩子一起在家中找以某个字母开头的物品，鼓励孩子用英语说出来。',
    offlineExtension: '出门散步时，也可以玩这个游戏！看看路上有什么以今天学的字母开头的东西。',
    type: 'find',
    estimatedMinutes: 5,
  },
  {
    id: 'pa-letter-sky-write',
    relatedNodeIds: ['eng-alphabet-a', 'eng-alphabet-b', 'eng-alphabet-c'],
    taskDescription: '用手指在空中写字母！A-B-C，写得越大越好！',
    parentGuide: '和孩子一起用手指在空中书写字母，可以边写边念。尝试大写和小写，让孩子感受字母的形状。',
    guidanceCard: '✍️ 空中写字：和孩子面对面，一起用手指在空中写字母，边写边念出字母名称。',
    offlineExtension: '洗澡时可以在雾气玻璃上写字母，或者用水在地面上画字母，让学习融入日常。',
    type: 'play',
    estimatedMinutes: 3,
  },
  {
    id: 'pa-letter-body-shape',
    relatedNodeIds: ['eng-alphabet-a', 'eng-alphabet-b', 'eng-alphabet-c'],
    taskDescription: '用身体变成字母的样子！可以变成 T 吗？试试看！',
    parentGuide: '和孩子一起用身体摆出字母的形状，如 T（双臂平举）、L（一只手贴身体一只手伸出）。',
    guidanceCard: '🤸 身体字母：和孩子一起用身体摆出字母形状，拍照记录，看看谁摆得更像！',
    offlineExtension: '可以和家人一起合作摆出更复杂的字母，比如 H 需要两个人配合。拍照做成字母墙！',
    type: 'play',
    estimatedMinutes: 5,
  },

  // ===== 儿歌类 =====
  {
    id: 'pa-song-abc',
    relatedNodeIds: ['eng-song-abc', 'eng-alphabet-a'],
    taskDescription: '和爸爸妈妈一起唱 ABC 歌！Come on, let\'s sing together! 🎵',
    parentGuide: '播放 ABC 歌，和孩子一起唱。可以加上手指指向对应的字母卡片，或者边唱边做动作。',
    guidanceCard: '🎵 一起唱歌：播放 ABC 歌，和孩子一起大声唱出来。可以拍手打节奏。',
    offlineExtension: '在车上、走路时都可以哼唱 ABC 歌。试试倒着唱 ZYX... 锻炼反应力！',
    type: 'sing',
    estimatedMinutes: 3,
  },
  {
    id: 'pa-song-twinkle',
    relatedNodeIds: ['eng-song-twinkle'],
    taskDescription: '和爸爸妈妈一起唱 Twinkle Twinkle Little Star！做星星闪闪的动作！⭐',
    parentGuide: '唱 "Twinkle Twinkle Little Star" 时，教孩子用双手做闪闪发光的动作（手指张开合上）。',
    guidanceCard: '⭐ 星星歌：和孩子一起唱这首经典儿歌，边唱边用手做星星闪烁的动作。',
    offlineExtension: '晚上看星星时唱这首歌，让孩子感受歌词的含义。问问孩子 "How many stars can you see?"',
    type: 'sing',
    estimatedMinutes: 3,
  },
  {
    id: 'pa-song-head-shoulders',
    relatedNodeIds: ['english-song-head-shoulders', 'english-tpr-body', 'english-tpr-touch'],
    taskDescription: '和爸爸妈妈一起唱 Head, Shoulders, Knees and Toes！摸到正确的位置！',
    parentGuide: '唱 "Head, Shoulders, Knees and Toes" 时做相应动作，逐渐加快速度，增加趣味性。',
    guidanceCard: '🏃 身体歌：边唱边做动作，每唱到一个身体部位就摸一下。可以越唱越快！',
    offlineExtension: '换成其他身体部位编新歌词，如 "Eyes, ears, mouth and nose"，创造属于你们的版本！',
    type: 'sing',
    estimatedMinutes: 5,
  },

  // ===== 日常对话类 =====
  {
    id: 'pa-talk-greet-family',
    relatedNodeIds: ['eng-greet-hello', 'eng-greet-goodbye'],
    taskDescription: '用英语和家人打招呼！Good morning, Daddy! Hello, Mommy! 💗',
    parentGuide: '鼓励孩子每天起床时用英语问候家人。提供固定句式："Good morning, [name]!" "Good night!"',
    guidanceCard: '👋 英语问候：养成每天用英语打招呼的习惯，从简单的 Hello/Good morning 开始。',
    offlineExtension: '设立"英语时间"，每天晚餐前5分钟全家只用英语交流简单问候和感谢。',
    type: 'talk',
    estimatedMinutes: 2,
  },
  {
    id: 'pa-talk-room-colors',
    relatedNodeIds: ['english-colors'],
    taskDescription: '看看房间里有什么颜色？用英语说出来！Red chair! Blue book!',
    parentGuide: '指着房间里的物品，引导孩子用 "颜色 + 物品" 的方式说英语，如 "Red apple", "Blue cup"。',
    guidanceCard: '🎨 颜色描述：在家指着物品，让孩子说出颜色。"What color is this?" "It\'s red!"',
    offlineExtension: '出门时也玩颜色游戏："I see something blue!" 让孩子猜是什么。',
    type: 'talk',
    estimatedMinutes: 5,
  },
  {
    id: 'pa-talk-whats-this',
    relatedNodeIds: ['english-dialogue-food', 'english-dialogue-shopping'],
    taskDescription: '指着东西问：What\'s this? 然后大声说出来！This is a cup!',
    parentGuide: '用 "What\'s this?" 和 "This is a ___" 的句式，让孩子练习日常物品的英语说法。',
    guidanceCard: '🤔 What\'s this 游戏：指着家里常见物品互相提问，练习 "What\'s this? This is a ___."',
    offlineExtension: '每天选3个新物品教孩子英语说法，一周下来就能学21个新词！',
    type: 'talk',
    estimatedMinutes: 5,
  },

  // ===== 数字类 =====
  {
    id: 'pa-number-count-fruits',
    relatedNodeIds: ['english-numbers', 'english-fruits'],
    taskDescription: '数一数家里有几个苹果？One, two, three... 用英语数！🍎',
    parentGuide: '让孩子数家里的水果、玩具等实物，用英语从 1 数到 10。每数一个就用手指点一下。',
    guidanceCard: '🔢 英语数数：让孩子数家里的物品（水果、玩具），用英语说出数字。',
    offlineExtension: '去超市时让孩子帮忙数水果："Please count the apples. How many apples?"',
    type: 'find',
    estimatedMinutes: 3,
  },
  {
    id: 'pa-number-count-shoes',
    relatedNodeIds: ['english-numbers'],
    taskDescription: '数数家里有几只鞋子？Two shoes make a pair! 👟',
    parentGuide: '整理鞋子时让孩子数数，引入 "pair" 的概念。"One pair, two pairs..."',
    guidanceCard: '👟 数鞋子：整理鞋架时让孩子用英语数鞋子，学习 pair（一双）的概念。',
    offlineExtension: '数袜子、手套等成对物品，强化 "pair" 的概念。问 "How many pairs?"',
    type: 'find',
    estimatedMinutes: 3,
  },

  // ===== 综合类 =====
  {
    id: 'pa-mix-color-sort',
    relatedNodeIds: ['english-colors'],
    taskDescription: '颜色分类游戏！把玩具按颜色分一分，用英语说：Red group! Blue group!',
    parentGuide: '准备不同颜色的物品（积木、蜡笔、玩具），让孩子按颜色分类，边分边用英语说颜色。',
    guidanceCard: '🧩 颜色分类：用家中物品（积木、蜡笔等）按颜色分类，练习颜色词汇。',
    offlineExtension: '洗衣服时让孩子帮忙按颜色分类，"Put the red clothes here, blue clothes there!"',
    type: 'play',
    estimatedMinutes: 5,
  },
  {
    id: 'pa-mix-spot-difference',
    relatedNodeIds: ['english-colors', 'english-animals'],
    taskDescription: '英语版找不同！看两幅图，找出不同的地方，用英语说出来！🔍',
    parentGuide: '准备两张相似但有差异的图片，让孩子找不同并用简单英语描述："This one has a cat!"',
    guidanceCard: '🔍 找不同：准备简单的找不同图片，让孩子用英语描述差异。',
    offlineExtension: '在绘本里也可以玩找不同："Can you find the difference between these two pages?"',
    type: 'play',
    estimatedMinutes: 5,
  },
  {
    id: 'pa-mix-draw-animal',
    relatedNodeIds: ['english-animals'],
    taskDescription: '画一只你最喜欢的动物，然后用英语告诉爸爸妈妈它是什么！🎨',
    parentGuide: '让孩子画一只动物，然后用英语说 "This is a [animal]." 可以描述颜色和大小。',
    guidanceCard: '🎨 画动物：让孩子画喜欢的动物，用英语说出名称和特征 "It\'s a big cat!"',
    offlineExtension: '去动物园或看动物纪录片时，让孩子用英语说出看到的动物名称。',
    type: 'draw',
    estimatedMinutes: 10,
  },
  {
    id: 'pa-mix-simon-says',
    relatedNodeIds: ['eng-body-head', 'eng-body-hand', 'eng-action-jump'],
    taskDescription: '和爸爸妈妈一起玩 Simon Says 游戏！Simon says touch your nose! 👃',
    parentGuide: '玩 "Simon Says" 游戏：只有说 "Simon says..." 开头的指令才需要做，锻炼英语听力。',
    guidanceCard: '🎮 Simon Says：经典英语指令游戏，锻炼听力和反应。只有 "Simon says" 开头的才做！',
    offlineExtension: '让孩子当 "Simon" 发号施令，练习说英语指令。全家一起玩更有趣！',
    type: 'play',
    estimatedMinutes: 5,
  },
]

/**
 * 根据关联知识点获取推荐的亲子活动
 */
export function getActivitiesByNodeIds(nodeIds: string[]): ParentActivity[] {
  return englishParentActivities.filter(
    (activity) => activity.relatedNodeIds.some((id) => nodeIds.includes(id)),
  )
}

/**
 * 随机获取一个亲子活动
 */
export function getRandomActivity(excludeIds?: string[]): ParentActivity {
  const available = excludeIds
    ? englishParentActivities.filter((a) => !excludeIds.includes(a.id))
    : englishParentActivities

  const pool = available.length > 0 ? available : englishParentActivities
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 获取推荐的线下延伸建议（基于当次学习的知识点）
 */
export function getOfflineExtensions(nodeIds: string[]): Array<{
  activityId: string
  extension: string
  type: ParentActivityType
}> {
  const related = getActivitiesByNodeIds(nodeIds)
  if (related.length === 0) {
    // 随机推荐 2 个
    const shuffled = [...englishParentActivities].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2).map((a) => ({
      activityId: a.id,
      extension: a.offlineExtension,
      type: a.type,
    }))
  }

  return related.slice(0, 3).map((a) => ({
    activityId: a.id,
    extension: a.offlineExtension,
    type: a.type,
  }))
}
