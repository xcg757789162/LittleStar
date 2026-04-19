/**
 * 《义务教育课程标准（2022 年版）》各学科核心学业要求摘要（极短版，供教师团评审对齐用）。
 * 非全文，仅作 LLM 评审锚点；具体教学仍以 requirement_spec 为准。
 */

const SNIPPETS: Record<string, string> = {
  math:
    '数感与运算能力；数量关系与模型观念；几何直观与空间观念；数据意识；推理意识与应用意识。',
  chinese:
    '识字与写字；阅读与鉴赏；表达与交流；梳理与探究；文化自信与思维能力在语言文字运用中的体现。',
  english:
    '语言能力（听、说、读、看、写）；文化意识；思维品质；学习能力；主题、语篇、语言知识融合。',
  physics:
    '物质、运动与相互作用、能量等核心概念；科学探究与证据推理；模型建构与科学态度。',
  chemistry:
    '物质的组成与结构、性质与应用；变化与规律；科学探究；绿色化学与社会责任。',
  biology:
    '生命观念；科学思维；探究实践；态度责任；从细胞到生态系统的层次观念。',
  geography:
    '区域认知；综合思维；地理实践力；人地协调观；空间—区域视角。',
  history:
    '唯物史观；时空观念；史料实证；历史解释；家国情怀。',
  politics:
    '政治认同；道德修养；法治观念；健全人格；责任意识。',
  science:
    '科学观念；科学思维；探究实践；态度责任；跨学科概念与真实情境问题解决。',
}

export function getStandardsSnippet(subjectKey: string): string {
  const k = subjectKey.split('-')[0]?.toLowerCase() ?? subjectKey.toLowerCase()
  return SNIPPETS[k] ?? '（该主题无内置课标摘要锚点，请依据 slug 与 requirement_spec 自行把握学段适宜性。）'
}
