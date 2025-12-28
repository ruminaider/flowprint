import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

/**
 * Helper to create a minimal valid FlowprintDocument.
 */
function makeDoc(
  overrides: Partial<FlowprintDocument> = {},
): FlowprintDocument {
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
        const match = line.match(/^( +)/)
        if (match) {
          const spaces = match[1]!.length
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
        const line = lines[i]!
        if (!line.startsWith(' ') && !line.startsWith('-') && line.includes(':')) {
          const key = line.split(':')[0]!.trim()
          if (!keyPositions.has(key)) {
            keyPositions.set(key, i)
          }
        }
      }

      const expectedOrder = ['schema', 'name', 'version', 'description', 'metadata', 'lanes', 'nodes']
      const actualKeys = [...keyPositions.keys()]
      const filteredActual = actualKeys.filter(k => expectedOrder.includes(k))
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
      const nodeStart = lines.findIndex(l => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      // Collect keys at 4-space indentation under the node
      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i]!
        // Stop when we hit another node or top-level key
        if (line.match(/^  \S/) || line.match(/^\S/)) break
        // Match 4-space indented keys
        const keyMatch = line.match(/^    (\w+):/)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1]!)
        }
      }

      const expectedOrder = ['type', 'lane', 'label', 'description', 'entry_points', 'next', 'error']
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
      const action = parsed.nodes.a as { error?: { retry?: { limit: number, backoff: string }, catch?: string } }
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
      const topLevelMetadata = lines.some(l => l === 'metadata:' || l.startsWith('metadata:'))
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
      const node = parsed.nodes.a as { entry_points?: Array<{ file: string, symbol: string }> }
      expect(node.entry_points).toHaveLength(2)
      expect(node.entry_points![0]!.file).toBe('src/api/handler.ts')
      expect(node.entry_points![0]!.symbol).toBe('handleRequest')
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
