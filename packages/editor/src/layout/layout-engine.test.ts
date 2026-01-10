/* eslint-disable @typescript-eslint/no-non-null-assertion -- test assertions guarantee non-null */
import { describe, it, expect } from 'vitest'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { computeLayout } from './layout-engine'

const minimalDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test',
  version: '1.0.0',
  lanes: {
    external: { label: 'External', visibility: 'external', order: 0 },
    internal: { label: 'Internal', visibility: 'internal', order: 1 },
  },
  nodes: {
    start: {
      type: 'action',
      lane: 'external',
      label: 'Start',
      next: 'end',
    },
    end: {
      type: 'terminal',
      lane: 'internal',
      label: 'End',
      outcome: 'success',
    },
  },
}

const prescriptionDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'prescription-fulfillment',
  version: '1.0.0',
  description: 'End-to-end prescription fulfillment',
  lanes: {
    patient: { label: 'Patient Actions', visibility: 'external', order: 0 },
    frontstage: { label: 'Frontstage', visibility: 'external', order: 1 },
    backstage: { label: 'Backstage', visibility: 'internal', order: 2 },
    support: { label: 'External Partners', visibility: 'internal', order: 3 },
  },
  nodes: {
    complete_consultation: {
      type: 'action',
      lane: 'frontstage',
      label: 'Complete Consultation',
      entry_points: [{ file: 'tasks.py', symbol: 'send_wheel_consult' }],
      next: 'evaluate_treatment',
    },
    evaluate_treatment: {
      type: 'switch',
      lane: 'backstage',
      label: 'Treatment Decision',
      cases: [
        { when: 'needs_prescription', next: 'create_prescription' },
        { when: 'otc_only', next: 'recommend_otc' },
      ],
      default: 'create_prescription',
    },
    create_prescription: {
      type: 'action',
      lane: 'backstage',
      label: 'Create Prescription',
      next: 'fulfill_order',
    },
    fulfill_order: {
      type: 'parallel',
      lane: 'backstage',
      label: 'Fulfill Order',
      branches: ['submit_to_pharmacy', 'notify_patient'],
      join: 'delivery_tracking',
      join_strategy: 'all_reached',
    },
    submit_to_pharmacy: {
      type: 'action',
      lane: 'support',
      label: 'Submit to Pharmacy',
      next: 'delivery_tracking',
      error: { retry: { limit: 3, backoff: 'exponential' }, catch: 'pharmacy_submission_failed' },
    },
    notify_patient: {
      type: 'action',
      lane: 'frontstage',
      label: 'Notify Patient of Order',
      next: 'delivery_tracking',
    },
    delivery_tracking: {
      type: 'wait',
      lane: 'support',
      label: 'Await Delivery Confirmation',
      event: 'delivery.confirmed',
      timeout: '7d',
      next: 'order_complete',
      timeout_next: 'order_failed',
    },
    pharmacy_submission_failed: {
      type: 'error',
      lane: 'frontstage',
      label: 'Handle Pharmacy Error',
      next: 'order_failed',
    },
    order_complete: {
      type: 'terminal',
      lane: 'patient',
      label: 'Order Complete',
      outcome: 'success',
    },
    order_failed: {
      type: 'terminal',
      lane: 'patient',
      label: 'Order Failed',
      outcome: 'failure',
    },
    recommend_otc: {
      type: 'action',
      lane: 'frontstage',
      label: 'Recommend OTC Products',
      next: 'order_complete',
    },
  },
}

describe('computeLayout', () => {
  it('returns correct number of nodes and edges for minimal doc', () => {
    const result = computeLayout(minimalDoc)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
  })

  it('returns correct lane bands', () => {
    const result = computeLayout(minimalDoc)
    expect(result.lanes).toHaveLength(2)
    expect(result.lanes[0]!.laneId).toBe('external')
    expect(result.lanes[0]!.visibility).toBe('external')
    expect(result.lanes[1]!.laneId).toBe('internal')
    expect(result.lanes[1]!.visibility).toBe('internal')
  })

  it('calculates line of visibility between external and internal lanes', () => {
    const result = computeLayout(minimalDoc)
    expect(result.lineOfVisibilityY).not.toBeNull()
    expect(result.lineOfVisibilityY).toBeGreaterThan(0)
  })

  it('positions nodes within their lane bands', () => {
    const result = computeLayout(minimalDoc)
    const laneBands = new Map(result.lanes.map((l) => [l.laneId, l]))

    for (const node of result.nodes) {
      const nodeData = minimalDoc.nodes[node.id]!
      const band = laneBands.get(nodeData.lane)!
      expect(node.position.y).toBeGreaterThanOrEqual(band.y)
      expect(node.position.y).toBeLessThan(band.y + band.height)
    }
  })

  it('assigns correct node types', () => {
    const result = computeLayout(minimalDoc)
    const startNode = result.nodes.find((n) => n.id === 'start')
    const endNode = result.nodes.find((n) => n.id === 'end')
    expect(startNode?.type).toBe('action')
    expect(endNode?.type).toBe('terminal')
  })

  it('handles prescription-fulfillment with all 6 node types', () => {
    const result = computeLayout(prescriptionDoc)
    const types = new Set(result.nodes.map((n) => n.type))
    expect(types).toContain('action')
    expect(types).toContain('switch')
    expect(types).toContain('parallel')
    expect(types).toContain('wait')
    expect(types).toContain('error')
    expect(types).toContain('terminal')
  })

  it('generates edges with correct types', () => {
    const result = computeLayout(prescriptionDoc)
    const edgeTypes = new Set(result.edges.map((e) => e.type))
    expect(edgeTypes).toContain('normal')
    expect(edgeTypes).toContain('error')
    expect(edgeTypes).toContain('default')
  })

  it('creates 4 lane bands for prescription doc', () => {
    const result = computeLayout(prescriptionDoc)
    expect(result.lanes).toHaveLength(4)
    expect(result.lanes[0]!.visibility).toBe('external')
    expect(result.lanes[1]!.visibility).toBe('external')
    expect(result.lanes[2]!.visibility).toBe('internal')
    expect(result.lanes[3]!.visibility).toBe('internal')
  })

  it('places line of visibility between frontstage and backstage', () => {
    const result = computeLayout(prescriptionDoc)
    expect(result.lineOfVisibilityY).not.toBeNull()
    const frontstage = result.lanes.find((l) => l.laneId === 'frontstage')!
    expect(result.lineOfVisibilityY).toBe(frontstage.y + frontstage.height)
  })

  it('orders nodes left-to-right by topological layer', () => {
    const result = computeLayout(prescriptionDoc)
    const startNode = result.nodes.find((n) => n.id === 'complete_consultation')!
    const endNode = result.nodes.find((n) => n.id === 'order_complete')!
    expect(startNode.position.x).toBeLessThan(endNode.position.x)
  })

  it('returns non-zero dimensions', () => {
    const result = computeLayout(prescriptionDoc)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })
})
