import { describe, expect, it } from 'vitest'
import { getSubjectsMissingCache } from '../usePreGeneration'
import type { Subject } from '@/types/models'

describe('getSubjectsMissingCache', () => {
  it('应找出已完成评测但当前没有缓存的学科', () => {
    const completedSubjects: Subject[] = ['math', 'chinese', 'english']

    expect(
      getSubjectsMissingCache(completedSubjects, {
        math: 2,
        chinese: 1,
        english: 0,
      }),
    ).toEqual(['english'])
  })

  it('所有已评测学科都达标时应返回空数组', () => {
    expect(
      getSubjectsMissingCache(['math', 'english'], {
        math: 1,
        chinese: 0,
        english: 3,
      }),
    ).toEqual([])
  })

  it('应支持自定义每学科最低缓存数', () => {
    expect(
      getSubjectsMissingCache(['english'], {
        math: 0,
        chinese: 0,
        english: 1,
      }, 2),
    ).toEqual(['english'])
  })
})
