import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

/**
 * Helper to create a minimal valid FlowprintDocument.
 */
function makeDoc(overrides: Partial<FlowprintDocument> = {}): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test-blueprint',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    nodes: {
      start: { type: 'action', lane: 'main', label: 'Start', next: 'done' },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Basic serialization
// ---------------------------------------------------------------------------

describe('serialize', () => {
  it('produces valid YAML that can be parsed back', () => {
    const doc = makeDoc()
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    expect(parsed.schema).toBe('flowprint/1.0')
    expect(parsed.name).toBe('test-blueprint')
    expect(parsed.version).toBe('1.0.0')
    expect(parsed.nodes.start).toBeDefined()
    expect(parsed.nodes.done).toBeDefined()
  })

  it('round-trips back to equivalent document', () => {
    const doc = makeDoc()
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    expect(parsed).toEqual(doc)
  })

  it('ends with a single trailing newline', () => {
    const doc = makeDoc()
    const yaml = serialize(doc)
    expect(yaml.endsWith('\n')).toBe(true)
    expect(yaml.endsWith('\n\n')).toBe(false)
  })

  it('uses 2-space indentation', () => {
    const doc = makeDoc()
    const yaml = serialize(doc)
    const lines = yaml.split('\n')
    // Check that indented lines use 2-space multiples
    for (const line of lines) {
      if (line.startsWith(' ')) {
        const match = /^( +)/.exec(line)
        if (match) {
          const spaces = match[1]?.length ?? 0
          expect(spaces % 2).toBe(0)
        }
      }
    }
  })

  // -------------------------------------------------------------------------
  // Key ordering
  // -------------------------------------------------------------------------

  describe('key ordering', () => {
    it('outputs top-level keys in canonical order', () => {
      const doc = makeDoc({
        description: 'A test',
        metadata: { owner: 'team-a' },
      })
      const yaml = serialize(doc)
      const lines = yaml.split('\n')

      // Find indices of top-level keys
      const keyPositions = new Map<string, number>()
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (!line.startsWith(' ') && !line.startsWith('-') && line.includes(':')) {
          const key = (line.split(':')[0] ?? '').trim()
          if (!keyPositions.has(key)) {
            keyPositions.set(key, i)
          }
        }
      }

      const expectedOrder = [
        'schema',
        'name',
        'version',
        'description',
        'metadata',
        'lanes',
        'nodes',
      ]
      const actualKeys = [...keyPositions.keys()]
      const filteredActual = actualKeys.filter((k) => expectedOrder.includes(k))
      expect(filteredActual).toEqual(expectedOrder)
    })

    it('outputs node keys in canonical order (type first)', () => {
      const doc = makeDoc({
        nodes: {
          my_node: {
            type: 'action',
            lane: 'main',
            label: 'My Node',
            description: 'Does things',
            entry_points: [{ file: 'src/app.ts', symbol: 'handler' }],
            next: 'done',
            error: { catch: 'err' },
          },
          err: { type: 'error', lane: 'main', label: 'Error', next: 'fail' },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)

      // Find the my_node section and extract its keys
      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      // Collect keys at 4-space indentation under the node
      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        // Stop when we hit another node or top-level key
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        // Match 4-space indented keys
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      const expectedOrder = [
        'type',
        'lane',
        'label',
        'description',
        'entry_points',
        'next',
        'error',
      ]
      expect(nodeKeys).toEqual(expectedOrder)
    })

    it('outputs top-level keys in canonical order with workflow', () => {
      const doc = makeDoc({
        description: 'A test',
        metadata: { owner: 'team-a' },
        workflow: { task_queue: 'my-queue', execution_timeout: '1h' },
      })
      const yaml = serialize(doc)
      const lines = yaml.split('\n')

      const keyPositions = new Map<string, number>()
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (!line.startsWith(' ') && !line.startsWith('-') && line.includes(':')) {
          const key = (line.split(':')[0] ?? '').trim()
          if (!keyPositions.has(key)) {
            keyPositions.set(key, i)
          }
        }
      }

      const expectedOrder = [
        'schema',
        'name',
        'version',
        'description',
        'metadata',
        'workflow',
        'lanes',
        'nodes',
      ]
      const actualKeys = [...keyPositions.keys()]
      const filteredActual = actualKeys.filter((k) => expectedOrder.includes(k))
      expect(filteredActual).toEqual(expectedOrder)
    })

    it('outputs action node keys in canonical order with 2.0 fields', () => {
      const doc = makeDoc({
        nodes: {
          my_node: {
            type: 'action',
            lane: 'main',
            label: 'My Node',
            description: 'Does things',
            metadata: { sla: '5m' },
            entry_points: [{ file: 'src/app.ts', symbol: 'handler' }],
            inputs: { patient_id: 'input.patient_id' },
            compensation: { file: 'src/rollback.ts', symbol: 'undo' },
            temporal: { start_to_close_timeout: '30s' },
            next: 'done',
            error: { catch: 'err' },
          },
          err: { type: 'error', lane: 'main', label: 'Error', next: 'fail' },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      const expectedOrder = [
        'type',
        'lane',
        'label',
        'description',
        'metadata',
        'entry_points',
        'inputs',
        'compensation',
        'temporal',
        'next',
        'error',
      ]
      expect(nodeKeys).toEqual(expectedOrder)
    })

    it('outputs wait node keys in canonical order with 2.0 fields', () => {
      const doc = makeDoc({
        nodes: {
          w: {
            type: 'wait',
            lane: 'main',
            label: 'Wait',
            event: 'payment.received',
            event_type: 'PaymentSignal',
            event_type_import: './signals',
            timeout: '24h',
            next: 'done',
            timeout_next: 'fail',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('w:'))
      expect(nodeStart).toBeGreaterThan(-1)

      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      const expectedOrder = [
        'type',
        'lane',
        'label',
        'event',
        'event_type',
        'event_type_import',
        'timeout',
        'next',
        'timeout_next',
      ]
      expect(nodeKeys).toEqual(expectedOrder)
    })
  })

  // -------------------------------------------------------------------------
  // Node types
  // -------------------------------------------------------------------------

  describe('node types', () => {
    it('serializes switch node with cases and default', () => {
      const doc = makeDoc({
        nodes: {
          sw: {
            type: 'switch',
            lane: 'main',
            label: 'Switch',
            cases: [
              { when: 'yes', next: 'a' },
              { when: 'no', next: 'b' },
            ],
            default: 'c',
          },
          a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
          b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'failure' },
          c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.sw).toEqual(doc.nodes.sw)
    })

    it('serializes parallel node with branches and join', () => {
      const doc = makeDoc({
        nodes: {
          p: {
            type: 'parallel',
            lane: 'main',
            label: 'Parallel',
            branches: ['a', 'b'],
            join: 'c',
            join_strategy: 'all_reached',
          },
          a: { type: 'action', lane: 'main', label: 'A', next: 'c' },
          b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
          c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.p).toEqual(doc.nodes.p)
    })

    it('serializes wait node with event, timeout, next, and timeout_next', () => {
      const doc = makeDoc({
        nodes: {
          w: {
            type: 'wait',
            lane: 'main',
            label: 'Wait',
            event: 'payment.received',
            timeout: '24h',
            next: 'done',
            timeout_next: 'fail',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.w).toEqual(doc.nodes.w)
    })

    it('serializes error node', () => {
      const doc = makeDoc({
        nodes: {
          e: { type: 'error', lane: 'main', label: 'Error Handler', next: 'fail' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.e).toEqual(doc.nodes.e)
    })

    it('serializes terminal node with outcome', () => {
      const doc = makeDoc({
        nodes: {
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.done).toEqual(doc.nodes.done)
    })
  })

  // -------------------------------------------------------------------------
  // Error handler
  // -------------------------------------------------------------------------

  describe('error handler', () => {
    it('serializes error with retry and catch', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            next: 'done',
            error: {
              retry: { limit: 3, backoff: 'exponential' },
              catch: 'err',
            },
          },
          err: { type: 'error', lane: 'main', label: 'Error', next: 'fail' },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      const action = parsed.nodes.a as {
        error?: { retry?: { limit: number; backoff: string }; catch?: string }
      }
      expect(action.error?.retry?.limit).toBe(3)
      expect(action.error?.retry?.backoff).toBe('exponential')
      expect(action.error?.catch).toBe('err')
    })

    it('serializes error with retry only (no catch)', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            next: 'done',
            error: {
              retry: { limit: 5 },
            },
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      const action = parsed.nodes.a as { error?: { retry?: { limit: number } } }
      expect(action.error?.retry?.limit).toBe(5)
    })
  })

  // -------------------------------------------------------------------------
  // Metadata and optional fields
  // -------------------------------------------------------------------------

  describe('optional fields', () => {
    it('includes description when present', () => {
      const doc = makeDoc({ description: 'A blueprint for testing' })
      const yaml = serialize(doc)
      expect(yaml).toContain('description: A blueprint for testing')
    })

    it('omits description when absent', () => {
      const doc = makeDoc()
      const yaml = serialize(doc)
      expect(yaml).not.toContain('description:')
    })

    it('includes metadata when present', () => {
      const doc = makeDoc({ metadata: { owner: 'team-a', domain: 'billing' } })
      const yaml = serialize(doc)
      expect(yaml).toContain('owner: team-a')
      expect(yaml).toContain('domain: billing')
    })

    it('omits metadata when absent', () => {
      const doc = makeDoc()
      const yaml = serialize(doc)
      // There should be no top-level metadata key
      const lines = yaml.split('\n')
      const topLevelMetadata = lines.some((l) => l === 'metadata:' || l.startsWith('metadata:'))
      expect(topLevelMetadata).toBe(false)
    })

    it('includes node metadata when present', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            metadata: { sla: '5m' },
          },
        },
      })
      const yaml = serialize(doc)
      expect(yaml).toContain('sla: 5m')
    })
  })

  // -------------------------------------------------------------------------
  // YAML style
  // -------------------------------------------------------------------------

  describe('YAML style', () => {
    it('uses block style for objects (no flow/inline)', () => {
      const doc = makeDoc({
        metadata: { owner: 'team-a' },
      })
      const yaml = serialize(doc)
      // Flow style would look like { owner: team-a }
      expect(yaml).not.toContain('{ ')
    })

    it('uses block style for arrays', () => {
      const doc = makeDoc({
        nodes: {
          p: {
            type: 'parallel',
            lane: 'main',
            label: 'P',
            branches: ['a', 'b'],
            join: 'c',
          },
          a: { type: 'action', lane: 'main', label: 'A', next: 'c' },
          b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
          c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      // Flow style arrays look like [a, b]
      expect(yaml).not.toMatch(/\[.*,.*\]/)
    })

    it('does not unnecessarily quote plain strings', () => {
      const doc = makeDoc()
      const yaml = serialize(doc)
      // 'flowprint/1.0' contains a slash but is still valid as unquoted YAML
      // Name and simple strings should not be quoted
      expect(yaml).toContain('name: test-blueprint')
    })
  })

  // -------------------------------------------------------------------------
  // Entry points
  // -------------------------------------------------------------------------

  describe('entry points', () => {
    it('serializes entry_points with file and symbol', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            entry_points: [
              { file: 'src/api/handler.ts', symbol: 'handleRequest' },
              { file: 'src/api/validator.ts', symbol: 'validateInput' },
            ],
          },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      const node = parsed.nodes.a as { entry_points?: { file: string; symbol: string }[] }
      expect(node.entry_points).toHaveLength(2)
      expect(node.entry_points?.[0]?.file).toBe('src/api/handler.ts')
      expect(node.entry_points?.[0]?.symbol).toBe('handleRequest')
    })
  })

  // -------------------------------------------------------------------------
  // Schema 2.0 fields
  // -------------------------------------------------------------------------

  describe('schema 2.0 fields', () => {
    it('round-trips workflow configuration', () => {
      const doc = makeDoc({
        workflow: {
          task_queue: 'my-queue',
          execution_timeout: '1h',
          input_type: 'ConsultationInput',
          input_type_import: './types',
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.workflow).toEqual(doc.workflow)
    })

    it('round-trips action node with inputs', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            inputs: { patient_id: 'input.patient_id', name: 'input.name' },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.a).toEqual(doc.nodes.a)
    })

    it('round-trips action node with compensation', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            compensation: { file: 'src/rollback.ts', symbol: 'undoAction' },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.a).toEqual(doc.nodes.a)
    })

    it('round-trips action node with temporal config', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            temporal: {
              start_to_close_timeout: '30s',
              schedule_to_close_timeout: '2m',
              heartbeat_timeout: '10s',
              retry: {
                max_attempts: 5,
                backoff_coefficient: 1.5,
                initial_interval: '2s',
                max_interval: '30s',
                non_retryable_errors: ['FatalError', 'NotFound'],
              },
            },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.a).toEqual(doc.nodes.a)
    })

    it('round-trips temporal config with partial retry', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            temporal: {
              start_to_close_timeout: '1m',
              retry: { max_attempts: 3 },
            },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.a).toEqual(doc.nodes.a)
    })

    it('round-trips wait node with event_type and event_type_import', () => {
      const doc = makeDoc({
        nodes: {
          w: {
            type: 'wait',
            lane: 'main',
            label: 'Wait',
            event: 'payment.received',
            event_type: 'PaymentSignal',
            event_type_import: './signals',
            timeout: '24h',
            next: 'done',
            timeout_next: 'fail',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.w).toEqual(doc.nodes.w)
    })

    it('omits workflow when absent', () => {
      const doc = makeDoc()
      const yaml = serialize(doc)
      expect(yaml).not.toContain('workflow:')
    })

    it('round-trips a full 2.0 action node with all new fields', () => {
      const doc = makeDoc({
        schema: 'flowprint/2.0',
        workflow: { task_queue: 'q', execution_timeout: '1h' },
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'Full Action',
            entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
            inputs: { id: 'input.id' },
            compensation: { file: 'src/rollback.ts', symbol: 'undo' },
            temporal: {
              start_to_close_timeout: '30s',
              retry: {
                max_attempts: 3,
                backoff_coefficient: 2,
                initial_interval: '1s',
                max_interval: '10s',
                non_retryable_errors: ['Fatal'],
              },
            },
            next: 'done',
            error: { retry: { limit: 3 }, catch: 'err' },
          },
          err: { type: 'error', lane: 'main', label: 'Error', next: 'fail' },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed).toEqual(doc)
    })
  })

  // -------------------------------------------------------------------------
  // Position
  // -------------------------------------------------------------------------

  describe('position', () => {
    it('round-trips node with position', () => {
      const doc = makeDoc({
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            position: { x: 100, y: 200 },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.nodes.a).toEqual(doc.nodes.a)
    })

    it('omits position when absent', () => {
      const doc = makeDoc()
      const yaml = serialize(doc)
      expect(yaml).not.toContain('position:')
    })

    it('outputs position before entry_points in key order', () => {
      const doc = makeDoc({
        nodes: {
          my_node: {
            type: 'action',
            lane: 'main',
            label: 'My Node',
            position: { x: 50, y: 75 },
            entry_points: [{ file: 'src/app.ts', symbol: 'handler' }],
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      const posIdx = nodeKeys.indexOf('position')
      const epIdx = nodeKeys.indexOf('entry_points')
      expect(posIdx).toBeGreaterThan(-1)
      expect(epIdx).toBeGreaterThan(-1)
      expect(posIdx).toBeLessThan(epIdx)
    })
  })

  // -------------------------------------------------------------------------
  // Deterministic output
  // -------------------------------------------------------------------------

  describe('deterministic output', () => {
    it('produces identical output on repeated serialization', () => {
      const doc = makeDoc({
        description: 'Test',
        metadata: { owner: 'team', domain: 'billing' },
        nodes: {
          a: {
            type: 'action',
            lane: 'main',
            label: 'A',
            entry_points: [{ file: 'a.ts', symbol: 'fn' }],
            next: 'b',
            error: { retry: { limit: 3 }, catch: 'err' },
          },
          b: {
            type: 'switch',
            lane: 'main',
            label: 'B',
            cases: [{ when: 'yes', next: 'done' }],
            default: 'err',
          },
          err: { type: 'error', lane: 'main', label: 'Error', next: 'fail' },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
          fail: { type: 'terminal', lane: 'main', label: 'Fail', outcome: 'failure' },
        },
      })
      const yaml1 = serialize(doc)
      const yaml2 = serialize(doc)
      expect(yaml1).toBe(yaml2)
    })
  })

  // -------------------------------------------------------------------------
  // Lanes
  // -------------------------------------------------------------------------

  describe('lanes', () => {
    it('serializes multiple lanes', () => {
      const doc = makeDoc({
        lanes: {
          customer: { label: 'Customer', visibility: 'external', order: 0 },
          internal: { label: 'Internal', visibility: 'internal', order: 1 },
        },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      expect(Object.keys(parsed.lanes)).toEqual(['customer', 'internal'])
      expect(parsed.lanes.customer?.visibility).toBe('external')
      expect(parsed.lanes.internal?.visibility).toBe('internal')
    })
  })

  // -------------------------------------------------------------------------
  // Version string quoting
  // -------------------------------------------------------------------------

  describe('string quoting', () => {
    it('quotes version strings that look like numbers', () => {
      const doc = makeDoc({ version: '1.0.0' })
      const yaml = serialize(doc)
      // When parsed, version must still be the string "1.0.0"
      const parsed = parse(yaml) as FlowprintDocument
      expect(parsed.version).toBe('1.0.0')
      expect(typeof parsed.version).toBe('string')
    })

    it('preserves YAML-reserved strings in metadata through round-trip', () => {
      const doc = makeDoc({
        metadata: { flag: 'true', empty: 'null', answer: 'yes', count: '1.0' },
      })
      const yaml = serialize(doc)
      const parsed = parse(yaml) as FlowprintDocument
      // All values must survive as strings, not booleans/numbers/null
      expect(parsed.metadata?.flag).toBe('true')
      expect(typeof parsed.metadata?.flag).toBe('string')
      expect(parsed.metadata?.empty).toBe('null')
      expect(typeof parsed.metadata?.empty).toBe('string')
      expect(parsed.metadata?.answer).toBe('yes')
      expect(typeof parsed.metadata?.answer).toBe('string')
      expect(parsed.metadata?.count).toBe('1.0')
      expect(typeof parsed.metadata?.count).toBe('string')
    })
  })
})
