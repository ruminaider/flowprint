import { describe, it, expect, beforeEach } from 'vitest'
import { parseExpression, clearParseCache } from '../../expressions/parser.js'

describe('expression parse cache', () => {
  beforeEach(() => {
    clearParseCache()
  })

  it('returns identical result objects for the same expression', () => {
    const result1 = parseExpression('input.x > 0')
    const result2 = parseExpression('input.x > 0')
    // Cached results are the same object reference
    expect(result1).toBe(result2)
  })

  it('caches successful parse results', () => {
    const result1 = parseExpression("input.priority === 'rush'")
    expect(result1.success).toBe(true)
    const result2 = parseExpression("input.priority === 'rush'")
    expect(result2).toBe(result1)
  })

  it('caches failed parse results', () => {
    const result1 = parseExpression('function foo() {}')
    expect(result1.success).toBe(false)
    const result2 = parseExpression('function foo() {}')
    expect(result2).toBe(result1)
  })

  it('caches empty expression errors', () => {
    const result1 = parseExpression('')
    expect(result1.success).toBe(false)
    const result2 = parseExpression('')
    expect(result2).toBe(result1)
  })

  it('clearParseCache() resets the cache', () => {
    const result1 = parseExpression('input.x > 0')
    clearParseCache()
    const result2 = parseExpression('input.x > 0')
    // After clearing, result is a new object (not the same reference)
    expect(result2).not.toBe(result1)
    // But structurally equivalent
    expect(result2).toEqual(result1)
  })

  it('different expressions have different cache entries', () => {
    const result1 = parseExpression('input.a > 0')
    const result2 = parseExpression('input.b > 0')
    expect(result1).not.toBe(result2)
    if (result1.success && result2.success) {
      expect(result1.expression.memberPaths).toContain('input.a')
      expect(result2.expression.memberPaths).toContain('input.b')
    }
  })
})
