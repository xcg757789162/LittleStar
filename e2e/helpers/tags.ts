export const TAGS = {
  feature: '@feature',
  lessonPicker: '@lesson-picker',
} as const

export function withTags(title: string, ...tags: string[]) {
  return `${title} ${tags.join(' ')}`.trim()
}

export const LESSON_PICKER_TEST_TITLE = withTags(
  'lesson picker should open the classroom lesson picker from home',
  TAGS.feature,
  TAGS.lessonPicker,
)
