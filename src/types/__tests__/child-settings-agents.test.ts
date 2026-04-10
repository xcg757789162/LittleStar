/**
 * 测试 ChildSettings 的角色配置扩展字段
 * TDD 步骤 1.2.1：先写测试，此时新字段尚未添加，测试应失败
 */
import { describe, it, expect } from 'vitest'
import { DEFAULT_ADVANCED_SETTINGS, type ChildSettings } from '../models'

describe('ChildSettings 角色配置新字段', () => {
  it('ChildSettings 应包含 selectedAgents 字段（string[]）', () => {
    // 类型检查：创建一个符合 ChildSettings 的对象时，selectedAgents 应被允许
    const settings: Partial<ChildSettings> = {
      selectedAgents: ['assistant', 'showoff', 'curious'],
    }
    expect(settings.selectedAgents).toEqual(['assistant', 'showoff', 'curious'])
    expect(Array.isArray(settings.selectedAgents)).toBe(true)
  })

  it('ChildSettings 应包含 agentVoiceMap 字段（Record<string, string>）', () => {
    const settings: Partial<ChildSettings> = {
      agentVoiceMap: { assistant: 'male-qn-jingying', showoff: 'clever_boy' },
    }
    expect(settings.agentVoiceMap).toEqual({
      assistant: 'male-qn-jingying',
      showoff: 'clever_boy',
    })
  })

  it('ChildSettings 应包含 teacherVoice 字段（string）', () => {
    const settings: Partial<ChildSettings> = {
      teacherVoice: 'female-tianmei',
    }
    expect(settings.teacherVoice).toBe('female-tianmei')
  })

  it('ChildSettings 应包含 maxDiscussionRounds 字段（number）', () => {
    const settings: Partial<ChildSettings> = {
      maxDiscussionRounds: 3,
    }
    expect(settings.maxDiscussionRounds).toBe(3)
  })
})

describe('DEFAULT_ADVANCED_SETTINGS 新字段默认值', () => {
  it('应包含 selectedAgents 默认值', () => {
    expect(DEFAULT_ADVANCED_SETTINGS).toHaveProperty('selectedAgents')
    expect(DEFAULT_ADVANCED_SETTINGS.selectedAgents).toEqual([
      'assistant',
      'showoff',
      'curious',
    ])
  })

  it('应包含 agentVoiceMap 默认值（空对象）', () => {
    expect(DEFAULT_ADVANCED_SETTINGS).toHaveProperty('agentVoiceMap')
    expect(DEFAULT_ADVANCED_SETTINGS.agentVoiceMap).toEqual({})
  })

  it('应包含 teacherVoice 默认值（空字符串）', () => {
    expect(DEFAULT_ADVANCED_SETTINGS).toHaveProperty('teacherVoice')
    expect(DEFAULT_ADVANCED_SETTINGS.teacherVoice).toBe('')
  })

  it('应包含 maxDiscussionRounds 默认值（3）', () => {
    expect(DEFAULT_ADVANCED_SETTINGS).toHaveProperty('maxDiscussionRounds')
    expect(DEFAULT_ADVANCED_SETTINGS.maxDiscussionRounds).toBe(3)
  })
})
