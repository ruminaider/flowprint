import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { validateRules, validateRulesTest } from '@ruminaider/flowprint-schema'
import { runRulesTests } from '@ruminaider/flowprint-engine'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')

describe('test command logic', () => {
  describe('passing test file', () => {
    it('runs order-discount tests and all pass', () => {
      const rulesContent = readFileSync(resolve(FIXTURES, 'order-discount.rules.yaml'), 'utf-8')
      const testContent = readFileSync(
        resolve(FIXTURES, 'order-discount.rules.test.yaml'),
        'utf-8',
      )

      const rulesDoc = parse(rulesContent) as unknown
      const testDoc = parse(testContent) as unknown

      // Validate both files
      const rulesValidation = validateRules(rulesDoc)
      expect(rulesValidation.valid).toBe(true)

      const testValidation = validateRulesTest(testDoc)
      expect(testValidation.valid).toBe(true)

      // Run tests
      const typed = testDoc as {
        tests: Array<{
          name: string
          input: Record<string, unknown>
          expected_output?: Record<string, unknown>
          expected_matched_count?: number
        }>
      }
      const results = runRulesTests(
        rulesDoc as Parameters<typeof runRulesTests>[0],
        typed.tests,
      )

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.passed)).toBe(true)
      expect(results.map((r) => r.name)).toEqual([
        'large order gets 25% discount',
        'medium order gets 10% discount',
        'small order gets no discount',
      ])
    })
  })

  describe('failing test file', () => {
    it('detects output mismatch', () => {
      const rulesContent = readFileSync(resolve(FIXTURES, 'order-discount.rules.yaml'), 'utf-8')
      const testContent = readFileSync(resolve(FIXTURES, 'failing.rules.test.yaml'), 'utf-8')

      const rulesDoc = parse(rulesContent) as unknown
      const testDoc = parse(testContent) as unknown

      const typed = testDoc as {
        tests: Array<{
          name: string
          input: Record<string, unknown>
          expected_output?: Record<string, unknown>
        }>
      }
      const results = runRulesTests(
        rulesDoc as Parameters<typeof runRulesTests>[0],
        typed.tests,
      )

      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(false)
      expect(results[0].errors[0]).toContain('Expected output')
    })
  })

  describe('test file naming convention', () => {
    it('derives rules file from test file by stripping .test', () => {
      // The naming convention: foo.rules.test.yaml -> foo.rules.yaml
      const testFile = 'order-discount.rules.test.yaml'
      const rulesFile = testFile.replace('.rules.test.yaml', '.rules.yaml')
      expect(rulesFile).toBe('order-discount.rules.yaml')
    })
  })
})
