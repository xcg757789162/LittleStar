/**
 * 测试 MiniMax 音色常量和预设角色定义
 * TDD 步骤 1.1.1：先写测试，此时常量尚未定义，测试应失败
 */
import { describe, it, expect } from 'vitest'
import {
  MINIMAX_VOICES,
  PRESET_AGENTS,
  type MiniMaxVoice,
  type PresetAgent,
} from '../models'

describe('MiniMax 音色常量 (MINIMAX_VOICES)', () => {
  it('应包含 12 个音色', () => {
    expect(MINIMAX_VOICES).toHaveLength(12)
  })

  it('每个音色应包含 id、label、gender 字段', () => {
    MINIMAX_VOICES.forEach((voice: MiniMaxVoice) => {
      expect(voice).toHaveProperty('id')
      expect(voice).toHaveProperty('label')
      expect(voice).toHaveProperty('gender')
      expect(typeof voice.id).toBe('string')
      expect(typeof voice.label).toBe('string')
      expect(['male', 'female', 'boy', 'girl']).toContain(voice.gender)
    })
  })

  it('应包含正确的性别分布：5 女声 + 3 男声 + 2 男童 + 1 女童 + 1 温润男声(male) = 4 男 + 5 女 + 2 男童 + 1 女童', () => {
    const genderCounts = MINIMAX_VOICES.reduce(
      (acc: Record<string, number>, v: MiniMaxVoice) => {
        acc[v.gender] = (acc[v.gender] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    // 5 female + 4 male + 2 boy + 1 girl = 12
    expect(genderCounts['female']).toBe(5)
    expect(genderCounts['male']).toBe(4)
    expect(genderCounts['boy']).toBe(2)
    expect(genderCounts['girl']).toBe(1)
  })

  it('所有 voice_id 应唯一', () => {
    const ids = MINIMAX_VOICES.map((v: MiniMaxVoice) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('应包含关键音色 ID', () => {
    const ids = MINIMAX_VOICES.map((v: MiniMaxVoice) => v.id)
    expect(ids).toContain('female-tianmei')
    expect(ids).toContain('clever_boy')
    expect(ids).toContain('lovely_girl')
    expect(ids).toContain('Chinese (Mandarin)_Gentleman')
  })
})

describe('预设角色常量 (PRESET_AGENTS)', () => {
  it('应包含 6 个角色', () => {
    expect(PRESET_AGENTS).toHaveLength(6)
  })

  it('每个角色应包含 id、name、emoji、description、defaultVoice、isTeacher 字段', () => {
    PRESET_AGENTS.forEach((agent: PresetAgent) => {
      expect(agent).toHaveProperty('id')
      expect(agent).toHaveProperty('name')
      expect(agent).toHaveProperty('emoji')
      expect(agent).toHaveProperty('description')
      expect(agent).toHaveProperty('defaultVoice')
      expect(agent).toHaveProperty('isTeacher')
      expect(typeof agent.id).toBe('string')
      expect(typeof agent.name).toBe('string')
      expect(typeof agent.emoji).toBe('string')
      expect(typeof agent.description).toBe('string')
      expect(typeof agent.defaultVoice).toBe('string')
      expect(typeof agent.isTeacher).toBe('boolean')
    })
  })

  it('应有且仅有 1 个教师角色', () => {
    const teachers = PRESET_AGENTS.filter((a: PresetAgent) => a.isTeacher)
    expect(teachers).toHaveLength(1)
    expect(teachers[0].id).toBe('teacher')
  })

  it('应有 5 个学生角色', () => {
    const students = PRESET_AGENTS.filter((a: PresetAgent) => !a.isTeacher)
    expect(students).toHaveLength(5)
  })

  it('每个角色的 defaultVoice 都应在 MINIMAX_VOICES 中存在', () => {
    const voiceIds = MINIMAX_VOICES.map((v: MiniMaxVoice) => v.id)
    PRESET_AGENTS.forEach((agent: PresetAgent) => {
      expect(voiceIds).toContain(agent.defaultVoice)
    })
  })

  it('所有角色 ID 应唯一', () => {
    const ids = PRESET_AGENTS.map((a: PresetAgent) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('应包含指定的角色 ID', () => {
    const ids = PRESET_AGENTS.map((a: PresetAgent) => a.id)
    expect(ids).toContain('teacher')
    expect(ids).toContain('assistant')
    expect(ids).toContain('showoff')
    expect(ids).toContain('curious')
    expect(ids).toContain('notetaker')
    expect(ids).toContain('thinker')
  })
})
