import type { KnowledgeNode, Question } from '@/types/models'

/**
 * 英语字母 A-Z 完整数据包
 * 26 个字母各一个知识点，每个字母 3 道题（1 闪卡 + 2 选择题）
 * A-H: Phase 1 (difficulty 1-2), I-Z: Phase 2 (difficulty 2-3)
 */

/** 字母数据定义 */
interface LetterData {
  letter: string
  lower: string
  word: string
  emoji: string
  difficulty: number
}

const LETTER_DATA: LetterData[] = [
  { letter: 'A', lower: 'a', word: 'Apple', emoji: '🍎', difficulty: 1 },
  { letter: 'B', lower: 'b', word: 'Bear', emoji: '🐻', difficulty: 1 },
  { letter: 'C', lower: 'c', word: 'Cat', emoji: '🐱', difficulty: 1 },
  { letter: 'D', lower: 'd', word: 'Dog', emoji: '🐶', difficulty: 1 },
  { letter: 'E', lower: 'e', word: 'Elephant', emoji: '🐘', difficulty: 1 },
  { letter: 'F', lower: 'f', word: 'Fish', emoji: '🐟', difficulty: 1 },
  { letter: 'G', lower: 'g', word: 'Grape', emoji: '🍇', difficulty: 2 },
  { letter: 'H', lower: 'h', word: 'Hat', emoji: '🎩', difficulty: 2 },
  { letter: 'I', lower: 'i', word: 'Ice cream', emoji: '🍦', difficulty: 2 },
  { letter: 'J', lower: 'j', word: 'Juice', emoji: '🧃', difficulty: 2 },
  { letter: 'K', lower: 'k', word: 'Kite', emoji: '🪁', difficulty: 2 },
  { letter: 'L', lower: 'l', word: 'Lion', emoji: '🦁', difficulty: 2 },
  { letter: 'M', lower: 'm', word: 'Moon', emoji: '🌙', difficulty: 2 },
  { letter: 'N', lower: 'n', word: 'Nose', emoji: '👃', difficulty: 2 },
  { letter: 'O', lower: 'o', word: 'Orange', emoji: '🍊', difficulty: 2 },
  { letter: 'P', lower: 'p', word: 'Pig', emoji: '🐷', difficulty: 2 },
  { letter: 'Q', lower: 'q', word: 'Queen', emoji: '👑', difficulty: 3 },
  { letter: 'R', lower: 'r', word: 'Rabbit', emoji: '🐰', difficulty: 3 },
  { letter: 'S', lower: 's', word: 'Sun', emoji: '☀️', difficulty: 3 },
  { letter: 'T', lower: 't', word: 'Tree', emoji: '🌳', difficulty: 3 },
  { letter: 'U', lower: 'u', word: 'Umbrella', emoji: '☂️', difficulty: 3 },
  { letter: 'V', lower: 'v', word: 'Violin', emoji: '🎻', difficulty: 3 },
  { letter: 'W', lower: 'w', word: 'Water', emoji: '💧', difficulty: 3 },
  { letter: 'X', lower: 'x', word: 'X-ray', emoji: '🩻', difficulty: 3 },
  { letter: 'Y', lower: 'y', word: 'Yellow', emoji: '💛', difficulty: 3 },
  { letter: 'Z', lower: 'z', word: 'Zebra', emoji: '🦓', difficulty: 3 },
]

/** 生成字母 ID */
function letterId(letter: string): string {
  return `english-letter-${letter.toLowerCase()}`
}

/** 字母知识点列表 */
export const letterKnowledgeNodes: KnowledgeNode[] = LETTER_DATA.map((data, index) => ({
  id: letterId(data.letter),
  subject: 'english' as const,
  gradeLevel: 'middle-kindergarten' as const,
  name: `字母 ${data.letter}${data.lower}`,
  description: `认识字母 ${data.letter}${data.lower}，代表单词：${data.word} ${data.emoji}`,
  prerequisites: index === 0 ? [] : [letterId(LETTER_DATA[index - 1].letter)],
  nextNodes: index < 25 ? [letterId(LETTER_DATA[index + 1].letter)] : [],
  difficulty: data.difficulty,
  contentType: index % 2 === 0 ? 'flashcard' as const : 'quiz' as const,
  order: index + 1,
}))

/**
 * 为每个字母生成 3 道题目
 * 题目 1：闪卡 — 大小写 + 代表单词 + emoji
 * 题目 2：选择题 — 字母识别
 * 题目 3：选择题 — 大小写匹配 / 字母顺序
 */
function generateLetterQuestions(): Question[] {
  const questions: Question[] = []

  LETTER_DATA.forEach((data, index) => {
    const nodeId = letterId(data.letter)
    const qPrefix = `en-letter-${data.lower}`

    // 题目 1：闪卡
    questions.push({
      id: `${qPrefix}-001`,
      knowledgeNodeId: nodeId,
      type: 'flashcard',
      content: {
        text: `${data.letter} ${data.lower} — ${data.word} ${data.emoji}`,
        hint: `大写 ${data.letter}，小写 ${data.lower}。${data.word} 的第一个字母是 ${data.letter}！`,
      },
      answer: data.letter,
      difficulty: data.difficulty,
      isAIGenerated: false,
    })

    // 题目 2：字母识别选择题
    // 选择 2 个干扰项（相邻字母或随机字母）
    const distractors = getDistractors(index, 2)
    const options = shuffle([
      { id: 'correct', text: data.letter, isCorrect: true },
      { id: 'wrong1', text: LETTER_DATA[distractors[0]].letter, isCorrect: false },
      { id: 'wrong2', text: LETTER_DATA[distractors[1]].letter, isCorrect: false },
    ])
    questions.push({
      id: `${qPrefix}-002`,
      knowledgeNodeId: nodeId,
      type: 'multiple-choice',
      content: {
        text: `${data.emoji} ${data.word} 的第一个字母是哪个？`,
        options,
        hint: `${data.word} starts with ${data.letter}!`,
      },
      answer: 'correct',
      difficulty: data.difficulty,
      isAIGenerated: false,
    })

    // 题目 3：大小写匹配或字母顺序
    if (index < 25) {
      // 字母顺序题：What comes after X?
      const nextLetter = LETTER_DATA[index + 1].letter
      const orderDistractors = getDistractors(index + 1, 2)
      const orderOptions = shuffle([
        { id: 'correct', text: nextLetter, isCorrect: true },
        { id: 'wrong1', text: LETTER_DATA[orderDistractors[0]].letter, isCorrect: false },
        { id: 'wrong2', text: LETTER_DATA[orderDistractors[1]].letter, isCorrect: false },
      ])
      questions.push({
        id: `${qPrefix}-003`,
        knowledgeNodeId: nodeId,
        type: 'multiple-choice',
        content: {
          text: `字母 ${data.letter} 的下一个字母是什么？`,
          options: orderOptions,
          hint: `A B C D E F G... 唱字母歌找答案！`,
        },
        answer: 'correct',
        difficulty: data.difficulty,
        isAIGenerated: false,
      })
    } else {
      // Z 没有下一个字母，改为大小写匹配题
      const caseDistractors = getDistractors(index, 2)
      const caseOptions = shuffle([
        { id: 'correct', text: data.lower, isCorrect: true },
        { id: 'wrong1', text: LETTER_DATA[caseDistractors[0]].lower, isCorrect: false },
        { id: 'wrong2', text: LETTER_DATA[caseDistractors[1]].lower, isCorrect: false },
      ])
      questions.push({
        id: `${qPrefix}-003`,
        knowledgeNodeId: nodeId,
        type: 'multiple-choice',
        content: {
          text: `大写 ${data.letter} 的小写是哪个？`,
          options: caseOptions,
          hint: `大写 ${data.letter}，小写 ${data.lower}！`,
        },
        answer: 'correct',
        difficulty: data.difficulty,
        isAIGenerated: false,
      })
    }
  })

  return questions
}

/** 获取干扰项索引（避开当前索引） */
function getDistractors(currentIndex: number, count: number): number[] {
  const result: number[] = []
  const candidates = Array.from({ length: 26 }, (_, i) => i).filter(i => i !== currentIndex)
  // 优先选择相邻字母作为干扰项
  const nearby = candidates.filter(i => Math.abs(i - currentIndex) <= 3)
  const others = candidates.filter(i => Math.abs(i - currentIndex) > 3)
  const pool = [...nearby, ...others]
  for (let i = 0; i < count && i < pool.length; i++) {
    result.push(pool[i])
  }
  return result
}

/** 简单的数组打乱（确定性，用于种子数据） */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = i - 1 // 简单确定性置换，保证可重复
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 字母题目列表 */
export const letterQuestions: Question[] = generateLetterQuestions()
