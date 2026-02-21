import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validate } from '../validate.js'
import { validateRules, validateRulesYaml } from '../rules.js'

const examplesDir = resolve(import.meta.dirname, '../../../..', 'examples')

function readExample(name: string): string {
  return readFileSync(resolve(examplesDir, name), 'utf-8')
}

// ── Rules schema validation ─────────────────────────────────────

describe('rules schema validation', () => {
  it('validates example order-processing rules file', () => {
    const yaml = readExample('order-processing.rules.yaml')
    const result = validateRulesYaml(yaml)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates a minimal valid rules document', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'minimal',
      hit_policy: 'first',
      rules: [{ then: { result: 'default' } }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates rules with all hit policies', () => {
    for (const policy of ['first', 'collect', 'all', 'priority'] as const) {
      const rule =
        policy === 'priority'
          ? { then: { value: 1 }, priority: 0 }
          : { then: { value: 1 } }
      const result = validateRules({
        schema: 'flowprint-rules/1.0',
        name: `test-${policy}`,
        hit_policy: policy,
        rules: [rule],
      })
      expect(result.valid).toBe(true)
    }
  })

  it('validates rules with all operator types', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'all-operators',
      hit_policy: 'first',
      inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
      rules: [
        {
          when: {
            a: { eq: 'value' },
            b: { not_eq: 'other' },
            c: { gt: 10 },
            d: { gte: 10 },
            e: { lt: 100 },
            f: { lte: 100 },
            g: { in: ['x', 'y'] },
            h: { not_in: ['z'] },
            i: { between: [1, 10] },
          },
          then: { matched: true },
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates rules with shorthand scalar conditions', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'shorthand',
      hit_policy: 'first',
      inputs: ['status', 'count', 'active'],
      rules: [
        {
          when: {
            status: 'active',
            count: 42,
            active: true,
          },
          then: { result: 'matched' },
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates rules with labeled expression inputs', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'labeled-inputs',
      hit_policy: 'first',
      inputs: [
        'order.amount',
        { label: 'Is VIP', expr: 'customer.loyalty_points > 1000' },
      ],
      rules: [{ then: { discount: 0 } }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates wildcard rules (no when clause)', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'wildcard',
      hit_policy: 'first',
      rules: [
        { when: { status: 'active' }, then: { action: 'process' } },
        { then: { action: 'default' } },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates explicit null matching via {eq: null}', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'null-match',
      hit_policy: 'first',
      inputs: ['field'],
      rules: [
        { when: { field: { eq: null } }, then: { result: 'null-field' } },
        { when: { field: { eq: '' } }, then: { result: 'empty-field' } },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates rules with priority field', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'priority-rules',
      hit_policy: 'priority',
      rules: [
        { when: { status: 'urgent' }, then: { queue: 'fast' }, priority: 0 },
        { when: { status: 'normal' }, then: { queue: 'standard' }, priority: 10 },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ── Rules schema errors ─────────────────────────────────────────

describe('rules schema errors', () => {
  it('rejects missing schema field', () => {
    const result = validateRules({
      name: 'test',
      hit_policy: 'first',
      rules: [{ then: {} }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('schema'))).toBe(true)
  })

  it('rejects wrong schema version', () => {
    const result = validateRules({
      schema: 'flowprint-rules/2.0',
      name: 'test',
      hit_policy: 'first',
      rules: [{ then: {} }],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects missing name', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      hit_policy: 'first',
      rules: [{ then: {} }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('name'))).toBe(true)
  })

  it('rejects invalid hit_policy', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'invalid',
      rules: [{ then: {} }],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects empty rules array', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects rule without then clause', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [{ when: { status: 'active' } }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('then'))).toBe(true)
  })

  it('rejects unknown operator in condition', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [
        {
          when: { status: { matches: 'regex.*' } },
          then: { result: true },
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects between with wrong number of elements', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [
        {
          when: { amount: { between: [1, 2, 3] } },
          then: { result: true },
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects additional properties on rule', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [
        {
          when: { status: 'active' },
          then: { result: true },
          extra: 'not allowed',
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid labeled input (missing expr)', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      inputs: [{ label: 'No Expression' }],
      rules: [{ then: {} }],
    })
    expect(result.valid).toBe(false)
  })

  it('reports YAML parse error for invalid YAML', () => {
    const result = validateRulesYaml('{ broken: [')
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('YAML parse error')
  })
})

// ── Rules structural warnings ───────────────────────────────────

describe('rules structural warnings', () => {
  it('warns about missing priority field with priority hit_policy', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'priority',
      rules: [
        { when: { status: 'active' }, then: { result: true } },
      ],
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/rules/0' && e.message.includes('priority') && e.severity === 'warning',
      ),
    ).toBe(true)
  })

  it('warns about undeclared input in when clause', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      inputs: ['status'],
      rules: [
        {
          when: { status: 'active', unknown_field: { eq: 1 } },
          then: { result: true },
        },
      ],
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/rules/0/when/unknown_field' &&
          e.message.includes('undeclared input') &&
          e.severity === 'warning',
      ),
    ).toBe(true)
  })

  it('does not warn about undeclared inputs when no inputs are declared', () => {
    const result = validateRules({
      schema: 'flowprint-rules/1.0',
      name: 'test',
      hit_policy: 'first',
      rules: [
        {
          when: { any_field: { eq: 1 } },
          then: { result: true },
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ── Flowprint document with rules references ────────────────────

describe('flowprint rules reference on nodes', () => {
  it('accepts action node with rules reference', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        compute: {
          type: 'action',
          lane: 'main',
          label: 'Compute Discount',
          rules: { file: 'rules/discount.rules.yaml' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts action node with rules reference and evaluator', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        compute: {
          type: 'action',
          lane: 'main',
          label: 'Compute Discount',
          rules: { file: 'rules/discount.rules.yaml', evaluator: 'gorules-zen' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts switch node with rules reference (no cases)', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        route: {
          type: 'switch',
          lane: 'main',
          label: 'Route Order',
          rules: { file: 'rules/routing.rules.yaml' },
          default: 'fallback',
        },
        fallback: { type: 'terminal', lane: 'main', label: 'Fallback', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects action node with both rules and entry_points', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        bad: {
          type: 'action',
          lane: 'main',
          label: 'Bad Node',
          rules: { file: 'rules/test.rules.yaml' },
          entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/bad' &&
          e.message.includes('rules') &&
          e.message.includes('entry_points'),
      ),
    ).toBe(true)
  })

  it('rejects switch node with both rules and cases', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        bad: {
          type: 'switch',
          lane: 'main',
          label: 'Bad Switch',
          rules: { file: 'rules/test.rules.yaml' },
          cases: [{ when: 'yes', next: 'end' }],
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/bad' && e.message.includes('rules') && e.message.includes('cases'),
      ),
    ).toBe(true)
  })

  it('rejects switch node with neither rules nor cases', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        empty: {
          type: 'switch',
          lane: 'main',
          label: 'Empty Switch',
        },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/empty' &&
          e.message.includes('cases') &&
          e.message.includes('rules'),
      ),
    ).toBe(true)
  })

  it('rejects invalid rules reference (missing file)', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        bad: {
          type: 'action',
          lane: 'main',
          label: 'Bad',
          rules: { evaluator: 'gorules-zen' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects rules reference with empty file path', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        bad: {
          type: 'action',
          lane: 'main',
          label: 'Bad',
          rules: { file: '' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
  })
})

// ── Serialization of rules reference ────────────────────────────

describe('rules serialization', () => {
  it('serializes action node with rules reference', async () => {
    const { serialize } = await import('../serialize.js')
    const yaml = serialize({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        compute: {
          type: 'action',
          lane: 'main',
          label: 'Compute',
          rules: { file: 'rules/discount.rules.yaml', evaluator: 'builtin' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('file: rules/discount.rules.yaml')
    expect(yaml).toContain('evaluator: builtin')
  })

  it('serializes switch node with rules reference', async () => {
    const { serialize } = await import('../serialize.js')
    const yaml = serialize({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        route: {
          type: 'switch',
          lane: 'main',
          label: 'Route',
          rules: { file: 'rules/routing.rules.yaml' },
          default: 'fallback',
        },
        fallback: { type: 'terminal', lane: 'main', label: 'Fallback', outcome: 'success' },
      },
    })
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('file: rules/routing.rules.yaml')
    expect(yaml).not.toContain('cases:')
  })
})

// ── Graph edges with rules-based switch nodes ───────────────────

describe('graph edges with rules nodes', () => {
  it('handles switch node with rules (no cases, no edges from cases)', async () => {
    const { getEdges } = await import('../graph.js')
    const edges = getEdges({
      schema: 'flowprint/2.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        route: {
          type: 'switch',
          lane: 'main',
          label: 'Route',
          rules: { file: 'rules/routing.rules.yaml' },
          default: 'fallback',
        },
        fallback: { type: 'terminal', lane: 'main', label: 'Fallback', outcome: 'success' },
      },
    })
    // Only the default edge, no case edges
    expect(edges).toEqual([
      { source: 'route', target: 'fallback', type: 'default' },
    ])
  })
})
