import { describe, it, expect } from 'vitest'
import { inferSubjectFromNodeId } from '../cache'

describe('inferSubjectFromNodeId', () => {
  it('推断内置科目：math', () => {
    expect(inferSubjectFromNodeId('math-g1-add')).toBe('math')
    expect(inferSubjectFromNodeId('math-g3-fractions')).toBe('math')
  })

  it('兼容历史别名：cn- → chinese', () => {
    expect(inferSubjectFromNodeId('cn-g1-pinyin')).toBe('chinese')
    expect(inferSubjectFromNodeId('CN-G2-Classical')).toBe('chinese')
  })

  it('兼容历史别名：en- → english', () => {
    expect(inferSubjectFromNodeId('en-g1-greetings')).toBe('english')
    expect(inferSubjectFromNodeId('EN-G4-Grammar')).toBe('english')
  })

  it('推断自定义课程 slug（单词）', () => {
    expect(inferSubjectFromNodeId('biology-cell-structure')).toBe('biology')
    expect(inferSubjectFromNodeId('finance-compound-interest')).toBe('finance')
  })

  it('推断多段 slug（取第一个连字符前的前缀）', () => {
    // 例如 slug="trigonometry"，节点 id 形如 trigonometry-angles-basics
    expect(inferSubjectFromNodeId('trigonometry-angles-basics')).toBe('trigonometry')
  })

  it('无连字符时返回 undefined', () => {
    expect(inferSubjectFromNodeId('standalone')).toBeUndefined()
    expect(inferSubjectFromNodeId('')).toBeUndefined()
  })

  it('大小写不敏感', () => {
    expect(inferSubjectFromNodeId('Math-G1-Add')).toBe('math')
    expect(inferSubjectFromNodeId('BIOLOGY-CELL')).toBe('biology')
  })
})
