import { describe, it, expect } from 'vitest'
import { evaluateExpression, evaluateExpressions } from '../evaluator.js'

describe('evaluateExpression', () => {
  it('evaluates arithmetic: qty * price', () => {
    const result = evaluateExpression('qty * price', { qty: 5, price: 10 })
    expect(result).toBe(50)
  })

  it('evaluates boolean with ZEN syntax: and/or', () => {
    const result = evaluateExpression(
      'tier == "enterprise" and amount > 10000',
      { tier: 'enterprise', amount: 15000 },
    )
    expect(result).toBe(true)
  })

  it('evaluates boolean false result', () => {
    const result = evaluateExpression(
      'tier == "enterprise" and amount > 10000',
      { tier: 'basic', amount: 15000 },
    )
    expect(result).toBe(false)
  })

  it('evaluates string comparison', () => {
    const result = evaluateExpression('status == "active"', { status: 'active' })
    expect(result).toBe(true)
  })

  it('evaluates numeric comparison', () => {
    const result = evaluateExpression('score >= 80', { score: 85 })
    expect(result).toBe(true)
  })

  it('throws on invalid expression syntax', () => {
    expect(() => evaluateExpression('((( invalid', {})).toThrow()
  })
})

describe('evaluateExpressions', () => {
  it('evaluates multiple expressions', () => {
    const result = evaluateExpressions(
      {
        subtotal: 'qty * price',
        tax: 'qty * price * 0.1',
      },
      { qty: 5, price: 10 },
    )
    expect(result).toEqual({
      subtotal: 50,
      tax: 5,
    })
  })

  it('later expressions reference earlier results', () => {
    const result = evaluateExpressions(
      {
        subtotal: 'qty * price',
        total: 'subtotal * 1.1',
      },
      { qty: 5, price: 10 },
    )
    expect(result.subtotal).toBe(50)
    expect(result.total).toBeCloseTo(55)
  })

  it('returns empty object for empty expressions', () => {
    const result = evaluateExpressions({}, { qty: 5 })
    expect(result).toEqual({})
  })
})
