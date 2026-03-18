import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parse } from 'yaml'

describe('YAML parsing limits', () => {
  it('rejects YAML with excessive aliases (YAML bomb protection)', () => {
    // Build a YAML bomb: define an anchor and reference it 101+ times
    const lines = ['top: &a value']
    for (let i = 0; i < 101; i++) {
      lines.push(`k${String(i)}: *a`)
    }
    const yaml = lines.join('\n')

    // With maxAliasCount: 100, parsing should throw
    expect(() => parse(yaml, { maxAliasCount: 100, schema: 'core' })).toThrow(
      /excessive alias count/i,
    )
  })

  it('accepts YAML with aliases within the limit', () => {
    const lines = ['top: &a value']
    for (let i = 0; i < 50; i++) {
      lines.push(`k${String(i)}: *a`)
    }
    const yaml = lines.join('\n')

    // With maxAliasCount: 100, parsing 50 aliases should succeed
    const result = parse(yaml, { maxAliasCount: 100, schema: 'core' })
    expect(result).toBeDefined()
    expect(result.top).toBe('value')
    expect(result.k0).toBe('value')
  })

  it('verifies loadRulesFile rejects YAML bombs', async () => {
    // Dynamically import to test the actual code path with mocked fs
    vi.mock('node:fs', () => ({
      readFileSync: vi.fn(),
    }))

    const { readFileSync } = await import('node:fs')
    const mockedReadFileSync = vi.mocked(readFileSync)
    const { loadRulesFile } = await import('../../rules/evaluator.js')

    // Build a YAML bomb with 101 aliases
    const lines = ['schema: flowprint-rules/1.0', 'name: bomb', 'hit_policy: first', 'x: &a val']
    for (let i = 0; i < 101; i++) {
      lines.push(`k${String(i)}: *a`)
    }
    lines.push('rules:', '  - then:', '      result: true')

    mockedReadFileSync.mockReturnValue(lines.join('\n'))

    expect(() => loadRulesFile('bomb.yaml', '/project')).toThrow(/parse/i)

    vi.restoreAllMocks()
  })
})
