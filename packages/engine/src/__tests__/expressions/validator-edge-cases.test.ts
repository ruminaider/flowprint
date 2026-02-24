import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validateExpressions } from '../../expressions/validator.js'

function makeDoc(
  overrides: Partial<FlowprintDocument> & { nodes: FlowprintDocument['nodes'] },
): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    ...overrides,
  }
}

const EXAMPLES_DIR = resolve(import.meta.dirname, '../../../../..', 'examples')

describe('validator edge cases', () => {
  it('input is always valid even without a node named input', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/check.ts', symbol: 'check' }],
          cases: [{ when: 'input.x > 0', next: 'done' }],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('self-reference in switch is rejected', () => {
    // A switch node referencing its own ID should fail because it hasn't
    // been visited yet at the time its expressions are evaluated (topo order)
    const doc = makeDoc({
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          entry_points: [{ file: 'src/s.ts', symbol: 's' }],
          next: 'check',
        },
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/c.ts', symbol: 'c' }],
          cases: [{ when: 'check.value > 0', next: 'done' }],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('does not come before'))).toBe(true)
  })

  it('executable example YAMLs pass expression validation', () => {
    // These examples use evaluable expressions in switch cases and have
    // entry_points that resolve to stub files. Other examples use descriptive
    // switch labels that are not evaluable expressions.
    const executableExamples = [
      'consultation-flow.flowprint.yaml',
      'consultation-flow-stubs.flowprint.yaml',
      'order-processing-flow.flowprint.yaml',
    ]

    for (const file of executableExamples) {
      const content = readFileSync(resolve(EXAMPLES_DIR, file), 'utf-8')
      const doc = parse(content) as FlowprintDocument
      const result = validateExpressions(doc)
      expect(result.valid, `${file} should pass validation`).toBe(true)
    }
  })

  it('forward reference is rejected', () => {
    // Switch referencing a node that comes after in topological order
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/c.ts', symbol: 'c' }],
          cases: [{ when: 'later_action.result > 0', next: 'later_action' }],
          default: 'done',
        },
        later_action: {
          type: 'action',
          lane: 'main',
          label: 'Later',
          entry_points: [{ file: 'src/l.ts', symbol: 'l' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.message.includes('later_action') && e.message.includes('does not come before'),
      ),
    ).toBe(true)
  })
})
