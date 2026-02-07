import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { generateCode } from '../../codegen/index.js'
import { generateWorkflow } from '../../codegen/workflow-generator.js'

function makeDoc(
  overrides: Partial<FlowprintDocument> & { nodes: FlowprintDocument['nodes'] },
): FlowprintDocument {
  return {
    schema: 'flowprint/2.0',
    name: 'test-flow',
    version: '1.0.0',
    lanes: {
      default: { label: 'Default', visibility: 'internal', order: 0 },
    },
    ...overrides,
  }
}

const EXAMPLES_DIR = resolve(import.meta.dirname, '../../../../..', 'examples')

function loadDoc(filename: string): FlowprintDocument {
  const content = readFileSync(resolve(EXAMPLES_DIR, filename), 'utf-8')
  return parse(content) as FlowprintDocument
}

describe('codegen edge cases', () => {
  it('all generated files from consultation-flow-v2 have balanced braces', () => {
    const doc = loadDoc('consultation-flow-v2.flowprint.yaml')
    const result = generateCode(doc, { outputDir: './out', flowName: doc.name })

    for (const file of result.files) {
      const open = (file.content.match(/\{/g) ?? []).length
      const close = (file.content.match(/\}/g) ?? []).length
      expect(open, `${file.path} should have balanced braces`).toBe(close)
    }
  })

  it('all generated files from consultation-flow-v2 have balanced parentheses', () => {
    const doc = loadDoc('consultation-flow-v2.flowprint.yaml')
    const result = generateCode(doc, { outputDir: './out', flowName: doc.name })

    for (const file of result.files) {
      const open = (file.content.match(/\(/g) ?? []).length
      const close = (file.content.match(/\)/g) ?? []).length
      expect(open, `${file.path} should have balanced parens`).toBe(close)
    }
  })

  it('switch without default produces no else block', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'default',
          label: 'Check',
          cases: [
            { when: "input.x === 'a'", next: 'done' },
            { when: "input.x === 'b'", next: 'done' },
          ],
          // No default
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain("if (input.x === 'a')")
    expect(result.content).toContain("} else if (input.x === 'b')")
    expect(result.content).not.toContain('} else {')
  })

  it('switch with default produces else block', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'default',
          label: 'Check',
          cases: [{ when: "input.x === 'a'", next: 'route_a' }],
          default: 'route_b',
        },
        route_a: {
          type: 'terminal',
          lane: 'default',
          label: 'A',
          outcome: 'success',
        },
        route_b: {
          type: 'terminal',
          lane: 'default',
          label: 'B',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain('} else {')
  })

  it('action without entry_points generates a comment', () => {
    const doc = makeDoc({
      schema: 'flowprint/1.0',
      nodes: {
        no_ep: {
          type: 'action',
          lane: 'default',
          label: 'No Entry Points',
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    // When entry_points is empty/missing, generateActionCode emits a comment
    expect(result.content).toContain('// No Entry Points (no entry points)')
    expect(result.content).not.toContain('defaultActivities.noEp()')
  })

  it('parallel first generates CancellationScope and Promise.race', () => {
    const doc = makeDoc({
      nodes: {
        race: {
          type: 'parallel',
          lane: 'default',
          label: 'Race',
          branches: ['fast', 'slow'],
          join: 'done',
          join_strategy: 'first',
        },
        fast: {
          type: 'action',
          lane: 'default',
          label: 'Fast',
          entry_points: [{ file: 'src/fast.ts', symbol: 'fast' }],
          next: 'done',
        },
        slow: {
          type: 'action',
          lane: 'default',
          label: 'Slow',
          entry_points: [{ file: 'src/slow.ts', symbol: 'slow' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain('CancellationScope.cancellable')
    expect(result.content).toContain('Promise.race')
  })

  it('parallel all generates Promise.all', () => {
    const doc = makeDoc({
      nodes: {
        fan: {
          type: 'parallel',
          lane: 'default',
          label: 'Fan Out',
          branches: ['a', 'b'],
          join: 'done',
          join_strategy: 'all',
        },
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'src/a.ts', symbol: 'a' }],
          next: 'done',
        },
        b: {
          type: 'action',
          lane: 'default',
          label: 'B',
          entry_points: [{ file: 'src/b.ts', symbol: 'b' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain('Promise.all')
    expect(result.content).not.toContain('CancellationScope')
  })

  it('compensation generates compensationStack with try/catch', () => {
    const doc = makeDoc({
      nodes: {
        step: {
          type: 'action',
          lane: 'default',
          label: 'Compensable Step',
          entry_points: [{ file: 'src/s.ts', symbol: 'step' }],
          compensation: { file: 'src/undo.ts', symbol: 'undoStep' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain('compensationStack')
    expect(result.content).toContain('compensationStack.push')
    expect(result.content).toContain('try {')
    expect(result.content).toContain('} catch (err) {')
    expect(result.content).toContain('compensationStack.reverse()')
  })

  it('no compensation means no compensationStack or try/catch', () => {
    const doc = makeDoc({
      nodes: {
        step: {
          type: 'action',
          lane: 'default',
          label: 'Simple Step',
          entry_points: [{ file: 'src/s.ts', symbol: 'step' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).not.toContain('compensationStack')
    // The catch block for compensation wrapping should not be present
    // (note: action-level error.catch try/catch is different from compensation try/catch)
    expect(result.content).not.toContain('compensationStack.reverse()')
  })

  it('temporal retry config generates maximumAttempts and backoffCoefficient', () => {
    const doc = makeDoc({
      nodes: {
        retry_action: {
          type: 'action',
          lane: 'default',
          label: 'Retry Action',
          entry_points: [{ file: 'src/r.ts', symbol: 'retryAction' }],
          temporal: {
            start_to_close_timeout: '30s',
            retry: {
              max_attempts: 5,
              backoff_coefficient: 1.5,
              initial_interval: '2s',
              max_interval: '30s',
            },
          },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    })
    const result = generateWorkflow(doc)
    expect(result.content).toContain('maximumAttempts: 5')
    expect(result.content).toContain('backoffCoefficient: 1.5')
    expect(result.content).toContain("initialInterval: '2s'")
    expect(result.content).toContain("maximumInterval: '30s'")
  })
})
