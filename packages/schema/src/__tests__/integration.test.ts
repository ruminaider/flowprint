import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import {
  validate,
  validateYaml,
  topoSort,
  detectCycles,
  getEdges,
  findRoots,
  serialize,
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isErrorNode,
  isTerminalNode,
} from '../index.js'
import type { FlowprintDocument, Node } from '../types.js'

// ── Helpers ──────────────────────────────────────────────────────

/** Look up a node by ID and assert it exists, returning a narrowed type. */
function getNode(doc: FlowprintDocument, id: string): Node {
  const node: Node | undefined = doc.nodes[id]
  if (!node) {
    throw new Error(`Node "${id}" not found in document`)
  }
  return node
}

const examplesDir = resolve(import.meta.dirname, '../../../..', 'examples')

const EXAMPLES = [
  'prescription-fulfillment.flowprint.yaml',
  'subscription-renewal.flowprint.yaml',
  'consultation-flow.flowprint.yaml',
  'consultation-flow-v2.flowprint.yaml',
] as const

function readExample(name: string): string {
  return readFileSync(resolve(examplesDir, name), 'utf-8')
}

function loadExample(name: string): FlowprintDocument {
  const yaml = readExample(name)
  return parse(yaml) as FlowprintDocument
}

// ── Validation ──────────────────────────────────────────────────

describe('integration: validate examples', () => {
  for (const example of EXAMPLES) {
    it(`validates ${example} with zero errors`, () => {
      const yaml = readExample(example)
      const result = validateYaml(yaml)
      if (!result.valid) {
        // Surface the actual errors for debugging
        console.error(`Validation errors for ${example}:`, result.errors)
      }
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it(`validates ${example} via parsed object`, () => {
      const doc = loadExample(example)
      const result = validate(doc)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  }
})

// ── Graph utilities ─────────────────────────────────────────────

describe('integration: graph utilities', () => {
  for (const example of EXAMPLES) {
    describe(example, () => {
      const doc = loadExample(example)

      it('getEdges returns non-empty edge list', () => {
        const edges = getEdges(doc)
        expect(edges.length).toBeGreaterThan(0)
        // All edges should reference valid node IDs
        const nodeIds = new Set(Object.keys(doc.nodes))
        for (const edge of edges) {
          expect(nodeIds.has(edge.source)).toBe(true)
          expect(nodeIds.has(edge.target)).toBe(true)
        }
      })

      it('findRoots returns at least one root', () => {
        const roots = findRoots(doc)
        expect(roots.length).toBeGreaterThan(0)
        // Roots must be actual node IDs
        const nodeIds = new Set(Object.keys(doc.nodes))
        for (const root of roots) {
          expect(nodeIds.has(root)).toBe(true)
        }
      })

      it('detectCycles returns null (no cycles)', () => {
        const cycles = detectCycles(doc)
        expect(cycles).toBeNull()
      })

      it('topoSort includes all nodes', () => {
        const sorted = topoSort(doc)
        const nodeIds = Object.keys(doc.nodes)
        expect(sorted.length).toBe(nodeIds.length)

        // Every node ID is present
        const sortedIds = sorted.map((n) => n.id)
        for (const nodeId of nodeIds) {
          expect(sortedIds).toContain(nodeId)
        }
      })

      it('topoSort assigns order 0 to root nodes', () => {
        const sorted = topoSort(doc)
        const roots = findRoots(doc)

        for (const root of roots) {
          const entry = sorted.find((n) => n.id === root)
          expect(entry).toBeDefined()
          expect(entry?.order).toBe(0)
        }
      })

      it('topoSort maintains correct ordering (parent before child)', () => {
        const sorted = topoSort(doc)
        const edges = getEdges(doc)
        const orderMap = new Map(sorted.map((n) => [n.id, n.order]))

        for (const edge of edges) {
          const sourceOrder = orderMap.get(edge.source)
          const targetOrder = orderMap.get(edge.target)
          expect(sourceOrder).toBeDefined()
          expect(targetOrder).toBeDefined()
          expect(sourceOrder ?? 0).toBeLessThanOrEqual(targetOrder ?? 0)
        }
      })
    })
  }
})

// ── Serialize round-trip ────────────────────────────────────────

describe('integration: serialize round-trip', () => {
  for (const example of EXAMPLES) {
    it(`round-trips ${example} (serialize -> parse -> validate)`, () => {
      const original = loadExample(example)

      // Serialize the document
      const serialized = serialize(original)
      expect(typeof serialized).toBe('string')
      expect(serialized.length).toBeGreaterThan(0)
      expect(serialized.endsWith('\n')).toBe(true)

      // Parse the serialized output back
      const reparsed = parse(serialized) as FlowprintDocument
      expect(reparsed).toBeDefined()

      // Validate the reparsed document
      const result = validate(reparsed)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it(`round-trip preserves structure for ${example}`, () => {
      const original = loadExample(example)
      const serialized = serialize(original)
      const reparsed = parse(serialized) as FlowprintDocument

      // Top-level fields
      expect(reparsed.schema).toBe(original.schema)
      expect(reparsed.name).toBe(original.name)
      expect(reparsed.version).toBe(original.version)
      expect(reparsed.description).toBe(original.description)

      // Metadata (if present)
      if (original.metadata) {
        expect(reparsed.metadata).toEqual(original.metadata)
      }

      // Lanes
      expect(Object.keys(reparsed.lanes).sort()).toEqual(Object.keys(original.lanes).sort())
      for (const [laneId, lane] of Object.entries(original.lanes)) {
        expect(reparsed.lanes[laneId]).toEqual(lane)
      }

      // Nodes — same set of IDs
      expect(Object.keys(reparsed.nodes).sort()).toEqual(Object.keys(original.nodes).sort())

      // Each node matches the original
      for (const [nodeId, node] of Object.entries(original.nodes)) {
        expect(reparsed.nodes[nodeId]).toEqual(node)
      }
    })

    it(`double serialize is idempotent for ${example}`, () => {
      const original = loadExample(example)
      const first = serialize(original)
      const reparsed = parse(first) as FlowprintDocument
      const second = serialize(reparsed)
      expect(second).toBe(first)
    })
  }
})

// ── Type guards on real data ────────────────────────────────────

describe('integration: type guards on example nodes', () => {
  describe('prescription-fulfillment', () => {
    const doc = loadExample('prescription-fulfillment.flowprint.yaml')

    it('identifies action nodes', () => {
      const node = getNode(doc, 'complete_consultation')
      expect(isActionNode(node)).toBe(true)
      expect(isSwitchNode(node)).toBe(false)
      expect(isTerminalNode(node)).toBe(false)
      if (isActionNode(node)) {
        expect(node.next).toBe('evaluate_treatment')
        expect(node.entry_points).toBeDefined()
        expect(node.entry_points?.length).toBeGreaterThan(0)
        expect(node.entry_points?.[0]?.file).toBe('backend/consults/wheel/tasks.py')
        expect(node.entry_points?.[0]?.symbol).toBe('send_wheel_consult')
      }
    })

    it('identifies switch nodes', () => {
      const node = getNode(doc, 'evaluate_treatment')
      expect(isSwitchNode(node)).toBe(true)
      expect(isActionNode(node)).toBe(false)
      if (isSwitchNode(node)) {
        expect(node.cases.length).toBe(2)
        expect(node.cases[0]?.when).toBe('needs_prescription')
        expect(node.default).toBe('create_prescription')
      }
    })

    it('identifies parallel nodes', () => {
      const node = getNode(doc, 'fulfill_order')
      expect(isParallelNode(node)).toBe(true)
      if (isParallelNode(node)) {
        expect(node.branches).toContain('submit_to_pharmacy')
        expect(node.branches).toContain('notify_patient')
        expect(node.join).toBe('delivery_tracking')
        expect(node.join_strategy).toBe('all_reached')
      }
    })

    it('identifies wait nodes', () => {
      const node = getNode(doc, 'delivery_tracking')
      expect(isWaitNode(node)).toBe(true)
      if (isWaitNode(node)) {
        expect(node.event).toBe('delivery.confirmed')
        expect(node.timeout).toBe('7d')
        expect(node.next).toBe('order_complete')
        expect(node.timeout_next).toBe('order_failed')
      }
    })

    it('identifies error nodes', () => {
      const node = getNode(doc, 'pharmacy_submission_failed')
      expect(isErrorNode(node)).toBe(true)
      if (isErrorNode(node)) {
        expect(node.next).toBe('order_failed')
        expect(node.entry_points).toBeDefined()
      }
    })

    it('identifies terminal nodes', () => {
      const node = getNode(doc, 'order_complete')
      expect(isTerminalNode(node)).toBe(true)
      if (isTerminalNode(node)) {
        expect(node.outcome).toBe('success')
      }

      const failNode = getNode(doc, 'order_failed')
      expect(isTerminalNode(failNode)).toBe(true)
      if (isTerminalNode(failNode)) {
        expect(failNode.outcome).toBe('failure')
      }
    })

    it('checks error handler with retry', () => {
      const node = getNode(doc, 'submit_to_pharmacy')
      expect(isActionNode(node)).toBe(true)
      if (isActionNode(node)) {
        expect(node.error).toBeDefined()
        expect(node.error?.retry).toBeDefined()
        expect(node.error?.retry?.limit).toBe(3)
        expect(node.error?.retry?.backoff).toBe('exponential')
        expect(node.error?.catch).toBe('pharmacy_submission_failed')
      }
    })
  })

  describe('subscription-renewal', () => {
    const doc = loadExample('subscription-renewal.flowprint.yaml')

    it('every node passes exactly one type guard', () => {
      const guards = [
        isActionNode,
        isSwitchNode,
        isParallelNode,
        isWaitNode,
        isErrorNode,
        isTerminalNode,
      ] as const

      for (const [, node] of Object.entries(doc.nodes)) {
        const matches = guards.filter((g) => g(node))
        expect(matches.length).toBe(1)
      }
    })

    it('has the expected node type distribution', () => {
      const counts = { action: 0, switch: 0, parallel: 0, wait: 0, error: 0, terminal: 0 }
      for (const node of Object.values(doc.nodes)) {
        counts[node.type]++
      }
      expect(counts.action).toBeGreaterThan(0)
      expect(counts.switch).toBeGreaterThan(0)
      expect(counts.wait).toBeGreaterThan(0)
      expect(counts.error).toBeGreaterThan(0)
      expect(counts.terminal).toBeGreaterThan(0)
    })
  })

  describe('consultation-flow', () => {
    const doc = loadExample('consultation-flow.flowprint.yaml')

    it('every node passes exactly one type guard', () => {
      const guards = [
        isActionNode,
        isSwitchNode,
        isParallelNode,
        isWaitNode,
        isErrorNode,
        isTerminalNode,
      ] as const

      for (const [, node] of Object.entries(doc.nodes)) {
        const matches = guards.filter((g) => g(node))
        expect(matches.length).toBe(1)
      }
    })

    it('exercises all 6 node types', () => {
      const types = new Set(Object.values(doc.nodes).map((n) => n.type))
      expect(types.has('action')).toBe(true)
      expect(types.has('switch')).toBe(true)
      expect(types.has('parallel')).toBe(true)
      expect(types.has('wait')).toBe(true)
      expect(types.has('error')).toBe(true)
      expect(types.has('terminal')).toBe(true)
    })

    it('parallel node has correct structure', () => {
      const node = getNode(doc, 'route_specialist_consults')
      expect(isParallelNode(node)).toBe(true)
      if (isParallelNode(node)) {
        expect(node.branches.length).toBe(2)
        expect(node.join).toBe('conduct_consultation')
      }
    })
  })

  describe('consultation-flow-v2', () => {
    const doc = loadExample('consultation-flow-v2.flowprint.yaml')

    it('uses schema version 2.0', () => {
      expect(doc.schema).toBe('flowprint/2.0')
    })

    it('has workflow configuration', () => {
      expect(doc.workflow).toBeDefined()
      expect(doc.workflow?.task_queue).toBe('consultation-tasks')
      expect(doc.workflow?.execution_timeout).toBe('4h')
      expect(doc.workflow?.input_type).toBe('ConsultationInput')
      expect(doc.workflow?.input_type_import).toBe('./types')
    })

    it('has action node with inputs', () => {
      const node = getNode(doc, 'initiate_consultation')
      expect(isActionNode(node)).toBe(true)
      if (isActionNode(node)) {
        expect(node.inputs).toBeDefined()
        expect(node.inputs?.patient_id).toBe('input.patient_id')
        expect(node.inputs?.symptoms).toBe('input.symptoms')
      }
    })

    it('has action node with compensation', () => {
      const node = getNode(doc, 'escalate_emergency')
      expect(isActionNode(node)).toBe(true)
      if (isActionNode(node)) {
        expect(node.compensation).toBeDefined()
        expect(node.compensation?.file).toBe('backend/consults/emergency.py')
        expect(node.compensation?.symbol).toBe('cancel_escalation')
      }
    })

    it('has action node with temporal config', () => {
      const node = getNode(doc, 'urgent_consult')
      expect(isActionNode(node)).toBe(true)
      if (isActionNode(node)) {
        expect(node.temporal).toBeDefined()
        expect(node.temporal?.start_to_close_timeout).toBe('30s')
        expect(node.temporal?.schedule_to_close_timeout).toBe('2m')
        expect(node.temporal?.heartbeat_timeout).toBe('10s')
        expect(node.temporal?.retry).toBeDefined()
        expect(node.temporal?.retry?.max_attempts).toBe(5)
        expect(node.temporal?.retry?.backoff_coefficient).toBe(1.5)
        expect(node.temporal?.retry?.initial_interval).toBe('2s')
        expect(node.temporal?.retry?.max_interval).toBe('30s')
        expect(node.temporal?.retry?.non_retryable_errors).toEqual([
          'ProviderNotLicensed',
          'PatientNotEligible',
        ])
      }
    })

    it('has wait node with event_type', () => {
      const node = getNode(doc, 'await_provider_availability')
      expect(isWaitNode(node)).toBe(true)
      if (isWaitNode(node)) {
        expect(node.event_type).toBe('ProviderAvailableSignal')
        expect(node.event_type_import).toBe('./signals')
      }
    })

    it('has parallel node with join_strategy "all"', () => {
      const node = getNode(doc, 'route_specialist_consults')
      expect(isParallelNode(node)).toBe(true)
      if (isParallelNode(node)) {
        expect(node.join_strategy).toBe('all')
      }
    })

    it('every node passes exactly one type guard', () => {
      const guards = [
        isActionNode,
        isSwitchNode,
        isParallelNode,
        isWaitNode,
        isErrorNode,
        isTerminalNode,
      ] as const

      for (const [, node] of Object.entries(doc.nodes)) {
        const matches = guards.filter((g) => g(node))
        expect(matches.length).toBe(1)
      }
    })
  })
})

// ── Cross-example structural checks ─────────────────────────────

describe('integration: cross-example checks', () => {
  it('all examples use a supported schema version', () => {
    for (const example of EXAMPLES) {
      const doc = loadExample(example)
      expect(['flowprint/1.0', 'flowprint/2.0']).toContain(doc.schema)
    }
  })

  it('all examples have at least one root and one terminal', () => {
    for (const example of EXAMPLES) {
      const doc = loadExample(example)
      const roots = findRoots(doc)
      expect(roots.length).toBeGreaterThan(0)

      const terminals = Object.entries(doc.nodes).filter(([, n]) => isTerminalNode(n))
      expect(terminals.length).toBeGreaterThan(0)
    }
  })

  it('all edges have valid types', () => {
    for (const example of EXAMPLES) {
      const doc = loadExample(example)
      const edges = getEdges(doc)
      for (const edge of edges) {
        expect(['normal', 'error', 'default']).toContain(edge.type)
      }
    }
  })

  it('all nodes reference valid lanes', () => {
    for (const example of EXAMPLES) {
      const doc = loadExample(example)
      const laneIds = new Set(Object.keys(doc.lanes))
      for (const [, node] of Object.entries(doc.nodes)) {
        expect(laneIds.has(node.lane)).toBe(true)
      }
    }
  })
})
