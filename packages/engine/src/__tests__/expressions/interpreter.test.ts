import { describe, it, expect } from 'vitest'
import { interpretExpression, InterpreterError } from '../../expressions/interpreter.js'
import type { InterpreterContext } from '../../expressions/interpreter.js'

function makeCtx(
  input: unknown = {},
  results: Record<string, unknown> = {},
): InterpreterContext {
  return {
    input,
    results: new Map(Object.entries(results)),
  }
}

describe('interpretExpression', () => {
  describe('arithmetic', () => {
    it('evaluates 2 + 3 to 5', () => {
      const ctx = makeCtx()
      expect(interpretExpression('2 + 3', ctx)).toBe(5)
    })

    it('evaluates input.qty * input.price', () => {
      const ctx = makeCtx({ qty: 5, price: 10 })
      expect(interpretExpression('input.qty * input.price', ctx)).toBe(50)
    })

    it('evaluates 10 / 3 to floating point', () => {
      const ctx = makeCtx()
      const result = interpretExpression('10 / 3', ctx)
      expect(typeof result).toBe('number')
      expect(result).toBeCloseTo(3.3333, 3)
    })

    it('evaluates 10 % 3 to 1', () => {
      const ctx = makeCtx()
      expect(interpretExpression('10 % 3', ctx)).toBe(1)
    })

    it('division by zero yields Infinity', () => {
      const ctx = makeCtx()
      expect(interpretExpression('1 / 0', ctx)).toBe(Infinity)
    })

    it('negative division by zero yields -Infinity', () => {
      const ctx = makeCtx({ n: -1 })
      expect(interpretExpression('input.n / 0', ctx)).toBe(-Infinity)
    })

    it('preserves operator precedence (2 + 3 * 4 = 14)', () => {
      const ctx = makeCtx()
      expect(interpretExpression('2 + 3 * 4', ctx)).toBe(14)
    })

    it('evaluates subtraction', () => {
      const ctx = makeCtx()
      expect(interpretExpression('10 - 3', ctx)).toBe(7)
    })

    it('evaluates string concatenation with +', () => {
      const ctx = makeCtx({ name: 'Alice' })
      expect(interpretExpression("'Hello ' + input.name", ctx)).toBe('Hello Alice')
    })
  })

  describe('mixed arithmetic + comparison', () => {
    it('evaluates input.qty * input.price > 1000', () => {
      const ctx = makeCtx({ qty: 5, price: 300 })
      expect(interpretExpression('input.qty * input.price > 1000', ctx)).toBe(true)
    })

    it('evaluates input.qty * input.price > 1000 (false)', () => {
      const ctx = makeCtx({ qty: 2, price: 100 })
      expect(interpretExpression('input.qty * input.price > 1000', ctx)).toBe(false)
    })

    it('evaluates total % 2 === 0 (even check)', () => {
      const ctx = makeCtx({ total: 42 })
      expect(interpretExpression('input.total % 2 === 0', ctx)).toBe(true)
    })
  })

  describe('comparison operators', () => {
    it('evaluates strict equality', () => {
      const ctx = makeCtx({ status: 'active' })
      expect(interpretExpression("input.status === 'active'", ctx)).toBe(true)
    })

    it('evaluates strict inequality', () => {
      const ctx = makeCtx({ value: 5 })
      expect(interpretExpression('input.value !== 10', ctx)).toBe(true)
    })

    it('evaluates greater than', () => {
      const ctx = makeCtx({ score: 85 })
      expect(interpretExpression('input.score > 50', ctx)).toBe(true)
    })

    it('evaluates less than or equal', () => {
      const ctx = makeCtx({ value: 100 })
      expect(interpretExpression('input.value <= 100', ctx)).toBe(true)
    })
  })

  describe('logical operators', () => {
    it('evaluates logical AND', () => {
      const ctx = makeCtx({ a: true, b: false })
      expect(interpretExpression('input.a && input.b', ctx)).toBe(false)
    })

    it('evaluates logical OR', () => {
      const ctx = makeCtx({ a: false, b: true })
      expect(interpretExpression('input.a || input.b', ctx)).toBe(true)
    })
  })

  describe('unary operators', () => {
    it('evaluates logical NOT', () => {
      const ctx = makeCtx({ cancelled: false })
      expect(interpretExpression('!input.cancelled', ctx)).toBe(true)
    })

    it('evaluates typeof', () => {
      const ctx = makeCtx({ value: 42 })
      expect(interpretExpression("typeof input.value === 'number'", ctx)).toBe(true)
    })
  })

  describe('ternary / conditional', () => {
    it('evaluates conditional expression (truthy)', () => {
      const ctx = makeCtx({ vip: true })
      expect(interpretExpression("input.vip ? 'fast' : 'normal'", ctx)).toBe('fast')
    })

    it('evaluates conditional expression (falsy)', () => {
      const ctx = makeCtx({ vip: false })
      expect(interpretExpression("input.vip ? 'fast' : 'normal'", ctx)).toBe('normal')
    })
  })

  describe('template literals', () => {
    it('evaluates template literal with interpolation', () => {
      const ctx = makeCtx({ status: 'active' })
      expect(interpretExpression('`Status: ${input.status}`', ctx)).toBe('Status: active')
    })
  })

  describe('method calls', () => {
    it('evaluates includes()', () => {
      const ctx = makeCtx({ name: 'hello world' })
      expect(interpretExpression("input.name.includes('world')", ctx)).toBe(true)
    })

    it('evaluates startsWith()', () => {
      const ctx = makeCtx({ name: 'hello' })
      expect(interpretExpression("input.name.startsWith('hel')", ctx)).toBe(true)
    })

    it('evaluates trim()', () => {
      const ctx = makeCtx({ value: '  spaced  ' })
      expect(interpretExpression('input.value.trim()', ctx)).toBe('spaced')
    })
  })

  describe('Math functions', () => {
    it('evaluates Math.abs()', () => {
      const ctx = makeCtx({ diff: -42 })
      expect(interpretExpression('Math.abs(input.diff)', ctx)).toBe(42)
    })

    it('evaluates Math.max()', () => {
      const ctx = makeCtx({ a: 3, b: 7 })
      expect(interpretExpression('Math.max(input.a, input.b)', ctx)).toBe(7)
    })

    it('evaluates Math.floor()', () => {
      const ctx = makeCtx()
      expect(interpretExpression('Math.floor(3.7)', ctx)).toBe(3)
    })

    it('accesses Math.PI', () => {
      const ctx = makeCtx()
      expect(interpretExpression('Math.PI', ctx)).toBeCloseTo(Math.PI, 10)
    })
  })

  describe('node results', () => {
    it('accesses previous node result', () => {
      const ctx = makeCtx({}, { validate_order: { isValid: true, total: 150 } })
      expect(interpretExpression('validate_order.isValid', ctx)).toBe(true)
      expect(interpretExpression('validate_order.total', ctx)).toBe(150)
    })

    it('uses node results in arithmetic', () => {
      const ctx = makeCtx(
        { taxRate: 0.1 },
        { calc: { subtotal: 100 } },
      )
      expect(interpretExpression('calc.subtotal * input.taxRate', ctx)).toBe(10)
    })
  })

  describe('error handling', () => {
    it('throws InterpreterError for unknown identifier', () => {
      const ctx = makeCtx()
      expect(() => interpretExpression('unknown.value', ctx)).toThrow(InterpreterError)
    })

    it('throws on property access on null', () => {
      const ctx = makeCtx({ value: null })
      expect(() => interpretExpression('input.value.x', ctx)).toThrow(InterpreterError)
    })

    it('throws on disallowed method', () => {
      const ctx = makeCtx({ items: [1, 2] })
      expect(() => interpretExpression('input.items.forEach()', ctx)).toThrow()
    })
  })
})
