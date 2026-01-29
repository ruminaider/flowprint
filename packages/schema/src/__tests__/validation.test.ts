import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validate, validateYaml } from '../validate.js'

const examplesDir = resolve(import.meta.dirname, '../../../..', 'examples')

function readExample(name: string): string {
  return readFileSync(resolve(examplesDir, name), 'utf-8')
}

// ── Valid documents ──────────────────────────────────────────────

describe('valid documents', () => {
  it('validates prescription-fulfillment example', () => {
    const yaml = readExample('prescription-fulfillment.flowprint.yaml')
    const result = validateYaml(yaml)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates subscription-renewal example', () => {
    const yaml = readExample('subscription-renewal.flowprint.yaml')
    const result = validateYaml(yaml)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates consultation-flow example', () => {
    const yaml = readExample('consultation-flow.flowprint.yaml')
    const result = validateYaml(yaml)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('validates a minimal valid document', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'minimal',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        start: { type: 'terminal', lane: 'main', label: 'Start', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ── Missing required fields ──────────────────────────────────────

describe('missing required fields', () => {
  it('detects missing schema field', () => {
    const result = validate({
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: { end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' } },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('schema'))).toBe(true)
  })

  it('detects missing name field', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: { end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' } },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('name'))).toBe(true)
  })

  it('detects missing lanes field', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      nodes: { end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' } },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('lanes'))).toBe(true)
  })

  it('detects missing nodes field', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('nodes'))).toBe(true)
  })

  it('detects missing required node fields (e.g. cases on switch)', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        decision: { type: 'switch', lane: 'main', label: 'Decision' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('detects missing outcome on terminal node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ── Invalid node type ────────────────────────────────────────────

describe('invalid node type', () => {
  it('detects unknown node type', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        bad: { type: 'unknown_type', lane: 'main', label: 'Bad Node' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path.includes('/nodes/bad'))).toBe(true)
  })
})

// ── Invalid lane reference (structural) ──────────────────────────

describe('invalid lane reference', () => {
  it('detects node referencing non-existent lane', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: { type: 'action', lane: 'nonexistent', label: 'Step', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.path === '/nodes/step/lane' && e.message.includes('nonexistent')),
    ).toBe(true)
  })
})

// ── Dangling node reference (structural) ─────────────────────────

describe('dangling node reference', () => {
  it('detects next pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: { type: 'action', lane: 'main', label: 'Step', next: 'does_not_exist' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/step/next' && e.message.includes('does_not_exist'),
      ),
    ).toBe(true)
  })

  it('detects switch case next pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        decision: {
          type: 'switch',
          lane: 'main',
          label: 'Decision',
          cases: [{ when: 'yes', next: 'missing_node' }],
        },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/decision/cases/0/next' && e.message.includes('missing_node'),
      ),
    ).toBe(true)
  })

  it('detects switch default pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        decision: {
          type: 'switch',
          lane: 'main',
          label: 'Decision',
          cases: [{ when: 'yes', next: 'end' }],
          default: 'ghost',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/decision/default' && e.message.includes('ghost'),
      ),
    ).toBe(true)
  })

  it('detects parallel branch pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['missing_branch'],
          join: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/fork/branches/0' && e.message.includes('missing_branch'),
      ),
    ).toBe(true)
  })

  it('detects parallel join pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'Step A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'missing_join',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/fork/join' && e.message.includes('missing_join'),
      ),
    ).toBe(true)
  })

  it('detects error.catch pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          next: 'end',
          error: { catch: 'missing_handler' },
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/step/error/catch' && e.message.includes('missing_handler'),
      ),
    ).toBe(true)
  })

  it('detects timeout_next pointing to non-existent node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        wait_step: {
          type: 'wait',
          lane: 'main',
          label: 'Wait',
          event: 'something',
          next: 'end',
          timeout_next: 'missing_timeout_node',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/wait_step/timeout_next' && e.message.includes('missing_timeout_node'),
      ),
    ).toBe(true)
  })
})

// ── Orphan nodes ─────────────────────────────────────────────────

describe('orphan nodes', () => {
  it('detects orphan node with no edges', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        orphan: { type: 'action', lane: 'main', label: 'Orphan Node' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.path === '/nodes/orphan' && e.message.includes('Orphan')),
    ).toBe(true)
    expect(result.errors.find((e) => e.path === '/nodes/orphan')?.severity).toBe('warning')
  })

  it('does not flag terminal nodes with incoming edges as orphans', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('flags unreachable terminal nodes with no incoming edges', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
        unreachable: { type: 'terminal', lane: 'main', label: 'Dead End', outcome: 'failure' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/unreachable' && e.message.includes('Unreachable'),
      ),
    ).toBe(true)
    expect(result.errors.find((e) => e.path === '/nodes/unreachable')?.severity).toBe('warning')
  })

  it('does not flag root nodes (no incoming but have outgoing) as orphans', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        root: { type: 'action', lane: 'main', label: 'Root', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ── Invalid schema version ───────────────────────────────────────

describe('invalid schema version', () => {
  it('detects unsupported schema version', () => {
    const result = validate({
      schema: 'flowprint/3.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.path === '/schema' && e.message.includes('Unsupported')),
    ).toBe(true)
  })

  it('detects invalid schema version format', () => {
    const result = validate({
      schema: 'not-a-version',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === '/schema')).toBe(true)
  })
})

// ── YAML parse errors ────────────────────────────────────────────

describe('YAML parse errors', () => {
  it('reports YAML syntax error', () => {
    const result = validateYaml('{ invalid yaml: [')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]?.severity).toBe('error')
    expect(result.errors[0]?.message).toContain('YAML parse error')
  })

  it('reports error for completely invalid YAML', () => {
    const result = validateYaml('\t\t::\n\t---\n:::')
    expect(result.valid).toBe(false)
  })
})

// ── Edge cases / malformed input ─────────────────────────────────

describe('malformed input', () => {
  it('handles null input', () => {
    const result = validate(null)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles undefined input', () => {
    const result = validate(undefined)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles string input', () => {
    const result = validate('not an object')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles array input', () => {
    const result = validate([1, 2, 3])
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles empty object', () => {
    const result = validate({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects additional top-level properties', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
      extra_field: 'should not be here',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('extra_field'))).toBe(true)
  })
})

// ── Visibility enum ──────────────────────────────────────────────

describe('lane visibility enum', () => {
  it('rejects invalid visibility value', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'private', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ── Outcome enum ─────────────────────────────────────────────────

describe('terminal outcome enum', () => {
  it('rejects invalid outcome value', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'unknown' },
      },
    })
    expect(result.valid).toBe(false)
  })
})

// ── Join strategy enum ───────────────────────────────────────────

describe('parallel join_strategy enum', () => {
  it('accepts all_reached', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'all_reached',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
  })

  it('accepts await_all', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'await_all',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid join_strategy', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'invalid',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
  })
})

// ── Error handler fields ─────────────────────────────────────────

describe('error handler', () => {
  it('validates error handler with retry and catch', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          next: 'end',
          error: {
            retry: { limit: 3, backoff: 'exponential' },
            catch: 'handler',
          },
        },
        handler: { type: 'error', lane: 'main', label: 'Handler', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid backoff value', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          next: 'end',
          error: {
            retry: { limit: 3, backoff: 'quadratic' },
          },
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
  })
})

// ── Schema 2.0 validation ───────────────────────────────────────

describe('schema 2.0 validation', () => {
  it('accepts a valid 2.0 document', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with workflow config', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      workflow: {
        task_queue: 'my-queue',
        execution_timeout: '1h',
        input_type: 'MyInput',
        input_type_import: './types',
      },
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with inputs', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          inputs: { id: 'input.id', name: 'input.name' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with compensation', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          compensation: { file: 'src/rollback.ts', symbol: 'undo' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with temporal config', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          temporal: {
            start_to_close_timeout: '30s',
            retry: {
              max_attempts: 3,
              backoff_coefficient: 2,
              initial_interval: '1s',
            },
          },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with join_strategy "all"', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'all',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts 2.0 document with join_strategy "first"', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'first',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects 2.0 document with join_strategy "all_reached"', () => {
    const result = validate({
      schema: 'flowprint/2.0',
      name: 'test-v2',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'all_reached',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/fork/join_strategy' && e.message.includes('not valid for schema 2.0'),
      ),
    ).toBe(true)
  })

  it('rejects 1.0 document with join_strategy "all"', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step_a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork',
          branches: ['step_a'],
          join: 'end',
          join_strategy: 'all',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/fork/join_strategy' && e.message.includes('not valid for schema 1.0'),
      ),
    ).toBe(true)
  })
})
