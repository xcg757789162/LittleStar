import { test as base, expect } from './base'
import { buildPickerCredentials, type PreparedLessonPickerSeed } from './data'
import { seedLessonPickerUser } from '../helpers/learning'

type AuthFixtures = {
  pickerSeed: PreparedLessonPickerSeed
}

export const test = base.extend<AuthFixtures>({
  pickerSeed: async ({ request, env }, use) => {
    const pickerSeed = await seedLessonPickerUser(request, env, buildPickerCredentials(env))
    await use(pickerSeed)
  },
})

export { expect }
