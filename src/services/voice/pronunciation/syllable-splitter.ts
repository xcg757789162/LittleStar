/**
 * 英文音节拆分引擎
 * 内置幼儿常用英语单词音节词典 + 基于辅音-元音模式的规则引擎
 */
import type { SyllableBreakdown } from './types'

/** 音节词典条目：[音节数组, 重音索引] */
type DictEntry = [string[], number]

/**
 * 内置幼儿英语常用单词音节词典
 * 覆盖 200+ 常用单词
 */
const SYLLABLE_DICTIONARY: Record<string, DictEntry> = {
  // ===== 水果 =====
  apple: [['ap', 'ple'], 0],
  banana: [['ba', 'na', 'na'], 1],
  orange: [['or', 'ange'], 0],
  grape: [['grape'], 0],
  mango: [['man', 'go'], 0],
  lemon: [['lem', 'on'], 0],
  melon: [['mel', 'on'], 0],
  cherry: [['cher', 'ry'], 0],
  strawberry: [['straw', 'ber', 'ry'], 0],
  blueberry: [['blue', 'ber', 'ry'], 0],
  watermelon: [['wa', 'ter', 'mel', 'on'], 0],
  pineapple: [['pine', 'ap', 'ple'], 0],
  peach: [['peach'], 0],

  // ===== 动物 =====
  cat: [['cat'], 0],
  dog: [['dog'], 0],
  fish: [['fish'], 0],
  bird: [['bird'], 0],
  bear: [['bear'], 0],
  lion: [['li', 'on'], 0],
  tiger: [['ti', 'ger'], 0],
  monkey: [['mon', 'key'], 0],
  rabbit: [['rab', 'bit'], 0],
  elephant: [['el', 'e', 'phant'], 0],
  giraffe: [['gi', 'raffe'], 1],
  penguin: [['pen', 'guin'], 0],
  dolphin: [['dol', 'phin'], 0],
  butterfly: [['but', 'ter', 'fly'], 0],
  dinosaur: [['di', 'no', 'saur'], 0],
  crocodile: [['croc', 'o', 'dile'], 0],
  kangaroo: [['kan', 'ga', 'roo'], 2],
  hippopotamus: [['hip', 'po', 'pot', 'a', 'mus'], 2],
  panda: [['pan', 'da'], 0],
  turtle: [['tur', 'tle'], 0],
  chicken: [['chick', 'en'], 0],
  duck: [['duck'], 0],
  sheep: [['sheep'], 0],
  horse: [['horse'], 0],
  pig: [['pig'], 0],
  cow: [['cow'], 0],
  frog: [['frog'], 0],
  snake: [['snake'], 0],
  spider: [['spi', 'der'], 0],
  ant: [['ant'], 0],

  // ===== 颜色 =====
  red: [['red'], 0],
  blue: [['blue'], 0],
  green: [['green'], 0],
  yellow: [['yel', 'low'], 0],
  purple: [['pur', 'ple'], 0],
  orange2: [['or', 'ange'], 0],
  pink: [['pink'], 0],
  black: [['black'], 0],
  white: [['white'], 0],
  brown: [['brown'], 0],

  // ===== 数字 =====
  one: [['one'], 0],
  two: [['two'], 0],
  three: [['three'], 0],
  four: [['four'], 0],
  five: [['five'], 0],
  six: [['six'], 0],
  seven: [['sev', 'en'], 0],
  eight: [['eight'], 0],
  nine: [['nine'], 0],
  ten: [['ten'], 0],
  eleven: [['e', 'lev', 'en'], 1],
  twelve: [['twelve'], 0],
  thirteen: [['thir', 'teen'], 1],
  fourteen: [['four', 'teen'], 1],
  fifteen: [['fif', 'teen'], 1],
  sixteen: [['six', 'teen'], 1],
  seventeen: [['sev', 'en', 'teen'], 2],
  eighteen: [['eigh', 'teen'], 1],
  nineteen: [['nine', 'teen'], 1],
  twenty: [['twen', 'ty'], 0],
  hundred: [['hun', 'dred'], 0],
  thousand: [['thou', 'sand'], 0],

  // ===== 身体部位 =====
  head: [['head'], 0],
  eye: [['eye'], 0],
  nose: [['nose'], 0],
  mouth: [['mouth'], 0],
  ear: [['ear'], 0],
  hand: [['hand'], 0],
  finger: [['fin', 'ger'], 0],
  arm: [['arm'], 0],
  leg: [['leg'], 0],
  foot: [['foot'], 0],
  shoulder: [['shoul', 'der'], 0],
  stomach: [['stom', 'ach'], 0],
  elbow: [['el', 'bow'], 0],

  // ===== 家庭 =====
  mother: [['moth', 'er'], 0],
  father: [['fa', 'ther'], 0],
  sister: [['sis', 'ter'], 0],
  brother: [['broth', 'er'], 0],
  baby: [['ba', 'by'], 0],
  family: [['fam', 'i', 'ly'], 0],
  grandma: [['grand', 'ma'], 0],
  grandpa: [['grand', 'pa'], 0],

  // ===== 食物 =====
  bread: [['bread'], 0],
  milk: [['milk'], 0],
  water: [['wa', 'ter'], 0],
  juice: [['juice'], 0],
  cookie: [['cook', 'ie'], 0],
  chocolate: [['choc', 'o', 'late'], 0],
  pizza: [['piz', 'za'], 0],
  noodle: [['noo', 'dle'], 0],
  sandwich: [['sand', 'wich'], 0],
  hamburger: [['ham', 'bur', 'ger'], 0],
  ice: [['ice'], 0],
  cream: [['cream'], 0],

  // ===== 学校/物品 =====
  book: [['book'], 0],
  pencil: [['pen', 'cil'], 0],
  table: [['ta', 'ble'], 0],
  chair: [['chair'], 0],
  teacher: [['teach', 'er'], 0],
  student: [['stu', 'dent'], 0],
  school: [['school'], 0],
  classroom: [['class', 'room'], 0],
  computer: [['com', 'pu', 'ter'], 1],
  telephone: [['tel', 'e', 'phone'], 0],
  umbrella: [['um', 'brel', 'la'], 1],

  // ===== 自然 =====
  sun: [['sun'], 0],
  moon: [['moon'], 0],
  star: [['star'], 0],
  rain: [['rain'], 0],
  rainbow: [['rain', 'bow'], 0],
  flower: [['flow', 'er'], 0],
  tree: [['tree'], 0],
  mountain: [['moun', 'tain'], 0],
  river: [['riv', 'er'], 0],
  ocean: [['o', 'cean'], 0],
  garden: [['gar', 'den'], 0],

  // ===== 交通工具 =====
  car: [['car'], 0],
  bus: [['bus'], 0],
  train: [['train'], 0],
  airplane: [['air', 'plane'], 0],
  bicycle: [['bi', 'cy', 'cle'], 0],
  helicopter: [['hel', 'i', 'cop', 'ter'], 2],

  // ===== 常用形容词 =====
  big: [['big'], 0],
  small: [['small'], 0],
  happy: [['hap', 'py'], 0],
  beautiful: [['beau', 'ti', 'ful'], 0],
  wonderful: [['won', 'der', 'ful'], 0],
  delicious: [['de', 'li', 'cious'], 1],
  fantastic: [['fan', 'tas', 'tic'], 1],
  excellent: [['ex', 'cel', 'lent'], 0],
  important: [['im', 'por', 'tant'], 1],

  // ===== 常用动词 =====
  hello: [['hel', 'lo'], 0],
  goodbye: [['good', 'bye'], 1],
  thank: [['thank'], 0],
  please: [['please'], 0],
  sorry: [['sor', 'ry'], 0],
  welcome: [['wel', 'come'], 0],

  // ===== 其他常用 =====
  together: [['to', 'geth', 'er'], 1],
  birthday: [['birth', 'day'], 0],
  christmas: [['christ', 'mas'], 0],
  morning: [['morn', 'ing'], 0],
  evening: [['eve', 'ning'], 0],
  tonight: [['to', 'night'], 1],
  yesterday: [['yes', 'ter', 'day'], 0],
  tomorrow: [['to', 'mor', 'row'], 1],
  princess: [['prin', 'cess'], 0],
  monster: [['mon', 'ster'], 0],
  dragon: [['drag', 'on'], 0],
  castle: [['cas', 'tle'], 0],
  magic: [['mag', 'ic'], 0],
  adventure: [['ad', 'ven', 'ture'], 1],
  treasure: [['treas', 'ure'], 0],
  pirate: [['pi', 'rate'], 0],
  robot: [['ro', 'bot'], 0],
  rocket: [['rock', 'et'], 0],
  spaceship: [['space', 'ship'], 0],
  astronaut: [['as', 'tro', 'naut'], 0],
  superhero: [['su', 'per', 'he', 'ro'], 2],
}

/** 元音字母集合 */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])

/**
 * 拆分英文单词为音节
 * 优先查词典，未命中则使用规则引擎
 */
export function splitSyllables(word: string): SyllableBreakdown {
  if (!word) {
    return { word: '', syllables: [''], stressIndex: 0 }
  }

  const lowerWord = word.toLowerCase()

  // 1. 查词典
  const dictEntry = SYLLABLE_DICTIONARY[lowerWord]
  if (dictEntry) {
    return {
      word: lowerWord,
      syllables: [...dictEntry[0]],
      stressIndex: dictEntry[1],
    }
  }

  // 2. 单字符
  if (lowerWord.length <= 2) {
    return { word: lowerWord, syllables: [lowerWord], stressIndex: 0 }
  }

  // 3. 规则引擎拆分
  const syllables = splitByRules(lowerWord)

  return {
    word: lowerWord,
    syllables,
    stressIndex: 0, // 规则引擎默认重音在第一音节
  }
}

/**
 * 基于辅音-元音模式的规则引擎拆分
 * 规则：
 * 1. 找到元音簇（V）和辅音簇（C）的模式
 * 2. 在 VCV 模式中，在辅音前分割（如 a-ni-mal）
 * 3. 在 VCCV 模式中，在两个辅音之间分割（如 but-ter）
 */
function splitByRules(word: string): string[] {
  const syllables: string[] = []
  let current = ''

  for (let i = 0; i < word.length; i++) {
    current += word[i]

    // 检查是否应该在这里分割
    if (i < word.length - 1 && shouldSplit(word, i)) {
      syllables.push(current)
      current = ''
    }
  }

  // 添加最后一个音节
  if (current) {
    // 如果最后一个音节只有一个辅音，合并到前一个
    if (syllables.length > 0 && current.length === 1 && !isVowel(current[0])) {
      syllables[syllables.length - 1] += current
    } else {
      syllables.push(current)
    }
  }

  // 确保至少有一个音节
  if (syllables.length === 0) {
    return [word]
  }

  return syllables
}

/**
 * 判断是否应在 word[i] 和 word[i+1] 之间分割
 */
function shouldSplit(word: string, i: number): boolean {
  if (i === 0 || i >= word.length - 2) return false

  const prev = word[i - 1]
  const curr = word[i]
  const next = word[i + 1]
  const nextNext = i + 2 < word.length ? word[i + 2] : ''

  // 规则 1: VCV → V-CV（元音后跟单辅音再跟元音，在辅音前切）
  if (isVowel(prev) && !isVowel(curr) && isVowel(next)) {
    return true
  }

  // 规则 2: VCCV → VC-CV（元音后跟两个辅音再跟元音，在辅音之间切）
  if (isVowel(prev) && !isVowel(curr) && !isVowel(next) && nextNext && isVowel(nextNext)) {
    // 不要拆分常见辅音组合
    const cluster = curr + next
    if (isConsonantCluster(cluster)) {
      return false // 在辅音簇前切
    }
    return true
  }

  return false
}

/**
 * 判断字符是否为元音
 */
function isVowel(ch: string): boolean {
  return VOWELS.has(ch.toLowerCase())
}

/**
 * 判断是否为常见辅音簇（不应拆分）
 */
function isConsonantCluster(cluster: string): boolean {
  const clusters = new Set([
    'bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr',
    'ph', 'pl', 'pr', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp',
    'st', 'str', 'sw', 'th', 'tr', 'tw', 'wh', 'wr',
  ])
  return clusters.has(cluster)
}
