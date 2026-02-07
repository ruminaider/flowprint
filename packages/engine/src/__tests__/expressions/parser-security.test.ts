import { describe, it, expect } from 'vitest'
import { parseExpression } from '../../expressions/parser.js'

describe('parser security', () => {
  it('rejects arithmetic operators', () => {
    // ALLOWED_BINARY_OPS only includes ===, !==, >, <, >=, <=
    // Arithmetic operators (+, -, *, /, %) are NOT in the allowlist
    for (const op of ['+', '-', '*', '/', '%']) {
      const result = parseExpression(`input.a ${op} input.b`)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toContain('Disallowed binary operator')
      }
    }
  })

  it('rejects in operator', () => {
    // 'in' is a binary operator not in ALLOWED_BINARY_OPS
    const result = parseExpression('"x" in input')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0]?.message).toContain('Disallowed binary operator')
    }
  })

  it('rejects comma/sequence expressions', () => {
    // SequenceExpression is not in ALLOWED_AST_TYPES
    // acorn.parseExpressionAt parses the first expression then stops
    // "(a, b)" would be parsed as a SequenceExpression inside parens
    const result = parseExpression('(input.a, input.b)')
    expect(result.success).toBe(false)
  })

  it('rejects assignment expressions', () => {
    // AssignmentExpression is not in ALLOWED_AST_TYPES
    const result = parseExpression('input.x = 5')
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only expressions', () => {
    const result = parseExpression('   ')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0]?.message).toContain('empty')
    }
  })
})
