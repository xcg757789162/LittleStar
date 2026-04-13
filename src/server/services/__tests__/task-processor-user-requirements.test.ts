import { describe, expect, it } from 'vitest'
import { buildTaskRequirements } from '../task-processor'

describe('buildTaskRequirements', () => {
  it('应把 settings 中的 userNickname 和 selfIntroduction 收口为 UserRequirements', () => {
    const requirements = buildTaskRequirements({
      requirement: '生成一节颜色课堂',
      language: 'zh-CN',
      settings: {
        userNickname: '小星星',
        selfIntroduction: '我喜欢画画和恐龙',
      },
    })

    expect(requirements).toEqual({
      requirement: '生成一节颜色课堂',
      language: 'zh-CN',
      userNickname: '小星星',
      userBio: '我喜欢画画和恐龙',
    })
  })

  it('应兼容 settings.userBio，并忽略空白昵称', () => {
    const requirements = buildTaskRequirements({
      requirement: '生成一节数学课堂',
      language: '',
      settings: {
        userNickname: '   ',
        userBio: '我喜欢拼图',
      },
    })

    expect(requirements).toEqual({
      requirement: '生成一节数学课堂',
      language: 'zh-CN',
      userBio: '我喜欢拼图',
    })
  })
})
