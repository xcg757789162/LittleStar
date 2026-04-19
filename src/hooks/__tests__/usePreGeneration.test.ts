import { describe, expect, it } from 'vitest'
import { isRateLimitMessage } from '../usePreGeneration'

describe('isRateLimitMessage', () => {
  it('识别常见限流文案', () => {
    expect(isRateLimitMessage('Error 429 too many requests')).toBe(true)
    expect(isRateLimitMessage('Rate limit exceeded')).toBe(true)
    expect(isRateLimitMessage('quota usage limit')).toBe(true)
  })

  it('空或非限流文案为 false', () => {
    expect(isRateLimitMessage(null)).toBe(false)
    expect(isRateLimitMessage(undefined)).toBe(false)
    expect(isRateLimitMessage('network error')).toBe(false)
  })
})
