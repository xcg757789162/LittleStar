/**
 * 温和引导型反馈模板库
 *
 * 设计原则：
 * - 三明治法则：肯定→引导→鼓励（低星级也要先肯定再引导）
 * - 防重复：连续调用不会返回相同文本
 * - 变量替换：支持 {word}/{goodPart}/{focusPart}/{syllable}
 * - 幼儿友好：所有文案都使用温柔、鼓励性语气
 */

/** 反馈阶段 */
export type FeedbackPhase = 'first_attempt' | 'retry' | 'after_drill' | 'perfect'

/** 所有有效反馈阶段 */
export const FEEDBACK_PHASES: FeedbackPhase[] = ['first_attempt', 'retry', 'after_drill', 'perfect']

/** 反馈变量 */
export interface FeedbackVariables {
  word?: string
  goodPart?: string
  focusPart?: string
  syllable?: string
}

/** 星级范围 */
type StarLevel = 1 | 2 | 3 | 4 | 5

// ============================================================
// 模板数据
// ============================================================

/**
 * 模板库结构：templates[stars][phase] = string[]
 * 每个星级+阶段组合至少 3 条模板
 */
const templates: Record<StarLevel, Record<FeedbackPhase, string[]>> = {
  1: {
    first_attempt: [
      '你真勇敢，敢开口说 {word}！我们一起再来一次好不好？',
      '哇，你已经开始尝试说 {word} 啦！让我们慢慢来，再试一次～',
      '好棒，你尝试了！{word} 有点难对不对？没关系，我们慢慢练～',
      '你真了不起，敢挑战 {word}！我们一起多练几次就会更好哦！',
    ],
    retry: [
      '你在进步呢！{word} 越来越好了，再来一次吧～',
      '比刚才好多啦！{word} 我们再练一次，一定会更棒！',
      '你很努力呢！{word} 我们一起加油，再试一次～',
      '很好的尝试！{focusPart} 这部分我们再多练练，加油！',
    ],
    after_drill: [
      '你跟着音节练了一遍 {syllable}，真棒！再试试整个词吧～',
      '一个音节一个音节练，{syllable}，你做得很好！来挑战完整的词吧！',
      '{syllable} 你练得不错呢！试试把它们连起来说 {word}～',
      '音节练习做得好！{syllable}，现在我们把 {word} 完整说一遍吧！',
    ],
    perfect: [
      '你一直在努力练习 {word}，真棒！下次会更好的！',
      '今天的练习很棒！{word} 越来越熟练了呢～',
      '你已经很勇敢了！{word} 我们下次继续加油！',
      '坚持练习就是最棒的！你今天学了 {word}，好厉害！',
    ],
  },
  2: {
    first_attempt: [
      '{word} 说得不错哦！有些地方可以再清楚一点，我们试试？',
      '你说的 {word} 我听到啦！{focusPart} 这部分我们可以再练练～',
      '很好的开始！{word} 的 {goodPart} 说得很棒，{focusPart} 再努力一下！',
      '你的 {word} 说得越来越有感觉啦！我们再来一次好不好？',
    ],
    retry: [
      '进步啦！{word} 比刚才清楚多了，{focusPart} 再加把劲！',
      '你的 {goodPart} 发得好准！{focusPart} 也快学会了，继续～',
      '{word} 越来越好了！再练一次 {focusPart}，你一定可以的！',
      '每次都在进步呢！{focusPart} 这部分再清楚一点就更棒了！',
    ],
    after_drill: [
      '音节拆开练 {syllable} 做得好！试试连起来说 {word} 吧～',
      '{syllable} 你拆得很准确！现在来挑战完整的 {word}！',
      '分音节练习真棒！{syllable}，让我们把 {word} 连贯地说一遍～',
      '你看，{syllable} 这样拆开练就简单多了！来说整个 {word} 试试？',
    ],
    perfect: [
      '你练习 {word} 很认真！继续保持这种劲头！',
      '今天 {word} 的进步很明显呢，你做得很好！',
      '{word} 越来越熟练了！你的努力没有白费～',
      '棒极了，{word} 练得真好！期待你下次更出色的表现！',
    ],
  },
  3: {
    first_attempt: [
      '{word} 说得很好哦！{goodPart} 特别棒，{focusPart} 再清楚一点就更好了！',
      '真不错！你的 {word} 说得很有感觉～再练一下 {focusPart} 吧！',
      '好厉害！{word} 的 {goodPart} 你说得像小老师一样！{focusPart} 也快完美了～',
      '{word} 说得很好！差一点点就能拿更多星星了，加油～',
    ],
    retry: [
      '哇，进步好大！{word} 比刚才好多了，{focusPart} 也更清楚了！',
      '你真的在进步！{word} 越说越好了，{goodPart} 完美！',
      '太棒了！{focusPart} 你也越来越有感觉了，{word} 快要满分啦！',
      '每一次都更好！{word} 快要完美了，再来最后一次好不好？',
    ],
    after_drill: [
      '音节练习 {syllable} 做得太棒了！把 {word} 连起来说一定更好！',
      '{syllable} 拆开练以后是不是简单多了？来挑战完整的 {word}！',
      '分音节练习很有效果！{syllable}，{word} 肯定能说得更好！',
      '看，{syllable} 你都掌握了！现在 {word} 对你来说小菜一碟！',
    ],
    perfect: [
      '你的 {word} 说得越来越标准了！三颗星，继续加油！',
      '真棒！{word} 说得好有自信！再练练就能拿更多星星！',
      '{word} 三颗星！你已经很棒了，再接再厉！',
      '好厉害，{word} 说得真好！你是个发音小能手！',
    ],
  },
  4: {
    first_attempt: [
      '哇，{word} 说得真棒！差一点就完美了！',
      '太厉害了！{word} 你说得好标准呀！四颗星！',
      '{word} 说得太好了！{goodPart} 完美，离满分就差一点点～',
      '好棒！{word} 你说得跟老师一样好了！',
    ],
    retry: [
      '每次都在进步！{word} 已经说得非常好了！',
      '{word} 越来越完美了！你的努力真的有效果！',
      '太棒了！{word} 这次说得比上次更标准了！',
      '你真的很厉害！{word} 四颗星，快要满分啦！',
    ],
    after_drill: [
      '音节练习后 {word} 说得更清楚了！{syllable} 帮助很大！',
      '{syllable} 练习得真好！{word} 现在说得特别标准！',
      '分音节练习后效果明显！{word} 你说得像小外教一样！',
      '{syllable} 掌握得太好了！{word} 四颗星，真了不起！',
    ],
    perfect: [
      '太棒了！{word} 四颗星！你是班上的发音之星！',
      '{word} 说得太好了！四颗星！我为你骄傲！',
      '真了不起！{word} 说得好标准！继续保持！',
      '哇，{word} 说得像小外教一样好！四颗星！',
    ],
  },
  5: {
    first_attempt: [
      '完美！{word} 说得太标准了！五颗星满分！🌟',
      '太厉害了！{word} 一次就说得这么完美！你是发音小天才！',
      '哇，满分！{word} 你说得跟外教老师一模一样！',
      '五颗星！{word} 简直完美！你太棒了！',
    ],
    retry: [
      '经过练习，{word} 终于满分啦！五颗星！🌟',
      '你的努力有了最好的回报！{word} 满分，太棒了！',
      '坚持练习就是胜利！{word} 五颗星，完美！',
      '从开始到现在，{word} 的进步太大了！满分！🌟',
    ],
    after_drill: [
      '音节练习后 {word} 达到满分了！{syllable} 学得太好了！',
      '{syllable} 拆分练习后完美拿下 {word}！五颗星！🌟',
      '分音节练习效果太棒了！{word} 满分！你真了不起！',
      '从 {syllable} 到完整的 {word}，你做到了满分！🌟',
    ],
    perfect: [
      '完美中的完美！你是今天的发音冠军！🏆',
      '太厉害了！每一个词都说得这么棒！满分！🌟',
      '你就是发音小天才！所有星星都是你的！⭐⭐⭐⭐⭐',
      '完美的表现！你的发音越来越棒了！继续保持！🌟',
    ],
  },
}

// ============================================================
// 防重复机制
// ============================================================

/** 记录最近使用的模板索引，key = `${stars}-${phase}` */
const recentIndices: Map<string, number[]> = new Map()

/** 获取防重复的随机索引 */
function getRandomIndex(key: string, templateCount: number): number {
  const recent = recentIndices.get(key) ?? []

  // 如果模板数量 ≤ 1，只能返回 0
  if (templateCount <= 1) return 0

  // 尝试避开最近使用的索引
  const avoidSet = new Set(recent.slice(-Math.min(2, templateCount - 1)))
  const candidates = Array.from({ length: templateCount }, (_, i) => i).filter(
    (i) => !avoidSet.has(i),
  )

  const index =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.floor(Math.random() * templateCount)

  // 更新历史，保留最近 3 条
  const updated = [...recent, index].slice(-3)
  recentIndices.set(key, updated)

  return index
}

// ============================================================
// 变量替换
// ============================================================

/** 替换模板中的变量占位符 */
function replaceVariables(template: string, vars: FeedbackVariables): string {
  let result = template
  if (vars.word) result = result.replace(/\{word\}/g, vars.word)
  if (vars.goodPart) result = result.replace(/\{goodPart\}/g, vars.goodPart)
  if (vars.focusPart) result = result.replace(/\{focusPart\}/g, vars.focusPart)
  if (vars.syllable) result = result.replace(/\{syllable\}/g, vars.syllable)

  // 清理未替换的占位符（当变量未提供时）
  result = result.replace(/\{[a-zA-Z]+\}/g, '')
  // 清理可能产生的多余空格
  result = result.replace(/\s{2,}/g, ' ').trim()

  return result
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 选取反馈文本
 *
 * 自动防重复 + 变量替换
 * @param stars 星级 1-5
 * @param phase 反馈阶段
 * @param vars 变量集合
 * @returns 替换后的反馈文本
 */
export function selectFeedback(
  stars: number,
  phase: FeedbackPhase,
  vars: FeedbackVariables,
): string {
  // 限制 stars 范围
  const s = Math.max(1, Math.min(5, Math.round(stars))) as StarLevel
  const key = `${s}-${phase}`
  const pool = templates[s]?.[phase] ?? templates[3].first_attempt

  const index = getRandomIndex(key, pool.length)
  return replaceVariables(pool[index], vars)
}

/**
 * 获取指定星级+阶段的模板数量
 * @param stars 星级 1-5
 * @param phase 反馈阶段
 * @returns 模板数量
 */
export function getTemplateCount(stars: number, phase: FeedbackPhase): number {
  const s = Math.max(1, Math.min(5, Math.round(stars))) as StarLevel
  return templates[s]?.[phase]?.length ?? 0
}
