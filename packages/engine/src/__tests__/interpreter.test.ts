import { describe, it, expect } from 'vitest'
import { interpretExpression, buildSafeMath } from '../expressions/interpreter.js'

function makeScope(input: unknown = {}, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return { input, Math: buildSafeMath(), ...extras }
}

describe('interpreter', () => {
  describe('literals', () => {
    it('evaluates string literal', () => {
      expect(interpretExpression("'hello'", makeScope())).toBe('hello')
    })

    it('evaluates number literal', () => {
      expect(interpretExpression('42', makeScope())).toBe(42)
    })

    it('evaluates boolean literal', () => {
      expect(interpretExpression('true', makeScope())).toBe(true)
    })

    it('evaluates null literal', () => {
      expect(interpretExpression('null', makeScope())).toBeNull()
    })
  })

  describe('identifiers', () => {
    it('resolves identifier from scope', () => {
      const scope = makeScope({ name: 'Alice' })
      expect(interpretExpression('input', scope)).toEqual({ name: 'Alice' })
    })

    it('throws on undefined identifier', () => {
      expect(() => interpretExpression('unknown', makeScope())).toThrow('Undefined identifier: unknown')
    })

    it('throws on forbidden identifier: Date', () => {
      expect(() => interpretExpression('Date', makeScope())).toThrow('Forbidden identifier: Date')
    })

    it('throws on forbidden identifier: process', () => {
      expect(() => interpretExpression('process', makeScope())).toThrow('Forbidden identifier: process')
    })

    it('throws on forbidden identifier: globalThis', () => {
      expect(() => interpretExpression('globalThis', makeScope())).toThrow('Forbidden identifier: globalThis')
    })
  })

  describe('member expressions', () => {
    it('resolves nested property', () => {
      const scope = makeScope({ order: { total: 99 } })
      expect(interpretExpression('input.order.total', scope)).toBe(99)
    })

    it('returns undefined for missing property on object', () => {
      const scope = makeScope({ order: {} })
      expect(interpretExpression('input.order.missing', scope)).toBeUndefined()
    })

    it('blocks __proto__ access', () => {
      expect(() => interpretExpression('input.__proto__', makeScope({}))).toThrow('blocked')
    })

    it('blocks constructor access', () => {
      expect(() => interpretExpression('input.constructor', makeScope({}))).toThrow('blocked')
    })

    it('blocks prototype access', () => {
      expect(() => interpretExpression('input.prototype', makeScope({}))).toThrow('blocked')
    })

    it('rejects computed member access', () => {
      expect(() => interpretExpression('input["key"]', makeScope({}))).toThrow('Computed member access')
    })
  })

  describe('binary operators', () => {
    it.each([
      { expr: '1 === 1', expected: true },
      { expr: '1 === 2', expected: false },
      { expr: '1 !== 2', expected: true },
      { expr: '1 !== 1', expected: false },
      { expr: '5 > 3', expected: true },
      { expr: '3 > 5', expected: false },
      { expr: '3 < 5', expected: true },
      { expr: '5 < 3', expected: false },
      { expr: '5 >= 5', expected: true },
      { expr: '5 <= 5', expected: true },
    ])('$expr → $expected', ({ expr, expected }) => {
      expect(interpretExpression(expr, makeScope())).toBe(expected)
    })

    it('throws on disallowed operator +', () => {
      expect(() => interpretExpression('1 + 2', makeScope())).toThrow('Disallowed binary operator')
    })
  })

  describe('logical operators', () => {
    it('evaluates && with short-circuit', () => {
      expect(interpretExpression('true && false', makeScope())).toBe(false)
      expect(interpretExpression('false && true', makeScope())).toBe(false)
    })

    it('evaluates || with short-circuit', () => {
      expect(interpretExpression('false || true', makeScope())).toBe(true)
      expect(interpretExpression('true || false', makeScope())).toBe(true)
    })
  })

  describe('unary operators', () => {
    it('evaluates !', () => {
      expect(interpretExpression('!true', makeScope())).toBe(false)
      expect(interpretExpression('!false', makeScope())).toBe(true)
    })

    it('evaluates typeof', () => {
      const scope = makeScope('hello')
      expect(interpretExpression('typeof input', scope)).toBe('string')
    })
  })

  describe('conditional (ternary)', () => {
    it('returns consequent when true', () => {
      const scope = makeScope(null, { x: 5 })
      expect(interpretExpression("x > 0 ? 'positive' : 'negative'", scope)).toBe('positive')
    })

    it('returns alternate when false', () => {
      const scope = makeScope(null, { x: -1 })
      expect(interpretExpression("x > 0 ? 'positive' : 'negative'", scope)).toBe('negative')
    })
  })

  describe('method calls', () => {
    it('str.includes()', () => {
      const scope = makeScope(null, { str: 'hello world' })
      expect(interpretExpression("str.includes('world')", scope)).toBe(true)
    })

    it('str.startsWith()', () => {
      const scope = makeScope(null, { str: 'hello' })
      expect(interpretExpression("str.startsWith('hel')", scope)).toBe(true)
    })

    it('str.endsWith()', () => {
      const scope = makeScope(null, { str: 'hello' })
      expect(interpretExpression("str.endsWith('llo')", scope)).toBe(true)
    })

    it('str.trim()', () => {
      const scope = makeScope(null, { str: '  hi  ' })
      expect(interpretExpression('str.trim()', scope)).toBe('hi')
    })

    it('throws on disallowed method', () => {
      const scope = makeScope(null, { arr: [1, 2, 3] })
      expect(() => interpretExpression('arr.map()', scope)).toThrow('Disallowed method call')
    })
  })

  describe('Math calls', () => {
    it('Math.abs()', () => {
      expect(interpretExpression('Math.abs(x)', makeScope(null, { x: -5 }))).toBe(5)
    })

    it('Math.max()', () => {
      expect(interpretExpression('Math.max(a, b)', makeScope(null, { a: 1, b: 2 }))).toBe(2)
    })

    it('Math.round()', () => {
      expect(interpretExpression('Math.round(x)', makeScope(null, { x: 1.7 }))).toBe(2)
    })

    it('Math.PI access via call throws (not a function)', () => {
      expect(() => interpretExpression('Math.PI()', makeScope())).toThrow('not a function')
    })
  })

  describe('template literals', () => {
    it('interpolates values', () => {
      const scope = makeScope(null, { name: 'Alice' })
      expect(interpretExpression('`Hello ${name}`', scope)).toBe('Hello Alice')
    })

    it('handles plain template without expressions', () => {
      expect(interpretExpression('`hello`', makeScope())).toBe('hello')
    })
  })

  describe('security', () => {
    it('rejects deeply nested expressions beyond MAX_AST_DEPTH', () => {
      // Build an expression that nests ternaries deeply
      let expr = 'true'
      for (let i = 0; i < 55; i++) {
        expr = `true ? ${expr} : false`
      }
      expect(() => interpretExpression(expr, makeScope())).toThrow('maximum AST depth')
    })

    it('rejects this expression', () => {
      // acorn parses `this` as ThisExpression, not Identifier
      expect(() => interpretExpression('this', makeScope())).toThrow('Disallowed expression type: ThisExpression')
    })

    it('rejects window identifier', () => {
      expect(() => interpretExpression('window', makeScope())).toThrow('Forbidden identifier: window')
    })

    it('rejects self identifier', () => {
      expect(() => interpretExpression('self', makeScope())).toThrow('Forbidden identifier: self')
    })

    it('prevents prototype pollution via scope', () => {
      // Even if someone puts __proto__ in scope, member access is blocked
      const scope = makeScope({ __proto__: { hacked: true } })
      expect(() => interpretExpression('input.__proto__', scope)).toThrow('blocked')
    })

    it('uses null-prototype scope internally', () => {
      // Ensure that hasOwnProperty from Object.prototype is not accessible
      const scope = makeScope({})
      expect(() => interpretExpression('hasOwnProperty', scope)).toThrow('Undefined identifier')
    })
  })

  describe('parity with vm evaluator', () => {
    // These test that the interpreter produces correct results for expressions
    // that appear in real blueprints
    it.each([
      { expr: 'input.quantity >= 10', scope: { quantity: 15 }, expected: true },
      { expr: 'input.quantity >= 10', scope: { quantity: 5 }, expected: false },
      { expr: 'input.is_provider === true', scope: { is_provider: true }, expected: true },
      { expr: 'input.is_provider === true', scope: { is_provider: false }, expected: false },
      { expr: 'input.status !== "cancelled"', scope: { status: 'active' }, expected: true },
      { expr: 'input.total > 100 && input.active === true', scope: { total: 200, active: true }, expected: true },
      { expr: 'input.total > 100 || input.vip === true', scope: { total: 50, vip: true }, expected: true },
    ])('$expr → $expected', ({ expr, scope, expected }) => {
      const fullScope = makeScope(scope)
      expect(interpretExpression(expr, fullScope)).toBe(expected)
    })
  })
})
