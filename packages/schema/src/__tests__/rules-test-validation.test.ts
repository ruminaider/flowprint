import { describe, it, expect } from 'vitest'
import { validateRulesTest, validateRulesTestYaml, SUPPORTED_RULES_TEST_VERSIONS } from '../rules.js'

describe('rules test file validation', () => {
  it('accepts a valid rules test file', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [
        {
          name: 'basic discount',
          input: { order_total: 150 },
          expected_output: { discount: 0.1 },
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts test with expected_matched_count', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [
        {
          name: 'multi-match',
          input: { score: 85 },
          expected_matched_count: 2,
        },
      ],
    })
    expect(result.valid).toBe(true)
  })

  it('accepts test with only name and input (no expectations)', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [
        {
          name: 'smoke test',
          input: { x: 1 },
        },
      ],
    })
    expect(result.valid).toBe(true)
  })

  it('rejects missing schema field', () => {
    const result = validateRulesTest({
      tests: [{ name: 'test', input: {} }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('schema'))).toBe(true)
  })

  it('rejects empty tests array', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('1 item'))).toBe(true)
  })

  it('rejects test with missing name', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [{ input: { x: 1 } }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('name'))).toBe(true)
  })

  it('rejects test with empty name', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [{ name: '', input: { x: 1 } }],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects test with missing input', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [{ name: 'no input' }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('input'))).toBe(true)
  })

  it('rejects additional properties on test case', () => {
    const result = validateRulesTest({
      schema: 'flowprint-rules-test/1.0',
      tests: [{ name: 'extra', input: {}, bogus: true }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('bogus'))).toBe(true)
  })

  it('exports SUPPORTED_RULES_TEST_VERSIONS', () => {
    expect(SUPPORTED_RULES_TEST_VERSIONS).toContain('flowprint-rules-test/1.0')
  })
})

describe('validateRulesTestYaml', () => {
  it('parses and validates valid YAML', () => {
    const yaml = `
schema: flowprint-rules-test/1.0
tests:
  - name: basic
    input:
      x: 1
    expected_output:
      y: 2
`
    const result = validateRulesTestYaml(yaml)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid YAML syntax', () => {
    const result = validateRulesTestYaml('{ invalid yaml: [')
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('YAML parse error')
  })
})
