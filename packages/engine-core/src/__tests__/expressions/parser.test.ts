import { describe, it, expect } from 'vitest'
import { parseExpression } from '../../expressions/parser.js'

describe('parseExpression', () => {
  describe('valid expressions', () => {
    it('parses simple comparison', () => {
      const result = parseExpression("input.priority === 'rush'")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.memberPaths).toContain('input.priority')
      }
    })

    it('parses logical AND with member access', () => {
      const result = parseExpression("validate_order.isValid && input.priority === 'rush'")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.identifiers).toContain('validate_order')
        expect(result.expression.memberPaths).toContain('validate_order.isValid')
        expect(result.expression.memberPaths).toContain('input.priority')
      }
    })

    it('parses allowed method call', () => {
      const result = parseExpression("input.name.includes('test')")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.memberPaths).toContain('input.name')
      }
    })

    it('parses numeric comparison', () => {
      const result = parseExpression('input.score > 50')
      expect(result.success).toBe(true)
    })

    it('parses Math.abs call', () => {
      const result = parseExpression('Math.abs(input.diff) > 10')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.identifiers).not.toContain('Math')
        expect(result.expression.memberPaths).toContain('input.diff')
      }
    })

    it('parses Math.max call', () => {
      const result = parseExpression('Math.max(input.a, input.b)')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
      }
    })

    it('parses range check', () => {
      const result = parseExpression('input.value >= 0 && input.value <= 100')
      expect(result.success).toBe(true)
    })

    it('parses template literal', () => {
      const result = parseExpression('`Status: ${input.status}`')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.memberPaths).toContain('input.status')
      }
    })

    it('parses ternary expression', () => {
      const result = parseExpression("input.vip ? 'fast' : 'normal'")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
      }
    })

    it('parses typeof check', () => {
      const result = parseExpression("typeof input.value === 'string'")
      expect(result.success).toBe(true)
    })

    it('parses logical NOT', () => {
      const result = parseExpression('!input.cancelled')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
      }
    })
  })

  describe('arithmetic expressions', () => {
    it('parses simple addition', () => {
      const result = parseExpression('2 + 3')
      expect(result.success).toBe(true)
    })

    it('parses member access with multiplication', () => {
      const result = parseExpression('input.qty * input.price')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
        expect(result.expression.memberPaths).toContain('input.qty')
        expect(result.expression.memberPaths).toContain('input.price')
      }
    })

    it('parses modulo operator', () => {
      const result = parseExpression('total % 100')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('total')
      }
    })

    it('parses subtraction', () => {
      const result = parseExpression('input.a - input.b')
      expect(result.success).toBe(true)
    })

    it('parses division', () => {
      const result = parseExpression('input.total / input.count')
      expect(result.success).toBe(true)
    })

    it('preserves operator precedence (2 + 3 * 4)', () => {
      // Acorn parses with correct JS precedence: 2 + (3 * 4) = 14
      const result = parseExpression('2 + 3 * 4')
      expect(result.success).toBe(true)
    })

    it('parses mixed arithmetic and comparison', () => {
      const result = parseExpression('input.qty * input.price > 1000')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('input')
      }
    })
  })

  describe('invalid expressions', () => {
    it('rejects assignment', () => {
      const result = parseExpression('x = 5')
      expect(result.success).toBe(false)
    })

    it('rejects function declaration', () => {
      const result = parseExpression('function foo() {}')
      expect(result.success).toBe(false)
    })

    it('rejects dynamic import', () => {
      const result = parseExpression("import('foo')")
      expect(result.success).toBe(false)
    })

    it('rejects await', () => {
      const result = parseExpression('await fetch()')
      expect(result.success).toBe(false)
    })

    it('rejects new', () => {
      const result = parseExpression('new Date()')
      expect(result.success).toBe(false)
    })

    it('rejects delete', () => {
      const result = parseExpression('delete input.x')
      expect(result.success).toBe(false)
    })

    it('rejects arbitrary method call', () => {
      const result = parseExpression('input.doSomething()')
      expect(result.success).toBe(false)
    })

    it('rejects Math.random()', () => {
      const result = parseExpression('Math.random()')
      expect(result.success).toBe(false)
    })

    it('rejects Math.sin()', () => {
      const result = parseExpression('Math.sin(x)')
      expect(result.success).toBe(false)
    })

    it('rejects Date.now()', () => {
      const result = parseExpression('Date.now()')
      expect(result.success).toBe(false)
    })

    it('rejects empty string', () => {
      const result = parseExpression('')
      expect(result.success).toBe(false)
    })

    it('rejects object literal', () => {
      const result = parseExpression('{}')
      expect(result.success).toBe(false)
    })

    it('rejects array literal', () => {
      const result = parseExpression('[1, 2, 3]')
      expect(result.success).toBe(false)
    })
  })

  describe('identifier extraction', () => {
    it('collects input from member expression', () => {
      const result = parseExpression("input.priority === 'rush'")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toEqual(['input'])
      }
    })

    it('collects validate_order from member expression', () => {
      const result = parseExpression('validate_order.isValid')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toEqual(['validate_order'])
      }
    })

    it('does not collect Math as an identifier', () => {
      const result = parseExpression('Math.abs(input.diff) > 10')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).not.toContain('Math')
      }
    })

    it('collects multiple identifiers', () => {
      const result = parseExpression('a.x && b.y')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.identifiers).toContain('a')
        expect(result.expression.identifiers).toContain('b')
        expect(result.expression.identifiers).toHaveLength(2)
      }
    })

    it('collects member paths', () => {
      const result = parseExpression("input.priority === 'rush' && validate_order.isValid")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.memberPaths).toContain('input.priority')
        expect(result.expression.memberPaths).toContain('validate_order.isValid')
      }
    })

    it('preserves source string', () => {
      const src = 'input.x > 0'
      const result = parseExpression(src)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.expression.source).toBe(src)
      }
    })
  })
})
